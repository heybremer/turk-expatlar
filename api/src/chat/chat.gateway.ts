import {

  ConnectedSocket,

  MessageBody,

  OnGatewayConnection,

  OnGatewayDisconnect,

  SubscribeMessage,

  WebSocketGateway,

  WebSocketServer,

} from '@nestjs/websockets';

import { Server, Socket } from 'socket.io';

import { JwtService } from '@nestjs/jwt';

import { ChatService } from './chat.service';

import { ChatModerationService } from './chat-moderation.service';

import { ExpoPushService } from '../notifications/expo-push.service';



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

}



@WebSocketGateway({

  cors: {

    origin: process.env.CORS_ORIGIN ?? 'http://localhost:3200',

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

  // Mesaj rate limiting: userId → { count, resetAt }
  private msgRateMap = new Map<string, { count: number; resetAt: number }>();
  private readonly MSG_LIMIT = 20; // 30 saniyede max 20 mesaj
  private readonly MSG_WINDOW_MS = 30_000;

  constructor(

    private chatService: ChatService,

    private chatModeration: ChatModerationService,

    private jwtService: JwtService,

    private expoPush: ExpoPushService,

  ) {}



  async handleConnection(client: AuthSocket) {

    try {

      const token =

        client.handshake.auth?.token ??

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

    if (client.userId && client.presenceRoomIds) {

      for (const chatId of client.presenceRoomIds) {

        this.removePresence(chatId, client.userId);

      }

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
      client.emit('error', { message: 'Sohbete katılmak için giriş yapmalısınız', code: 'AUTH_REQUIRED' });
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



      const denied = await this.chatService.checkRoomAccess(chatId, client.userId);

      if (denied) {

        client.emit('access_denied', denied);

        return;

      }



    const roomPassword = await this.chatService.getRoomPassword(chatId);

    if (roomPassword) {

      if (!password || password !== roomPassword) {

        client.emit('password_required', { chatId });

        return;

      }

    }



    await client.join(chatId);



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

    client.leave(data.chatId);

  }



  @SubscribeMessage('send_message')

  async handleMessage(

    @ConnectedSocket() client: AuthSocket,

    @MessageBody()

    data: {

      chatId: string;

      body: string;

      attachments?: { url: string; name: string; size: number; type: string; mime: string }[];

      expiresInSeconds?: number;

      replyToId?: string;

    },

  ) {

    if (!client.userId) {

      client.emit('error', { message: 'Mesaj göndermek için giriş yapmalısınız' });

      return;

    }

    // Rate limiting kontrolü
    const now = Date.now();
    const rateEntry = this.msgRateMap.get(client.userId);
    if (!rateEntry || now > rateEntry.resetAt) {
      this.msgRateMap.set(client.userId, { count: 1, resetAt: now + this.MSG_WINDOW_MS });
    } else if (rateEntry.count >= this.MSG_LIMIT) {
      client.emit('error', { message: 'Çok fazla mesaj gönderdiniz. Lütfen bekleyin.' });
      return;
    } else {
      rateEntry.count++;
    }

    const denied = await this.chatService.checkRoomAccess(data.chatId, client.userId);
    if (denied) {
      client.emit('access_denied', denied);
      return;
    }

    const body = (data.body ?? '').trim();

    const attachments = data.attachments ?? [];

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

    if (data.expiresInSeconds && data.expiresInSeconds > 0) {

      expiresAt = new Date(Date.now() + data.expiresInSeconds * 1000);

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

    void this.notifyDmMessage(data.chatId, client.userId, client.displayName ?? 'Birisi', body, attachments.length > 0);

    if (expiresAt) {

      const ms = expiresAt.getTime() - Date.now();

      setTimeout(() => {

        this.server.to(data.chatId).emit('message_deleted', { messageId: message.id });

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

      const msg = await this.chatService.deleteMessage(data.messageId, client.userId);

      this.server.to(msg.chatId).emit('message_deleted', { messageId: msg.id });

    } catch {

      client.emit('error', { message: 'Mesaj silinemedi' });

    }

  }



  emitReadReceipt(chatId: string, userId: string, readAt: string) {

    this.server.to(chatId).emit('read_receipt', { chatId, userId, readAt });

  }



  @SubscribeMessage('mark_read')

  async handleMarkRead(

    @ConnectedSocket() client: AuthSocket,

    @MessageBody() data: { chatId: string },

  ) {

    if (!client.userId) return;

    const result = await this.chatService.markDmRead(data.chatId, client.userId);

    this.emitReadReceipt(data.chatId, client.userId, result.lastReadAt);

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

    const ALLOWED = ['👍','❤️','😂','😮','😢','😡','🙏','🎉'];
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
      const recipientId = await this.chatService.getDmRecipientId(chatId, senderId);
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

  }

}


