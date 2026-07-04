import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AttendeeStatus, EventStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationGateway } from '../notifications/notification.gateway';
import { GamificationService } from '../gamification/gamification.service';

@Injectable()
export class EventsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private notifGateway: NotificationGateway,
    private gamification: GamificationService,
  ) {}

  async findEvents(params: {
    page?: number;
    limit?: number;
    stateId?: string;
    cityId?: string;
    upcoming?: boolean;
    priceType?: string;
    category?: string;
    thisWeek?: boolean;
  }) {
    const page = params.page ?? 1;
    const limit = Math.min(params.limit ?? 20, 50);
    const skip = (page - 1) * limit;

    // Bu hafta: pazartesi 00:00 → pazar 23:59
    let thisWeekFilter: { gte: Date; lte: Date } | undefined;
    if (params.thisWeek) {
      const now = new Date();
      const monday = new Date(now);
      monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
      monday.setHours(0, 0, 0, 0);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);
      thisWeekFilter = { gte: monday, lte: sunday };
    }

    const where = {
      deletedAt: null,
      status: EventStatus.PUBLISHED,
      ...(params.stateId && { stateId: params.stateId }),
      ...(params.cityId && { cityId: params.cityId }),
      ...(thisWeekFilter
        ? { startsAt: thisWeekFilter }
        : params.upcoming !== false
          ? { startsAt: { gte: new Date() } }
          : {}),
      ...(params.priceType && { priceType: params.priceType as any }),
      ...(params.category && { category: params.category }),
    };

    const [items, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startsAt: 'asc' },
        include: {
          state: true,
          city: true,
          organizer: {
            select: {
              id: true,
              profile: {
                select: {
                  displayName: true,
                  avatarUrl: true,
                  postalCountry: true,
                },
              },
            },
          },
          _count: { select: { attendees: true } },
        },
      }),
      this.prisma.event.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async findEvent(id: string) {
    const event = await this.prisma.event.findFirst({
      where: { id, deletedAt: null },
      include: {
        state: true,
        city: true,
        organizer: {
          select: {
            id: true,
            profile: {
              select: {
                displayName: true,
                avatarUrl: true,
                postalCountry: true,
                trustScore: true,
              },
            },
          },
        },
        attendees: {
          include: {
            user: {
              select: {
                id: true,
                profile: {
                  select: {
                    displayName: true,
                    avatarUrl: true,
                    postalCountry: true,
                  },
                },
              },
            },
          },
        },
        _count: { select: { attendees: true } },
      },
    });
    if (!event) throw new NotFoundException('Etkinlik bulunamadı');
    return event;
  }

  async createEvent(organizerId: string, dto: CreateEventDto) {
    const event = await this.prisma.event.create({
      data: {
        organizerId,
        stateId: dto.stateId,
        cityId: dto.cityId,
        title: dto.title,
        description: dto.description,
        location: dto.location,
        startsAt: new Date(dto.startsAt),
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
        capacity: dto.capacity,
        priceType: dto.priceType,
        priceAmount: dto.priceAmount,
        category: dto.category,
        status: EventStatus.PENDING_APPROVAL,
      },
      include: { state: true, city: true },
    });

    void this.gamification.award(
      organizerId,
      'EVENT_CREATED',
      event.id,
      'Event',
    );

    return event;
  }

  async attend(
    eventId: string,
    userId: string,
    status: AttendeeStatus = AttendeeStatus.GOING,
  ) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, deletedAt: null, status: EventStatus.PUBLISHED },
      include: { _count: { select: { attendees: true } } },
    });
    if (!event) throw new NotFoundException('Etkinlik bulunamadı');

    if (event.capacity && event._count.attendees >= event.capacity) {
      throw new ConflictException('Etkinlik dolu');
    }

    const existing = await this.prisma.eventAttendee.findUnique({
      where: { eventId_userId: { eventId, userId } },
    });

    const result = await this.prisma.eventAttendee.upsert({
      where: { eventId_userId: { eventId, userId } },
      update: { status },
      create: { eventId, userId, status },
    });

    if (
      !existing &&
      event.organizerId !== userId &&
      status === AttendeeStatus.GOING
    ) {
      const notif = await this.notifications.create({
        userId: event.organizerId,
        title: 'Etkinliğine yeni katılımcı',
        body: `"${event.title}" etkinliğine yeni biri katıldı.`,
        link: `/etkinlikler/${eventId}`,
      });
      this.notifGateway.pushToUser(event.organizerId, notif);
    }

    if (!existing && status === AttendeeStatus.GOING) {
      void this.gamification.award(userId, 'EVENT_JOINED', eventId, 'Event');
    }

    return result;
  }

  async approveEvent(eventId: string) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, deletedAt: null },
    });
    if (!event) throw new NotFoundException('Etkinlik bulunamadı');

    const updated = await this.prisma.event.update({
      where: { id: eventId },
      data: { status: EventStatus.PUBLISHED },
    });

    const notif = await this.notifications.create({
      userId: event.organizerId,
      title: 'Etkinliğiniz onaylandı!',
      body: `"${event.title}" etkinliğiniz admin tarafından onaylandı ve yayına alındı.`,
      link: `/etkinlikler/${eventId}`,
    });
    this.notifGateway.pushToUser(event.organizerId, notif);

    return updated;
  }

  async rejectEvent(eventId: string, reason?: string) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, deletedAt: null },
    });
    if (!event) throw new NotFoundException('Etkinlik bulunamadı');

    const updated = await this.prisma.event.update({
      where: { id: eventId },
      data: { status: EventStatus.CANCELLED },
    });

    const notif = await this.notifications.create({
      userId: event.organizerId,
      title: 'Etkinlik onaylanmadı',
      body: reason
        ? `"${event.title}" etkinliğiniz reddedildi: ${reason}`
        : `"${event.title}" etkinliğiniz admin tarafından onaylanmadı.`,
      link: `/etkinlikler/${eventId}`,
    });
    this.notifGateway.pushToUser(event.organizerId, notif);

    return updated;
  }

  findPendingEvents() {
    return this.prisma.event.findMany({
      where: { status: EventStatus.PENDING_APPROVAL, deletedAt: null },
      orderBy: { createdAt: 'asc' },
      include: {
        state: true,
        city: true,
        organizer: { select: { profile: { select: { displayName: true } } } },
      },
    });
  }
}
