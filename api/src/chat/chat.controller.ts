import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  forwardRef,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { diskStorage } from 'multer';
import { join } from 'path';
import { existsSync, mkdirSync, unlink } from 'fs';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SubscriptionGuard } from '../common/guards/subscription.guard';
import { RequireSubscription } from '../common/decorators/require-subscription.decorator';
import { RequireFeature } from '../common/decorators/require-feature.decorator';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { ALLOWED_MIME, MAX_UPLOAD_SIZE, MIME_EXT } from './chat-upload.util';
import { LinkPreviewService } from './link-preview.service';
import type { Request } from 'express';

@ApiTags('chat')
@RequireFeature('chat')
@Controller('chat')
export class ChatController {
  constructor(
    private chatService: ChatService,
    @Inject(forwardRef(() => ChatGateway))
    private chatGateway: ChatGateway,
    private linkPreviewService: LinkPreviewService,
  ) {}

  @Get('rooms')
  listRooms() {
    return this.chatService.listPublicRooms();
  }

  @Get('link-preview')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  getLinkPreview(@Query('url') url: string) {
    if (!url) throw new BadRequestException('url gerekli');
    return this.linkPreviewService.getPreview(url);
  }

  @Get('rooms/accessible')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  listAccessibleRooms(@CurrentUser() user: { id: string }) {
    return this.chatService.listAccessibleRooms(user.id);
  }

  @Get('resolve/:type/:slug')
  resolveChat(
    @Param('type') type: 'state' | 'city' | 'global',
    @Param('slug') slug: string,
  ) {
    return this.chatService.resolveChatId(type, slug);
  }

  @Get(':chatId/region-users')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async getRegionUsers(
    @CurrentUser() user: { id: string },
    @Param('chatId') chatId: string,
  ) {
    const denied = await this.chatService.checkRoomAccess(chatId, user.id);
    if (denied) throw new ForbiddenException('Bu odaya erişiminiz yok');
    return this.chatService.getRegionUsers(chatId);
  }

  @Get(':chatId/messages')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiQuery({ name: 'before', required: false })
  async getMessages(
    @CurrentUser() user: { id: string },
    @Param('chatId') chatId: string,
    @Query('before') before?: string,
  ) {
    const denied = await this.chatService.checkRoomAccess(chatId, user.id);
    if (denied) throw new ForbiddenException('Bu odaya erişiminiz yok');
    return this.chatService.getMessages(chatId, 50, before);
  }

  @Post(':chatId/upload')
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @UseGuards(JwtAuthGuard)
  // Kullanıcı başına dakikada max 10 yükleme (disk doldurma koruması)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const dir = join(process.cwd(), 'uploads', 'chat');
          if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
          cb(null, dir);
        },
        filename: (_req, file, cb) => {
          const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
          const ext = MIME_EXT[file.mimetype] ?? '.bin';
          cb(null, `${unique}${ext}`);
        },
      }),
      limits: { fileSize: MAX_UPLOAD_SIZE },
      fileFilter: (_req, file, cb) => {
        if (ALLOWED_MIME.includes(file.mimetype)) cb(null, true);
        else cb(new BadRequestException('Desteklenmeyen dosya türü'), false);
      },
    }),
  )
  async uploadFile(
    @CurrentUser() user: { id: string },
    @Param('chatId') chatId: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ) {
    if (!file) throw new BadRequestException('Dosya bulunamadı');

    // Yükleme yalnızca erişim hakkı olan odalar için yapılabilir. Multer
    // dosyayı handler'dan önce diske yazdığı için erişim reddedilirse silinir.
    const denied = await this.chatService.checkRoomAccess(chatId, user.id);
    if (denied) {
      unlink(file.path, () => undefined);
      throw new ForbiddenException('Bu odaya dosya yükleyemezsiniz');
    }

    const protocol = req.protocol;
    const host = req.get('host');
    const url = `${protocol}://${host}/uploads/chat/${file.filename}`;
    const isImage = file.mimetype.startsWith('image/');
    const isAudio = file.mimetype.startsWith('audio/');
    return {
      url,
      name: file.originalname,
      size: file.size,
      type: isImage ? 'image' : isAudio ? 'audio' : 'file',
      mime: file.mimetype,
    };
  }

  // Oda şifresi yönetimi
  @Patch(':chatId/password')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  setRoomPassword(
    @CurrentUser() user: { id: string },
    @Param('chatId') chatId: string,
    @Body() body: { password?: string },
  ) {
    return this.chatService.setRoomPassword(
      chatId,
      user.id,
      body.password ?? null,
    );
  }

  // Mesaj silme (kendi mesajı veya admin)
  @Delete('messages/:messageId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async deleteMessage(
    @CurrentUser() user: { id: string; role?: string },
    @Param('messageId') messageId: string,
  ) {
    const msg = await this.chatService.deleteMessage(
      messageId,
      user.id,
      user.role === 'ADMIN',
    );
    // Socket üzerinden silenlerle aynı davranış: açık istemcilerden de kaldır
    this.chatGateway.emitMessageDeleted(msg.chatId, msg.id);
    return msg;
  }

  // Odadaki tüm mesajları temizle (yalnızca admin)
  @Delete(':chatId/messages')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  clearRoomMessages(
    @CurrentUser() user: { id: string },
    @Param('chatId') chatId: string,
  ) {
    return this.chatService
      .clearRoomMessages(chatId, user.id)
      .then((result) => {
        this.chatGateway.emitRoomCleared(chatId);
        return result;
      });
  }

  // DM endpoints
  @Get('dm/list')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  listMyDms(@CurrentUser() user: { id: string }) {
    return this.chatService.listMyDms(user.id);
  }

  @Get('dm/unread-count')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  getDmUnreadCount(@CurrentUser() user: { id: string }) {
    return this.chatService
      .getDmUnreadCount(user.id)
      .then((count) => ({ count }));
  }

  // Kanal başına okunmamış mesaj özeti (genel + kullanıcının bölge kanalları)
  @Get('unread-summary')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  getUnreadSummary(@CurrentUser() user: { id: string }) {
    return this.chatService.getChannelUnreadSummary(user.id);
  }

  // Kanal/DM fark etmeksizin okundu işareti (socket bağlantısı yokken)
  @Patch(':chatId/read')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async markRead(
    @CurrentUser() user: { id: string },
    @Param('chatId') chatId: string,
  ) {
    const result = await this.chatService.markRead(chatId, user.id);
    if (result.isDm) {
      this.chatGateway.emitReadReceipt(chatId, user.id, result.lastReadAt);
    }
    return result;
  }

  @Patch('dm/:chatId/read')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  markDmRead(
    @CurrentUser() user: { id: string },
    @Param('chatId') chatId: string,
  ) {
    return this.chatService.markDmRead(chatId, user.id).then((result) => {
      this.chatGateway.emitReadReceipt(chatId, user.id, result.lastReadAt);
      return result;
    });
  }

  @Delete('dm/:chatId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  hideDm(@CurrentUser() user: { id: string }, @Param('chatId') chatId: string) {
    return this.chatService.hideDmConversation(chatId, user.id);
  }

  @Patch(':chatId/mute')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  setMute(
    @CurrentUser() user: { id: string },
    @Param('chatId') chatId: string,
    @Body() dto: { muted: boolean },
  ) {
    return this.chatService.setMute(chatId, user.id, !!dto.muted);
  }

  @Post('dm/:targetUserId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, SubscriptionGuard)
  @RequireSubscription()
  resolveDm(
    @CurrentUser() user: { id: string },
    @Param('targetUserId') targetUserId: string,
  ) {
    return this.chatService.resolveDmChat(user.id, targetUserId);
  }
}
