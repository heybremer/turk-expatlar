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
import { CourierDirection, CourierStatus } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt.guard';
import { CourierService } from './courier.service';
import { AcceptCourierDto } from './dto/accept-courier.dto';
import { CreateCourierRequestDto } from './dto/create-courier-request.dto';

@ApiTags('courier')
@Controller('courier')
export class CourierController {
  constructor(private courierService: CourierService) {}

  @Get('requests')
  @ApiQuery({ name: 'direction', required: false, enum: CourierDirection })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'status', required: false, description: 'OPEN, MATCHED, COMPLETED veya virgülle ayrılmış' })
  findRequests(
    @Query('page') page?: string,
    @Query('direction') direction?: CourierDirection,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    const parsedStatus = status
      ? status.includes(',')
        ? (status.split(',').map((s) => s.trim()) as CourierStatus[])
        : (status as CourierStatus)
      : undefined;

    return this.courierService.findRequests({
      page: page ? parseInt(page, 10) : undefined,
      direction,
      search,
      status: parsedStatus,
    });
  }

  @Get('requests/:id')
  @UseGuards(OptionalJwtAuthGuard)
  findRequest(
    @Param('id') id: string,
    @CurrentUser() user?: { id: string },
  ) {
    return this.courierService.findRequest(id, user?.id);
  }

  @Post('requests')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  createRequest(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateCourierRequestDto,
  ) {
    return this.courierService.createRequest(user.id, dto);
  }

  @Post('requests/:id/accept')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  accept(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: AcceptCourierDto,
  ) {
    return this.courierService.accept(id, user.id, dto);
  }

  @Patch('requests/:id/confirm/:acceptanceId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  confirm(
    @Param('id') id: string,
    @Param('acceptanceId') acceptanceId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.courierService.confirm(id, acceptanceId, user.id);
  }

  @Patch('requests/:id/complete')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  complete(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.courierService.complete(id, user.id);
  }

  @Patch('requests/:id/cancel')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  cancel(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.courierService.cancel(id, user.id);
  }
}
