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
import { PrismaService } from '../prisma/prisma.service';
import { isValidChannel, telsizRoom } from './telsiz.channels';

interface TelsizSocket extends Socket {
  userId?: string;
  displayName?: string;
  avatarUrl?: string | null;
  channelId?: string;
}

interface ChannelMember {
  userId: string;
  displayName: string;
  avatarUrl?: string | null;
  socketId: string;
}

// Ses paketleri base64 taşınır; tek bir bas-konuş klibi ~2 MB'ı aşmasın
const MAX_AUDIO_BYTES = 2 * 1024 * 1024;
// Bir konuşmacının tek seferde kanalı meşgul tutabileceği azami süre (ms)
const MAX_TALK_MS = 30_000;

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:3200',
    credentials: true,
  },
  namespace: '/telsiz',
  maxHttpBufferSize: 3 * 1024 * 1024,
})
export class TelsizGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  // channelId → socketId → üye
  private presence = new Map<string, Map<string, ChannelMember>>();
  // channelId → o an konuşan kişi (yarı-çift yönlü kilit)
  private speaker = new Map<
    string,
    {
      userId: string;
      displayName: string;
      socketId: string;
      timeout: NodeJS.Timeout;
    }
  >();

  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async handleConnection(client: TelsizSocket) {
    try {
      const auth = client.handshake.auth as { token?: string } | undefined;
      const token =
        auth?.token ??
        client.handshake.headers?.authorization?.replace('Bearer ', '');
      if (!token) {
        client.disconnect();
        return;
      }
      const payload = this.jwtService.verify<{ sub: string }>(token);
      const profile = await this.prisma.profile.findUnique({
        where: { userId: payload.sub },
        select: { displayName: true, avatarUrl: true },
      });
      client.userId = payload.sub;
      client.displayName = profile?.displayName ?? 'Gezgin';
      client.avatarUrl = profile?.avatarUrl ?? null;
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: TelsizSocket) {
    this.removeFromChannel(client);
  }

  @SubscribeMessage('join_channel')
  handleJoin(
    @ConnectedSocket() client: TelsizSocket,
    @MessageBody() data: { channelId: string },
  ) {
    if (!client.userId) return;
    const channelId = data?.channelId;
    if (!channelId || !isValidChannel(channelId)) {
      client.emit('telsiz_error', { message: 'Geçersiz kanal' });
      return;
    }

    // Önceki kanaldan çık
    if (client.channelId && client.channelId !== channelId) {
      this.removeFromChannel(client);
    }

    client.channelId = channelId;
    void client.join(telsizRoom(channelId));

    const members =
      this.presence.get(channelId) ?? new Map<string, ChannelMember>();
    members.set(client.id, {
      userId: client.userId,
      displayName: client.displayName ?? 'Gezgin',
      avatarUrl: client.avatarUrl,
      socketId: client.id,
    });
    this.presence.set(channelId, members);

    this.broadcastPresence(channelId);

    // Kanal meşgulse yeni katılan da bilsin
    const active = this.speaker.get(channelId);
    if (active) {
      client.emit('speaker_start', {
        channelId,
        userId: active.userId,
        displayName: active.displayName,
      });
    }
  }

  @SubscribeMessage('leave_channel')
  handleLeave(@ConnectedSocket() client: TelsizSocket) {
    this.removeFromChannel(client);
  }

  @SubscribeMessage('ptt_start')
  handlePttStart(
    @ConnectedSocket() client: TelsizSocket,
    @MessageBody() data: { channelId: string },
  ) {
    if (!client.userId) return;
    const channelId = data?.channelId;
    if (!channelId || client.channelId !== channelId) return;

    const active = this.speaker.get(channelId);
    if (active && active.socketId !== client.id) {
      // Kanal meşgul — başka biri konuşuyor
      client.emit('ptt_denied', {
        channelId,
        userId: active.userId,
        displayName: active.displayName,
      });
      return;
    }

    // Kilidi al; süre aşımına karşı otomatik serbest bırak
    const timeout = setTimeout(() => {
      this.releaseSpeaker(channelId, client.id);
    }, MAX_TALK_MS);

    this.speaker.set(channelId, {
      userId: client.userId,
      displayName: client.displayName ?? 'Gezgin',
      socketId: client.id,
      timeout,
    });

    client.emit('ptt_granted', { channelId });
    client.to(telsizRoom(channelId)).emit('speaker_start', {
      channelId,
      userId: client.userId,
      displayName: client.displayName ?? 'Gezgin',
    });
  }

  @SubscribeMessage('ptt_audio')
  handlePttAudio(
    @ConnectedSocket() client: TelsizSocket,
    @MessageBody()
    data: {
      channelId: string;
      audio: string;
      mime: string;
      durationMs?: number;
    },
  ) {
    if (!client.userId) return;
    const channelId = data?.channelId;
    if (!channelId || client.channelId !== channelId) return;

    // Yalnızca kilidi elinde tutan konuşabilir
    const active = this.speaker.get(channelId);
    if (!active || active.socketId !== client.id) return;

    if (typeof data.audio !== 'string' || data.audio.length === 0) return;
    // base64 boyutu ≈ 4/3 * bytes; kaba üst sınır kontrolü
    if (data.audio.length > (MAX_AUDIO_BYTES * 4) / 3) return;

    client.to(telsizRoom(channelId)).emit('voice', {
      channelId,
      userId: client.userId,
      displayName: client.displayName ?? 'Gezgin',
      audio: data.audio,
      mime: data.mime || 'audio/webm',
      durationMs: data.durationMs ?? 0,
    });
  }

  @SubscribeMessage('ptt_end')
  handlePttEnd(
    @ConnectedSocket() client: TelsizSocket,
    @MessageBody() data: { channelId: string },
  ) {
    const channelId = data?.channelId ?? client.channelId;
    if (!channelId) return;
    this.releaseSpeaker(channelId, client.id);
  }

  private releaseSpeaker(channelId: string, socketId: string) {
    const active = this.speaker.get(channelId);
    if (!active || active.socketId !== socketId) return;
    clearTimeout(active.timeout);
    this.speaker.delete(channelId);
    this.server.to(telsizRoom(channelId)).emit('speaker_end', { channelId });
  }

  private removeFromChannel(client: TelsizSocket) {
    const channelId = client.channelId;
    if (!channelId) return;

    // Konuşuyorsa kilidi bırak
    this.releaseSpeaker(channelId, client.id);

    const members = this.presence.get(channelId);
    if (members) {
      members.delete(client.id);
      if (members.size === 0) this.presence.delete(channelId);
    }
    void client.leave(telsizRoom(channelId));
    client.channelId = undefined;
    this.broadcastPresence(channelId);
  }

  private broadcastPresence(channelId: string) {
    const members = this.presence.get(channelId);
    // Aynı kullanıcının birden fazla sekmesini tekilleştir
    const byUser = new Map<string, ChannelMember>();
    for (const m of members?.values() ?? []) {
      if (!byUser.has(m.userId)) byUser.set(m.userId, m);
    }
    const users = [...byUser.values()].map((m) => ({
      userId: m.userId,
      displayName: m.displayName,
      avatarUrl: m.avatarUrl,
    }));
    this.server.to(telsizRoom(channelId)).emit('presence', {
      channelId,
      users,
      count: users.length,
    });
  }
}
