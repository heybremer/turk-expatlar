import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface ExpoPushPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

@Injectable()
export class ExpoPushService {
  private readonly logger = new Logger(ExpoPushService.name);

  constructor(private prisma: PrismaService) {}

  async setToken(userId: string, token: string | null) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { expoPushToken: token?.trim() ? token.trim() : null },
    });
  }

  async sendToUser(userId: string, payload: ExpoPushPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { expoPushToken: true },
    });
    const token = user?.expoPushToken;
    if (!token) return;

    const invalid = await this.send(token, payload);
    if (invalid) {
      // Token artık geçerli değil (cihaz kaldırıldı/yeniden yüklendi) — temizle
      await this.prisma.user.updateMany({
        where: { id: userId, expoPushToken: token },
        data: { expoPushToken: null },
      });
    }
  }

  /** Returns true if the token turned out to be invalid (DeviceNotRegistered). */
  private async send(token: string, payload: ExpoPushPayload): Promise<boolean> {
    try {
      const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
        },
        body: JSON.stringify({
          to: token,
          title: payload.title,
          body: payload.body,
          data: payload.data ?? {},
          sound: 'default',
          priority: 'high',
        }),
      });
      const json = (await res.json().catch(() => null)) as {
        data?: { status?: string; details?: { error?: string } };
      } | null;
      const ticket = json?.data;
      if (ticket?.status === 'error') {
        if (ticket.details?.error === 'DeviceNotRegistered') return true;
        this.logger.warn(`Expo push reddedildi: ${ticket.details?.error ?? 'bilinmeyen hata'}`);
      }
      return false;
    } catch (err) {
      this.logger.warn('Expo push gönderimi başarısız', err as Error);
      return false;
    }
  }
}
