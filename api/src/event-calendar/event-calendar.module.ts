import { Module } from '@nestjs/common';
import { EventCalendarController } from './event-calendar.controller';
import { EventCalendarService } from './event-calendar.service';

@Module({
  controllers: [EventCalendarController],
  providers: [EventCalendarService],
  exports: [EventCalendarService],
})
export class EventCalendarModule {}
