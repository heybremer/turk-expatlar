import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationGateway } from './notification.gateway';
import { WebPushService } from './web-push.service';
import { ExpoPushService } from './expo-push.service';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationGateway, WebPushService, ExpoPushService],
  exports: [NotificationsService, NotificationGateway, WebPushService, ExpoPushService],
})
export class NotificationsModule {}
