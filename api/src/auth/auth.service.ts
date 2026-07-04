import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PostalCountry } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  createUniqueReferralCode,
  normalizeReferralCode,
} from '../common/referral.util';
import { validatePostalForCountry } from '../common/postal-country.util';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { isFeatureEnabled } from '../site-settings/runtime-config.store';
import { MailService } from './mail.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private mail: MailService,
  ) {}

  async register(dto: RegisterDto) {
    if (!isFeatureEnabled('registration')) {
      throw new BadRequestException('Kayıt geçici olarak kapalı');
    }

    if (!dto.gdprConsent) {
      throw new BadRequestException('GDPR onayı gerekli');
    }

    try {
      validatePostalForCountry(dto.postalCountry, dto.postalCode);
    } catch (err) {
      throw new BadRequestException(err instanceof Error ? err.message : 'Geçersiz posta kodu');
    }

    if (dto.postalCountry === PostalCountry.DE) {
      if (!dto.stateId || !dto.cityId) {
        throw new BadRequestException('Almanya kaydı için eyalet ve şehir gerekli');
      }
    }

    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException('Bu e-posta zaten kayıtlı');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const referralCode = await createUniqueReferralCode(this.prisma);

    let referredById: string | undefined;
    if (dto.referralCode?.trim()) {
      const normalized = normalizeReferralCode(dto.referralCode);
      const referrer = await this.prisma.user.findFirst({
        where: {
          referralCode: normalized,
          deletedAt: null,
          status: 'ACTIVE',
        },
        select: { id: true },
      });
      if (!referrer) {
        throw new BadRequestException('Geçersiz referans kodu');
      }
      referredById = referrer.id;
    }

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        gdprConsentAt: new Date(),
        referralCode,
        referredById,
        profile: {
          create: {
            displayName: dto.displayName,
            stateId: dto.postalCountry === PostalCountry.DE ? dto.stateId : null,
            cityId: dto.postalCountry === PostalCountry.DE ? dto.cityId : null,
            postalCode: dto.postalCode,
            postalCountry: dto.postalCountry,
            languages: dto.languages ?? ['tr'],
            interests: dto.interests ?? [],
            userStatus: dto.userStatus,
          },
        },
      },
      include: {
        profile: { include: { state: true, city: true } },
      },
    });

    // E-posta doğrulama maili gönder (arka planda, kayıt akışını engelleme)
    void this.sendVerificationEmail(user.id, user.email);

    return this.buildAuthResponse(user);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: {
        profile: { include: { state: true, city: true } },
      },
    });

    if (!user || user.deletedAt) {
      throw new UnauthorizedException('Geçersiz giriş bilgileri');
    }

    if (user.status === 'BANNED' || user.status === 'SUSPENDED') {
      throw new UnauthorizedException('Hesabınız askıya alınmış');
    }

    if (!user.passwordHash) {
      throw new UnauthorizedException('Bu hesap şifre ile giriş desteklemiyor. Google ile giriş yapın.');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Geçersiz giriş bilgileri');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return this.buildAuthResponse(user);
  }

  async findOrCreateGoogleUser(dto: {
    googleId: string;
    email: string;
    displayName: string;
    avatarUrl: string | null;
  }) {
    // 1. googleId ile var mı?
    let user = await this.prisma.user.findUnique({
      where: { googleId: dto.googleId },
      include: { profile: { include: { state: true, city: true } } },
    });

    if (user) {
      return this.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
        include: { profile: { include: { state: true, city: true } } },
      });
    }

    // 2. Aynı e-posta ile var mı? (hesapları birleştir)
    user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: { profile: { include: { state: true, city: true } } },
    });

    if (user) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          googleId: dto.googleId,
          emailVerified: true,
          lastLoginAt: new Date(),
        },
        include: { profile: { include: { state: true, city: true } } },
      });
      return user;
    }

    // 3. Yeni kullanıcı oluştur
    const referralCode = await createUniqueReferralCode(this.prisma);
    user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        googleId: dto.googleId,
        emailVerified: true,
        gdprConsentAt: new Date(),
        lastLoginAt: new Date(),
        referralCode,
        profile: {
          create: {
            displayName: dto.displayName,
            avatarUrl: dto.avatarUrl,
            languages: ['tr'],
            interests: [],
          },
        },
      },
      include: { profile: { include: { state: true, city: true } } },
    });

    return user;
  }

  async sendVerificationEmail(userId: string, email: string) {
    // Eski geçersiz token'ları temizle
    await this.prisma.emailVerificationToken.deleteMany({
      where: { userId, usedAt: null },
    });

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 saat

    await this.prisma.emailVerificationToken.create({
      data: { userId, token, expiresAt },
    });

    const siteUrl = process.env.SITE_URL ?? 'http://localhost:3200';
    const verifyLink = `${siteUrl}/email-dogrula?token=${token}`;

    await this.mail.sendEmailVerification(email, verifyLink);
  }

  async resendVerificationEmail(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, emailVerified: true },
    });

    if (!user) throw new NotFoundException('Kullanıcı bulunamadı');
    if (user.emailVerified) {
      return { message: 'E-posta adresiniz zaten doğrulanmış.' };
    }

    await this.sendVerificationEmail(user.id, user.email);
    return { message: 'Doğrulama e-postası tekrar gönderildi.' };
  }

  async verifyEmail(token: string) {
    const record = await this.prisma.emailVerificationToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new BadRequestException('Geçersiz veya süresi dolmuş bağlantı');
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { emailVerified: true },
      }),
      this.prisma.emailVerificationToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return { message: 'E-posta adresiniz başarıyla doğrulandı.' };
  }

  async requestPasswordReset(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true, email: true, deletedAt: true, status: true },
    });

    // Güvenlik: kullanıcı yoksa da başarı döndür (e-posta sızdırma önlemi)
    if (!user || user.deletedAt || user.status === 'BANNED') {
      return { message: 'Eğer bu e-posta kayıtlıysa sıfırlama bağlantısı gönderildi.' };
    }

    // Eski geçersiz token'ları temizle
    await this.prisma.passwordResetToken.deleteMany({
      where: { userId: user.id, usedAt: null },
    });

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 saat

    await this.prisma.passwordResetToken.create({
      data: { userId: user.id, token, expiresAt },
    });

    const siteUrl = process.env.SITE_URL ?? 'http://localhost:3200';
    const resetLink = `${siteUrl}/sifre-sifirla?token=${token}`;

    await this.mail.sendPasswordReset(user.email, resetLink);

    return { message: 'Eğer bu e-posta kayıtlıysa sıfırlama bağlantısı gönderildi.' };
  }

  async resetPassword(token: string, newPassword: string) {
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new BadRequestException('Geçersiz veya süresi dolmuş bağlantı');
    }

    if (!record.user || record.user.deletedAt || record.user.status === 'BANNED') {
      throw new NotFoundException('Kullanıcı bulunamadı');
    }

    if (newPassword.length < 8) {
      throw new BadRequestException('Şifre en az 8 karakter olmalı');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return { message: 'Şifreniz başarıyla güncellendi. Giriş yapabilirsiniz.' };
  }

  private buildAuthResponse(user: {
    id: string;
    email: string;
    role: string;
    emailVerified?: boolean;
    profile: unknown;
    passwordHash?: string | null;
  }) {
    const { passwordHash: _, ...safeUser } = user;
    const token = this.jwt.sign({
      sub: user.id,
      role: user.role,
      emailVerified: user.emailVerified ?? false,
    });
    return { user: safeUser, accessToken: token };
  }

  buildGoogleAuthResponse(user: {
    id: string;
    email: string;
    role: string;
    emailVerified?: boolean;
  }) {
    const token = this.jwt.sign({
      sub: user.id,
      role: user.role,
      emailVerified: user.emailVerified ?? true,
    });
    return { accessToken: token };
  }
}
