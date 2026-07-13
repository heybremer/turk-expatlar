import { Test, TestingModule } from '@nestjs/testing';
import { CourierStatus, JobStatus, SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { GamificationService } from '../gamification/gamification.service';
import { TasksService } from './tasks.service';

describe('TasksService', () => {
  let service: TasksService;
  let prisma: {
    message: { deleteMany: jest.Mock };
    jobPosting: { updateMany: jest.Mock };
    courierRequest: { updateMany: jest.Mock };
    subscription: { updateMany: jest.Mock };
    event: { findMany: jest.Mock; updateMany: jest.Mock };
    travelAnnouncement: { updateMany: jest.Mock };
    emailVerificationToken: { deleteMany: jest.Mock };
    passwordResetToken: { deleteMany: jest.Mock };
    user: { updateMany: jest.Mock };
    notification: { deleteMany: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      message: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      jobPosting: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
      courierRequest: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
      subscription: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
      event: { findMany: jest.fn(), updateMany: jest.fn() },
      travelAnnouncement: { updateMany: jest.fn() },
      emailVerificationToken: { deleteMany: jest.fn() },
      passwordResetToken: { deleteMany: jest.fn() },
      user: { updateMany: jest.fn() },
      notification: { deleteMany: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: PrismaService, useValue: prisma },
        { provide: GamificationService, useValue: { awardEventCompleted: jest.fn() } },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
  });

  describe('purgeExpiredChatMessages', () => {
    it('yalnızca süresi geçmiş süreli mesajları kalıcı siler', async () => {
      await service.purgeExpiredChatMessages();

      expect(prisma.message.deleteMany).toHaveBeenCalledTimes(1);
      const arg = (
        prisma.message.deleteMany.mock.calls as unknown as [
          { where: { expiresAt: { not: null; lt: Date } } },
        ][]
      )[0][0];
      expect(arg.where.expiresAt.not).toBeNull();
      expect(arg.where.expiresAt.lt).toBeInstanceOf(Date);
    });
  });

  describe('expireJobPostings', () => {
    it('only expires PUBLISHED job postings with a past expiresAt', async () => {
      await service.expireJobPostings();

      expect(prisma.jobPosting.updateMany).toHaveBeenCalledWith({
        where: {
          status: JobStatus.PUBLISHED,
          expiresAt: { not: null, lt: expect.any(Date) },
        },
        data: { status: JobStatus.EXPIRED },
      });
    });
  });

  describe('expireCourierRequests', () => {
    it('expires OPEN requests whose preferred date has passed the grace period, or that are stale with no date', async () => {
      await service.expireCourierRequests();

      expect(prisma.courierRequest.updateMany).toHaveBeenCalledWith({
        where: {
          status: CourierStatus.OPEN,
          OR: [
            { preferredDate: { not: null, lt: expect.any(Date) } },
            { preferredDate: null, createdAt: { lt: expect.any(Date) } },
          ],
        },
        data: { status: CourierStatus.EXPIRED },
      });
    });
  });

  describe('expireSubscriptions', () => {
    it('only expires ACTIVE subscriptions with a past expiresAt', async () => {
      await service.expireSubscriptions();

      expect(prisma.subscription.updateMany).toHaveBeenCalledWith({
        where: {
          status: SubscriptionStatus.ACTIVE,
          expiresAt: { not: null, lt: expect.any(Date) },
        },
        data: { status: SubscriptionStatus.EXPIRED },
      });
    });
  });
});
