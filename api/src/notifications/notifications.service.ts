import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WebPushService } from './web-push.service';
import { ExpoPushService } from './expo-push.service';

export interface CreateNotificationDto {
  userId: string;
  title: string;
  body?: string;
  link?: string;
}

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private webPush: WebPushService,
    private expoPush: ExpoPushService,
  ) {}

  async create(dto: CreateNotificationDto) {
    const notif = await this.prisma.notification.create({
      data: {
        userId: dto.userId,
        title: dto.title,
        body: dto.body ?? '',
        link: dto.link ?? null,
      },
    });

    // Web Push + Expo (mobil) Push — arka planda gönder, hata akışı engellemesin
    void this.webPush.pushToUser(dto.userId, {
      title: dto.title,
      body: dto.body ?? '',
      url: dto.link ?? '/',
    }).catch(() => void 0);

    void this.expoPush.sendToUser(dto.userId, {
      title: dto.title,
      body: dto.body ?? '',
      data: { url: dto.link ?? '/' },
    }).catch(() => void 0);

    return notif;
  }

  async list(userId: string, limit = 20) {
    const [items, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      this.prisma.notification.count({ where: { userId, read: false } }),
    ]);
    return { items, unreadCount };
  }

  unreadCount(userId: string) {
    return this.prisma.notification.count({ where: { userId, read: false } });
  }

  markRead(userId: string, id: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { read: true },
    });
  }

  markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  }
}
