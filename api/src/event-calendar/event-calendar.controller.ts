import { Controller, Get, Query } from '@nestjs/common';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { RequireFeature } from '../common/decorators/require-feature.decorator';
import { EventCalendarService } from './event-calendar.service';

@ApiTags('event-calendar')
@RequireFeature('events')
@Controller('event-calendar')
export class EventCalendarController {
  constructor(private eventCalendarService: EventCalendarService) {}

  @Get('events')
  @ApiQuery({ name: 'city', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'search', required: false })
  getEvents(
    @Query('city') city?: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
  ) {
    return this.eventCalendarService.getEvents({ city, category, search });
  }

  @Get('cities')
  getFeaturedCities() {
    return this.eventCalendarService.getFeaturedCities();
  }
}
