import { Module } from '@nestjs/common';
import { BusinessesController } from './businesses.controller';
import { BusinessesService } from './businesses.service';
import { SubscriptionGuard } from '../common/guards/subscription.guard';
import { RolesGuard } from '../common/guards/roles.guard';

@Module({
  controllers: [BusinessesController],
  providers: [BusinessesService, SubscriptionGuard, RolesGuard],
})
export class BusinessesModule {}
