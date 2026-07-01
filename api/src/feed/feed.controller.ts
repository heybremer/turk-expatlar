import { Controller, Get, Query } from '@nestjs/common';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { FeedService } from './feed.service';

@ApiTags('feed')
@Controller('feed')
export class FeedController {
  constructor(private feedService: FeedService) {}

  @Get('home')
  @ApiQuery({ name: 'stateId', required: false })
  @ApiQuery({ name: 'cityId', required: false })
  getHomeFeed(
    @Query('stateId') stateId?: string,
    @Query('cityId') cityId?: string,
  ) {
    return this.feedService.getHomeFeed(stateId, cityId);
  }
}
