import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BusinessStatus, ReviewStatus, VerificationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../redis/cache.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class BusinessesService {
  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
  ) {}

  getCategories() {
    return this.cache.wrap(
      'businesses:categories',
      () => this.prisma.businessCategory.findMany({ orderBy: { sortOrder: 'asc' } }),
      600, // 10 dakika cache
    );
  }

  async findBusinesses(params: {
    page?: number;
    limit?: number;
    categoryId?: string;
    stateId?: string;
    cityId?: string;
    speaksTurkish?: boolean;
    verified?: boolean;
    search?: string;
  }) {
    const page = params.page ?? 1;
    const limit = Math.min(params.limit ?? 20, 50);
    const skip = (page - 1) * limit;

    const where = {
      deletedAt: null,
      status: BusinessStatus.ACTIVE,
      ...(params.categoryId && { categoryId: params.categoryId }),
      ...(params.stateId && { stateId: params.stateId }),
      ...(params.cityId && { cityId: params.cityId }),
      ...(params.speaksTurkish && { speaksTurkish: true }),
      ...(params.verified && { isVerified: true }),
      ...(params.search && {
        OR: [
          { name: { contains: params.search, mode: 'insensitive' as const } },
          { description: { contains: params.search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.business.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ isVerified: 'desc' }, { averageRating: 'desc' }],
        include: { category: true, state: true, city: true },
      }),
      this.prisma.business.count({ where }),
    ]);

    if (params.search && items.length) {
      await this.prisma.business.updateMany({
        where: { id: { in: items.map((b) => b.id) } },
        data: { searchCount: { increment: 1 } },
      });
    }

    return { items, total, page, limit };
  }

  async findBusiness(id: string) {
    const business = await this.prisma.business.findFirst({
      where: { id, deletedAt: null, status: BusinessStatus.ACTIVE },
      include: {
        category: true,
        state: true,
        city: true,
        reviews: {
          where: { deletedAt: null, status: ReviewStatus.APPROVED },
          take: 20,
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: {
                profile: { select: { displayName: true, avatarUrl: true } },
              },
            },
          },
        },
      },
    });
    if (!business) throw new NotFoundException('İşletme bulunamadı');
    return business;
  }

  createBusiness(ownerId: string, dto: CreateBusinessDto) {
    return this.prisma.business.create({
      data: {
        ownerId,
        ...dto,
        status: BusinessStatus.PENDING,
      },
      include: { category: true, state: true, city: true },
    });
  }

  async createReview(businessId: string, userId: string, dto: CreateReviewDto) {
    const business = await this.prisma.business.findFirst({
      where: { id: businessId, status: BusinessStatus.ACTIVE },
    });
    if (!business) throw new NotFoundException();

    const existing = await this.prisma.businessReview.findUnique({
      where: { businessId_userId: { businessId, userId } },
    });

    if (existing && !existing.deletedAt) {
      throw new ConflictException('Bu işletmeye zaten yorum yaptınız');
    }

    const review = existing
      ? await this.prisma.businessReview.update({
          where: { id: existing.id },
          data: {
            rating: dto.rating,
            comment: dto.comment,
            status: ReviewStatus.PENDING,
            editCount: 0,
            deletedAt: null,
          },
        })
      : await this.prisma.businessReview.create({
          data: {
            businessId,
            userId,
            rating: dto.rating,
            comment: dto.comment,
            status: ReviewStatus.PENDING,
          },
        });

    await this.recalculateReviewStats(businessId);

    if (business.ownerId && business.ownerId !== userId) {
      await this.prisma.notification.create({
        data: {
          userId: business.ownerId,
          title: 'İşletmenize yeni yorum',
          body: `"${business.name}" için ${dto.rating} yıldızlı yeni yorum.`,
          link: `/rehber/${businessId}`,
        },
      });
    }

    return this.prisma.businessReview.findUniqueOrThrow({
      where: { id: review.id },
      select: {
        id: true,
        rating: true,
        comment: true,
        status: true,
        editCount: true,
        createdAt: true,
      },
    });
  }

  async getMyReview(businessId: string, userId: string) {
    return this.prisma.businessReview.findFirst({
      where: { businessId, userId, deletedAt: null },
      select: {
        id: true,
        rating: true,
        comment: true,
        status: true,
        editCount: true,
        createdAt: true,
      },
    });
  }

  async updateMyReview(businessId: string, userId: string, dto: CreateReviewDto) {
    const review = await this.prisma.businessReview.findFirst({
      where: { businessId, userId, deletedAt: null },
    });
    if (!review) throw new NotFoundException('Yorum bulunamadı');
    if (review.status !== ReviewStatus.PENDING) {
      throw new BadRequestException('Yalnızca onay bekleyen yorumlar düzenlenebilir');
    }
    if (review.editCount >= 1) {
      throw new ForbiddenException('Yorum yalnızca bir kez düzenlenebilir');
    }

    return this.prisma.businessReview.update({
      where: { id: review.id },
      data: {
        rating: dto.rating,
        comment: dto.comment,
        editCount: { increment: 1 },
      },
      select: {
        id: true,
        rating: true,
        comment: true,
        status: true,
        editCount: true,
        createdAt: true,
      },
    });
  }

  async submitVerification(businessId: string, userId: string, docUrls: string[]) {
    const biz = await this.prisma.business.findFirst({
      where: { id: businessId, ownerId: userId, deletedAt: null },
    });
    if (!biz) throw new NotFoundException('İşletme bulunamadı');
    if (biz.verificationStatus === VerificationStatus.VERIFIED) {
      throw new BadRequestException('İşletme zaten doğrulanmış');
    }
    if (docUrls.length === 0) throw new BadRequestException('En az bir belge gereklidir');

    return this.prisma.business.update({
      where: { id: businessId },
      data: {
        verificationStatus: VerificationStatus.PENDING_REVIEW,
        verificationDocs: docUrls,
      },
    });
  }

  async reviewVerification(
    businessId: string,
    approved: boolean,
    note?: string,
  ) {
    return this.prisma.business.update({
      where: { id: businessId },
      data: {
        verificationStatus: approved
          ? VerificationStatus.VERIFIED
          : VerificationStatus.REJECTED,
        isVerified: approved,
        verificationNote: note ?? null,
      },
    });
  }

  async getPendingVerifications() {
    return this.prisma.business.findMany({
      where: { verificationStatus: VerificationStatus.PENDING_REVIEW, deletedAt: null },
      select: {
        id: true, name: true, verificationDocs: true, verificationStatus: true,
        owner: { select: { id: true, email: true, profile: { select: { displayName: true } } } },
        city: { select: { name: true } },
        state: { select: { name: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  private async recalculateReviewStats(businessId: string) {
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
}
