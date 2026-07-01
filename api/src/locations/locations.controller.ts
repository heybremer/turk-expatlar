import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { LocationsService } from './locations.service';

@ApiTags('locations')
@Controller('locations')
export class LocationsController {
  constructor(private locationsService: LocationsService) {}

  @Get('states')
  findStates() {
    return this.locationsService.findStates();
  }

  @Get('states/:slug')
  findState(@Param('slug') slug: string) {
    return this.locationsService.findStateBySlug(slug);
  }

  @Get('cities')
  findCities(@Query('stateId') stateId?: string) {
    return this.locationsService.findCities(stateId);
  }

  @Get('cities/:slug')
  findCityBySlug(@Param('slug') slug: string) {
    return this.locationsService.findCityBySlug(slug);
  }

  @Get('postal/:code')
  lookupPostal(@Param('code') code: string) {
    return this.locationsService.lookupPostalCode(code);
  }

  @Get('postal/tr/:code')
  lookupTurkishPostal(@Param('code') code: string) {
    return this.locationsService.lookupTurkishPostalCode(code);
  }
}
