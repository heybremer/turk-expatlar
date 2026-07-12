import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';

import { HttpException } from '@nestjs/common';

import { Server, Socket } from 'socket.io';

import { JwtService } from '@nestjs/jwt';

import { ChatService } from './chat.service';

import { ChatModerationService } from './chat-moderation.service';

import { sanitizeAttachments } from './chat-upload.util';

import { ExpoPushService } from '../notifications/expo-push.service';

// Süreli mesaj üst sınırı: UI 24 saate izin verir, sunucu 7 güne kadar kabul
// eder. Node setTimeout ~24,8 günü aşan değerlerde hemen tetiklendiği için
// sınırsız değer kabul edilemez.
const MAX_EXPIRES_IN_SECONDS = 7 * 24 * 60 * 60;

export interface OnlineUser {
  userId: string;

  displayName: string;

  avatarUrl?: string | null;

  postalCountry?: string | null;

  socketId: string;
}

interface AuthSocket extends Socket {
  userId?: string;

  displayName?: string;

  avatarUrl?: string | null;

  postalCountry?: string | null;

  presenceRoomIds?: string[];

  // join_room ile girilen ve presence eklenen odalar (örn. DM'ler)
  joinedPresenceRoomIds?: Set<string>;
}

@WebSocketGateway({
  cors: {
    // main.ts ile aynı biçim: virgülle ayrılmış çoklu origin desteklenir
    origin: process.env.CORS_ORIGIN?.split(',') ?? ['http://localhost:3200'],

    credentials: true,
  },

  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  // chatId → userId → { user, refs }

  private roomPresence = new Map<
    string,
    Map<string, { user: OnlineUser; refs: number }>
  >();

  // chatId → userId → auto-stop timeout
  private typingTimers = new Map<string, Map<string, NodeJS.Timeout>>();

  constructor(
    private chatService: ChatService,

    private chatModeration: ChatModerationService,

    private jwtService: JwtService,

    private expoPush: ExpoPushService,
  ) {}

  async handleConnection(client: AuthSocket) {
    try {
      const token =
        (client.handshake.auth as { token?: string } | undefined)?.token ??
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (token) {
        const payload = this.jwtService.verify<{
          sub: string;

          displayName?: string;

          avatarUrl?: string;
        }>(token);

        client.userId = payload.sub;

        const profile = await this.chatService.getUserChatProfile(payload.sub);

        if (!profile) {
          client.userId = undefined;
          return;
        }

        client.displayName =
          profile.displayName ?? payload.displayName ?? 'Kullanıcı';

        client.avatarUrl = profile.avatarUrl ?? payload.avatarUrl ?? null;

        client.postalCountry = profile.postalCountry ?? null;

        void this.registerSitePresence(client);
      }
    } catch {
      // anonim bağlantı (sadece okuma)
    }
  }

  /** Ek URL doğrulaması için istemcinin bağlandığı API adresi (proto+host). */
  private getHandshakeBase(client: AuthSocket): string | undefined {
    const headers = client.handshake?.headers ?? {};
    const forwardedProto = headers['x-forwarded-proto'];
    const proto =
      (Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto)
        ?.split(',')[0]
        ?.trim() ?? 'http';
    const host = headers.host;
    return host ? `${proto}://${host}` : undefined;
  }

  private async registerSitePresence(client: AuthSocket) {
    if (!client.userId) return;

    try {
      const joinCheck = await this.chatModeration.checkCanJoin(client.userId);

      if (!joinCheck.allowed) return;

      const roomIds = await this.chatService.getPresenceChatIds(client.userId);

      client.presenceRoomIds = roomIds;

      for (const chatId of roomIds) {
        this.addPresence(chatId, client);
      }
    } catch {
      // presence isteğe bağlı
    }
  }

  handleDisconnect(client: AuthSocket) {
    if (!client.userId) return;

    for (const chatId of client.presenceRoomIds ?? []) {
      this.removePresence(chatId, client.userId);
    }

    for (const chatId of client.joinedPresenceRoomIds ?? []) {
      this.removePresence(chatId, client.userId);
    }
  }

  private addPresence(chatId: string, client: AuthSocket) {
    if (!client.userId) return;

    if (!this.roomPresence.has(chatId)) {
      this.roomPresence.set(chatId, new Map());
    }

    const map = this.roomPresence.get(chatId)!;

    const existing = map.get(client.userId);

    if (existing) {
      existing.refs += 1;

      existing.user = {
        userId: client.userId,

        displayName: client.displayName ?? 'Kullanıcı',

        avatarUrl: client.avatarUrl,

        postalCountry: client.postalCountry,

        socketId: client.id,
      };
    } else {
      map.set(client.userId, {
        refs: 1,

        user: {
          userId: client.userId,

          displayName: client.displayName ?? 'Kullanıcı',

          avatarUrl: client.avatarUrl,

          postalCountry: client.postalCountry,

          socketId: client.id,
        },
      });

      this.emitOnlineList(chatId);
    }
  }

  private removePresence(chatId: string, userId: string) {
    const map = this.roomPresence.get(chatId);

    if (!map) return;

    const entry = map.get(userId);

    if (!entry) return;

    entry.refs -= 1;

    if (entry.refs <= 0) {
      map.delete(userId);

      this.emitOnlineList(chatId);
    }
  }

  private emitOnlineList(chatId: string) {
    const map = this.roomPresence.get(chatId);

    const list = map ? [...map.values()].map((e) => e.user) : [];

    this.server.to(chatId).emit('online_users', list);
  }

  @SubscribeMessage('join_room')
  async handleJoin(
    @ConnectedSocket() client: AuthSocket,

    @MessageBody() data: { chatId: string; password?: string },
  ) {
    const { chatId, password } = data;

    // Oturum açmamış kullanıcılar odaya giremez
    if (!client.userId) {
      client.emit('error', {
        message: 'Sohbete katılmak için giriş yapmalısınız',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    const joinCheck = await this.chatModeration.checkCanJoin(client.userId);

    if (!joinCheck.allowed) {
      client.emit('moderation_notice', {
        message: joinCheck.message,

        code: joinCheck.code,

        bannedUntil: joinCheck.bannedUntil?.toISOString(),

        clearInput: false,
      });

      return;
    }

    const denied = await this.chatService.checkRoomAccess(
      chatId,
      client.userId,
    );

    if (denied) {
      client.emit('access_denied', denied);

      return;
    }

    const passwordOk = await this.chatService.verifyRoomPassword(
      chatId,
      password ?? '',
    );
    if (!passwordOk) {
      client.emit('password_required', { chatId });
      return;
    }

    await client.join(chatId);

    // Odaya fiilen giren kullanıcı o odada çevrimiçi görünmeli. Site geneli
    // presence yalnızca genel/eyalet/şehir kanallarını kapsadığından bu
    // olmadan özellikle DM'lerde karşı taraf hep çevrimdışı görünüyordu.
    if (!client.joinedPresenceRoomIds) {
      client.joinedPresenceRoomIds = new Set();
    }
    const alreadyTracked =
      client.joinedPresenceRoomIds.has(chatId) ||
      (client.presenceRoomIds ?? []).includes(chatId);
    if (!alreadyTracked) {
      client.joinedPresenceRoomIds.add(chatId);
      this.addPresence(chatId, client);
    }

    // Mevcut online listesini hemen gönder

    const map = this.roomPresence.get(chatId);

    const list = map ? [...map.values()].map((e) => e.user) : [];

    client.emit('online_users', list);

    try {
      const messages = await this.chatService.getMessages(chatId, 50);

      client.emit('history', messages.reverse());
    } catch {
      client.emit('error', { message: 'Oda geçmişi yüklenemedi' });
    }
  }

  @SubscribeMessage('leave_room')
  handleLeave(
    @ConnectedSocket() client: AuthSocket,

    @MessageBody() data: { chatId: string },
  ) {
    void client.leave(data.chatId);

    if (client.userId && client.joinedPresenceRoomIds?.has(data.chatId)) {
      client.joinedPresenceRoomIds.delete(data.chatId);
      this.removePresence(data.chatId, client.userId);
    }
  }

  @SubscribeMessage('send_message')
  async handleMessage(
    @ConnectedSocket() client: AuthSocket,

    @MessageBody()
    data: {
      chatId: string;

      body: string;

      attachments?: {
        url: string;
        name: string;
        size: number;
        type: string;
        mime: string;
      }[];

      expiresInSeconds?: number;

      replyToId?: string;
    },
  ) {
    if (!client.userId) {
      client.emit('error', {
        message: 'Mesaj göndermek için giriş yapmalısınız',
        code: 'AUTH_REQUIRED',
      });

      return;
    }

    const denied = await this.chatService.checkRoomAccess(
      data.chatId,
      client.userId,
    );
    if (denied) {
      client.emit('access_denied', denied);
      return;
    }

    const body = (data.body ?? '').trim();

    // Ekler istemciden geldiği gibi kullanılamaz: yalnızca bu sunucuya
    // gerçekten yüklenmiş dosyalar kabul edilir (harici URL/piksel engeli)
    const attachments = sanitizeAttachments(
      data.attachments,
      this.getHandshakeBase(client),
    );

    if (!body && attachments.length === 0) return;

    if (body.length > 1000) {
      client.emit('error', { message: 'Mesaj çok uzun (max 1000 karakter)' });

      return;
    }

    const moderation = await this.chatModeration.checkMessage(
      client.userId,

      data.chatId,

      body,
    );

    if (!moderation.allowed) {
      client.emit('moderation_notice', {
        message: moderation.message,

        code: moderation.code,

        bannedUntil: moderation.bannedUntil?.toISOString(),

        clearInput: moderation.clearInput ?? true,
      });

      return;
    }

    let expiresAt: Date | undefined;

    const expiresIn = Number(data.expiresInSeconds);
    if (Number.isFinite(expiresIn) && expiresIn > 0) {
      const clamped = Math.min(Math.floor(expiresIn), MAX_EXPIRES_IN_SECONDS);
      expiresAt = new Date(Date.now() + clamped * 1000);
    }

    const message = await this.chatService.saveMessage(
      data.chatId,

      client.userId,

      body,

      attachments,

      expiresAt,

      data.replyToId,
    );

    this.server.to(data.chatId).emit('new_message', message);

    void this.notifyDmMessage(
      data.chatId,
      client.userId,
      client.displayName ?? 'Birisi',
      body,
      attachments.length > 0,
    );

    if (expiresAt) {
      const ms = expiresAt.getTime() - Date.now();

      setTimeout(() => {
        this.server
          .to(data.chatId)
          .emit('message_deleted', { messageId: message.id });
      }, ms);
    }
  }

  @SubscribeMessage('delete_message')
  async handleDeleteMessage(
    @ConnectedSocket() client: AuthSocket,

    @MessageBody() data: { messageId: string },
  ) {
    if (!client.userId) return;

    try {
      const msg = await this.chatService.deleteMessage(
        data.messageId,
        client.userId,
      );

      this.server.to(msg.chatId).emit('message_deleted', { messageId: msg.id });
    } catch {
      client.emit('error', { message: 'Mesaj silinemedi' });
    }
  }

  @SubscribeMessage('edit_message')
  async handleEditMessage(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { messageId: string; body: string },
  ) {
    if (!client.userId) return;

    const body = (data.body ?? '').trim();
    if (body.length > 1000) {
      client.emit('error', { message: 'Mesaj çok uzun (max 1000 karakter)' });
      return;
    }

    try {
      const editable = await this.chatService.getEditableMessage(
        data.messageId,
        client.userId,
      );

      // Eki olmayan mesaj boş metne düzenlenemez (silme için ayrı akış var)
      if (!body && !editable.hasAttachments) {
        client.emit('error', { message: 'Mesaj boş olamaz' });
        return;
      }

      if (body) {
        const moderation = await this.chatModeration.checkMessage(
          client.userId,
          editable.chatId,
          body,
        );
        if (!moderation.allowed) {
          client.emit('moderation_notice', {
            message: moderation.message,
            code: moderation.code,
            bannedUntil: moderation.bannedUntil?.toISOString(),
            clearInput: moderation.clearInput ?? true,
          });
          return;
        }
      }

      const updated = await this.chatService.applyMessageEdit(
        data.messageId,
        body,
      );
      this.server.to(updated.chatId).emit('message_edited', {
        messageId: updated.id,
        body: updated.body,
        editedAt: updated.editedAt?.toISOString(),
      });
    } catch (err) {
      client.emit('error', {
        message:
          err instanceof HttpException ? err.message : 'Mesaj düzenlenemedi',
      });
    }
  }

  emitReadReceipt(chatId: string, userId: string, readAt: string) {
    this.server.to(chatId).emit('read_receipt', { chatId, userId, readAt });
  }

  emitMessageDeleted(chatId: string, messageId: string) {
    this.server.to(chatId).emit('message_deleted', { messageId });
  }

  emitRoomCleared(chatId: string) {
    this.server.to(chatId).emit('room_cleared', { chatId });
  }

  @SubscribeMessage('mark_read')
  async handleMarkRead(
    @ConnectedSocket() client: AuthSocket,

    @MessageBody() data: { chatId: string },
  ) {
    if (!client.userId) return;

    try {
      const result = await this.chatService.markRead(
        data.chatId,
        client.userId,
      );
      // "Görüldü" bildirimi yalnızca DM'lerde anlamlı
      if (result.isDm) {
        this.emitReadReceipt(data.chatId, client.userId, result.lastReadAt);
      }
    } catch {
      // Erişimi olmayan kullanıcı okundu bilgisi yayınlayamaz; sessizce yok say
    }
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: AuthSocket,

    @MessageBody() data: { chatId: string },
  ) {
    if (!client.userId) return;

    client.to(data.chatId).emit('user_typing', {
      chatId: data.chatId,

      userId: client.userId,

      displayName: client.displayName ?? 'Kullanıcı',
    });

    if (!this.typingTimers.has(data.chatId)) {
      this.typingTimers.set(data.chatId, new Map());
    }

    const roomTimers = this.typingTimers.get(data.chatId)!;

    const existing = roomTimers.get(client.userId);

    if (existing) clearTimeout(existing);

    roomTimers.set(
      client.userId,

      setTimeout(() => {
        this.clearTyping(data.chatId, client.userId!);

        client.to(data.chatId).emit('user_typing_stop', {
          chatId: data.chatId,

          userId: client.userId,
        });
      }, 3000),
    );
  }

  @SubscribeMessage('typing_stop')
  handleTypingStop(
    @ConnectedSocket() client: AuthSocket,

    @MessageBody() data: { chatId: string },
  ) {
    if (!client.userId) return;

    this.clearTyping(data.chatId, client.userId);

    client.to(data.chatId).emit('user_typing_stop', {
      chatId: data.chatId,

      userId: client.userId,
    });
  }

  @SubscribeMessage('react_message')
  async handleReactMessage(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { messageId: string; emoji: string },
  ) {
    if (!client.userId) return;

    const ALLOWED = ['👍', '❤️', '😂', '😮', '😢', '😡', '🙏', '🎉'];
    if (!ALLOWED.includes(data.emoji)) return;

    const message = await this.chatService.toggleReaction(
      data.messageId,
      client.userId,
      data.emoji,
    );

    if (!message) return;

    this.server.to(message.chatId).emit('message_reaction', {
      messageId: data.messageId,
      reactions: message.reactions,
    });
  }

  private async notifyDmMessage(
    chatId: string,
    senderId: string,
    senderName: string,
    body: string,
    hasAttachment: boolean,
  ) {
    try {
      const recipientId = await this.chatService.getDmRecipientId(
        chatId,
        senderId,
      );
      if (!recipientId) return;
      if (await this.chatService.isMuted(chatId, recipientId)) return;
      await this.expoPush.sendToUser(recipientId, {
        title: senderName,
        body: body || (hasAttachment ? '📎 Ek gönderdi' : 'Yeni mesaj'),
        data: { type: 'chat_dm', chatId, senderId },
      });
    } catch {
      // push bildirimi kritik değil, sohbet akışını engellemesin
    }
  }

  private clearTyping(chatId: string, userId: string) {
    const roomTimers = this.typingTimers.get(chatId);

    if (!roomTimers) return;

    const timer = roomTimers.get(userId);

    if (timer) clearTimeout(timer);

    roomTimers.delete(userId);

    if (roomTimers.size === 0) this.typingTimers.delete(chatId);
  }
}
