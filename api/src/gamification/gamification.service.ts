import { Injectable, Logger } from '@nestjs/common';
import { PointAction, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationGateway } from '../notifications/notification.gateway';
import { getLevelProgress, levelForPoints } from './level.util';

/** Her puan kaynağı için sabit puan değerleri — tek yerden yönetilir. */
export const POINT_VALUES: Record<PointAction, number> = {
  FORUM_TOPIC_CREATED: 5,
  FORUM_REPLY_CREATED: 3,
  FORUM_REPLY_MARKED_BEST: 10,
  EVENT_CREATED: 10,
  EVENT_JOINED: 5,
  EVENT_COMPLETED_ORGANIZER: 100,
  EVENT_COMPLETED_ATTENDEE: 75,
};

@Injectable()
export class GamificationService {
  private logger = new Logger('GamificationService');

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private notifGateway: NotificationGateway,
  ) {}

  /**
   * Bir kullanıcıya puan verir. `refId` verilirse aynı olay için (örn. aynı forum
   * konusu) yalnızca bir kez puan verilmesi garanti edilir (idempotent).
   * Seviye atlanırsa kullanıcıya bildirim gönderilir.
   */
  async award(
    userId: string,
    action: PointAction,
    refId?: string,
    refType?: string,
  ) {
    const points = POINT_VALUES[action];
    try {
      const before = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { points: true, level: true },
      });
      if (!before) return null;

      await this.prisma.pointLog.create({
        data: {
          userId,
          action,
          points,
          refId: refId ?? null,
          refType: refType ?? null,
        },
      });

      const updated = await this.prisma.user.update({
        where: { id: userId },
        data: { points: { increment: points } },
        select: { points: true, level: true },
      });

      const newLevel = levelForPoints(updated.points);
      if (newLevel !== updated.level) {
        await this.prisma.user.update({
          where: { id: userId },
          data: { level: newLevel },
        });
        if (newLevel > updated.level) {
          await this.notifyLevelUp(userId, newLevel);
        }
      }

      return { points: updated.points, level: newLevel };
    } catch (err) {
      // @@unique([userId, action, refId]) ihlali = bu olay için puan zaten verilmiş
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        return null;
      }
      this.logger.error(`Puan verilemedi (${action}, user=${userId}): ${err}`);
      return null;
    }
  }

  private async notifyLevelUp(userId: string, newLevel: number) {
    const notif = await this.notifications.create({
      userId,
      title: `Tebrikler! Seviye ${newLevel} oldun 🎉`,
      body: 'Platformdaki etkinliğinle seviye atladın. Profilinden yeni seviyeni görebilirsin.',
      link: '/profil',
    });
    this.notifGateway.pushToUser(userId, notif);
  }

  async getProgress(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { points: true },
    });
    return getLevelProgress(user?.points ?? 0);
  }

  /** Etkinlik tamamlandığında organizatöre ve katılımcılara toplu puan verir. */
  async awardEventCompleted(eventId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: {
        organizerId: true,
        attendees: { where: { status: 'GOING' }, select: { userId: true } },
      },
    });
    if (!event) return;

    await this.award(
      event.organizerId,
      'EVENT_COMPLETED_ORGANIZER',
      eventId,
      'Event',
    );
    await Promise.all(
      event.attendees
        .filter((a) => a.userId !== event.organizerId)
        .map((a) =>
          this.award(a.userId, 'EVENT_COMPLETED_ATTENDEE', eventId, 'Event'),
        ),
    );
  }
}
