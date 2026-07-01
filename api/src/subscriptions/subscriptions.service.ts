import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MembershipPlan, SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ApplyPromoDto } from './dto/apply-promo.dto';

const PLAN_PRICES: Record<string, number> = {
  USER_YEARLY: 10,
  BUSINESS_YEARLY: 50,
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

  async applyPromoCode(userId: string, dto: ApplyPromoDto) {
    const existing = await this.prisma.subscription.findUnique({
      where: { userId },
    });
    if (existing?.status === SubscriptionStatus.ACTIVE) {
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

    if (!promo || !promo.active) throw new NotFoundException('Promosyon kodu bulunamadı');
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

    const [subscription] = await this.prisma.$transaction([
      this.prisma.subscription.upsert({
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
          expiresAt,
          cancelledAt: null,
        },
      }),
      this.prisma.promoCode.update({
        where: { id: promo.id },
        data: { usedCount: { increment: 1 } },
      }),
      this.prisma.promoCodeRedemption.create({
        data: { promoCodeId: promo.id, userId },
      }),
    ]);

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

    // Stripe key tanımlıysa gerçek session oluştur
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey || stripeKey === 'sk_test_PLACEHOLDER') {
      return {
        url: null,
        message: 'Stripe henüz yapılandırılmadı. Lütfen STRIPE_SECRET_KEY ortam değişkenini ayarlayın.',
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
    if (!webhookSecret) return;

    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

    const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as { metadata?: { userId?: string; plan?: string } };
      const { userId, plan } = session.metadata ?? {};
      if (!userId || !plan) return;

      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);

      await this.prisma.subscription.upsert({
        where: { userId },
        create: {
          userId,
          plan: plan as MembershipPlan,
          status: SubscriptionStatus.ACTIVE,
          expiresAt,
        },
        update: {
          plan: plan as MembershipPlan,
          status: SubscriptionStatus.ACTIVE,
          expiresAt,
          cancelledAt: null,
        },
      });
    }
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
