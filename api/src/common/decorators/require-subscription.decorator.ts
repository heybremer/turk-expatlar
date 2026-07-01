import { SetMetadata } from '@nestjs/common';
import { MembershipPlan } from '@prisma/client';

export const REQUIRE_SUBSCRIPTION_KEY = 'require_subscription';

/**
 * Belirli bir üyelik planı zorunlu kılar.
 * Bir plan belirtilmezse sadece herhangi bir aktif abonelik aranır.
 */
export const RequireSubscription = (plan?: MembershipPlan) =>
  SetMetadata(REQUIRE_SUBSCRIPTION_KEY, plan ?? true);
