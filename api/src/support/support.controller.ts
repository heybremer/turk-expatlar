import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';
import { SupportService } from './support.service';

@ApiTags('support')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('support')
export class SupportController {
  constructor(private supportService: SupportService) {}

  @Post()
  create(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateSupportTicketDto,
  ) {
    return this.supportService.create(user.id, dto);
  }

  @Get('mine')
  findMine(@CurrentUser() user: { id: string }) {
    return this.supportService.findMine(user.id);
  }
}
