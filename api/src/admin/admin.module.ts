import { Module } from '@nestjs/common';
import { ChatModule } from '../chat/chat.module';
import { TasksModule } from '../tasks/tasks.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AuditLogService } from './audit-log.service';

@Module({
  imports: [ChatModule, TasksModule],
  controllers: [AdminController],
  providers: [AdminService, AuditLogService],
  exports: [AuditLogService],
})
export class AdminModule {}