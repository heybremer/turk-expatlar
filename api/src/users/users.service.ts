import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PostalCountry } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { createUniqueReferralCode } from '../common/referral.util';
import {
  resolveAllowedPages,
} from '../common/page-permissions';
import { validatePostalForCountry } from '../common/postal-country.util';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getMe(userId: string) {
    await this.ensureReferralCode(userId);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: { include: { state: true, city: true } },
        referredBy: {
          select: {
            id: true,
            referralCode: true,
            profile: { select: { displayName: true, postalCountry: true } },
          },
        },
        _count: { select: { referrals: true } },
      },
    });
    if (!user) throw new NotFoundException();
    const { passwordHash: _, ...safe } = user;

    // Onboarding yalnızca posta kodu doluysa otomatik tamamlanır (eski 5 dk kuralı kaldırıldı)

    const settings = await this.prisma.siteSettings.findUnique({
      where: { id: 'default' },
      select: { trDefaultAllowedPages: true },
    });
    const resolvedAllowedPages = resolveAllowedPages(
      safe.profile?.allowedPages ?? [],
      settings?.trDefaultAllowedPages ?? [],
    );

    return {
      ...safe,
      pageAccess: {
        allowedPages: resolvedAllowedPages,
        isRestricted: safe.profile?.postalCountry === PostalCountry.TR,
      },
    };
  }

  async getMyReferrals(userId: string) {
    await this.ensureReferralCode(userId);

    const [user, referrals] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          referralCode: true,
          referredBy: {
            select: {
              id: true,
              referralCode: true,
              profile: { select: { displayName: true, postalCountry: true } },
            },
          },
          _count: { select: { referrals: true } },
        },
      }),
      this.prisma.user.findMany({
        where: { referredById: userId, deletedAt: null },
        select: {
          id: true,
          email: true,
          createdAt: true,
          profile: { select: { displayName: true, postalCountry: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);

    if (!user) throw new NotFoundException();

    return {
      referralCode: user.referralCode,
      referralCount: user._count.referrals,
      referredBy: user.referredBy,
      referrals,
    };
  }

  private async ensureReferralCode(userId: string) {
    const existing = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { referralCode: true },
    });
    if (!existing || existing.referralCode) return;

    const referralCode = await createUniqueReferralCode(this.prisma);
    await this.prisma.user.update({
      where: { id: userId },
      data: { referralCode },
    });
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const {
      email,
      phone,
      firstName,
      lastName,
      avatarUrl,
      completeOnboarding,
      postalCountry,
      ...profileFields
    } = dto;

    const existingProfile = await this.prisma.profile.findUnique({
      where: { userId },
    });
    if (!existingProfile) throw new NotFoundException('Profil bulunamadı');

    const country = postalCountry ?? existingProfile.postalCountry;
    const existingPostal = existingProfile.postalCode?.trim() ?? '';
    const incomingPostal =
      profileFields.postalCode !== undefined
        ? profileFields.postalCode.trim()
        : undefined;
    const nextPostal = incomingPostal ?? existingPostal;

    if (!nextPostal || !/^\d{5}$/.test(nextPostal)) {
      throw new BadRequestException('Geçerli bir 5 haneli posta kodu gerekli');
    }

    if (incomingPostal !== undefined || !existingPostal) {
      try {
        validatePostalForCountry(country, nextPostal);
      } catch (err) {
        throw new ConflictException(
          err instanceof Error ? err.message : 'Geçersiz posta kodu',
        );
      }
    }

    if (email) {
      const taken = await this.prisma.user.findFirst({
        where: { email, id: { not: userId } },
      });
      if (taken) throw new ConflictException('Bu e-posta adresi kullanılıyor');
    }

    const displayName = [firstName, lastName].filter(Boolean).join(' ').trim();

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone: phone || null }),
      },
    });

    const profile = await this.prisma.profile.update({
      where: { userId },
      data: {
        ...profileFields,
        postalCode: nextPostal,
        ...(postalCountry !== undefined && { postalCountry }),
        ...(firstName !== undefined && { firstName: firstName || null }),
        ...(lastName !== undefined && { lastName: lastName || null }),
        ...(displayName && { displayName }),
        ...(avatarUrl !== undefined && { avatarUrl: avatarUrl || null }),
        ...(completeOnboarding || !existingProfile.postalCode
          ? { onboardingCompletedAt: new Date() }
          : {}),
      },
      include: { state: true, city: true },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, phone: true },
    });

    return { ...profile, email: user?.email, phone: user?.phone };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true, deletedAt: true },
    });
    if (!user || user.deletedAt) throw new NotFoundException();

    if (!user.passwordHash) {
      throw new UnauthorizedException('Bu hesap şifre ile giriş desteklemiyor');
    }
    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Mevcut şifre hatalı');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return { message: 'Şifre güncellendi' };
  }

  async updateAvatar(userId: string, avatarUrl: string) {
    return this.prisma.profile.update({
      where: { userId },
      data: { avatarUrl },
      select: { avatarUrl: true },
    });
  }

  async deleteAccount(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        deletedAt: new Date(),
        email: `deleted_${userId}@anonymized.local`,
        status: 'BANNED',
        profile: {
          update: {
            displayName: 'Silinmiş Kullanıcı',
            firstName: null,
            lastName: null,
            bio: null,
            avatarUrl: null,
          },
        },
      },
    });
    return { message: 'Hesabınız silindi ve verileriniz anonimleştirildi' };
  }

  async searchUsers(query: string, excludeId: string) {
    if (!query || query.trim().length < 2) return [];
    const q = query.trim();
    return this.prisma.user.findMany({
      where: {
        id: { not: excludeId },
        deletedAt: null,
        OR: [
          { profile: { displayName: { contains: q, mode: 'insensitive' } } },
          { profile: { firstName: { contains: q, mode: 'insensitive' } } },
          { profile: { lastName: { contains: q, mode: 'insensitive' } } },
          { email: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        profile: {
          select: {
            displayName: true,
            avatarUrl: true,
            postalCountry: true,
            city: { select: { name: true } },
            state: { select: { name: true } },
          },
        },
      },
      take: 10,
    });
  }

  async blockUser(blockerId: string, blockedId: string) {
    if (blockerId === blockedId) {
      throw new BadRequestException('Kendinizi engelleyemezsiniz');
    }
    const target = await this.prisma.user.findFirst({
      where: { id: blockedId, deletedAt: null },
      select: { id: true },
    });
    if (!target) throw new NotFoundException('Kullanıcı bulunamadı');

    await this.prisma.block.upsert({
      where: { blockerId_blockedId: { blockerId, blockedId } },
      create: { blockerId, blockedId },
      update: {},
    });
    return { message: 'Kullanıcı engellendi' };
  }

  async unblockUser(blockerId: string, blockedId: string) {
    await this.prisma.block
      .delete({ where: { blockerId_blockedId: { blockerId, blockedId } } })
      .catch(() => null);
    return { message: 'Engel kaldırıldı' };
  }

  async getBlockStatus(userId: string, otherUserId: string) {
    const [blockedByMe, blockedMe] = await Promise.all([
      this.prisma.block.findUnique({
        where: { blockerId_blockedId: { blockerId: userId, blockedId: otherUserId } },
      }),
      this.prisma.block.findUnique({
        where: { blockerId_blockedId: { blockerId: otherUserId, blockedId: userId } },
      }),
    ]);
    return { blockedByMe: !!blockedByMe, blockedMe: !!blockedMe };
  }

  async listBlockedUsers(userId: string) {
    const blocks = await this.prisma.block.findMany({
      where: { blockerId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        blocked: {
          select: {
            id: true,
            profile: { select: { displayName: true, avatarUrl: true } },
          },
        },
      },
    });
    return blocks.map((b) => ({ id: b.blocked.id, profile: b.blocked.profile, blockedAt: b.createdAt }));
  }

  async getPublicProfile(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: {
        id: true,
        createdAt: true,
        role: true,
        profile: {
          select: {
            displayName: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            bio: true,
            occupation: true,
            postalCountry: true,
            state: { select: { name: true } },
            city: { select: { name: true } },
          },
        },
      },
    });
    if (!user?.profile) throw new NotFoundException('Kullanıcı bulunamadı');
    return user;
  }
}
