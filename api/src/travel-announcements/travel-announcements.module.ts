import { Module } from '@nestjs/common';
import { TravelAnnouncementsController } from './travel-announcements.controller';
import { TravelAnnouncementsService } from './travel-announcements.service';

@Module({
  controllers: [TravelAnnouncementsController],
  providers: [TravelAnnouncementsService],
})
export class TravelAnnouncementsModule {}
