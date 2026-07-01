import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SiteSettingsService } from './site-settings.service';

@ApiTags('site-settings')
@Controller('site-settings')
export class SiteSettingsController {
  constructor(private siteSettingsService: SiteSettingsService) {}

  @Get('public')
  getPublicSettings() {
    return this.siteSettingsService.getPublicSettings();
  }
}
