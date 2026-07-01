import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';

interface AuthSocket extends Socket {
  userId?: string;
}

/**
 * /notifications namespace — her kullanıcı kendi oda adıyla (user:<id>) dinler.
 * NotificationsService.push() bu gateway üzerinden emit eder.
 */
@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:3200',
    credentials: true,
  },
  namespace: '/notifications',
})
export class NotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;

  private logger = new Logger('NotificationGateway');

  constructor(private jwtService: JwtService) {}

  async handleConnection(client: AuthSocket) {
    const token =
      client.handshake.auth?.token ??
      client.handshake.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      client.disconnect();
      return;
    }

    try {
      const payload = this.jwtService.verify<{ sub: string }>(token);
      client.userId = payload.sub;
      client.join(`user:${payload.sub}`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthSocket) {
    if (client.userId) {
      client.leave(`user:${client.userId}`);
    }
  }

  /** Belirli bir kullanıcıya gerçek zamanlı bildirim gönder */
  pushToUser(userId: string, notification: Record<string, unknown>) {
    this.server.to(`user:${userId}`).emit('notification', notification);
  }
}
