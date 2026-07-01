import { Injectable } from '@nestjs/common';
import { BusinessStatus, EventStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SearchService {
  constructor(private prisma: PrismaService) {}

  async search(query: string) {
    const q = query.trim();
    if (q.length < 2) {
      return { topics: [], events: [], businesses: [] };
    }

    const contains = { contains: q, mode: 'insensitive' as const };

    const [topics, events, businesses] = await Promise.all([
      this.prisma.forumTopic.findMany({
        where: {
          deletedAt: null,
          OR: [{ title: contains }, { body: contains }],
        },
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          category: true,
          city: true,
          _count: { select: { replies: true, interests: true } },
        },
      }),
      this.prisma.event.findMany({
        where: {
          deletedAt: null,
          status: EventStatus.PUBLISHED,
          OR: [{ title: contains }, { description: contains }],
        },
        take: 10,
        orderBy: { startsAt: 'asc' },
        include: { city: true, state: true, _count: { select: { attendees: true } } },
      }),
      this.prisma.business.findMany({
        where: {
          deletedAt: null,
          status: BusinessStatus.ACTIVE,
          OR: [{ name: contains }, { description: contains }],
        },
        take: 10,
        orderBy: [{ isVerified: 'desc' }, { averageRating: 'desc' }],
        include: { category: true, city: true },
      }),
    ]);

    return { topics, events, businesses };
  }
}
