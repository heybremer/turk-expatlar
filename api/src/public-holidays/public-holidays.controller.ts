import { Controller, Get, Header, Query, Res } from '@nestjs/common';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { PublicHolidaysService } from './public-holidays.service';

@ApiTags('public-holidays')
@Controller('public-holidays')
export class PublicHolidaysController {
  constructor(private publicHolidaysService: PublicHolidaysService) {}

  @Get('states')
  getStates() {
    return this.publicHolidaysService.getStates();
  }

  @Get()
  @ApiQuery({ name: 'state', required: true })
  @ApiQuery({ name: 'year', required: false })
  getHolidays(
    @Query('state') state: string,
    @Query('year') year?: string,
  ) {
    return this.publicHolidaysService.getHolidays(
      state,
      year ? parseInt(year, 10) : undefined,
    );
  }

  @Get('overview')
  @ApiQuery({ name: 'year', required: false })
  getOverview(@Query('year') year?: string) {
    return this.publicHolidaysService.getOverview(
      year ? parseInt(year, 10) : undefined,
    );
  }

  @Get('feed.ics')
  @Header('Content-Type', 'text/calendar; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=86400')
  @ApiQuery({ name: 'state', required: true })
  @ApiQuery({ name: 'year', required: false })
  getFeed(
    @Query('state') state: string,
    @Query('year') year: string | undefined,
    @Res() res: Response,
  ) {
    const y = year ? parseInt(year, 10) : new Date().getFullYear();
    const slug = (state || 'almanya')
      .toLowerCase()
      .replace(/ä/g, 'ae')
      .replace(/ö/g, 'oe')
      .replace(/ü/g, 'ue')
      .replace(/ß/g, 'ss')
      .replace(/\W+/g, '-');
    const ics = this.publicHolidaysService.generateIcsFeed(state, y);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="tatil-gunleri-${slug}-${y}.ics"`,
    );
    res.send(ics);
  }
}
