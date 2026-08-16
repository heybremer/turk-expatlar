import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EditorTeam, EventStatus, PriceType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EditorialTasksService } from './editorial-tasks.service';

const EVENT_EDITOR_EMAILS = [
  'editor-events-elif@turkexpatlar.de',
  'editor-events-burak@turkexpatlar.de',
];

const MAX_PENDING_BOT_EVENTS = 2;

const EVENT_TEMPLATES = [
  {
    stateSlug: 'berlin',
    citySlug: 'berlin',
    cityName: 'Berlin',
    title: 'Berlin Yeni Gelenler Tanışma Buluşması',
    category: 'Tanışma',
    capacity: 30,
    purpose:
      'Berlin’e yeni gelenlerin tanışması, şehirdeki ilk adımlarını konuşması ve güvenilir kaynakları paylaşması',
  },
  {
    stateSlug: 'hamburg',
    citySlug: 'hamburg',
    cityName: 'Hamburg',
    title: 'Hamburg Türkçe-Almanca Konuşma Buluşması',
    category: 'Dil',
    capacity: 24,
    purpose:
      'Türkçe ve Almanca konuşma pratiği yapmak isteyen topluluk üyelerini bir araya getirmek',
  },
  {
    stateSlug: 'bayern',
    citySlug: 'muenchen',
    cityName: 'München',
    title: 'Münih Kariyer ve Networking Buluşması',
    category: 'Kariyer',
    capacity: 30,
    purpose:
      'İş arayanların ve çalışanların Almanya’daki kariyer deneyimlerini ve güvenilir kaynakları paylaşması',
  },
  {
    stateSlug: 'hessen',
    citySlug: 'frankfurt-am-main',
    cityName: 'Frankfurt',
    title: 'Frankfurt Aileler İçin Hafta Sonu Buluşması',
    category: 'Aile',
    capacity: 30,
    purpose:
      'Ailelerin şehir yaşamı, çocuk etkinlikleri ve günlük hayata ilişkin faydalı kaynakları paylaşması',
  },
  {
    stateSlug: 'nordrhein-westfalen',
    citySlug: 'koeln',
    cityName: 'Köln',
    title: 'Köln Kültür ve Sosyal Çevre Buluşması',
    category: 'Sosyal',
    capacity: 30,
    purpose:
      'Topluluk üyelerinin yeni insanlarla tanışması ve şehirdeki kültürel imkânları konuşması',
  },
] as const;

@Injectable()
export class EventBotService {
  private readonly logger = new Logger(EventBotService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly editorialTasks: EditorialTasksService,
  ) {}

  /** Her pazartesi bir sonraki topluluk etkinliği önerisini hazırlar. */
  @Cron('15 8 * * 1')
  async createScheduledEvent() {
    const result = await this.createNow();
    if (result.created) {
      this.logger.log(`Etkinlik taslağı oluşturuldu: ${result.title}`);
    }
  }

  async createNow(): Promise<
    | { created: true; eventId: string; title: string; startsAt: Date }
    | { created: false; reason: string }
  > {
    const editors = await this.prisma.user.findMany({
      where: {
        email: { in: EVENT_EDITOR_EMAILS },
        isBot: true,
        editorTeam: EditorTeam.EVENTS,
        deletedAt: null,
      },
      orderBy: { email: 'asc' },
      select: { id: true },
    });

    if (editors.length === 0) {
      return { created: false, reason: 'Etkinlik editörü bulunamadı' };
    }

    const pendingCount = await this.prisma.event.count({
      where: {
        organizerId: { in: editors.map(({ id }) => id) },
        status: EventStatus.PENDING_APPROVAL,
        deletedAt: null,
      },
    });
    if (pendingCount >= MAX_PENDING_BOT_EVENTS) {
      return {
        created: false,
        reason: 'Onay bekleyen otomatik etkinlik sınırına ulaşıldı',
      };
    }

    const weekIndex = this.getIsoWeekIndex(new Date());
    const template = EVENT_TEMPLATES[weekIndex % EVENT_TEMPLATES.length];
    const organizer = editors[weekIndex % editors.length];
    const startsAt = this.getUpcomingSaturday(new Date(), 3);
    const endsAt = new Date(startsAt.getTime() + 2 * 60 * 60 * 1000);

    const city = await this.prisma.city.findFirst({
      where: {
        slug: template.citySlug,
        state: { slug: template.stateSlug },
      },
      select: { id: true, stateId: true },
    });
    if (!city) {
      return {
        created: false,
        reason: `${template.cityName} konum kaydı bulunamadı`,
      };
    }

    const windowStart = new Date(startsAt);
    windowStart.setUTCDate(windowStart.getUTCDate() - 3);
    const windowEnd = new Date(startsAt);
    windowEnd.setUTCDate(windowEnd.getUTCDate() + 3);
    const duplicate = await this.prisma.event.findFirst({
      where: {
        title: template.title,
        startsAt: { gte: windowStart, lte: windowEnd },
        status: { not: EventStatus.CANCELLED },
        deletedAt: null,
      },
      select: { id: true },
    });
    if (duplicate) {
      return { created: false, reason: 'Bu haftanın etkinliği zaten mevcut' };
    }

    const event = await this.prisma.event.create({
      data: {
        organizerId: organizer.id,
        stateId: city.stateId,
        cityId: city.id,
        title: template.title,
        description: `Bu etkinlik, Türk Expatlar topluluğu için otomasyon destekli etkinlik ekibi tarafından hazırlanmıştır. Yayın öncesinde tarih, mekân ve program yönetici tarafından doğrulanır. Amaç: ${template.purpose}.`,
        location: `${template.cityName} · mekân yönetici onayından sonra duyurulacak`,
        startsAt,
        endsAt,
        capacity: template.capacity,
        priceType: PriceType.FREE,
        category: template.category,
        status: EventStatus.PENDING_APPROVAL,
      },
      select: { id: true, title: true, startsAt: true },
    });

    await this.editorialTasks.scanAll();
    return { created: true, eventId: event.id, title: event.title, startsAt };
  }

  async getDashboardData() {
    const editors = await this.prisma.user.findMany({
      where: {
        email: { in: EVENT_EDITOR_EMAILS },
        isBot: true,
        editorTeam: EditorTeam.EVENTS,
        deletedAt: null,
      },
      select: { id: true },
    });
    const editorIds = editors.map(({ id }) => id);
    const [pendingCount, recentEvents] = await Promise.all([
      this.prisma.event.count({
        where: {
          organizerId: { in: editorIds },
          status: EventStatus.PENDING_APPROVAL,
          deletedAt: null,
        },
      }),
      this.prisma.event.findMany({
        where: { organizerId: { in: editorIds }, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          title: true,
          startsAt: true,
          status: true,
          createdAt: true,
        },
      }),
    ]);
    return {
      botFound: editors.length > 0,
      editorCount: editors.length,
      pendingCount,
      recentEvents,
    };
  }

  private getUpcomingSaturday(from: Date, weeksAhead: number) {
    const result = new Date(from);
    result.setUTCHours(13, 0, 0, 0);
    const daysUntilSaturday = (6 - result.getUTCDay() + 7) % 7 || 7;
    result.setUTCDate(
      result.getUTCDate() + daysUntilSaturday + (weeksAhead - 1) * 7,
    );
    return result;
  }

  private getIsoWeekIndex(date: Date) {
    const current = new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    );
    const day = current.getUTCDay() || 7;
    current.setUTCDate(current.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(current.getUTCFullYear(), 0, 1));
    return Math.ceil(
      ((current.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
    );
  }
}
