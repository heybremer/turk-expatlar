import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NewsletterService {
  private readonly logger = new Logger(NewsletterService.name);

  constructor(private prisma: PrismaService) {}

  /** Haftalık özet içeriği — SMTP entegrasyonu için hazır taslak */
  async buildWeeklyDigestPreview() {
    const since = new Date();
    since.setDate(since.getDate() - 7);

    const [newTopics, newEvents, newBusinesses] = await Promise.all([
      this.prisma.forumTopic.count({
        where: { deletedAt: null, createdAt: { gte: since } },
      }),
      this.prisma.event.count({
        where: { deletedAt: null, createdAt: { gte: since } },
      }),
      this.prisma.business.count({
        where: { deletedAt: null, createdAt: { gte: since } },
      }),
    ]);

    const summary = {
      periodStart: since.toISOString(),
      periodEnd: new Date().toISOString(),
      stats: { newTopics, newEvents, newBusinesses },
      note: 'SMTP yapılandırması (SMTP_HOST, SMTP_USER, SMTP_PASS) eklendiğinde bu özet e-posta olarak gönderilebilir.',
    };

    this.logger.log(`Weekly digest preview: ${JSON.stringify(summary.stats)}`);
    return summary;
  }
}
