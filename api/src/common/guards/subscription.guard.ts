import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MembershipPlan, SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { REQUIRE_SUBSCRIPTION_KEY } from '../decorators/require-subscription.decorator';

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPlan = this.reflector.getAllAndOverride<
      MembershipPlan | true | undefined
    >(REQUIRE_SUBSCRIPTION_KEY, [context.getHandler(), context.getClass()]);

    if (!requiredPlan) return true;

    const request = context.switchToHttp().getRequest<{ user?: { id: string } }>();
    const userId = request.user?.id;

    if (!userId) {
      throw new ForbiddenException('Bu özellik için giriş yapmanız gerekiyor');
    }

    const sub = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    const isActive =
      sub?.status === SubscriptionStatus.ACTIVE &&
      (!sub.expiresAt || sub.expiresAt > new Date());

    if (!isActive) {
      throw new HttpException(
        'Bu özellik aktif üyelik gerektiriyor. Üyelik planlarını görmek için /uyelik sayfasını ziyaret edin.',
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    if (requiredPlan !== true && sub!.plan !== requiredPlan) {
      const planLabel =
        requiredPlan === MembershipPlan.BUSINESS_YEARLY
          ? 'işletme (Business) üyeliği'
          : 'kullanıcı üyeliği';
      throw new HttpException(
        `Bu özellik ${planLabel} gerektiriyor.`,
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    return true;
  }
}
