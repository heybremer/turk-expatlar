import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { NewsletterService } from './newsletter.service';

@ApiTags('admin-newsletter')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/newsletter')
export class AdminNewsletterController {
  constructor(private newsletter: NewsletterService) {}

  @Get('preview')
  previewWeeklyDigest() {
    return this.newsletter.buildWeeklyDigestPreview();
  }
}
