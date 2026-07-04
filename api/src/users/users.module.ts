import { Module } from '@nestjs/common';
import { GamificationModule } from '../gamification/gamification.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PublicUsersController } from './public-users.controller';
import { UsersController } from './users.controller';
import { UserReviewsController } from './user-reviews.controller';
import { FriendsController } from './friends.controller';
import { UsersService } from './users.service';
import { UserReviewsService } from './user-reviews.service';
import { FriendsService } from './friends.service';

@Module({
  imports: [GamificationModule, NotificationsModule],
  controllers: [
    UsersController,
    PublicUsersController,
    UserReviewsController,
    FriendsController,
  ],
  providers: [UsersService, UserReviewsService, FriendsService],
  exports: [UsersService],
})
export class UsersModule {}
