import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ChatController } from './chat.controller';
import { ChatGateway } from './chat.gateway';
import { ChatModerationService } from './chat-moderation.service';
import { ChatService } from './chat.service';
import { LinkPreviewService } from './link-preview.service';
import { SubscriptionGuard } from '../common/guards/subscription.guard';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
      }),
    }),
    NotificationsModule,
  ],
  controllers: [ChatController],
  providers: [
    ChatGateway,
    ChatService,
    ChatModerationService,
    LinkPreviewService,
    SubscriptionGuard,
  ],
  exports: [ChatModerationService],
})
export class ChatModule {}
