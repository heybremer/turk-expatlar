import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { SentryGlobalFilter, SentryModule } from '@sentry/nestjs/setup';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RedisModule } from './redis/redis.module';
import { FeatureFlagGuard } from './common/guards/feature-flag.guard';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { BusinessesModule } from './businesses/businesses.module';
import { ChatModule } from './chat/chat.module';
import { CourierModule } from './courier/courier.module';
import { EventsModule } from './events/events.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { FeedModule } from './feed/feed.module';
import { ForumModule } from './forum/forum.module';
import { JobsModule } from './jobs/jobs.module';
import { LocationsModule } from './locations/locations.module';
import { PrismaModule } from './prisma/prisma.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ReportsModule } from './reports/reports.module';
import { SearchModule } from './search/search.module';
import { SupportModule } from './support/support.module';
import { UsersModule } from './users/users.module';
import { NewsModule } from './news/news.module';
import { EventCalendarModule } from './event-calendar/event-calendar.module';
import { PublicHolidaysModule } from './public-holidays/public-holidays.module';
import { SiteSettingsModule } from './site-settings/site-settings.module';
import { NewsletterModule } from './newsletter/newsletter.module';
import { TasksModule } from './tasks/tasks.module';
import { TravelAnnouncementsModule } from './travel-announcements/travel-announcements.module';
import { GamificationModule } from './gamification/gamification.module';
import { TelsizModule } from './telsiz/telsiz.module';

@Module({
  imports: [
    SentryModule.forRoot(),
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    PrismaModule,
    RedisModule,
    AuthModule,
    UsersModule,
    LocationsModule,
    ForumModule,
    EventsModule,
    BusinessesModule,
    ReportsModule,
    AdminModule,
    FeedModule,
    SearchModule,
    NotificationsModule,
    JobsModule,
    CourierModule,
    SubscriptionsModule,
    ChatModule,
    SupportModule,
    NewsModule,
    EventCalendarModule,
    PublicHolidaysModule,
    SiteSettingsModule,
    NewsletterModule,
    TasksModule,
    TravelAnnouncementsModule,
    GamificationModule,
    TelsizModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: SentryGlobalFilter,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: FeatureFlagGuard,
    },
  ],
})
export class AppModule {}
