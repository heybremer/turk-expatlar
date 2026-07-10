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
import { TelsizModerationService } from './telsiz-moderation.service';
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
  // channelId → Set<socketId>  (el kaldıranlar)
  private handRaises = new Map<string, Set<string>>();

  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
    private moderation: TelsizModerationService,
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
    // Aktif el kaldırmaları ilet
    this.broadcastHandRaises(channelId);
  }

  @SubscribeMessage('leave_channel')
  handleLeave(@ConnectedSocket() client: TelsizSocket) {
    this.removeFromChannel(client);
  }

  @SubscribeMessage('ptt_start')
  async handlePttStart(
    @ConnectedSocket() client: TelsizSocket,
    @MessageBody() data: { channelId: string },
  ) {
    if (!client.userId) return;
    const channelId = data?.channelId;
    if (!channelId || client.channelId !== channelId) return;

    // Susturulmuş mu kontrol et
    const muteUntil = await this.moderation.getMuteUntil(client.userId);
    if (muteUntil) {
      const mins = Math.ceil((muteUntil.getTime() - Date.now()) / 60_000);
      client.emit('ptt_denied', {
        channelId,
        userId: '',
        displayName: `Susturuldunuz — ${mins} dk kaldı`,
        muted: true,
      });
      return;
    }

    const active = this.speaker.get(channelId);
    if (active && active.socketId !== client.id) {
      // Kanal meşgul — el kaldır
      const raises =
        this.handRaises.get(channelId) ?? new Set<string>();
      raises.add(client.id);
      this.handRaises.set(channelId, raises);
      this.broadcastHandRaises(channelId);

      client.emit('ptt_denied', {
        channelId,
        userId: active.userId,
        displayName: active.displayName,
        muted: false,
      });
      return;
    }

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

  @SubscribeMessage('ptt_chunk')
  handlePttChunk(
    @ConnectedSocket() client: TelsizSocket,
    @MessageBody() data: { channelId: string; pcm: string; rate?: number },
  ) {
    if (!client.userId) return;
    const channelId = data?.channelId;
    if (!channelId || client.channelId !== channelId) return;

    const active = this.speaker.get(channelId);
    if (!active || active.socketId !== client.id) return;

    if (typeof data.pcm !== 'string' || data.pcm.length === 0) return;
    if (data.pcm.length > 64_000) return;

    const rate =
      typeof data.rate === 'number' && data.rate >= 8000 && data.rate <= 48000
        ? data.rate
        : 16000;

    client.to(telsizRoom(channelId)).emit('voice_chunk', {
      channelId,
      userId: client.userId,
      displayName: client.displayName ?? 'Gezgin',
      pcm: data.pcm,
      rate,
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

    const active = this.speaker.get(channelId);
    if (!active || active.socketId !== client.id) return;

    if (typeof data.audio !== 'string' || data.audio.length === 0) return;
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
    // El kaldırma varsa temizle
    this.lowerHand(channelId, client.id);
    this.releaseSpeaker(channelId, client.id);
  }

  @SubscribeMessage('telsiz_report')
  async handleReport(
    @ConnectedSocket() client: TelsizSocket,
    @MessageBody() data: { channelId: string; reportedUserId: string },
  ) {
    if (!client.userId) return;
    const channelId = data?.channelId ?? client.channelId;
    if (!channelId || !data?.reportedUserId) return;

    const result = await this.moderation.report(
      client.userId,
      data.reportedUserId,
      channelId,
    );

    if (result.alreadyReported) {
      client.emit('report_result', {
        success: false,
        message: 'Bu kullanıcıyı daha önce zaten şikayet ettiniz.',
      });
      return;
    }

    client.emit('report_result', {
      success: true,
      warned: result.warned ?? false,
      muted: result.muted ?? false,
      message: result.warned
        ? 'Şikayetiniz iletildi. Kullanıcı uyarıldı.'
        : result.muted
          ? 'Şikayetiniz iletildi. Kullanıcı 1 saat susturuldu.'
          : 'Şikayetiniz alındı.',
    });

    // Susturma uygulandıysa aktif konuşmayı kes
    if (result.muted) {
      const active = this.speaker.get(channelId);
      if (active && active.userId === data.reportedUserId) {
        this.releaseSpeaker(channelId, active.socketId);
      }
    }
  }

  private lowerHand(channelId: string, socketId: string) {
    const raises = this.handRaises.get(channelId);
    if (!raises) return;
    raises.delete(socketId);
    if (raises.size === 0) this.handRaises.delete(channelId);
    this.broadcastHandRaises(channelId);
  }

  private releaseSpeaker(channelId: string, socketId: string) {
    const active = this.speaker.get(channelId);
    if (!active || active.socketId !== socketId) return;
    clearTimeout(active.timeout);
    this.speaker.delete(channelId);
    this.server.to(telsizRoom(channelId)).emit('speaker_end', { channelId });
    // Konuşmacı bitince el kaldıranları da kanala bildir
    this.broadcastHandRaises(channelId);
  }

  private removeFromChannel(client: TelsizSocket) {
    const channelId = client.channelId;
    if (!channelId) return;

    this.releaseSpeaker(channelId, client.id);
    this.lowerHand(channelId, client.id);

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

  private broadcastHandRaises(channelId: string) {
    const raises = this.handRaises.get(channelId) ?? new Set<string>();
    const members = this.presence.get(channelId) ?? new Map<string, ChannelMember>();
    // socketId → userId dönüşümü, tekilleştir
    const userIds = new Set<string>();
    for (const socketId of raises) {
      const member = members.get(socketId);
      if (member) userIds.add(member.userId);
    }
    this.server.to(telsizRoom(channelId)).emit('hand_raises', {
      channelId,
      userIds: [...userIds],
    });
  }
}
