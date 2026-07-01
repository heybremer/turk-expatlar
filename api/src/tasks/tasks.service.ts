import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EventStatus } from '@prisma/client';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Her gece 02:00'de tamamlanan etkinlikleri COMPLETED olarak işaretle
   */
  @Cron('0 2 * * *')
  async markCompletedEvents() {
    const result = await this.prisma.event.updateMany({
      where: {
        status: EventStatus.PUBLISHED,
        endsAt: { lt: new Date() },
      },
      data: { status: EventStatus.COMPLETED },
    });
    if (result.count > 0) {
      this.logger.log(`${result.count} etkinlik COMPLETED olarak işaretlendi`);
    }
  }

  /**
   * Her saat başında süresi geçmiş e-posta doğrulama tokenlarını temizle
   */
  @Cron(CronExpression.EVERY_HOUR)
  async cleanExpiredEmailVerificationTokens() {
    const result = await this.prisma.emailVerificationToken.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
        usedAt: null,
      },
    });
    if (result.count > 0) {
      this.logger.log(`${result.count} süresi dolmuş e-posta doğrulama tokeni silindi`);
    }
  }

  /**
   * Her gün 03:00'de süresi geçmiş şifre sıfırlama tokenlarını temizle
   */
  @Cron('0 3 * * *')
  async cleanExpiredPasswordResetTokens() {
    const result = await this.prisma.passwordResetToken.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
        usedAt: null,
      },
    });
    if (result.count > 0) {
      this.logger.log(`${result.count} süresi dolmuş şifre sıfırlama tokeni silindi`);
    }
  }

  /**
   * Her gün 04:00'de süresi dolan yasakları kaldır
   */
  @Cron('0 4 * * *')
  async liftExpiredBans() {
    const result = await this.prisma.user.updateMany({
      where: {
        status: 'SUSPENDED',
        bannedUntil: { lt: new Date() },
      },
      data: {
        status: 'ACTIVE',
        bannedUntil: null,
      },
    });
    if (result.count > 0) {
      this.logger.log(`${result.count} geçici yasak kaldırıldı`);
    }
  }

  /**
   * Her Pazartesi 06:00'da eski bildirimleri temizle (>90 gün)
   */
  @Cron('0 6 * * 1')
  async cleanOldNotifications() {
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const result = await this.prisma.notification.deleteMany({
      where: {
        createdAt: { lt: cutoff },
        read: true,
      },
    });
    if (result.count > 0) {
      this.logger.log(`${result.count} eski bildirim temizlendi`);
    }
  }
}
