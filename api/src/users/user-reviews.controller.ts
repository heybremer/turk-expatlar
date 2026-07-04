import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreateUserReviewDto } from './dto/create-user-review.dto';
import { UserReviewsService } from './user-reviews.service';

@ApiTags('users')
@Controller('users')
export class UserReviewsController {
  constructor(private reviewsService: UserReviewsService) {}

  @Get(':id/reviews')
  list(@Param('id') targetUserId: string) {
    return this.reviewsService.list(targetUserId);
  }

  @Post(':id/reviews')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  create(
    @Param('id') targetUserId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateUserReviewDto,
  ) {
    return this.reviewsService.create(targetUserId, user.id, dto);
  }

  @Patch('reviews/:reviewId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  update(
    @Param('reviewId') reviewId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateUserReviewDto,
  ) {
    return this.reviewsService.update(reviewId, user.id, dto);
  }

  @Delete('reviews/:reviewId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  remove(
    @Param('reviewId') reviewId: string,
    @CurrentUser() user: { id: string; role?: string },
  ) {
    return this.reviewsService.remove(
      reviewId,
      user.id,
      user.role === 'ADMIN' || user.role === 'MODERATOR',
    );
  }
}
