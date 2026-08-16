import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ForumBotService } from './forum-bot.service';
import { ForumReplyBotService } from './forum-reply-bot.service';
import { TasksService } from './tasks.service';
import { GamificationModule } from '../gamification/gamification.module';
import { ForumModule } from '../forum/forum.module';
import { EditorialTasksService } from './editorial-tasks.service';

@Module({
  imports: [PrismaModule, GamificationModule, ForumModule],
  providers: [
    TasksService,
    ForumBotService,
    ForumReplyBotService,
    EditorialTasksService,
  ],
  exports: [ForumBotService, ForumReplyBotService, EditorialTasksService],
})
export class TasksModule {}
