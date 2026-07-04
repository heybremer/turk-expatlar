import { Module } from '@nestjs/common';
import { GamificationService } from './gamification.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  providers: [GamificationService],
  exports: [GamificationService],
})
export class GamificationModule {}
