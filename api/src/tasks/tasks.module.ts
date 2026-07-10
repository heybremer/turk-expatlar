import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ForumBotService } from './forum-bot.service';
import { ForumReplyBotService } from './forum-reply-bot.service';
import { TasksService } from './tasks.service';
import { GamificationModule } from '../gamification/gamification.module';
import { ForumModule } from '../forum/forum.module';

@Module({
  imports: [PrismaModule, GamificationModule, ForumModule],
  providers: [TasksService, ForumBotService, ForumReplyBotService],
  exports: [ForumBotService, ForumReplyBotService],
})
export class TasksModule {}
