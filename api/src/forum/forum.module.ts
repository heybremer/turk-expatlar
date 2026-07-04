import { Module } from '@nestjs/common';
import { ForumController } from './forum.controller';
import { ForumService } from './forum.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { ContentModerationService } from '../common/content-moderation.service';
import { GamificationModule } from '../gamification/gamification.module';

@Module({
  imports: [NotificationsModule, GamificationModule],
  controllers: [ForumController],
  providers: [ForumService, ContentModerationService],
})
export class ForumModule {}
