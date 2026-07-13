import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import {
  BusinessStatus,
  ChatBannedWordSeverity,
  ChatType,
  CourierAcceptanceStatus,
  CourierStatus,
  EventStatus,
  JobStatus,
  MembershipPlan,
  PostalCountry,
  PromoDiscountType,
  ReportStatus,
  ReportTargetType,
  ReviewStatus,
  SupportTicketStatus,
  UserRole,
  UserStatus,
} from '@prisma/client';
import {
  RESTRICTABLE_PAGES,
  resolveAllowedPages,
  sanitizePageKeys,
} from '../common/page-permissions';
import { ChatModerationService } from '../chat/chat-moderation.service';
import { DEFAULT_BANNED_WORDS } from '../chat/default-banned-words';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from './audit-log.service';
import {
  AdminCreateBusinessDto,
  AdminCreateUserDto,
  AdminUpdateBusinessDto,
  AdminUpdateEventDto,
  AdminUpdateForumReplyDto,
  AdminUpdateForumTopicDto,
  AdminUpdateJobDto,
  AdminUpdateReviewDto,
} from './dto/admin.dto';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private chatModeration: ChatModerationService,
    private auditLog: AuditLogService,
  ) {}

  getDashboard() {
    return Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.forumTopic.count({ where: { deletedAt: null } }),
      this.prisma.event.count({ where: { deletedAt: null } }),
      this.prisma.business.count({ where: { deletedAt: null } }),
      this.prisma.report.count({ where: { status: ReportStatus.PENDING } }),
      this.prisma.event.count({ where: { status: EventStatus.PENDING_APPROVAL } }),
      this.prisma.business.count({ where: { status: BusinessStatus.PENDING } }),
      this.prisma.jobPosting.count({ where: { status: JobStatus.PENDING } }),
      this.getMembershipRevenue(),
    ]).then(
      ([
        users,
        topics,
        events,
        businesses,
        pendingReports,
        pendingEvents,
        pendingBusinesses,
        pendingJobs,
        membershipRevenue,
      ]) => ({
        users,
        topics,
        events,
        businesses,
        pendingReports,
        pendingEvents,
        pendingBusinesses,
        pendingJobs,
        membershipRevenue,
      }),
    );
  }

  private async getMembershipRevenue() {
    const settings = await this.prisma.siteSettings.findUnique({
      where: { id: 'default' },
      select: {
        userMembershipPriceEur: true,
        businessMembershipPriceEur: true,
      },
    });
    const userPrice = settings?.userMembershipPriceEur ?? 10;
    const businessPrice = settings?.businessMembershipPriceEur ?? 50;

    const subs = await this.prisma.subscription.findMany({
      where: {
        plan: { in: [MembershipPlan.USER_YEARLY, MembershipPlan.BUSINESS_YEARLY] },
      },
      select: {
        plan: true,
        promoCodeId: true,
        promoCode: { select: { discountType: true, discountPercent: true } },
      },
    });

    let userRevenueEur = 0;
    let businessRevenueEur = 0;
    let userPaidCount = 0;
    let businessPaidCount = 0;

    for (const sub of subs) {
      const listPrice =
        sub.plan === MembershipPlan.USER_YEARLY ? userPrice : businessPrice;
      const amount = this.subscriptionRevenueEur(sub, listPrice);
      if (amount <= 0) continue;

      if (sub.plan === MembershipPlan.USER_YEARLY) {
        userRevenueEur += amount;
        userPaidCount += 1;
      } else {
        businessRevenueEur += amount;
        businessPaidCount += 1;
      }
    }

    return {
      userRevenueEur,
      businessRevenueEur,
      totalRevenueEur: userRevenueEur + businessRevenueEur,
      userPaidCount,
      businessPaidCount,
      userPriceEur: userPrice,
      businessPriceEur: businessPrice,
    };
  }

  private subscriptionRevenueEur(
    sub: {
      promoCodeId: string | null;
      promoCode: {
        discountType: PromoDiscountType;
        discountPercent: number | null;
      } | null;
    },
    listPrice: number,
  ): number {
    if (!sub.promoCodeId) return listPrice;

    const promo = sub.promoCode;
    if (!promo || promo.discountType === PromoDiscountType.FREE) return 0;
    if (promo.discountType === PromoDiscountType.PERCENT && promo.discountPercent) {
      return Math.round(listPrice * (1 - promo.discountPercent / 100));
    }

    return listPrice;
  }

  // ─── Kullanıcı yönetimi ──────────────────────────────────────────────────

  async listUsers(params: {
    page?: number;
    search?: string;
    status?: string;
    role?: string;
    postalCountry?: string;
  }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { deletedAt: null };
    if (params.status) where.status = params.status;
    if (params.role) where.role = params.role;
    if (params.postalCountry === PostalCountry.DE || params.postalCountry === PostalCountry.TR) {
      where.profile = { postalCountry: params.postalCountry };
    }
    if (params.search) {
      where.OR = [
        { email: { contains: params.search, mode: 'insensitive' } },
        { profile: { displayName: { contains: params.search, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          createdAt: true,
          bannedUntil: true,
          referralCode: true,
          profile: {
            select: {
              displayName: true,
              avatarUrl: true,
              postalCode: true,
              postalCountry: true,
              allowedPages: true,
            },
          },
          referredBy: {
            select: {
              id: true,
              email: true,
              referralCode: true,
              profile: { select: { displayName: true } },
            },
          },
          _count: { select: { forumTopics: true, forumReplies: true, referrals: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async listBannedUsers(params: { page?: number; search?: string }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      deletedAt: null,
      status: { in: [UserStatus.SUSPENDED, UserStatus.BANNED] },
    };
    if (params.search) {
      where.OR = [
        { email: { contains: params.search, mode: 'insensitive' } },
        { profile: { displayName: { contains: params.search, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          createdAt: true,
          bannedUntil: true,
          profile: { select: { displayName: true, avatarUrl: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async listBlocks(params: { page?: number; search?: string }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (params.search) {
      where.OR = [
        { blocker: { email: { contains: params.search, mode: 'insensitive' } } },
        { blocker: { profile: { displayName: { contains: params.search, mode: 'insensitive' } } } },
        { blocked: { email: { contains: params.search, mode: 'insensitive' } } },
        { blocked: { profile: { displayName: { contains: params.search, mode: 'insensitive' } } } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.block.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          blocker: {
            select: {
              id: true,
              email: true,
              profile: { select: { displayName: true } },
            },
          },
          blocked: {
            select: {
              id: true,
              email: true,
              profile: { select: { displayName: true } },
            },
          },
        },
      }),
      this.prisma.block.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async removeBlock(id: string) {
    const block = await this.prisma.block.findUnique({ where: { id } });
    if (!block) throw new NotFoundException('Engel kaydı bulunamadı');
    return this.prisma.block.delete({ where: { id } });
  }

  getUser(id: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        bannedUntil: true,
        profile: {
          select: {
            displayName: true,
            avatarUrl: true,
            bio: true,
            occupation: true,
            state: { select: { name: true } },
            city: { select: { name: true } },
          },
        },
        _count: { select: { forumTopics: true, forumReplies: true } },
      },
    });
  }

  // Zamanlı ban veya kalıcı askıya al
  async banUser(id: string, until?: Date, actorId?: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (user?.role === UserRole.ADMIN) {
      throw new NotFoundException('Admin hesabı banlanamaz');
    }
    const result = await this.prisma.user.update({
      where: { id },
      data: {
        status: UserStatus.SUSPENDED,
        bannedUntil: until ?? null,
      },
    });
    await this.auditLog.log({
      userId: actorId,
      action: 'user.ban',
      entityType: 'User',
      entityId: id,
      metadata: { until: until?.toISOString() ?? null },
    });
    return result;
  }

  // Banı kaldır
  async unbanUser(id: string, actorId?: string) {
    const result = await this.prisma.user.update({
      where: { id },
      data: { status: UserStatus.ACTIVE, bannedUntil: null },
    });
    await this.auditLog.log({
      userId: actorId,
      action: 'user.unban',
      entityType: 'User',
      entityId: id,
    });
    return result;
  }

  // Rol değiştir (ADMIN, MODERATOR, USER)
  async changeUserRole(id: string, role: UserRole, actorId?: string) {
    const result = await this.prisma.user.update({
      where: { id },
      data: { role },
    });
    await this.auditLog.log({
      userId: actorId,
      action: 'user.role_change',
      entityType: 'User',
      entityId: id,
      metadata: { newRole: role },
    });
    return result;
  }

  // Kullanıcı sil (soft delete)
  async deleteUser(id: string, actorId?: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (user?.role === UserRole.ADMIN) {
      throw new NotFoundException('Admin hesabı silinemez');
    }
    const result = await this.prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        email: `deleted_${id}@anonymized.local`,
        status: 'BANNED',
        bannedUntil: null,
        profile: {
          update: { displayName: 'Silinmiş Kullanıcı', bio: null, avatarUrl: null },
        },
      },
    });
    await this.auditLog.log({
      userId: actorId,
      action: 'user.delete',
      entityType: 'User',
      entityId: id,
    });
    return result;
  }

  async createUser(dto: AdminCreateUserDto) {
    const passwordHash = await bcrypt.hash(dto.password, 10);
    return this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        role: dto.role ?? UserRole.USER,
        emailVerified: true,
        gdprConsentAt: new Date(),
        profile: { create: { displayName: dto.displayName } },
      },
      select: {
        id: true,
        email: true,
        role: true,
        profile: { select: { displayName: true } },
      },
    });
  }

  // ─── Forum ───────────────────────────────────────────────────────────────

  async listForumTopics(params: { page?: number; search?: string }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = 20;
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = { deletedAt: null };
    if (params.search) {
      where.OR = [
        { title: { contains: params.search, mode: 'insensitive' } },
        { body: { contains: params.search, mode: 'insensitive' } },
      ];
    }
    const [items, total] = await Promise.all([
      this.prisma.forumTopic.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { email: true, profile: { select: { displayName: true } } } },
          category: { select: { name: true } },
          _count: { select: { replies: true } },
        },
      }),
      this.prisma.forumTopic.count({ where }),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  getForumTopic(id: string) {
    return this.prisma.forumTopic.findFirstOrThrow({
      where: { id, deletedAt: null },
      include: {
        user: { select: { email: true, profile: { select: { displayName: true } } } },
        category: { select: { name: true } },
        replies: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'asc' },
          include: {
            user: { select: { email: true, profile: { select: { displayName: true } } } },
          },
        },
      },
    });
  }

  updateForumTopic(id: string, dto: AdminUpdateForumTopicDto) {
    return this.prisma.forumTopic.update({
      where: { id },
      data: {
        ...(dto.title && { title: dto.title }),
        ...(dto.body && { body: dto.body }),
        ...(dto.status && { status: dto.status as never }),
      },
    });
  }

  async deleteForumTopic(id: string, actorId?: string) {
    const result = await this.prisma.forumTopic.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    await this.auditLog.log({
      userId: actorId,
      action: 'forum_topic.delete',
      entityType: 'ForumTopic',
      entityId: id,
    });
    return result;
  }

  updateForumReply(id: string, dto: AdminUpdateForumReplyDto) {
    return this.prisma.forumReply.update({
      where: { id },
      data: { ...(dto.body && { body: dto.body }) },
    });
  }

  async deleteForumReply(id: string, actorId?: string) {
    const result = await this.prisma.forumReply.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    await this.auditLog.log({
      userId: actorId,
      action: 'forum_reply.delete',
      entityType: 'ForumReply',
      entityId: id,
    });
    return result;
  }

  // ─── Etkinlikler ─────────────────────────────────────────────────────────

  async listEvents(params: { page?: number; filter?: string; search?: string }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = 20;
    const skip = (page - 1) * limit;
    const now = new Date();
    const where: Record<string, unknown> = { deletedAt: null };
    const andConditions: Record<string, unknown>[] = [];

    if (params.filter === 'pending') {
      where.status = EventStatus.PENDING_APPROVAL;
    } else if (params.filter === 'completed') {
      andConditions.push({
        OR: [
          { status: EventStatus.COMPLETED },
          { status: EventStatus.PUBLISHED, endsAt: { lt: now } },
          { status: EventStatus.PUBLISHED, endsAt: null, startsAt: { lt: now } },
        ],
      });
    }

    if (params.search) {
      andConditions.push({
        OR: [
          { title: { contains: params.search, mode: 'insensitive' } },
          { location: { contains: params.search, mode: 'insensitive' } },
        ],
      });
    }

    if (andConditions.length) where.AND = andConditions;

    const [items, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startsAt: 'desc' },
        include: {
          organizer: { select: { email: true, profile: { select: { displayName: true } } } },
          city: true,
          state: true,
          _count: { select: { attendees: true } },
        },
      }),
      this.prisma.event.count({ where }),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  updateEvent(id: string, dto: AdminUpdateEventDto) {
    return this.prisma.event.update({
      where: { id },
      data: {
        ...(dto.title && { title: dto.title }),
        ...(dto.description && { description: dto.description }),
        ...(dto.location && { location: dto.location }),
        ...(dto.status && { status: dto.status as never }),
      },
    });
  }

  async deleteEvent(id: string, actorId?: string) {
    const result = await this.prisma.event.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    await this.auditLog.log({
      userId: actorId,
      action: 'event.delete',
      entityType: 'Event',
      entityId: id,
    });
    return result;
  }

  // ─── İşletmeler ──────────────────────────────────────────────────────────

  async listBusinesses(params: { page?: number; search?: string; status?: string }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = 20;
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = { deletedAt: null };
    if (params.status) where.status = params.status;
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { description: { contains: params.search, mode: 'insensitive' } },
      ];
    }
    const [items, total] = await Promise.all([
      this.prisma.business.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          category: true,
          city: true,
          state: true,
          owner: {
            select: {
              id: true,
              email: true,
              createdAt: true,
              profile: { select: { displayName: true } },
              subscription: {
                select: { plan: true, startsAt: true, expiresAt: true, status: true },
              },
            },
          },
        },
      }),
      this.prisma.business.count({ where }),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  createBusiness(dto: AdminCreateBusinessDto) {
    return this.prisma.business.create({
      data: {
        ...dto,
        status: BusinessStatus.ACTIVE,
        languages: [],
      },
      include: { category: true, city: true, state: true, owner: true },
    });
  }

  updateBusiness(id: string, dto: AdminUpdateBusinessDto) {
    return this.prisma.business.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.description && { description: dto.description }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.whatsapp !== undefined && { whatsapp: dto.whatsapp }),
        ...(dto.website !== undefined && { website: dto.website }),
        ...(dto.status && { status: dto.status as never }),
        ...(dto.isVerified !== undefined && { isVerified: dto.isVerified }),
      },
      include: { category: true, city: true, owner: true },
    });
  }

  async deleteBusiness(id: string, actorId?: string) {
    const result = await this.prisma.business.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    await this.auditLog.log({
      userId: actorId,
      action: 'business.delete',
      entityType: 'Business',
      entityId: id,
    });
    return result;
  }

  async listBusinessReviews(params: { page?: number; status?: string }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = 20;
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = { deletedAt: null };
    if (params.status === 'pending') where.status = ReviewStatus.PENDING;
    else if (params.status === 'approved') where.status = ReviewStatus.APPROVED;

    const [items, total] = await Promise.all([
      this.prisma.businessReview.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          business: { select: { id: true, name: true } },
          user: { select: { email: true, profile: { select: { displayName: true } } } },
        },
      }),
      this.prisma.businessReview.count({ where }),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async updateBusinessReview(id: string, dto: AdminUpdateReviewDto) {
    const review = await this.prisma.businessReview.update({
      where: { id },
      data: {
        ...(dto.rating !== undefined && { rating: dto.rating }),
        ...(dto.comment !== undefined && { comment: dto.comment }),
      },
    });
    await this.recalculateBusinessReviewStats(review.businessId);
    return review;
  }

  async deleteBusinessReview(id: string, actorId?: string) {
    const review = await this.prisma.businessReview.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    await this.recalculateBusinessReviewStats(review.businessId);
    await this.auditLog.log({
      userId: actorId,
      action: 'business_review.delete',
      entityType: 'BusinessReview',
      entityId: id,
    });
    return review;
  }

  async approveBusinessReview(id: string) {
    const review = await this.prisma.businessReview.update({
      where: { id },
      data: { status: ReviewStatus.APPROVED },
    });
    await this.recalculateBusinessReviewStats(review.businessId);
    return review;
  }

  async rejectBusinessReview(id: string) {
    const review = await this.prisma.businessReview.update({
      where: { id },
      data: { status: ReviewStatus.REJECTED },
    });
    await this.recalculateBusinessReviewStats(review.businessId);
    return review;
  }

  private async recalculateBusinessReviewStats(businessId: string) {
    const stats = await this.prisma.businessReview.aggregate({
      where: { businessId, deletedAt: null, status: ReviewStatus.APPROVED },
      _avg: { rating: true },
      _count: true,
    });
    await this.prisma.business.update({
      where: { id: businessId },
      data: {
        averageRating: stats._avg.rating ?? 0,
        reviewCount: stats._count,
      },
    });
  }

  getBusinessCategories() {
    return this.prisma.businessCategory.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  // ─── Bekleyen içerik ─────────────────────────────────────────────────────

  async listJobs(params: { page?: number; search?: string; status?: string }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = 20;
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = { deletedAt: null };
    if (params.status) where.status = params.status;
    if (params.search?.trim()) {
      const q = params.search.trim();
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { company: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.jobPosting.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          city: true,
          state: true,
          owner: {
            select: {
              id: true,
              email: true,
              profile: { select: { displayName: true } },
            },
          },
        },
      }),
      this.prisma.jobPosting.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  getPendingJobs() {
    return this.prisma.jobPosting.findMany({
      where: { status: JobStatus.PENDING, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        owner: { select: { email: true, profile: { select: { displayName: true } } } },
        city: true,
      },
    });
  }

  async approveJob(id: string, actorId?: string) {
    const result = await this.prisma.jobPosting.update({
      where: { id },
      data: { status: JobStatus.PUBLISHED },
    });
    await this.auditLog.log({
      userId: actorId,
      action: 'job.approve',
      entityType: 'JobPosting',
      entityId: id,
    });
    return result;
  }

  async rejectJob(id: string, actorId?: string) {
    const result = await this.prisma.jobPosting.update({
      where: { id },
      data: { status: JobStatus.REJECTED },
    });
    await this.auditLog.log({
      userId: actorId,
      action: 'job.reject',
      entityType: 'JobPosting',
      entityId: id,
    });
    return result;
  }

  async updateJob(id: string, dto: AdminUpdateJobDto) {
    const job = await this.prisma.jobPosting.findFirst({ where: { id, deletedAt: null } });
    if (!job) throw new NotFoundException('İlan bulunamadı');
    return this.prisma.jobPosting.update({
      where: { id },
      data: {
        ...(dto.company !== undefined && { company: dto.company }),
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.jobType !== undefined && { jobType: dto.jobType }),
        ...(dto.workMode !== undefined && { workMode: dto.workMode }),
        ...(dto.stateId !== undefined && { stateId: dto.stateId || null }),
        ...(dto.cityId !== undefined && { cityId: dto.cityId || null }),
        ...(dto.salaryRange !== undefined && { salaryRange: dto.salaryRange || null }),
        ...(dto.turkishFriendly !== undefined && { turkishFriendly: dto.turkishFriendly }),
        ...(dto.germanLevel !== undefined && { germanLevel: dto.germanLevel || null }),
        ...(dto.contactMethod !== undefined && { contactMethod: dto.contactMethod }),
        ...(dto.contactValue !== undefined && { contactValue: dto.contactValue || null }),
        ...(dto.status !== undefined && { status: dto.status }),
      },
      include: { city: true, state: true, owner: { select: { email: true, profile: { select: { displayName: true } } } } },
    });
  }

  async deleteJob(id: string, actorId?: string) {
    const result = await this.prisma.jobPosting.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    await this.auditLog.log({
      userId: actorId,
      action: 'job.delete',
      entityType: 'JobPosting',
      entityId: id,
    });
    return result;
  }

  getPendingReports() {
    return this.listReports({ status: ReportStatus.PENDING, limit: 100 }).then((r) => r.items);
  }

  async listReports(params: { page?: number; status?: string; limit?: number }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(params.limit ?? 20, 100);
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = {};
    if (params.status) where.status = params.status;

    const [items, total] = await Promise.all([
      this.prisma.report.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          reporter: {
            select: {
              id: true,
              email: true,
              profile: { select: { displayName: true } },
            },
          },
        },
      }),
      this.prisma.report.count({ where }),
    ]);

    const enriched = await Promise.all(
      items.map(async (r) => {
        const target = await this.resolveReportTarget(r.targetType, r.targetId);
        return { ...r, targetLabel: target.label, reportedUserId: target.userId, reportedUserName: target.userName };
      }),
    );

    return { items: enriched, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getReportStats() {
    const reports = await this.prisma.report.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        reporter: {
          select: {
            id: true,
            email: true,
            profile: { select: { displayName: true } },
          },
        },
      },
    });

    type TargetKey = string;
    const targetMap = new Map<
      TargetKey,
      { targetType: ReportTargetType; targetId: string; total: number; pending: number }
    >();
    const relMap = new Map<
      string,
      {
        reporterId: string;
        reporterName: string;
        targetType: ReportTargetType;
        targetId: string;
        count: number;
        lastAt: Date;
      }
    >();

    for (const r of reports) {
      const tKey = `${r.targetType}:${r.targetId}`;
      const t = targetMap.get(tKey) ?? {
        targetType: r.targetType,
        targetId: r.targetId,
        total: 0,
        pending: 0,
      };
      t.total += 1;
      if (r.status === ReportStatus.PENDING) t.pending += 1;
      targetMap.set(tKey, t);

      const rKey = `${r.reporterId}:${tKey}`;
      const rel = relMap.get(rKey) ?? {
        reporterId: r.reporterId,
        reporterName: r.reporter.profile?.displayName ?? r.reporter.email,
        targetType: r.targetType,
        targetId: r.targetId,
        count: 0,
        lastAt: r.createdAt,
      };
      rel.count += 1;
      if (r.createdAt > rel.lastAt) rel.lastAt = r.createdAt;
      relMap.set(rKey, rel);
    }

    const byTarget = await Promise.all(
      [...targetMap.values()]
        .sort((a, b) => b.total - a.total || b.pending - a.pending)
        .map(async (t) => {
          const resolved = await this.resolveReportTarget(t.targetType, t.targetId);
          const complaintScore = Math.min(100, t.pending * 15 + t.total * 5);
          return {
            targetType: t.targetType,
            targetId: t.targetId,
            targetLabel: resolved.label,
            reportedUserId: resolved.userId,
            reportedUserName: resolved.userName,
            totalReports: t.total,
            pendingReports: t.pending,
            complaintScore,
          };
        }),
    );

    const relationships = await Promise.all(
      [...relMap.values()]
        .sort((a, b) => b.count - a.count || b.lastAt.getTime() - a.lastAt.getTime())
        .map(async (rel) => {
          const resolved = await this.resolveReportTarget(rel.targetType, rel.targetId);
          return {
            reporterId: rel.reporterId,
            reporterName: rel.reporterName,
            targetType: rel.targetType,
            targetId: rel.targetId,
            targetLabel: resolved.label,
            reportedUserId: resolved.userId,
            reportedUserName: resolved.userName,
            reportCount: rel.count,
            lastReportedAt: rel.lastAt,
          };
        }),
    );

    return { byTarget, relationships, totalReports: reports.length };
  }

  private async resolveReportTarget(
    targetType: ReportTargetType,
    targetId: string,
  ): Promise<{ label: string; userId?: string; userName?: string }> {
    const userSelect = {
      select: {
        id: true,
        email: true,
        profile: { select: { displayName: true } },
      },
    };

    const nameOf = (u?: { id: string; email: string; profile?: { displayName: string } | null } | null) =>
      u?.profile?.displayName ?? u?.email ?? undefined;

    switch (targetType) {
      case ReportTargetType.USER: {
        const u = await this.prisma.user.findUnique({ where: { id: targetId }, ...userSelect });
        return { label: nameOf(u) ?? targetId, userId: u?.id, userName: nameOf(u) };
      }
      case ReportTargetType.FORUM_TOPIC: {
        const t = await this.prisma.forumTopic.findUnique({
          where: { id: targetId },
          select: { title: true, user: userSelect },
        });
        return {
          label: t?.title ?? targetId,
          userId: t?.user?.id,
          userName: nameOf(t?.user),
        };
      }
      case ReportTargetType.FORUM_REPLY: {
        const r = await this.prisma.forumReply.findUnique({
          where: { id: targetId },
          select: { body: true, user: userSelect },
        });
        const snippet = r?.body?.slice(0, 60) ?? targetId;
        return {
          label: snippet + (r?.body && r.body.length > 60 ? '…' : ''),
          userId: r?.user?.id,
          userName: nameOf(r?.user),
        };
      }
      case ReportTargetType.EVENT: {
        const e = await this.prisma.event.findUnique({
          where: { id: targetId },
          select: { title: true, organizer: userSelect },
        });
        return {
          label: e?.title ?? targetId,
          userId: e?.organizer?.id,
          userName: nameOf(e?.organizer),
        };
      }
      case ReportTargetType.BUSINESS: {
        const b = await this.prisma.business.findUnique({
          where: { id: targetId },
          select: { name: true, owner: userSelect },
        });
        return {
          label: b?.name ?? targetId,
          userId: b?.owner?.id,
          userName: nameOf(b?.owner),
        };
      }
      case ReportTargetType.BUSINESS_REVIEW: {
        const rv = await this.prisma.businessReview.findUnique({
          where: { id: targetId },
          select: { comment: true, user: userSelect },
        });
        return {
          label: (rv?.comment?.slice(0, 50) ?? 'Yorum') + (rv?.comment && rv.comment.length > 50 ? '…' : ''),
          userId: rv?.user?.id,
          userName: nameOf(rv?.user),
        };
      }
      case ReportTargetType.MESSAGE: {
        const m = await this.prisma.message.findUnique({
          where: { id: targetId },
          select: { body: true, user: userSelect },
        });
        return {
          label: (m?.body?.slice(0, 50) ?? 'Mesaj') + (m?.body && m.body.length > 50 ? '…' : ''),
          userId: m?.user?.id,
          userName: nameOf(m?.user),
        };
      }
      case ReportTargetType.JOB_POSTING: {
        const j = await this.prisma.jobPosting.findUnique({
          where: { id: targetId },
          select: { title: true, owner: userSelect },
        });
        return {
          label: j?.title ?? targetId,
          userId: j?.owner?.id,
          userName: nameOf(j?.owner),
        };
      }
      case ReportTargetType.COURIER_REQUEST: {
        const c = await this.prisma.courierRequest.findUnique({
          where: { id: targetId },
          select: { itemName: true, owner: userSelect },
        });
        return {
          label: c?.itemName ?? targetId,
          userId: c?.owner?.id,
          userName: nameOf(c?.owner),
        };
      }
      default:
        return { label: targetId };
    }
  }

  getPendingEvents() {
    return this.prisma.event.findMany({
      where: { status: EventStatus.PENDING_APPROVAL, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        organizer: { select: { email: true, profile: { select: { displayName: true } } } },
        city: true,
        state: true,
      },
    });
  }

  getPendingBusinesses() {
    return this.prisma.business.findMany({
      where: { status: BusinessStatus.PENDING, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        owner: { select: { email: true, profile: { select: { displayName: true } } } },
        category: true,
        city: true,
      },
    });
  }

  async resolveReport(id: string, status: ReportStatus, moderatorId: string) {
    const result = await this.prisma.report.update({
      where: { id },
      data: { status, moderatorId, resolvedAt: new Date() },
    });
    await this.auditLog.log({
      userId: moderatorId,
      action: 'report.resolve',
      entityType: 'Report',
      entityId: id,
      metadata: { status },
    });
    return result;
  }

  async approveEvent(id: string, actorId?: string) {
    const event = await this.prisma.event.findUnique({ where: { id } });
    if (!event) throw new Error('Etkinlik bulunamadı');

    const updated = await this.prisma.event.update({
      where: { id },
      data: { status: EventStatus.PUBLISHED },
    });

    await this.prisma.notification.create({
      data: {
        userId: event.organizerId,
        title: 'Etkinliğiniz onaylandı!',
        body: `"${event.title}" etkinliğiniz yayına alındı.`,
        link: `/etkinlikler/${id}`,
      },
    });

    await this.auditLog.log({
      userId: actorId,
      action: 'event.approve',
      entityType: 'Event',
      entityId: id,
    });

    return updated;
  }

  async rejectEvent(id: string, reason?: string, actorId?: string) {
    const event = await this.prisma.event.findUnique({ where: { id } });
    if (!event) throw new Error('Etkinlik bulunamadı');

    const updated = await this.prisma.event.update({
      where: { id },
      data: { status: EventStatus.CANCELLED },
    });

    await this.prisma.notification.create({
      data: {
        userId: event.organizerId,
        title: 'Etkinlik onaylanmadı',
        body: reason
          ? `"${event.title}" reddedildi: ${reason}`
          : `"${event.title}" etkinliğiniz admin tarafından onaylanmadı.`,
        link: `/etkinlikler/${id}`,
      },
    });

    await this.auditLog.log({
      userId: actorId,
      action: 'event.reject',
      entityType: 'Event',
      entityId: id,
      metadata: { reason: reason ?? null },
    });

    return updated;
  }

  async approveBusiness(id: string, actorId?: string) {
    const result = await this.prisma.business.update({
      where: { id },
      data: { status: BusinessStatus.ACTIVE },
    });
    await this.auditLog.log({
      userId: actorId,
      action: 'business.approve',
      entityType: 'Business',
      entityId: id,
    });
    return result;
  }

  async suspendUser(id: string, actorId?: string) {
    const result = await this.prisma.user.update({
      where: { id },
      data: { status: UserStatus.SUSPENDED },
    });
    await this.auditLog.log({
      userId: actorId,
      action: 'user.suspend',
      entityType: 'User',
      entityId: id,
    });
    return result;
  }

  // ─── Seyahat / kurye ─────────────────────────────────────────────────────

  async listCourierRequests(params: { page?: number; search?: string; status?: string }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = 20;
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = { deletedAt: null };
    if (params.status) where.status = params.status;
    if (params.search?.trim()) {
      const q = params.search.trim();
      where.OR = [
        { itemName: { contains: q, mode: 'insensitive' } },
        { fromArea: { contains: q, mode: 'insensitive' } },
        { toArea: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.courierRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          owner: {
            select: {
              id: true,
              email: true,
              profile: { select: { displayName: true } },
            },
          },
          _count: { select: { acceptances: true } },
        },
      }),
      this.prisma.courierRequest.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async deleteCourierRequest(id: string, actorId?: string) {
    const result = await this.prisma.courierRequest.update({
      where: { id },
      data: { deletedAt: new Date(), status: CourierStatus.CANCELLED },
    });
    await this.auditLog.log({
      userId: actorId,
      action: 'courier_request.delete',
      entityType: 'CourierRequest',
      entityId: id,
    });
    return result;
  }

  async listCourierCarryRelations(params: {
    page?: number;
    search?: string;
    phase?: string;
  }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = 20;
    const skip = (page - 1) * limit;

    const requestBase = { deletedAt: null };
    const where: Record<string, unknown> = { request: requestBase };

    if (params.phase === 'pending') {
      where.status = CourierAcceptanceStatus.PENDING;
    } else if (params.phase === 'matched') {
      where.status = CourierAcceptanceStatus.CONFIRMED;
      where.request = { ...requestBase, status: CourierStatus.MATCHED };
    } else if (params.phase === 'completed') {
      where.status = CourierAcceptanceStatus.CONFIRMED;
      where.request = { ...requestBase, status: CourierStatus.COMPLETED };
    } else {
      where.status = {
        in: [CourierAcceptanceStatus.PENDING, CourierAcceptanceStatus.CONFIRMED],
      };
    }

    if (params.search?.trim()) {
      const q = params.search.trim();
      where.OR = [
        { traveler: { email: { contains: q, mode: 'insensitive' } } },
        { traveler: { profile: { displayName: { contains: q, mode: 'insensitive' } } } },
        { request: { itemName: { contains: q, mode: 'insensitive' } } },
        { request: { owner: { email: { contains: q, mode: 'insensitive' } } } },
        {
          request: {
            owner: { profile: { displayName: { contains: q, mode: 'insensitive' } } },
          },
        },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.courierAcceptance.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          traveler: {
            select: {
              id: true,
              email: true,
              profile: { select: { displayName: true, trustScore: true } },
            },
          },
          request: {
            select: {
              id: true,
              itemName: true,
              fromArea: true,
              toArea: true,
              direction: true,
              status: true,
              owner: {
                select: {
                  id: true,
                  email: true,
                  profile: { select: { displayName: true, trustScore: true } },
                },
              },
            },
          },
        },
      }),
      this.prisma.courierAcceptance.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ─── Destek formları ─────────────────────────────────────────────────────

  async listSupportTickets(params: {
    page?: number;
    search?: string;
    status?: string;
    category?: string;
  }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = 20;
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = {};

    if (params.status) where.status = params.status;
    if (params.category) where.category = params.category;

    if (params.search?.trim()) {
      const q = params.search.trim();
      where.OR = [
        { subject: { contains: q, mode: 'insensitive' } },
        { message: { contains: q, mode: 'insensitive' } },
        { user: { email: { contains: q, mode: 'insensitive' } } },
        { user: { profile: { displayName: { contains: q, mode: 'insensitive' } } } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              profile: { select: { displayName: true } },
            },
          },
        },
      }),
      this.prisma.supportTicket.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async updateSupportTicket(
    id: string,
    data: { status?: SupportTicketStatus; adminNote?: string },
  ) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('Destek talebi bulunamadı');

    const resolvedAt =
      data.status === SupportTicketStatus.RESOLVED ||
      data.status === SupportTicketStatus.CLOSED
        ? new Date()
        : data.status
          ? null
          : undefined;

    return this.prisma.supportTicket.update({
      where: { id },
      data: {
        ...(data.status && { status: data.status }),
        ...(data.adminNote !== undefined && { adminNote: data.adminNote || null }),
        ...(resolvedAt !== undefined && { resolvedAt }),
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            profile: { select: { displayName: true } },
          },
        },
      },
    });
  }

  // ─── Sohbet moderasyonu ───────────────────────────────────────────────────

  async listChatChannels() {
    const channels = await this.prisma.chat.findMany({
      where: { type: { not: ChatType.DIRECT } },
      orderBy: { createdAt: 'desc' },
      include: {
        state: { select: { name: true, slug: true } },
        city: { select: { name: true, slug: true } },
        _count: { select: { messages: true, members: true } },
      },
    });
    return { items: channels };
  }

  async createChatChannel(data: {
    type: ChatType;
    name?: string;
    stateId?: string;
    cityId?: string;
    eventId?: string;
    password?: string;
    isPublic?: boolean;
  }) {
    if (data.type === ChatType.DIRECT) {
      throw new NotFoundException('DM kanalı bu yolla oluşturulamaz');
    }
    const channel = await this.prisma.chat.create({
      data: {
        type: data.type,
        name: data.name?.trim() || null,
        stateId: data.stateId || null,
        cityId: data.cityId || null,
        eventId: data.eventId || null,
        password: data.password?.trim() || null,
        isPublic: data.isPublic ?? true,
      },
      include: {
        state: { select: { name: true } },
        city: { select: { name: true } },
      },
    });
    return channel;
  }

  listChatBannedWords() {
    return this.prisma.chatBannedWord.findMany({
      orderBy: [{ severity: 'asc' }, { word: 'asc' }],
    });
  }

  async addChatBannedWord(word: string, severity: ChatBannedWordSeverity = ChatBannedWordSeverity.CRITICAL) {
    const normalized = word.trim().toLowerCase();
    if (!normalized) throw new NotFoundException('Kelime boş olamaz');
    const created = await this.prisma.chatBannedWord.upsert({
      where: { word: normalized },
      create: { word: normalized, severity, isActive: true },
      update: { severity, isActive: true },
    });
    this.chatModeration.invalidateBannedWordsCache();
    return created;
  }

  async removeChatBannedWord(id: string) {
    const deleted = await this.prisma.chatBannedWord.delete({ where: { id } });
    this.chatModeration.invalidateBannedWordsCache();
    return deleted;
  }

  async toggleChatBannedWord(id: string, isActive: boolean) {
    const updated = await this.prisma.chatBannedWord.update({
      where: { id },
      data: { isActive },
    });
    this.chatModeration.invalidateBannedWordsCache();
    return updated;
  }

  async seedDefaultBannedWords() {
    let created = 0;
    let skipped = 0;

    for (const word of DEFAULT_BANNED_WORDS) {
      const normalized = word.trim().toLowerCase();
      if (!normalized) continue;

      const existing = await this.prisma.chatBannedWord.findUnique({
        where: { word: normalized },
      });

      if (existing) {
        skipped++;
        continue;
      }

      await this.prisma.chatBannedWord.create({
        data: {
          word: normalized,
          severity: ChatBannedWordSeverity.CRITICAL,
          isActive: true,
        },
      });
      created++;
    }

    this.chatModeration.invalidateBannedWordsCache();

    const totalInList = await this.prisma.chatBannedWord.count();

    return {
      created,
      skipped,
      scanned: DEFAULT_BANNED_WORDS.length,
      totalInList,
    };
  }

  async listChatModerationLogs(params: {
    page?: number;
    search?: string;
    reason?: string;
    autoBannedOnly?: boolean;
  }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = 25;
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = {};

    if (params.reason) where.reason = params.reason;
    if (params.autoBannedOnly) where.autoBanned = true;

    if (params.search?.trim()) {
      const q = params.search.trim();
      where.OR = [
        { detail: { contains: q, mode: 'insensitive' } },
        { messageSnippet: { contains: q, mode: 'insensitive' } },
        { user: { email: { contains: q, mode: 'insensitive' } } },
        { user: { profile: { displayName: { contains: q, mode: 'insensitive' } } } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.chatModerationLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              status: true,
              bannedUntil: true,
              profile: { select: { displayName: true } },
            },
          },
          chat: { select: { id: true, name: true, type: true } },
        },
      }),
      this.prisma.chatModerationLog.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async unbanChatUser(userId: string, actorId?: string) {
    const result = await this.prisma.user.update({
      where: { id: userId },
      data: { status: UserStatus.ACTIVE, bannedUntil: null },
    });
    await this.auditLog.log({
      userId: actorId,
      action: 'chat.unban',
      entityType: 'User',
      entityId: userId,
    });
    return result;
  }

  async getPagePermissionsConfig() {
    const settings = await this.prisma.siteSettings.findUnique({
      where: { id: 'default' },
      select: { trDefaultAllowedPages: true },
    });

    const [deCount, trCount] = await Promise.all([
      this.prisma.profile.count({ where: { postalCountry: PostalCountry.DE } }),
      this.prisma.profile.count({ where: { postalCountry: PostalCountry.TR } }),
    ]);

    return {
      pages: RESTRICTABLE_PAGES,
      trDefaultAllowedPages: settings?.trDefaultAllowedPages ?? [],
      counts: { DE: deCount, TR: trCount },
    };
  }

  async updateTrDefaultPages(pages: string[]) {
    const sanitized = sanitizePageKeys(pages);
    return this.prisma.siteSettings.upsert({
      where: { id: 'default' },
      create: { id: 'default', trDefaultAllowedPages: sanitized },
      update: { trDefaultAllowedPages: sanitized },
    });
  }

  async updateUserPagePermissions(userId: string, allowedPages: string[]) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });
    if (!user?.profile) throw new NotFoundException('Kullanıcı bulunamadı');
    if (user.profile.postalCountry !== PostalCountry.TR) {
      throw new BadRequestException('Sayfa yetkileri yalnızca Türkiye posta kodlu üyeler için ayarlanır');
    }

    const sanitized = sanitizePageKeys(allowedPages);
    return this.prisma.profile.update({
      where: { userId },
      data: { allowedPages: sanitized },
      select: {
        userId: true,
        displayName: true,
        postalCountry: true,
        allowedPages: true,
      },
    });
  }

  async resetUserPagePermissions(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });
    if (!user?.profile) throw new NotFoundException('Kullanıcı bulunamadı');

    return this.prisma.profile.update({
      where: { userId },
      data: { allowedPages: [] },
      select: {
        userId: true,
        displayName: true,
        postalCountry: true,
        allowedPages: true,
      },
    });
  }

  async listUsersByCountry(postalCountry: PostalCountry, page = 1) {
    const limit = 50;
    const skip = (page - 1) * limit;
    const settings = await this.prisma.siteSettings.findUnique({
      where: { id: 'default' },
      select: { trDefaultAllowedPages: true },
    });

    const where = {
      deletedAt: null,
      profile: { postalCountry },
    };

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          createdAt: true,
          profile: {
            select: {
              displayName: true,
              postalCode: true,
              postalCountry: true,
              allowedPages: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items: items.map((u) => ({
        ...u,
        resolvedAllowedPages: resolveAllowedPages(
          u.profile?.allowedPages ?? [],
          settings?.trDefaultAllowedPages ?? [],
        ),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ─── Audit log ───────────────────────────────────────────────────────────

  async listAuditLogs(params: {
    page?: number;
    action?: string;
    entityType?: string;
    userId?: string;
  }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = 30;
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = {};
    if (params.action) where.action = params.action;
    if (params.entityType) where.entityType = params.entityType;
    if (params.userId) where.userId = params.userId;

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, email: true, profile: { select: { displayName: true } } },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ─── Analytics ─────────────────────────────────────────────────────────────

  async getContentAnalytics(days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const [
      totalUsers,
      newUsers,
      totalTopics,
      newTopics,
      totalReplies,
      newReplies,
      totalEvents,
      newEvents,
      totalMessages,
      newMessages,
      usersByCountry,
      topicsByCategory,
    ] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.user.count({ where: { createdAt: { gte: since }, deletedAt: null } }),
      this.prisma.forumTopic.count({ where: { deletedAt: null } }),
      this.prisma.forumTopic.count({ where: { createdAt: { gte: since }, deletedAt: null } }),
      this.prisma.forumReply.count({ where: { deletedAt: null } }),
      this.prisma.forumReply.count({ where: { createdAt: { gte: since }, deletedAt: null } }),
      this.prisma.event.count({ where: { deletedAt: null } }),
      this.prisma.event.count({ where: { createdAt: { gte: since }, deletedAt: null } }),
      this.prisma.message.count({ where: { deletedAt: null } }),
      this.prisma.message.count({ where: { createdAt: { gte: since }, deletedAt: null } }),
      this.prisma.profile.groupBy({
        by: ['postalCountry'],
        _count: { postalCountry: true },
        orderBy: { _count: { postalCountry: 'desc' } },
        take: 10,
      }),
      this.prisma.topicCategory.findMany({
        include: { _count: { select: { topics: true } } },
        orderBy: { sortOrder: 'asc' },
      }),
    ]);

    // Son 30 gün günlük kullanıcı artışı
    const dailyUsers = await this.prisma.$queryRaw<{ date: string; count: number }[]>`
      SELECT DATE("created_at"::timestamp) as date, COUNT(*)::int as count
      FROM users
      WHERE created_at >= ${since} AND deleted_at IS NULL
      GROUP BY DATE("created_at"::timestamp)
      ORDER BY date ASC
    `;

    return {
      summary: {
        totalUsers, newUsers,
        totalTopics, newTopics,
        totalReplies, newReplies,
        totalEvents, newEvents,
        totalMessages, newMessages,
        days,
      },
      usersByCountry: (usersByCountry as Array<{ postalCountry: string | null; _count: { postalCountry: number } }>).map((r) => ({
        country: r.postalCountry ?? 'Diğer',
        count: r._count.postalCountry,
      })),
      topicsByCategory: (topicsByCategory as Array<{ name: string; _count: { topics: number } }>).map((c) => ({
        name: c.name,
        count: c._count.topics,
      })),
      dailyUsers,
    };
  }
}
