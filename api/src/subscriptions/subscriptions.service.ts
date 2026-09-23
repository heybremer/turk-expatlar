import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { MembershipPlan, Prisma, SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ApplyPromoDto } from './dto/apply-promo.dto';

const PLAN_PRICES: Record<string, number> = {
  USER_YEARLY: 10,
  BUSINESS_YEARLY: 50,
};

export type StripeCheckoutSession = {
  id?: string;
  payment_status?: string;
  amount_total?: number | null;
  currency?: string | null;
  created?: number;
  customer?: string | { id: string } | null;
  metadata?: { userId?: string; plan?: string } | null;
};

@Injectable()
export class SubscriptionsService {
  constructor(private prisma: PrismaService) {}

  async getMySubscription(userId: string) {
    const sub = await this.prisma.subscription.findUnique({
      where: { userId },
      include: { promoCode: { select: { code: true, label: true } } },
    });

    const plan = sub?.plan ?? null;
    const status = sub?.status ?? null;
    const isActive =
      sub?.status === SubscriptionStatus.ACTIVE &&
      (!sub.expiresAt || sub.expiresAt > new Date());

    return { subscription: sub, plan, status, isActive };
  }

  private isSubscriptionActive(
    sub: { status: SubscriptionStatus; expiresAt: Date | null } | null,
  ) {
    return (
      sub?.status === SubscriptionStatus.ACTIVE &&
      (!sub.expiresAt || sub.expiresAt > new Date())
    );
  }

  async applyPromoCode(userId: string, dto: ApplyPromoDto) {
    const existing = await this.prisma.subscription.findUnique({
      where: { userId },
    });
    if (this.isSubscriptionActive(existing)) {
      throw new ConflictException('Zaten aktif bir üyeliğiniz var');
    }

    const alreadyRedeemed = await this.prisma.promoCodeRedemption.findUnique({
      where: { userId },
    });
    if (alreadyRedeemed) {
      throw new ConflictException('Daha önce bir promosyon kodu kullandınız');
    }

    const promo = await this.prisma.promoCode.findUnique({
      where: { code: dto.code.toUpperCase() },
    });

    if (!promo || !promo.active)
      throw new NotFoundException('Promosyon kodu bulunamadı');
    if (promo.validUntil && promo.validUntil < new Date()) {
      throw new BadRequestException('Promosyon kodunun süresi dolmuş');
    }
    if (promo.usedCount >= promo.maxUses) {
      throw new BadRequestException('Promosyon kodu kullanım limiti doldu');
    }

    // FREE_PROMO plan seçilmişse her iki plan tipine uygula
    const targetPlan =
      promo.plan === MembershipPlan.FREE_PROMO ? dto.plan : promo.plan;

    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    let subscription;
    try {
      subscription = await this.prisma.$transaction(async (tx) => {
        // Koşullu artış: eşzamanlı isteklerde maxUses aşılamaz
        const claimed = await tx.promoCode.updateMany({
          where: {
            id: promo.id,
            active: true,
            usedCount: { lt: promo.maxUses },
          },
          data: { usedCount: { increment: 1 } },
        });
        if (claimed.count === 0) {
          throw new BadRequestException('Promosyon kodu kullanım limiti doldu');
        }

        await tx.promoCodeRedemption.create({
          data: { promoCodeId: promo.id, userId },
        });

        return tx.subscription.upsert({
          where: { userId },
          create: {
            userId,
            plan: targetPlan,
            status: SubscriptionStatus.ACTIVE,
            promoCodeId: promo.id,
            expiresAt,
          },
          update: {
            plan: targetPlan,
            status: SubscriptionStatus.ACTIVE,
            promoCodeId: promo.id,
            startsAt: new Date(),
            expiresAt,
            cancelledAt: null,
          },
        });
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException('Daha önce bir promosyon kodu kullandınız');
      }
      throw err;
    }

    return {
      message: 'Promosyon kodu uygulandı! 1 yıllık üyeliğiniz aktif.',
      subscription,
    };
  }

  async createCheckoutSession(userId: string, plan: MembershipPlan) {
    // Stripe entegrasyonu için placeholder.
    // Gerçek ortamda: stripe.checkout.sessions.create(...)
    const price = PLAN_PRICES[plan];
    if (!price) throw new BadRequestException('Geçersiz plan');

    const existing = await this.prisma.subscription.findUnique({
      where: { userId },
    });
    if (this.isSubscriptionActive(existing)) {
      throw new ConflictException('Zaten aktif bir üyeliğiniz var');
    }

    // Stripe key tanımlıysa gerçek session oluştur
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey || stripeKey === 'sk_test_PLACEHOLDER') {
      return {
        url: null,
        message:
          'Stripe henüz yapılandırılmadı. Lütfen STRIPE_SECRET_KEY ortam değişkenini ayarlayın.',
        plan,
        priceEur: price,
      };
    }

    // Stripe bağlıysa dinamik import ile session oluştur
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeKey);
    const webUrl = process.env.WEB_URL ?? 'http://localhost:3200';

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name:
                plan === MembershipPlan.USER_YEARLY
                  ? 'Türk Expatlar — Kullanıcı Üyeliği (1 yıl)'
                  : 'Türk Expatlar — İşletme Üyeliği (1 yıl)',
            },
            unit_amount: price * 100,
          },
          quantity: 1,
        },
      ],
      metadata: { userId, plan },
      success_url: `${webUrl}/uyelik/basarili?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${webUrl}/uyelik`,
    });

    return { url: session.url, sessionId: session.id };
  }

  async handleStripeWebhook(rawBody: Buffer, signature: string) {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    // 2xx dönülürse Stripe olayı teslim edilmiş sayar ve ödeme kaybolur
    if (!webhookSecret || !stripeKey) {
      throw new ServiceUnavailableException('Stripe webhook yapılandırılmadı');
    }
    if (!rawBody || !signature) {
      throw new BadRequestException('Geçersiz webhook isteği');
    }

    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeKey);

    let event: { type: string; data: { object: unknown } };
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch {
      throw new BadRequestException('Webhook imzası doğrulanamadı');
    }

    if (
      event.type === 'checkout.session.completed' ||
      event.type === 'checkout.session.async_payment_succeeded'
    ) {
      await this.activateFromCheckoutSession(
        event.data.object as StripeCheckoutSession,
      );
    }
    return { received: true };
  }

  async activateFromCheckoutSession(session: StripeCheckoutSession) {
    if (session.payment_status !== 'paid') return;

    const { userId, plan } = session.metadata ?? {};
    if (!userId || !plan) return;
    const price = PLAN_PRICES[plan];
    if (!price) return;
    if (
      session.amount_total !== price * 100 ||
      session.currency?.toLowerCase() !== 'eur'
    ) {
      console.error('[Stripe webhook] Tutar/plan uyuşmazlığı', {
        sessionId: session.id,
        plan,
        amountTotal: session.amount_total,
        currency: session.currency,
      });
      return;
    }

    // Süre Stripe oturum zamanından hesaplanır: aynı olay tekrar gelirse sonuç değişmez
    const paidAt = session.created
      ? new Date(session.created * 1000)
      : new Date();
    const expiresAt = new Date(paidAt);
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    const existing = await this.prisma.subscription.findUnique({
      where: { userId },
    });
    const keepLaterExpiry =
      this.isSubscriptionActive(existing) &&
      existing!.expiresAt !== null &&
      existing!.expiresAt > expiresAt;
    const finalExpiresAt = keepLaterExpiry ? existing!.expiresAt! : expiresAt;
    const customerId =
      typeof session.customer === 'string' ? session.customer : undefined;

    await this.prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        plan: plan as MembershipPlan,
        status: SubscriptionStatus.ACTIVE,
        startsAt: paidAt,
        expiresAt: finalExpiresAt,
        stripeCustomerId: customerId,
      },
      update: {
        plan: plan as MembershipPlan,
        status: SubscriptionStatus.ACTIVE,
        expiresAt: finalExpiresAt,
        cancelledAt: null,
        ...(customerId ? { stripeCustomerId: customerId } : {}),
      },
    });
  }

  // Admin: promo kod listesi + istatistik
  listPromoCodes() {
    return this.prisma.promoCode.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        code: true,
        label: true,
        maxUses: true,
        usedCount: true,
        plan: true,
        active: true,
        validUntil: true,
      },
    });
  }

  async createPromoCode(data: {
    code: string;
    label: string;
    maxUses: number;
    plan: MembershipPlan;
    validUntil?: Date;
  }) {
    return this.prisma.promoCode.create({
      data: {
        code: data.code.toUpperCase(),
        label: data.label,
        maxUses: data.maxUses,
        plan: data.plan,
        validUntil: data.validUntil,
      },
    });
  }

  async getLaunchPromoStats() {
    const promo = await this.prisma.promoCode.findUnique({
      where: { code: 'LAUNCH100' },
      select: {
        code: true,
        maxUses: true,
        usedCount: true,
        active: true,
        validUntil: true,
      },
    });

    if (!promo) {
      return {
        code: 'LAUNCH100',
        maxUses: 100,
        usedCount: 0,
        remaining: 100,
        active: false,
        available: false,
      };
    }

    const expired = promo.validUntil ? promo.validUntil < new Date() : false;
    const remaining = Math.max(0, promo.maxUses - promo.usedCount);
    const available = promo.active && !expired && remaining > 0;

    return {
      code: promo.code,
      maxUses: promo.maxUses,
      usedCount: promo.usedCount,
      remaining,
      active: promo.active && !expired,
      available,
    };
  }
}
