import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CourierDirection } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt.guard';
import { TravelAnnouncementsService } from './travel-announcements.service';
import { CreateTravelAnnouncementDto } from './dto/create-travel-announcement.dto';
import { CreateTravelRequestDto } from './dto/create-travel-request.dto';

@ApiTags('travel-announcements')
@Controller('travel-announcements')
export class TravelAnnouncementsController {
  constructor(private service: TravelAnnouncementsService) {}

  @Get()
  findAll(
    @Query('direction') direction?: CourierDirection,
    @Query('page') page?: string,
  ) {
    return this.service.findAll({
      direction,
      page: page ? parseInt(page, 10) : undefined,
    });
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  findOne(
    @Param('id') id: string,
    @CurrentUser() user?: { id: string },
  ) {
    return this.service.findOne(id, user?.id);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  create(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateTravelAnnouncementDto,
  ) {
    return this.service.create(user.id, dto);
  }

  @Post(':id/requests')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  createRequest(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateTravelRequestDto,
  ) {
    return this.service.createRequest(id, user.id, dto);
  }

  @Patch(':id/requests/:reqId/accept')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  acceptRequest(
    @Param('id') id: string,
    @Param('reqId') reqId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.service.respondRequest(id, reqId, user.id, true);
  }

  @Patch(':id/requests/:reqId/decline')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  declineRequest(
    @Param('id') id: string,
    @Param('reqId') reqId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.service.respondRequest(id, reqId, user.id, false);
  }

  @Patch(':id/close')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  close(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.service.closeAnnouncement(id, user.id);
  }
}
