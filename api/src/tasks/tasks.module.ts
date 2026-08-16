import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ForumBotService } from './forum-bot.service';
import { ForumReplyBotService } from './forum-reply-bot.service';
import { TasksService } from './tasks.service';
import { GamificationModule } from '../gamification/gamification.module';
import { ForumModule } from '../forum/forum.module';
import { EditorialTasksService } from './editorial-tasks.service';
import { EventBotService } from './event-bot.service';

@Module({
  imports: [PrismaModule, GamificationModule, ForumModule],
  providers: [
    TasksService,
    ForumBotService,
    ForumReplyBotService,
    EditorialTasksService,
    EventBotService,
  ],
  exports: [
    ForumBotService,
    ForumReplyBotService,
    EditorialTasksService,
    EventBotService,
  ],
})
export class TasksModule {}
