import { Injectable, Logger } from '@nestjs/common';
import * as webpush from 'web-push';
import { PrismaService } from '../prisma/prisma.service';

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
}

@Injectable()
export class WebPushService {
  private readonly logger = new Logger(WebPushService.name);
  private readonly enabled: boolean;

  constructor(private prisma: PrismaService) {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const email = process.env.VAPID_EMAIL ?? 'mailto:admin@turkexpatlar.de';

    this.enabled = !!(publicKey && privateKey);

    if (this.enabled) {
      webpush.setVapidDetails(email, publicKey!, privateKey!);
    }
  }

  async subscribe(
    userId: string,
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  ) {
    return this.prisma.pushSubscription.upsert({
      where: { userId_endpoint: { userId, endpoint: subscription.endpoint } },
      update: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
      create: {
        userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
    });
  }

  async unsubscribe(userId: string, endpoint: string) {
    return this.prisma.pushSubscription.deleteMany({
      where: { userId, endpoint },
    });
  }

  async pushToUser(userId: string, payload: PushPayload) {
    if (!this.enabled) return;

    const subs = await this.prisma.pushSubscription.findMany({
      where: { userId },
    });

    const deadEndpoints: string[] = [];

    await Promise.all(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            JSON.stringify({
              title: payload.title,
              body: payload.body,
              url: payload.url ?? '/',
              icon: '/icon-192.png',
              badge: '/icon-192.png',
            }),
          );
        } catch (err: unknown) {
          const status = (err as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) {
            deadEndpoints.push(sub.endpoint);
          } else {
            this.logger.warn(`Push gönderimi başarısız: ${sub.endpoint}`, err);
          }
        }
      }),
    );

    // Geçersiz abonelikleri temizle
    if (deadEndpoints.length) {
      await this.prisma.pushSubscription.deleteMany({
        where: { userId, endpoint: { in: deadEndpoints } },
      });
    }
  }
}
