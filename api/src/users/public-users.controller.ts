import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt.guard';
import { UsersService } from './users.service';

@ApiTags('users')
@Controller('users')
export class PublicUsersController {
  constructor(private usersService: UsersService) {}

  @Get(':id/public')
  @UseGuards(OptionalJwtAuthGuard)
  getPublicProfile(@Param('id') id: string) {
    return this.usersService.getPublicProfile(id);
  }
}
