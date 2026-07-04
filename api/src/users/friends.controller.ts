import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { FriendsService } from './friends.service';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class FriendsController {
  constructor(private friendsService: FriendsService) {}

  @Get('friends')
  listFriends(@CurrentUser() user: { id: string }) {
    return this.friendsService.listFriends(user.id);
  }

  @Get('friend-requests/incoming')
  listIncoming(@CurrentUser() user: { id: string }) {
    return this.friendsService.listIncomingRequests(user.id);
  }

  @Get('friend-requests/outgoing')
  listOutgoing(@CurrentUser() user: { id: string }) {
    return this.friendsService.listOutgoingRequests(user.id);
  }

  @Get(':userId/friendship-status')
  getStatus(
    @CurrentUser() user: { id: string },
    @Param('userId') userId: string,
  ) {
    return this.friendsService.getStatus(user.id, userId);
  }

  @Post(':userId/friend-request')
  sendRequest(
    @CurrentUser() user: { id: string },
    @Param('userId') userId: string,
  ) {
    return this.friendsService.sendRequest(user.id, userId);
  }

  @Post('friend-requests/:requestId/accept')
  acceptRequest(
    @CurrentUser() user: { id: string },
    @Param('requestId') requestId: string,
  ) {
    return this.friendsService.acceptRequest(requestId, user.id);
  }

  @Delete('friend-requests/:requestId')
  rejectRequest(
    @CurrentUser() user: { id: string },
    @Param('requestId') requestId: string,
  ) {
    return this.friendsService.rejectRequest(requestId, user.id);
  }

  @Delete(':userId/friend')
  removeFriend(
    @CurrentUser() user: { id: string },
    @Param('userId') userId: string,
  ) {
    return this.friendsService.removeFriend(user.id, userId);
  }
}
