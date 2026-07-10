import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

// Kaç farklı kişiden şikayet gelince uyarı / susturma tetiklenir
const REPORTS_FOR_WARNING = 3;
const MUTE_DURATION_MS = 60 * 60 * 1000; // 1 saat

export interface ModerationResult {
  /** Şikayet zaten mevcut veya hata */
  alreadyReported?: boolean;
  /** Uyarı verildi mi */
  warned?: boolean;
  /** Susturuldu mu */
  muted?: boolean;
  /** Yeterli benzersiz şikayet gelmedi — birikmeye devam */
  pending?: boolean;
}

@Injectable()
export class TelsizModerationService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  /** Bir kullanıcı susturulmuş mu? Değilse null, ise bitiş zamanını döner */
  async getMuteUntil(userId: string): Promise<Date | null> {
    const mute = await this.prisma.telsizMute.findUnique({
      where: { userId },
      select: { muteUntil: true, warnCount: true },
    });
    if (!mute) return null;
    if (mute.muteUntil > new Date()) return mute.muteUntil;
    // Ceza süresi dolmuş — kayıt değer korunsun (warnCount için), muteUntil geçmiş
    return null;
  }

  /** Şikayet işle; gerekirse uyarı / susturma uygula */
  async report(
    reporterId: string,
    reportedId: string,
    channelId: string,
  ): Promise<ModerationResult> {
    if (reporterId === reportedId) return { alreadyReported: true };

    // Kendi kendine birden fazla şikayet engeli
    const existing = await this.prisma.telsizReport.findUnique({
      where: { reporterId_reportedId: { reporterId, reportedId } },
    });
    if (existing) return { alreadyReported: true };

    // Şikayeti kaydet
    await this.prisma.telsizReport.create({
      data: { reporterId, reportedId, channelId },
    });

    // Raporlanan kullanıcı hakkındaki toplam benzersiz şikayet sayısı
    const totalReports = await this.prisma.telsizReport.count({
      where: { reportedId },
    });

    // Mevcut moderation durumu
    const modRecord = await this.prisma.telsizMute.findUnique({
      where: { userId: reportedId },
    });
    const warnCount = modRecord?.warnCount ?? 0;

    // Raporlanan kullanıcı profilini bildirim için çek
    const profile = await this.prisma.profile.findUnique({
      where: { userId: reportedId },
      select: { displayName: true },
    });
    const displayName = profile?.displayName ?? 'Kullanıcı';

    if (totalReports >= REPORTS_FOR_WARNING * (warnCount + 1)) {
      if (warnCount === 0) {
        // İlk eşik: uyarı ver
        await this.prisma.telsizMute.upsert({
          where: { userId: reportedId },
          create: {
            userId: reportedId,
            muteUntil: new Date(0), // henüz susturma yok
            warnCount: 1,
            reportCount: totalReports,
          },
          update: {
            warnCount: 1,
            reportCount: totalReports,
          },
        });
        await this.notifications.create({
          userId: reportedId,
          title: '⚠️ Telsiz Uyarısı',
          body: 'Telsiz kanalında uygunsuz dil kullandığınız için şikayet edildiniz. Tekrar şikayet edilirseniz 1 saat susturulacaksınız.',
          link: '/uygulamalar/yolculuk-telsiz',
        });
        return { warned: true };
      } else {
        // İkinci eşik: 1 saat sustur
        const muteUntil = new Date(Date.now() + MUTE_DURATION_MS);
        await this.prisma.telsizMute.upsert({
          where: { userId: reportedId },
          create: {
            userId: reportedId,
            muteUntil,
            warnCount: warnCount + 1,
            reportCount: totalReports,
          },
          update: {
            muteUntil,
            warnCount: { increment: 1 },
            reportCount: totalReports,
          },
        });
        // Şikayetleri sıfırla (susturma sonrasında tekrar sayılmaya başlansın)
        await this.prisma.telsizReport.deleteMany({ where: { reportedId } });
        await this.notifications.create({
          userId: reportedId,
          title: '🔇 Telsiz Susturma',
          body: `Uygunsuz dil nedeniyle 1 saat boyunca Telsizde konuşamazsınız. Sonraki ihlalde kalıcı olarak yasaklanacaksınız.`,
          link: '/uygulamalar/yolculuk-telsiz',
        });
        return { muted: true };
      }
    }

    return { pending: true };
  }
}
