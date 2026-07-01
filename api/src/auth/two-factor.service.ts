import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TwoFactorService {
  constructor(private prisma: PrismaService) {}

  async setup(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, twoFactorEnabled: true },
    });
    if (!user) throw new BadRequestException('Kullanıcı bulunamadı');
    if (user.twoFactorEnabled) {
      throw new BadRequestException('2FA zaten etkin');
    }

    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(user.email, 'Türk Expatlar', secret);
    const qrDataUrl = await QRCode.toDataURL(otpauth);

    // Geçici olarak kaydet — henüz aktif değil
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: secret },
    });

    return { secret, qrDataUrl };
  }

  async enable(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorSecret: true, twoFactorEnabled: true },
    });
    if (!user?.twoFactorSecret) {
      throw new BadRequestException('Önce 2FA kurulumu başlatın');
    }
    if (!authenticator.verify({ token: code, secret: user.twoFactorSecret })) {
      throw new BadRequestException('Geçersiz kod');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true },
    });

    return { message: '2FA başarıyla etkinleştirildi' };
  }

  async disable(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorSecret: true, twoFactorEnabled: true },
    });
    if (!user?.twoFactorEnabled) {
      throw new BadRequestException('2FA zaten devre dışı');
    }
    if (!authenticator.verify({ token: code, secret: user.twoFactorSecret! })) {
      throw new BadRequestException('Geçersiz kod');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: false, twoFactorSecret: null },
    });

    return { message: '2FA devre dışı bırakıldı' };
  }

  verifyCode(secret: string, code: string): boolean {
    return authenticator.verify({ token: code, secret });
  }

  async validateLogin(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorSecret: true, twoFactorEnabled: true },
    });
    if (!user?.twoFactorEnabled || !user.twoFactorSecret) return true; // 2FA kapalı

    if (!authenticator.verify({ token: code, secret: user.twoFactorSecret })) {
      throw new UnauthorizedException('Geçersiz iki faktörlü doğrulama kodu');
    }
    return true;
  }
}
