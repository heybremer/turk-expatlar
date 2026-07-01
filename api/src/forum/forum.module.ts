import { Module } from '@nestjs/common';
import { ForumController } from './forum.controller';
import { ForumService } from './forum.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { ContentModerationService } from '../common/content-moderation.service';

@Module({
  imports: [NotificationsModule],
  controllers: [ForumController],
  providers: [ForumService, ContentModerationService],
})
export class ForumModule {}
