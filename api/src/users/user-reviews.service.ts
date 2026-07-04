import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GamificationService } from '../gamification/gamification.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationGateway } from '../notifications/notification.gateway';
import { CreateUserReviewDto } from './dto/create-user-review.dto';

const REVIEW_SELECT = {
  id: true,
  rating: true,
  comment: true,
  editCount: true,
  createdAt: true,
  updatedAt: true,
  author: {
    select: {
      id: true,
      profile: { select: { displayName: true, avatarUrl: true } },
    },
  },
} as const;

@Injectable()
export class UserReviewsService {
  constructor(
    private prisma: PrismaService,
    private gamification: GamificationService,
    private notifications: NotificationsService,
    private notifGateway: NotificationGateway,
  ) {}

  async list(targetUserId: string) {
    const [reviews, stats] = await Promise.all([
      this.prisma.userReview.findMany({
        where: { targetUserId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        select: REVIEW_SELECT,
      }),
      this.prisma.userReview.aggregate({
        where: { targetUserId, deletedAt: null },
        _avg: { rating: true },
        _count: true,
      }),
    ]);

    return {
      reviews: reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        editCount: r.editCount,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        author: {
          id: r.author.id,
          displayName: r.author.profile?.displayName ?? 'Kullanıcı',
          avatarUrl: r.author.profile?.avatarUrl ?? null,
        },
      })),
      averageRating: stats._avg.rating ?? 0,
      reviewCount: stats._count,
    };
  }

  async create(
    targetUserId: string,
    authorId: string,
    dto: CreateUserReviewDto,
  ) {
    if (targetUserId === authorId) {
      throw new BadRequestException('Kendi profilinize yorum yapamazsınız');
    }

    const target = await this.prisma.user.findFirst({
      where: { id: targetUserId, deletedAt: null },
      select: { id: true },
    });
    if (!target) throw new NotFoundException('Kullanıcı bulunamadı');

    const existing = await this.prisma.userReview.findUnique({
      where: { targetUserId_authorId: { targetUserId, authorId } },
    });
    if (existing && !existing.deletedAt) {
      throw new ConflictException('Bu kullanıcıya zaten yorum yaptınız');
    }

    const review = existing
      ? await this.prisma.userReview.update({
          where: { id: existing.id },
          data: {
            rating: dto.rating,
            comment: dto.comment,
            deletedAt: null,
          },
        })
      : await this.prisma.userReview.create({
          data: {
            targetUserId,
            authorId,
            rating: dto.rating,
            comment: dto.comment,
          },
        });

    if (!existing) {
      await this.gamification.award(
        authorId,
        'USER_REVIEW_CREATED',
        review.id,
        'UserReview',
      );

      const notif = await this.notifications.create({
        userId: targetUserId,
        title: 'Profilinize yeni bir yorum yapıldı',
        body: `${dto.rating}/5 puanla değerlendirildiniz.`,
        link: `/kullanici/${targetUserId}`,
      });
      this.notifGateway.pushToUser(targetUserId, notif);
    }

    return review;
  }

  async update(reviewId: string, authorId: string, dto: CreateUserReviewDto) {
    const review = await this.prisma.userReview.findUnique({
      where: { id: reviewId },
    });
    if (!review || review.deletedAt)
      throw new NotFoundException('Yorum bulunamadı');
    if (review.authorId !== authorId) throw new ForbiddenException();
    if (review.editCount >= 3) {
      throw new BadRequestException('Bu yorumu daha fazla düzenleyemezsiniz');
    }

    return this.prisma.userReview.update({
      where: { id: reviewId },
      data: {
        rating: dto.rating,
        comment: dto.comment,
        editCount: { increment: 1 },
      },
    });
  }

  async remove(reviewId: string, requesterId: string, isAdmin: boolean) {
    const review = await this.prisma.userReview.findUnique({
      where: { id: reviewId },
    });
    if (!review || review.deletedAt)
      throw new NotFoundException('Yorum bulunamadı');
    if (review.authorId !== requesterId && !isAdmin) {
      throw new ForbiddenException();
    }

    await this.prisma.userReview.update({
      where: { id: reviewId },
      data: { deletedAt: new Date() },
    });
    return { success: true };
  }
}
