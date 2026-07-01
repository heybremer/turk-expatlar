import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { UpdateSiteSettingsDto } from './dto/update-site-settings.dto';
import { SiteSettingsService } from './site-settings.service';

@ApiTags('admin-site-settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/site-settings')
export class AdminSiteSettingsController {
  constructor(private siteSettingsService: SiteSettingsService) {}

  @Get()
  getSettings() {
    return this.siteSettingsService.getSettings();
  }

  @Patch()
  updateSettings(
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateSiteSettingsDto,
  ) {
    return this.siteSettingsService.updateSettings(user.id, dto);
  }

  @Post('clear-cache')
  clearCache() {
    return this.siteSettingsService.clearCaches();
  }
}
