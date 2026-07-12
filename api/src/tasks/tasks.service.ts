import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EventStatus, TravelStatus } from '@prisma/client';
import { GamificationService } from '../gamification/gamification.service';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private prisma: PrismaService,
    private gamification: GamificationService,
  ) {}

  /**
   * Her gece 02:00'de tamamlanan etkinlikleri COMPLETED olarak işaretle ve
   * organizatör/katılımcılara puan ver.
   */
  @Cron('0 2 * * *')
  async markCompletedEvents() {
    const toComplete = await this.prisma.event.findMany({
      where: {
        status: EventStatus.PUBLISHED,
        endsAt: { lt: new Date() },
      },
      select: { id: true },
    });
    if (!toComplete.length) return;

    await this.prisma.event.updateMany({
      where: { id: { in: toComplete.map((e) => e.id) } },
      data: { status: EventStatus.COMPLETED },
    });

    for (const event of toComplete) {
      await this.gamification.awardEventCompleted(event.id);
    }

    this.logger.log(
      `${toComplete.length} etkinlik COMPLETED olarak işaretlendi ve puan verildi`,
    );
  }

  /**
   * Her gece 02:30'da kalkış tarihi geçmiş açık yolculuk ilanlarını kapat
   */
  @Cron('30 2 * * *')
  async closeExpiredTravelAnnouncements() {
    const result = await this.prisma.travelAnnouncement.updateMany({
      where: {
        status: TravelStatus.OPEN,
        departureDate: { lt: new Date() },
      },
      data: { status: TravelStatus.CLOSED },
    });
    if (result.count > 0) {
      this.logger.log(`${result.count} süresi geçmiş yolculuk ilanı kapatıldı`);
    }
  }

  /**
   * Her saat başında süresi dolan süreli (otomatik silinen) sohbet
   * mesajlarını veritabanından kalıcı olarak sil. Canlı istemcilere silme
   * bilgisi zaten socket zamanlayıcısıyla gider; bu cron gizlilik vaadinin
   * kalıcı depolamada da geçerli olmasını sağlar.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async purgeExpiredChatMessages() {
    const result = await this.prisma.message.deleteMany({
      where: { expiresAt: { not: null, lt: new Date() } },
    });
    if (result.count > 0) {
      this.logger.log(`${result.count} süreli sohbet mesajı kalıcı silindi`);
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
      this.logger.log(
        `${result.count} süresi dolmuş e-posta doğrulama tokeni silindi`,
      );
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
      this.logger.log(
        `${result.count} süresi dolmuş şifre sıfırlama tokeni silindi`,
      );
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
