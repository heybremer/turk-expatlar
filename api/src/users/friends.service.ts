import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationGateway } from '../notifications/notification.gateway';

const PROFILE_SELECT = {
  id: true,
  role: true,
  profile: {
    select: { displayName: true, avatarUrl: true, postalCountry: true },
  },
} as const;

type ProfileUser = {
  id: string;
  role: string;
  profile: {
    displayName: string;
    avatarUrl: string | null;
    postalCountry: unknown;
  } | null;
};

function mapProfile(u: ProfileUser) {
  return {
    id: u.id,
    role: u.role,
    displayName: u.profile?.displayName ?? 'Kullanıcı',
    avatarUrl: u.profile?.avatarUrl ?? null,
    postalCountry: u.profile?.postalCountry ?? null,
  };
}

@Injectable()
export class FriendsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private notifGateway: NotificationGateway,
  ) {}

  /** Kabul edilmiş arkadaşlarımın listesi. */
  async listFriends(userId: string) {
    const requests = await this.prisma.friendRequest.findMany({
      where: {
        status: 'ACCEPTED',
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        sender: { select: PROFILE_SELECT },
        receiver: { select: PROFILE_SELECT },
      },
    });

    return requests.map((r) => {
      const friend = r.senderId === userId ? r.receiver : r.sender;
      return { ...mapProfile(friend), friendsSince: r.updatedAt };
    });
  }

  /** Bana gelen bekleyen istekler. */
  async listIncomingRequests(userId: string) {
    const requests = await this.prisma.friendRequest.findMany({
      where: { receiverId: userId, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      include: { sender: { select: PROFILE_SELECT } },
    });
    return requests.map((r) => ({
      id: r.id,
      createdAt: r.createdAt,
      user: mapProfile(r.sender),
    }));
  }

  /** Benim gönderdiğim, henüz cevaplanmamış istekler. */
  async listOutgoingRequests(userId: string) {
    const requests = await this.prisma.friendRequest.findMany({
      where: { senderId: userId, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      include: { receiver: { select: PROFILE_SELECT } },
    });
    return requests.map((r) => ({
      id: r.id,
      createdAt: r.createdAt,
      user: mapProfile(r.receiver),
    }));
  }

  async getStatus(userId: string, otherUserId: string) {
    if (userId === otherUserId) return { status: 'SELF' as const };

    const request = await this.prisma.friendRequest.findFirst({
      where: {
        OR: [
          { senderId: userId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: userId },
        ],
      },
    });

    if (!request) return { status: 'NONE' as const };
    if (request.status === 'ACCEPTED')
      return { status: 'FRIENDS' as const, requestId: request.id };
    if (request.status === 'REJECTED') return { status: 'NONE' as const };

    return request.senderId === userId
      ? { status: 'PENDING_SENT' as const, requestId: request.id }
      : { status: 'PENDING_RECEIVED' as const, requestId: request.id };
  }

  async sendRequest(senderId: string, receiverId: string) {
    if (senderId === receiverId) {
      throw new BadRequestException(
        'Kendinize arkadaşlık isteği gönderemezsiniz',
      );
    }

    const [target, sender] = await Promise.all([
      this.prisma.user.findFirst({
        where: { id: receiverId, deletedAt: null },
        select: { id: true },
      }),
      this.prisma.user.findUnique({
        where: { id: senderId },
        select: PROFILE_SELECT,
      }),
    ]);
    if (!target) throw new NotFoundException('Kullanıcı bulunamadı');
    const senderName = sender
      ? mapProfile(sender).displayName
      : 'Bir kullanıcı';

    const existing = await this.prisma.friendRequest.findFirst({
      where: {
        OR: [
          { senderId, receiverId },
          { senderId: receiverId, receiverId: senderId },
        ],
      },
    });

    if (existing) {
      if (existing.status === 'ACCEPTED') {
        throw new ConflictException('Bu kullanıcı zaten arkadaşınız');
      }
      if (existing.status === 'PENDING') {
        throw new ConflictException('Bekleyen bir arkadaşlık isteği zaten var');
      }
      // REJECTED idi — yeniden istek göndermeye izin ver (silip yeniden oluştur)
      await this.prisma.friendRequest.delete({ where: { id: existing.id } });
    }

    const request = await this.prisma.friendRequest.create({
      data: { senderId, receiverId },
    });

    const notif = await this.notifications.create({
      userId: receiverId,
      title: 'Yeni arkadaşlık isteği',
      body: `${senderName} size arkadaşlık isteği gönderdi.`,
      link: `/kullanici/${senderId}`,
    });
    this.notifGateway.pushToUser(receiverId, notif);

    return request;
  }

  async acceptRequest(requestId: string, userId: string) {
    const request = await this.prisma.friendRequest.findUnique({
      where: { id: requestId },
    });
    if (!request) throw new NotFoundException('İstek bulunamadı');
    if (request.receiverId !== userId) throw new ForbiddenException();
    if (request.status !== 'PENDING') {
      throw new BadRequestException('Bu istek zaten yanıtlanmış');
    }

    const [updated, accepter] = await Promise.all([
      this.prisma.friendRequest.update({
        where: { id: requestId },
        data: { status: 'ACCEPTED' },
      }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: PROFILE_SELECT,
      }),
    ]);
    const accepterName = accepter
      ? mapProfile(accepter).displayName
      : 'Bir kullanıcı';

    const notif = await this.notifications.create({
      userId: request.senderId,
      title: 'Arkadaşlık isteğiniz kabul edildi',
      body: `${accepterName} arkadaşlık isteğinizi kabul etti. Artık arkadaşsınız.`,
      link: `/kullanici/${userId}`,
    });
    this.notifGateway.pushToUser(request.senderId, notif);

    return updated;
  }

  async rejectRequest(requestId: string, userId: string) {
    const request = await this.prisma.friendRequest.findUnique({
      where: { id: requestId },
    });
    if (!request) throw new NotFoundException('İstek bulunamadı');
    if (request.receiverId !== userId && request.senderId !== userId) {
      throw new ForbiddenException();
    }
    if (request.status !== 'PENDING') {
      throw new BadRequestException('Bu istek zaten yanıtlanmış');
    }

    // Gönderen kendi isteğini geri çekiyorsa da aynı uç nokta kullanılır.
    await this.prisma.friendRequest.delete({ where: { id: requestId } });
    return { success: true };
  }

  /** Kabul edilmiş bir arkadaşlığı sonlandırır. */
  async removeFriend(userId: string, otherUserId: string) {
    const request = await this.prisma.friendRequest.findFirst({
      where: {
        status: 'ACCEPTED',
        OR: [
          { senderId: userId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: userId },
        ],
      },
    });
    if (!request) throw new NotFoundException('Arkadaşlık bulunamadı');

    await this.prisma.friendRequest.delete({ where: { id: request.id } });
    return { success: true };
  }
}
