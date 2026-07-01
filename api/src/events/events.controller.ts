import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AttendeeStatus, UserRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequireFeature } from '../common/decorators/require-feature.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateEventDto } from './dto/create-event.dto';
import { EventsService } from './events.service';

@ApiTags('events')
@RequireFeature('events')
@Controller('events')
export class EventsController {
  constructor(private eventsService: EventsService) {}

  @Get()
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'stateId', required: false })
  @ApiQuery({ name: 'cityId', required: false })
  @ApiQuery({ name: 'priceType', required: false, enum: ['FREE', 'PAID'] })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'thisWeek', required: false, type: Boolean })
  findEvents(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('stateId') stateId?: string,
    @Query('cityId') cityId?: string,
    @Query('priceType') priceType?: string,
    @Query('category') category?: string,
    @Query('thisWeek') thisWeek?: string,
  ) {
    return this.eventsService.findEvents({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      stateId,
      cityId,
      priceType,
      category,
      thisWeek: thisWeek === 'true',
    });
  }

  @Get(':id')
  findEvent(@Param('id') id: string) {
    return this.eventsService.findEvent(id);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  createEvent(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateEventDto,
  ) {
    return this.eventsService.createEvent(user.id, dto);
  }

  @Post(':id/attend')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  attend(
    @Param('id') eventId: string,
    @CurrentUser() user: { id: string },
    @Query('status') status?: AttendeeStatus,
  ) {
    return this.eventsService.attend(eventId, user.id, status);
  }

  // Admin endpoints
  @Get('admin/pending')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  findPendingEvents() {
    return this.eventsService.findPendingEvents();
  }

  @Patch(':id/approve')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  approveEvent(@Param('id') id: string) {
    return this.eventsService.approveEvent(id);
  }

  @Patch(':id/reject')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  rejectEvent(@Param('id') id: string, @Body('reason') reason?: string) {
    return this.eventsService.rejectEvent(id, reason);
  }
}
