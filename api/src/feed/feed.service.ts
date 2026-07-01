import { Injectable } from '@nestjs/common';
import { EventStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../redis/cache.service';

@Injectable()
export class FeedService {
  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
  ) {}

  async getHomeFeed(stateId?: string, cityId?: string) {
    const cacheKey = `feed:home:${cityId ?? stateId ?? 'all'}`;

    return this.cache.wrap(
      cacheKey,
      () => this.fetchFeed(stateId, cityId),
      120, // 2 dakika cache
    );
  }

  private async fetchFeed(stateId?: string, cityId?: string) {
    const locationFilter = cityId
      ? { cityId }
      : stateId
        ? { stateId }
        : {};

    const [events, topics, businesses] = await Promise.all([
      this.prisma.event.findMany({
        where: {
          deletedAt: null,
          status: EventStatus.PUBLISHED,
          startsAt: { gte: new Date() },
          ...locationFilter,
        },
        take: 5,
        orderBy: { startsAt: 'asc' },
        include: {
          city: true,
          state: true,
          _count: { select: { attendees: true } },
        },
      }),
      this.prisma.forumTopic.findMany({
        where: { deletedAt: null, ...locationFilter },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          category: true,
          city: true,
          state: true,
          _count: { select: { replies: true } },
        },
      }),
      this.prisma.business.findMany({
        where: {
          deletedAt: null,
          status: 'ACTIVE',
          ...locationFilter,
        },
        take: 6,
        orderBy: [{ isVerified: 'desc' }, { averageRating: 'desc' }],
        include: { category: true, city: true },
      }),
    ]);

    return {
      events,
      topics,
      businesses,
      guide: [
        { title: 'Anmeldung', slug: 'anmeldung' },
        { title: 'Banka Hesabı', slug: 'banka' },
        { title: 'Krankenkasse', slug: 'krankenkasse' },
        { title: 'Ev Arama', slug: 'ev-arama' },
      ],
    };
  }
}
