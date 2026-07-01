import { Module } from '@nestjs/common';
import { ChatModule } from '../chat/chat.module';
import { TasksModule } from '../tasks/tasks.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [ChatModule, TasksModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}