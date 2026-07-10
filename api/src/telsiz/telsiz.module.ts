import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TelsizController } from './telsiz.controller';
import { TelsizGateway } from './telsiz.gateway';
import { TelsizModerationService } from './telsiz-moderation.service';
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
  controllers: [TelsizController],
  providers: [TelsizGateway, TelsizModerationService],
})
export class TelsizModule {}
