import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TelsizController } from './telsiz.controller';
import { TelsizGateway } from './telsiz.gateway';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
      }),
    }),
  ],
  controllers: [TelsizController],
  providers: [TelsizGateway],
})
export class TelsizModule {}
