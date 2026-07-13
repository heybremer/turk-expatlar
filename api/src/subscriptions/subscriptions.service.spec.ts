import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { MembershipPlan, SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionsService } from './subscriptions.service';

describe('SubscriptionsService', () => {
  let service: SubscriptionsService;
  let prisma: {
    subscription: {
      findUnique: jest.Mock;
      upsert: jest.Mock;
    };
    promoCodeRedemption: { findUnique: jest.Mock; create: jest.Mock };
    promoCode: { findUnique: jest.Mock; update: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      subscription: { findUnique: jest.fn(), upsert: jest.fn() },
      promoCodeRedemption: { findUnique: jest.fn(), create: jest.fn() },
      promoCode: { findUnique: jest.fn(), update: jest.fn() },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [SubscriptionsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<SubscriptionsService>(SubscriptionsService);
  });

  describe('getMySubscription', () => {
    it('reports isActive=false once expiresAt is in the past, even if status is stale', async () => {
      prisma.subscription.findUnique.mockResolvedValue({
        plan: MembershipPlan.USER_YEARLY,
        status: SubscriptionStatus.ACTIVE,
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      });

      const result = await service.getMySubscription('user-1');

      expect(result.isActive).toBe(false);
    });

    it('reports isActive=true for an ACTIVE subscription with a future expiry', async () => {
      prisma.subscription.findUnique.mockResolvedValue({
        plan: MembershipPlan.USER_YEARLY,
        status: SubscriptionStatus.ACTIVE,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      const result = await service.getMySubscription('user-1');

      expect(result.isActive).toBe(true);
    });

    it('reports isActive=false when there is no subscription at all', async () => {
      prisma.subscription.findUnique.mockResolvedValue(null);

      const result = await service.getMySubscription('user-1');

      expect(result.isActive).toBe(false);
      expect(result.plan).toBeNull();
    });
  });

  describe('applyPromoCode', () => {
    it('blocks redemption when an unexpired ACTIVE subscription already exists', async () => {
      prisma.subscription.findUnique.mockResolvedValue({
        status: SubscriptionStatus.ACTIVE,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      await expect(
        service.applyPromoCode('user-1', { code: 'LAUNCH100', plan: MembershipPlan.USER_YEARLY }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });
});
