import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { MembershipPlan } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { SubscriptionGuard } from '../common/guards/subscription.guard';
import { RequireSubscription } from '../common/decorators/require-subscription.decorator';
import { BusinessesService } from './businesses.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { CreateReviewDto } from './dto/create-review.dto';

@ApiTags('businesses')
@Controller('businesses')
export class BusinessesController {
  constructor(private businessesService: BusinessesService) {}

  @Get('categories')
  getCategories() {
    return this.businessesService.getCategories();
  }

  @Get()
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'stateId', required: false })
  @ApiQuery({ name: 'cityId', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'verified', required: false })
  findBusinesses(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('categoryId') categoryId?: string,
    @Query('stateId') stateId?: string,
    @Query('cityId') cityId?: string,
    @Query('search') search?: string,
    @Query('verified') verified?: string,
    @Query('speaksTurkish') speaksTurkish?: string,
  ) {
    return this.businessesService.findBusinesses({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      categoryId,
      stateId,
      cityId,
      search,
      verified: verified === 'true',
      speaksTurkish: speaksTurkish === 'true',
    });
  }

  @Get(':id')
  findBusiness(@Param('id') id: string) {
    return this.businessesService.findBusiness(id);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, SubscriptionGuard)
  @RequireSubscription(MembershipPlan.BUSINESS_YEARLY)
  createBusiness(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateBusinessDto,
  ) {
    return this.businessesService.createBusiness(user.id, dto);
  }

  @Post(':id/reviews')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  createReview(
    @Param('id') businessId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateReviewDto,
  ) {
    return this.businessesService.createReview(businessId, user.id, dto);
  }

  @Get(':id/reviews/me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  getMyReview(
    @Param('id') businessId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.businessesService.getMyReview(businessId, user.id);
  }

  @Patch(':id/reviews/me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  updateMyReview(
    @Param('id') businessId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateReviewDto,
  ) {
    return this.businessesService.updateMyReview(businessId, user.id, dto);
  }

  // ─── Doğrulama ─────────────────────────────────────────────────────────────

  @Post(':id/request-verification')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  requestVerification(
    @Param('id') businessId: string,
    @CurrentUser() user: { id: string },
    @Body('docUrls') docUrls: string[],
  ) {
    return this.businessesService.submitVerification(businessId, user.id, docUrls);
  }

  @Get('admin/pending-verification')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'MODERATOR')
  getPendingVerifications() {
    return this.businessesService.getPendingVerifications();
  }

  @Patch(':id/verify')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'MODERATOR')
  @HttpCode(HttpStatus.OK)
  reviewVerification(
    @Param('id') businessId: string,
    @Body() body: { approved: boolean; note?: string },
  ) {
    return this.businessesService.reviewVerification(businessId, body.approved, body.note);
  }
}
