import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ForumTopicStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReplyDto } from './dto/create-reply.dto';
import { CreateTopicDto } from './dto/create-topic.dto';
import { UpdateTopicDto } from './dto/update-topic.dto';
import { UpdateReplyDto } from './dto/update-reply.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationGateway } from '../notifications/notification.gateway';
import { ContentModerationService } from '../common/content-moderation.service';
import { GamificationService } from '../gamification/gamification.service';

const replyUserSelect = {
  id: true,
  role: true,
  profile: {
    select: { displayName: true, avatarUrl: true, postalCountry: true },
  },
} as const;

const childReplyInclude = {
  user: { select: replyUserSelect },
  _count: { select: { votes: true } },
} as const;

const topReplyInclude = {
  user: { select: replyUserSelect },
  _count: { select: { votes: true, children: true } },
  children: {
    where: { deletedAt: null },
    orderBy: { createdAt: 'asc' as const },
    include: childReplyInclude,
  },
} as const;

export type ForumTopicSort = 'newest' | 'views' | 'replies' | 'likes';

function resolveTopicOrderBy(sort?: ForumTopicSort) {
  switch (sort) {
    case 'views':
      return [{ viewCount: 'desc' as const }, { createdAt: 'desc' as const }];
    case 'replies':
      return [
        { replies: { _count: 'desc' as const } },
        { createdAt: 'desc' as const },
      ];
    case 'likes':
      return [
        { interests: { _count: 'desc' as const } },
        { createdAt: 'desc' as const },
      ];
    default:
      return [{ createdAt: 'desc' as const }];
  }
}

@Injectable()
export class ForumService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private notifGateway: NotificationGateway,
    private moderation: ContentModerationService,
    private gamification: GamificationService,
  ) {}

  getCategories() {
    return this.prisma.topicCategory.findMany({
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findTopics(params: {
    page?: number;
    limit?: number;
    categoryId?: string;
    stateId?: string;
    cityId?: string;
    status?: ForumTopicStatus;
    search?: string;
    sort?: ForumTopicSort;
  }) {
    const page = params.page ?? 1;
    const limit = Math.min(params.limit ?? 20, 50);
    const skip = (page - 1) * limit;

    const where = {
      deletedAt: null,
      ...(params.categoryId && { categoryId: params.categoryId }),
      ...(params.stateId && { stateId: params.stateId }),
      ...(params.cityId && { cityId: params.cityId }),
      ...(params.status && { status: params.status }),
      ...(params.search && {
        OR: [
          { title: { contains: params.search, mode: 'insensitive' as const } },
          { body: { contains: params.search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.forumTopic.findMany({
        where,
        skip,
        take: limit,
        orderBy: resolveTopicOrderBy(params.sort),
        include: {
          category: true,
          state: true,
          city: true,
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
          _count: { select: { replies: true, interests: true } },
        },
      }),
      this.prisma.forumTopic.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async createPoll(
    topicId: string,
    userId: string,
    dto: { question: string; options: string[]; endsAt?: string },
  ) {
    const topic = await this.prisma.forumTopic.findFirst({
      where: { id: topicId, userId, deletedAt: null },
    });
    if (!topic) throw new ForbiddenException('Bu konuya anket ekleyemezsiniz');
    if (dto.options.length < 2 || dto.options.length > 10) {
      throw new BadRequestException(
        'Anket en az 2, en fazla 10 seçenek içerebilir',
      );
    }

    return this.prisma.forumPoll.create({
      data: {
        topicId,
        question: dto.question,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
        options: {
          create: dto.options.map((text, order) => ({ text, order })),
        },
      },
      include: {
        options: {
          orderBy: { order: 'asc' },
          include: { _count: { select: { votes: true } } },
        },
      },
    });
  }

  async getPoll(topicId: string, userId?: string) {
    const poll = await this.prisma.forumPoll.findUnique({
      where: { topicId },
      include: {
        options: {
          orderBy: { order: 'asc' },
          include: { _count: { select: { votes: true } } },
        },
      },
    });
    if (!poll) return null;

    let userVotedOptionId: string | null = null;
    if (userId) {
      const vote = await this.prisma.forumPollVote.findFirst({
        where: { userId, option: { pollId: poll.id } },
        select: { optionId: true },
      });
      userVotedOptionId = vote?.optionId ?? null;
    }

    const totalVotes = poll.options.reduce((sum, o) => sum + o._count.votes, 0);
    return {
      ...poll,
      totalVotes,
      options: poll.options.map((o) => ({
        ...o,
        voteCount: o._count.votes,
        percent:
          totalVotes > 0 ? Math.round((o._count.votes / totalVotes) * 100) : 0,
        userVoted: o.id === userVotedOptionId,
      })),
      userVotedOptionId,
    };
  }

  async votePoll(optionId: string, userId: string) {
    const option = await this.prisma.forumPollOption.findUnique({
      where: { id: optionId },
      include: { poll: true },
    });
    if (!option) throw new NotFoundException('Seçenek bulunamadı');
    if (option.poll.endsAt && option.poll.endsAt < new Date()) {
      throw new BadRequestException('Bu anket sona erdi');
    }

    // Önceki oyu kaldır (değiştirme desteği)
    await this.prisma.forumPollVote.deleteMany({
      where: { userId, option: { pollId: option.pollId } },
    });

    await this.prisma.forumPollVote.create({
      data: { optionId, userId },
    });

    return this.getPoll(option.poll.topicId, userId);
  }

  async findTopicsCursor(params: {
    cursor?: string;
    limit?: number;
    categoryId?: string;
    stateId?: string;
    cityId?: string;
    status?: ForumTopicStatus;
    search?: string;
    sort?: ForumTopicSort;
  }) {
    const limit = Math.min(params.limit ?? 20, 50);

    const where = {
      deletedAt: null,
      ...(params.categoryId && { categoryId: params.categoryId }),
      ...(params.stateId && { stateId: params.stateId }),
      ...(params.cityId && { cityId: params.cityId }),
      ...(params.status && { status: params.status }),
      ...(params.search && {
        OR: [
          { title: { contains: params.search, mode: 'insensitive' as const } },
          { body: { contains: params.search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const items = await this.prisma.forumTopic.findMany({
      where,
      take: limit + 1,
      ...(params.cursor && { cursor: { id: params.cursor }, skip: 1 }),
      orderBy: resolveTopicOrderBy(params.sort),
      include: {
        category: true,
        state: true,
        city: true,
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
        _count: { select: { replies: true, interests: true } },
      },
    });

    const hasMore = items.length > limit;
    const data = hasMore ? items.slice(0, limit) : items;
    const nextCursor = hasMore ? data[data.length - 1]?.id : null;

    return { items: data, nextCursor };
  }

  private async enrichRepliesWithVotes(
    replies: Array<{
      id: string;
      _count?: { votes?: number; children?: number };
      children?: Array<{
        id: string;
        _count?: { votes?: number };
        [key: string]: unknown;
      }>;
      [key: string]: unknown;
    }>,
    currentUserId?: string,
  ) {
    const allIds: string[] = [];
    for (const r of replies) {
      allIds.push(r.id);
      for (const c of r.children ?? []) allIds.push(c.id);
    }

    const voteCounts = allIds.length
      ? await this.prisma.forumReplyVote.groupBy({
          by: ['replyId'],
          where: { replyId: { in: allIds } },
          _count: { replyId: true },
        })
      : [];
    const countMap = new Map(
      voteCounts.map((v) => [v.replyId, v._count.replyId]),
    );

    let votedSet = new Set<string>();
    if (currentUserId && allIds.length) {
      const myVotes = await this.prisma.forumReplyVote.findMany({
        where: { userId: currentUserId, replyId: { in: allIds } },
        select: { replyId: true },
      });
      votedSet = new Set(myVotes.map((v) => v.replyId));
    }

    return replies.map((r) => ({
      ...r,
      voteCount: countMap.get(r.id) ?? r._count?.votes ?? 0,
      userVoted: votedSet.has(r.id),
      children: (r.children ?? []).map((c) => ({
        ...c,
        voteCount: countMap.get(c.id) ?? c._count?.votes ?? 0,
        userVoted: votedSet.has(c.id),
      })),
    }));
  }

  async findTopic(id: string, currentUserId?: string) {
    const topic = await this.prisma.forumTopic.findFirst({
      where: { id, deletedAt: null },
      include: {
        category: true,
        state: true,
        city: true,
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
        replies: {
          where: { deletedAt: null, parentId: null },
          orderBy: [{ isBest: 'desc' }, { createdAt: 'asc' }],
          include: topReplyInclude,
        },
        _count: { select: { interests: true, replies: true } },
      },
    });

    if (!topic) throw new NotFoundException('Konu bulunamadı');

    await this.prisma.forumTopic.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });

    let userInterested = false;
    if (currentUserId) {
      const interest = await this.prisma.forumTopicInterest.findUnique({
        where: { topicId_userId: { topicId: id, userId: currentUserId } },
      });
      userInterested = !!interest;
    }

    const enrichedReplies = await this.enrichRepliesWithVotes(
      topic.replies,
      currentUserId,
    );

    return { ...topic, replies: enrichedReplies, userInterested };
  }

  async toggleInterest(topicId: string, userId: string) {
    const existing = await this.prisma.forumTopicInterest.findUnique({
      where: { topicId_userId: { topicId, userId } },
    });

    if (existing) {
      await this.prisma.forumTopicInterest.delete({
        where: { id: existing.id },
      });
      const count = await this.prisma.forumTopicInterest.count({
        where: { topicId },
      });
      return { interested: false, count };
    }

    await this.prisma.forumTopicInterest.create({ data: { topicId, userId } });
    const count = await this.prisma.forumTopicInterest.count({
      where: { topicId },
    });
    return { interested: true, count };
  }

  async createTopic(userId: string, dto: CreateTopicDto) {
    if (this.moderation.isSpam(dto.title) || this.moderation.isSpam(dto.body)) {
      throw new BadRequestException('İçerik spam olarak algılandı');
    }
    const sanitizedTitle = this.moderation.sanitize(dto.title);
    const sanitizedBody = this.moderation.sanitize(dto.body);

    const topic = await this.prisma.forumTopic.create({
      data: {
        userId,
        categoryId: dto.categoryId,
        title: sanitizedTitle,
        body: sanitizedBody,
        stateId: dto.stateId,
        cityId: dto.cityId,
        isAnonymous: dto.isAnonymous ?? false,
      },
      include: { category: true, state: true, city: true },
    });

    void this.gamification.award(
      userId,
      'FORUM_TOPIC_CREATED',
      topic.id,
      'ForumTopic',
    );

    return topic;
  }

  private extractMentions(body: string): string[] {
    const matches =
      body.match(/@([\p{L}\p{N}_.-]+(?:\s[\p{L}\p{N}_.-]+)*)/gu) ?? [];
    return [...new Set(matches.map((m) => m.slice(1).trim()))];
  }

  private async notifyMentions(
    body: string,
    replierId: string,
    topicId: string,
    topicTitle: string,
  ) {
    const names = this.extractMentions(body);
    if (!names.length) return;

    for (const name of names) {
      const profile = await this.prisma.profile.findFirst({
        where: { displayName: { equals: name, mode: 'insensitive' } },
        select: { userId: true, displayName: true },
      });
      if (!profile || profile.userId === replierId) continue;

      const notif = await this.notifications.create({
        userId: profile.userId,
        title: 'Bir yorumda etiketlendiniz',
        body: `"${topicTitle}" konusunda @${profile.displayName} olarak etiketlendiniz.`,
        link: `/forum/${topicId}`,
      });
      this.notifGateway.pushToUser(profile.userId, notif);
    }
  }

  async createReply(topicId: string, userId: string, dto: CreateReplyDto) {
    const topic = await this.prisma.forumTopic.findFirst({
      where: { id: topicId, deletedAt: null },
    });
    if (!topic) throw new NotFoundException('Konu bulunamadı');

    if (dto.parentId) {
      const parent = await this.prisma.forumReply.findFirst({
        where: { id: dto.parentId, topicId, deletedAt: null },
      });
      if (!parent) throw new BadRequestException('Üst cevap bulunamadı');
      if (parent.parentId) {
        throw new BadRequestException('Yalnızca 1 seviye yanıt desteklenir');
      }
    }

    const sanitizedBody = this.moderation.sanitize(dto.body);
    if (this.moderation.isSpam(dto.body)) {
      throw new BadRequestException('İçerik spam olarak algılandı');
    }

    const reply = await this.prisma.forumReply.create({
      data: {
        topicId,
        userId,
        body: sanitizedBody,
        parentId: dto.parentId ?? null,
      },
      include: {
        user: { select: replyUserSelect },
        _count: { select: { votes: true, children: true } },
        children: { where: { deletedAt: null }, include: childReplyInclude },
      },
    });

    if (topic.status === ForumTopicStatus.OPEN) {
      await this.prisma.forumTopic.update({
        where: { id: topicId },
        data: { status: ForumTopicStatus.ANSWERED },
      });
    }

    if (topic.userId !== userId) {
      const notif = await this.notifications.create({
        userId: topic.userId,
        title: 'Sorunuza yeni cevap',
        body: `"${topic.title}" konunuza yeni bir cevap geldi.`,
        link: `/forum/${topicId}`,
      });
      this.notifGateway.pushToUser(topic.userId, notif);
    }

    await this.notifyMentions(dto.body, userId, topicId, topic.title);
    void this.gamification.award(
      userId,
      'FORUM_REPLY_CREATED',
      reply.id,
      'ForumReply',
    );

    return {
      ...reply,
      voteCount: 0,
      userVoted: false,
      children: reply.children.map((c) => ({
        ...c,
        voteCount: 0,
        userVoted: false,
      })),
    };
  }

  async toggleReplyVote(replyId: string, userId: string) {
    const reply = await this.prisma.forumReply.findFirst({
      where: { id: replyId, deletedAt: null },
    });
    if (!reply) throw new NotFoundException('Cevap bulunamadı');

    const existing = await this.prisma.forumReplyVote.findUnique({
      where: { replyId_userId: { replyId, userId } },
    });

    if (existing) {
      await this.prisma.forumReplyVote.delete({ where: { id: existing.id } });
    } else {
      await this.prisma.forumReplyVote.create({ data: { replyId, userId } });
    }

    const count = await this.prisma.forumReplyVote.count({
      where: { replyId },
    });
    return { voted: !existing, count };
  }

  async updateTopic(topicId: string, userId: string, dto: UpdateTopicDto) {
    const topic = await this.prisma.forumTopic.findFirst({
      where: { id: topicId, deletedAt: null },
    });
    if (!topic) throw new NotFoundException('Konu bulunamadı');

    const requester = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    const isOwner = topic.userId === userId;
    const isAdmin =
      requester?.role === 'ADMIN' || requester?.role === 'MODERATOR';

    if (!isOwner && !isAdmin)
      throw new ForbiddenException('Bu konuyu düzenleme yetkiniz yok');

    if (
      (dto.title && this.moderation.isSpam(dto.title)) ||
      (dto.body && this.moderation.isSpam(dto.body))
    ) {
      throw new BadRequestException('İçerik spam olarak algılandı');
    }

    return this.prisma.forumTopic.update({
      where: { id: topicId },
      data: {
        ...(dto.title && { title: this.moderation.sanitize(dto.title) }),
        ...(dto.body && { body: this.moderation.sanitize(dto.body) }),
      },
      include: { category: true, state: true, city: true },
    });
  }

  async deleteTopic(topicId: string, userId: string) {
    const topic = await this.prisma.forumTopic.findFirst({
      where: { id: topicId, deletedAt: null },
    });
    if (!topic) throw new NotFoundException('Konu bulunamadı');

    const requester = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    const isOwner = topic.userId === userId;
    const isAdmin =
      requester?.role === 'ADMIN' || requester?.role === 'MODERATOR';

    if (!isOwner && !isAdmin)
      throw new ForbiddenException('Bu konuyu silme yetkiniz yok');

    return this.prisma.forumTopic.update({
      where: { id: topicId },
      data: { deletedAt: new Date() },
    });
  }

  async updateReply(replyId: string, userId: string, dto: UpdateReplyDto) {
    const reply = await this.prisma.forumReply.findFirst({
      where: { id: replyId, deletedAt: null },
    });
    if (!reply) throw new NotFoundException('Cevap bulunamadı');

    const requester = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    const isOwner = reply.userId === userId;
    const isAdmin =
      requester?.role === 'ADMIN' || requester?.role === 'MODERATOR';

    if (!isOwner && !isAdmin)
      throw new ForbiddenException('Bu cevabı düzenleme yetkiniz yok');

    if (this.moderation.isSpam(dto.body)) {
      throw new BadRequestException('İçerik spam olarak algılandı');
    }

    return this.prisma.forumReply.update({
      where: { id: replyId },
      data: { body: this.moderation.sanitize(dto.body) },
      include: {
        user: { select: replyUserSelect },
        _count: { select: { votes: true, children: true } },
        children: { where: { deletedAt: null }, include: childReplyInclude },
      },
    });
  }

  async deleteReply(replyId: string, userId: string) {
    const reply = await this.prisma.forumReply.findFirst({
      where: { id: replyId, deletedAt: null },
    });
    if (!reply) throw new NotFoundException('Cevap bulunamadı');

    const requester = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    const isOwner = reply.userId === userId;
    const isAdmin =
      requester?.role === 'ADMIN' || requester?.role === 'MODERATOR';

    if (!isOwner && !isAdmin)
      throw new ForbiddenException('Bu cevabı silme yetkiniz yok');

    return this.prisma.forumReply.update({
      where: { id: replyId },
      data: { deletedAt: new Date() },
    });
  }

  async markSolved(topicId: string, userId: string, replyId: string) {
    const topic = await this.prisma.forumTopic.findFirst({
      where: { id: topicId, userId, deletedAt: null },
    });
    if (!topic) throw new NotFoundException();

    // Yanıt bu konuya ait ve silinmemiş olmalı
    const reply = await this.prisma.forumReply.findFirst({
      where: { id: replyId, topicId, deletedAt: null },
      select: { id: true },
    });
    if (!reply) throw new NotFoundException('Cevap bulunamadı');

    await this.prisma.forumReply.updateMany({
      where: { topicId },
      data: { isBest: false },
    });
    const bestReply = await this.prisma.forumReply.update({
      where: { id: replyId },
      data: { isBest: true },
    });
    void this.gamification.award(
      bestReply.userId,
      'FORUM_REPLY_MARKED_BEST',
      replyId,
      'ForumReply',
    );

    return this.prisma.forumTopic.update({
      where: { id: topicId },
      data: {
        status: ForumTopicStatus.SOLVED,
        solvedReplyId: replyId,
      },
    });
  }
}
