import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ForumBotService } from './forum-bot.service';
import { TasksService } from './tasks.service';

@Module({
  imports: [PrismaModule],
  providers: [TasksService, ForumBotService],
  exports: [ForumBotService],
})
export class TasksModule {}
