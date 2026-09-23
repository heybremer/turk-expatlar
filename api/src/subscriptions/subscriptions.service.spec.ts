import { BadRequestException, ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { MembershipPlan, Prisma, SubscriptionStatus } from '@prisma/client';
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
    promoCode: {
      findUnique: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  const activePromo = {
    id: 'promo-1',
    code: 'LAUNCH100',
    active: true,
    validUntil: null,
    usedCount: 5,
    maxUses: 100,
    plan: MembershipPlan.FREE_PROMO,
  };

  beforeEach(async () => {
    prisma = {
      subscription: { findUnique: jest.fn(), upsert: jest.fn() },
      promoCodeRedemption: { findUnique: jest.fn(), create: jest.fn() },
      promoCode: {
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      $transaction: jest.fn((fn: (tx: unknown) => unknown) => fn(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionsService,
        { provide: PrismaService, useValue: prisma },
      ],
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
        service.applyPromoCode('user-1', {
          code: 'LAUNCH100',
          plan: MembershipPlan.USER_YEARLY,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('allows redemption when the ACTIVE subscription has already expired', async () => {
      prisma.subscription.findUnique.mockResolvedValue({
        status: SubscriptionStatus.ACTIVE,
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      });
      prisma.promoCodeRedemption.findUnique.mockResolvedValue(null);
      prisma.promoCode.findUnique.mockResolvedValue(activePromo);
      prisma.promoCode.updateMany.mockResolvedValue({ count: 1 });
      prisma.subscription.upsert.mockResolvedValue({ id: 'sub-1' });

      const result = await service.applyPromoCode('user-1', {
        code: 'launch100',
        plan: MembershipPlan.USER_YEARLY,
      });

      expect(result.subscription).toEqual({ id: 'sub-1' });
      expect(prisma.subscription.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ plan: MembershipPlan.USER_YEARLY }),
        }),
      );
    });

    it('rejects when a concurrent redemption consumed the last slot', async () => {
      prisma.subscription.findUnique.mockResolvedValue(null);
      prisma.promoCodeRedemption.findUnique.mockResolvedValue(null);
      prisma.promoCode.findUnique.mockResolvedValue({
        ...activePromo,
        usedCount: 99,
      });
      prisma.promoCode.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.applyPromoCode('user-1', {
          code: 'LAUNCH100',
          plan: MembershipPlan.USER_YEARLY,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.promoCode.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ usedCount: { lt: 100 } }),
        }),
      );
      expect(prisma.subscription.upsert).not.toHaveBeenCalled();
    });

    it('maps a duplicate redemption race to ConflictException', async () => {
      prisma.subscription.findUnique.mockResolvedValue(null);
      prisma.promoCodeRedemption.findUnique.mockResolvedValue(null);
      prisma.promoCode.findUnique.mockResolvedValue(activePromo);
      prisma.promoCode.updateMany.mockResolvedValue({ count: 1 });
      prisma.promoCodeRedemption.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );

      await expect(
        service.applyPromoCode('user-1', {
          code: 'LAUNCH100',
          plan: MembershipPlan.USER_YEARLY,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('createCheckoutSession', () => {
    it('refuses a new checkout while an active subscription exists', async () => {
      prisma.subscription.findUnique.mockResolvedValue({
        status: SubscriptionStatus.ACTIVE,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      await expect(
        service.createCheckoutSession('user-1', MembershipPlan.USER_YEARLY),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('activateFromCheckoutSession', () => {
    const paidSession = {
      id: 'cs_1',
      payment_status: 'paid',
      amount_total: 1000,
      currency: 'eur',
      created: Math.floor(Date.UTC(2026, 0, 10) / 1000),
      metadata: { userId: 'user-1', plan: MembershipPlan.USER_YEARLY },
    };

    it('ignores sessions that are not paid yet', async () => {
      await service.activateFromCheckoutSession({
        ...paidSession,
        payment_status: 'unpaid',
      });
      expect(prisma.subscription.upsert).not.toHaveBeenCalled();
    });

    it('ignores sessions whose amount does not match the plan price', async () => {
      const spy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);
      await service.activateFromCheckoutSession({
        ...paidSession,
        amount_total: 100,
      });
      expect(prisma.subscription.upsert).not.toHaveBeenCalled();
      spy.mockRestore();
    });

    it('derives expiry from the session timestamp so replays are idempotent', async () => {
      prisma.subscription.findUnique.mockResolvedValue(null);

      await service.activateFromCheckoutSession(paidSession);
      await service.activateFromCheckoutSession(paidSession);

      const expected = new Date(Date.UTC(2027, 0, 10));
      const calls = prisma.subscription.upsert.mock.calls as Array<
        [{ create: { expiresAt: Date } }]
      >;
      expect(calls).toHaveLength(2);
      for (const [args] of calls) {
        expect(args.create.expiresAt.getTime()).toBe(expected.getTime());
      }
    });
  });

  describe('handleStripeWebhook', () => {
    it('does not acknowledge webhooks when Stripe is not configured', async () => {
      const prev = process.env.STRIPE_WEBHOOK_SECRET;
      delete process.env.STRIPE_WEBHOOK_SECRET;
      await expect(
        service.handleStripeWebhook(Buffer.from('{}'), 'sig'),
      ).rejects.toThrow();
      if (prev !== undefined) process.env.STRIPE_WEBHOOK_SECRET = prev;
    });
  });
});
