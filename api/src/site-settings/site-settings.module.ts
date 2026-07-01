import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { EventCalendarModule } from '../event-calendar/event-calendar.module';
import { NewsModule } from '../news/news.module';
import { AuthModule } from '../auth/auth.module';
import { FeatureFlagGuard } from '../common/guards/feature-flag.guard';
import { AdminSiteSettingsController } from './admin-site-settings.controller';
import { MaintenanceMiddleware } from './maintenance.middleware';
import { SiteSettingsController } from './site-settings.controller';
import { SiteSettingsService } from './site-settings.service';

@Module({
  imports: [EventCalendarModule, NewsModule, AuthModule],
  controllers: [SiteSettingsController, AdminSiteSettingsController],
  providers: [SiteSettingsService, FeatureFlagGuard, MaintenanceMiddleware],
  exports: [SiteSettingsService, FeatureFlagGuard],
})
export class SiteSettingsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(MaintenanceMiddleware).forRoutes('*');
  }
}
