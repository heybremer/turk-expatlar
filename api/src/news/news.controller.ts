import { Controller, ForbiddenException, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { isAppFeatureEnabled } from '../site-settings/runtime-config.store';
import { NewsService } from './news.service';

@ApiTags('news')
@Controller('news')
export class NewsController {
  constructor(private newsService: NewsService) {}

  /** GET /api/news/state?stateName=Bayern */
  @Get('state')
  getStateNews(@Query('stateName') stateName: string) {
    if (!isAppFeatureEnabled('appStateNewsEnabled')) {
      throw new ForbiddenException('Eyalet haberleri şu an kapalı.');
    }
    return this.newsService.getStateNews(stateName ?? '');
  }

  /** GET /api/news/city?cityName=Köln&stateName=Nordrhein-Westfalen */
  @Get('city')
  getCityNews(
    @Query('cityName') cityName: string,
    @Query('stateName') stateName?: string,
  ) {
    if (!isAppFeatureEnabled('appCityNewsEnabled')) {
      throw new ForbiddenException('Şehir haberleri şu an kapalı.');
    }
    return this.newsService.getCityNews(cityName ?? '', stateName);
  }

  /** GET /api/news/states — list of supported states */
  @Get('states')
  getAvailableStates() {
    return this.newsService.getAvailableStates();
  }

  /** GET /api/news/cities — list of cities with dedicated feeds */
  @Get('cities')
  getAvailableCities() {
    return this.newsService.getAvailableCities();
  }
}
