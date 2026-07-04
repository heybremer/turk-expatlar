import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationGateway } from './notification.gateway';
import { WebPushService } from './web-push.service';
import { ExpoPushService } from './expo-push.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationGateway,
    WebPushService,
    ExpoPushService,
  ],
  exports: [
    NotificationsService,
    NotificationGateway,
    WebPushService,
    ExpoPushService,
  ],
})
export class NotificationsModule {}
