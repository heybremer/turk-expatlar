import type { RawBodyRequest } from '@nestjs/common';
import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ApplyPromoDto } from './dto/apply-promo.dto';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { SubscriptionsService } from './subscriptions.service';

@ApiTags('subscriptions')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private subscriptionsService: SubscriptionsService) {}

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  getMySubscription(@CurrentUser() user: { id: string }) {
    return this.subscriptionsService.getMySubscription(user.id);
  }

  @Get('promo/launch')
  getLaunchPromoStats() {
    return this.subscriptionsService.getLaunchPromoStats();
  }

  @Post('promo')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  applyPromo(
    @CurrentUser() user: { id: string },
    @Body() dto: ApplyPromoDto,
  ) {
    return this.subscriptionsService.applyPromoCode(user.id, dto);
  }

  @Post('checkout')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  createCheckout(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateCheckoutDto,
  ) {
    return this.subscriptionsService.createCheckoutSession(user.id, dto.plan);
  }

  // Stripe webhook — raw body gerekli, auth yok
  @Post('webhook/stripe')
  stripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') sig: string,
  ) {
    return this.subscriptionsService.handleStripeWebhook(req.rawBody!, sig);
  }

  // Admin: promo kodları
  @Get('admin/promo-codes')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  listPromoCodes() {
    return this.subscriptionsService.listPromoCodes();
  }
}
