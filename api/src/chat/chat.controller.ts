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
import { diskStorage } from 'multer';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SubscriptionGuard } from '../common/guards/subscription.guard';
import { RequireSubscription } from '../common/decorators/require-subscription.decorator';
import { RequireFeature } from '../common/decorators/require-feature.decorator';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { LinkPreviewService } from './link-preview.service';
import type { Request } from 'express';

// MIME -> güvenli dosya uzantısı eşlemesi. Uzantı istemcinin gönderdiği
// dosya adından DEĞİL, doğrulanan MIME türünden türetilir (XSS/HTML yükleme koruması).
const MIME_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    '.docx',
  'audio/m4a': '.m4a',
  'audio/x-m4a': '.m4a',
  'audio/mp4': '.m4a',
  'audio/mpeg': '.mp3',
  'audio/wav': '.wav',
  'audio/x-wav': '.wav',
  'audio/aac': '.aac',
  'audio/webm': '.webm',
};
const ALLOWED_MIME = Object.keys(MIME_EXT);
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

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
      limits: { fileSize: MAX_SIZE },
      fileFilter: (_req, file, cb) => {
        if (ALLOWED_MIME.includes(file.mimetype)) cb(null, true);
        else cb(new BadRequestException('Desteklenmeyen dosya türü'), false);
      },
    }),
  )
  uploadFile(@UploadedFile() file: Express.Multer.File, @Req() req: Request) {
    if (!file) throw new BadRequestException('Dosya bulunamadı');
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
  deleteMessage(
    @CurrentUser() user: { id: string; role?: string },
    @Param('messageId') messageId: string,
  ) {
    return this.chatService.deleteMessage(
      messageId,
      user.id,
      user.role === 'ADMIN',
    );
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
