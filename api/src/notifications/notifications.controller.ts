import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';
import { WebPushService } from './web-push.service';
import { ExpoPushService } from './expo-push.service';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(
    private notificationsService: NotificationsService,
    private webPushService: WebPushService,
    private expoPushService: ExpoPushService,
  ) {}

  @Get()
  list(@CurrentUser() user: { id: string }) {
    return this.notificationsService.list(user.id);
  }

  @Get('unread-count')
  unreadCount(@CurrentUser() user: { id: string }) {
    return this.notificationsService.unreadCount(user.id);
  }

  @Patch(':id/read')
  markRead(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.notificationsService.markRead(user.id, id);
  }

  @Patch('read-all')
  markAllRead(@CurrentUser() user: { id: string }) {
    return this.notificationsService.markAllRead(user.id);
  }

  // ─── Web Push ──────────────────────────────────────────────────────────────

  @Get('vapid-public-key')
  getVapidPublicKey() {
    return { publicKey: process.env.VAPID_PUBLIC_KEY ?? '' };
  }

  @Post('push-subscribe')
  subscribe(
    @CurrentUser() user: { id: string },
    @Body() body: { endpoint: string; keys: { p256dh: string; auth: string } },
  ) {
    return this.webPushService.subscribe(user.id, body);
  }

  @Delete('push-unsubscribe')
  unsubscribe(
    @CurrentUser() user: { id: string },
    @Body('endpoint') endpoint: string,
  ) {
    return this.webPushService.unsubscribe(user.id, endpoint);
  }

  // ─── Mobil (Expo) Push ─────────────────────────────────────────────────────

  @Post('expo-token')
  setExpoPushToken(
    @CurrentUser() user: { id: string },
    @Body('token') token: string,
  ) {
    return this.expoPushService.setToken(user.id, token);
  }

  @Delete('expo-token')
  clearExpoPushToken(@CurrentUser() user: { id: string }) {
    return this.expoPushService.setToken(user.id, null);
  }
}
