import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CourierDirection,
  TravelRequestStatus,
  TravelStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTravelAnnouncementDto } from './dto/create-travel-announcement.dto';
import { CreateTravelRequestDto } from './dto/create-travel-request.dto';

const travelerSelect = {
  id: true,
  profile: {
    select: {
      displayName: true,
      avatarUrl: true,
      trustScore: true,
      postalCountry: true,
    },
  },
};

@Injectable()
export class TravelAnnouncementsService {
  constructor(private prisma: PrismaService) {}

  async findAll(params: {
    direction?: CourierDirection;
    page?: number;
    limit?: number;
  }) {
    const page =
      params.page && Number.isFinite(params.page) && params.page > 0
        ? Math.floor(params.page)
        : 1;
    const rawLimit =
      params.limit && Number.isFinite(params.limit) && params.limit > 0
        ? Math.floor(params.limit)
        : 20;
    const limit = Math.min(rawLimit, 50);
    const skip = (page - 1) * limit;

    const where = {
      status: TravelStatus.OPEN,
      departureDate: { gte: new Date() },
      ...(params.direction && { direction: params.direction }),
    };

    const [items, total] = await Promise.all([
      this.prisma.travelAnnouncement.findMany({
        where,
        skip,
        take: limit,
        orderBy: { departureDate: 'asc' },
        include: {
          user: { select: travelerSelect },
          _count: { select: { requests: true } },
        },
      }),
      this.prisma.travelAnnouncement.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async findOne(id: string, currentUserId?: string) {
    const ann = await this.prisma.travelAnnouncement.findUnique({
      where: { id },
      include: {
        user: { select: travelerSelect },
        requests: {
          orderBy: { createdAt: 'desc' },
          include: {
            requester: { select: travelerSelect },
          },
        },
      },
    });
    if (!ann) throw new NotFoundException('İlan bulunamadı');

    const isOwner = currentUserId === ann.userId;
    const myRequest = currentUserId
      ? ann.requests.find((r) => r.requesterId === currentUserId)
      : undefined;

    return {
      ...ann,
      // Talepleri yalnızca ilan sahibi görebilir
      requests: isOwner ? ann.requests : [],
      requestCount: ann.requests.length,
      isOwner,
      myRequest: myRequest ?? null,
    };
  }

  create(userId: string, dto: CreateTravelAnnouncementDto) {
    const departure = new Date(dto.departureDate);
    if (departure <= new Date()) {
      throw new BadRequestException('Kalkış tarihi gelecekte olmalı');
    }

    return this.prisma.travelAnnouncement.create({
      data: {
        userId,
        direction: dto.direction,
        fromCity: dto.fromCity,
        toCity: dto.toCity,
        departureDate: departure,
        availableKg: dto.availableKg,
        notes: dto.notes,
      },
    });
  }

  async createRequest(
    announcementId: string,
    requesterId: string,
    dto: CreateTravelRequestDto,
  ) {
    const ann = await this.prisma.travelAnnouncement.findUnique({
      where: { id: announcementId },
    });
    if (!ann) throw new NotFoundException('İlan bulunamadı');
    if (ann.status !== TravelStatus.OPEN) {
      throw new ConflictException('Bu ilan artık açık değil');
    }
    // Kalkış tarihi geçmiş ilanlara teklif verilemez
    if (ann.departureDate <= new Date()) {
      throw new ConflictException('Bu yolculuğun kalkış tarihi geçti');
    }
    if (ann.userId === requesterId) {
      throw new ForbiddenException('Kendi ilanınıza teklif veremezsiniz');
    }

    try {
      const req = await this.prisma.travelRequest.create({
        data: {
          announcementId,
          requesterId,
          itemName: dto.itemName,
          description: dto.description,
          weightKg: dto.weightKg,
          paymentType: dto.paymentType,
          paymentAmount: dto.paymentAmount,
          notes: dto.notes,
        },
      });

      await this.prisma.notification.create({
        data: {
          userId: ann.userId,
          title: 'Yolculuk ilanına yeni teklif',
          body: `Birileri senden "${dto.itemName}" götürmeni istiyor.`,
          link: `/seyahat/yolculuk/${announcementId}`,
        },
      });

      return req;
    } catch {
      throw new ConflictException('Bu ilana zaten teklif verdiniz');
    }
  }

  async respondRequest(
    announcementId: string,
    requestId: string,
    userId: string,
    accept: boolean,
  ) {
    const ann = await this.prisma.travelAnnouncement.findUnique({
      where: { id: announcementId },
    });
    if (!ann) throw new NotFoundException();
    if (ann.userId !== userId) throw new ForbiddenException();

    const req = await this.prisma.travelRequest.findFirst({
      where: { id: requestId, announcementId },
    });
    if (!req) throw new NotFoundException('Teklif bulunamadı');
    if (req.status !== TravelRequestStatus.PENDING) {
      throw new ConflictException('Bu teklif zaten yanıtlanmış');
    }

    const updated = await this.prisma.travelRequest.update({
      where: { id: requestId },
      data: {
        status: accept
          ? TravelRequestStatus.ACCEPTED
          : TravelRequestStatus.DECLINED,
      },
    });

    await this.prisma.notification.create({
      data: {
        userId: req.requesterId,
        title: accept ? 'Teklifiniz kabul edildi!' : 'Teklifiniz reddedildi',
        body: accept
          ? `"${req.itemName}" taşıma teklifiniz yolculuk ilanı sahibi tarafından kabul edildi.`
          : `"${req.itemName}" taşıma teklifiniz bu sefer kabul edilmedi.`,
        link: `/seyahat/yolculuk/${announcementId}`,
      },
    });

    return updated;
  }

  async closeAnnouncement(id: string, userId: string) {
    const ann = await this.prisma.travelAnnouncement.findUnique({
      where: { id },
    });
    if (!ann) throw new NotFoundException();
    if (ann.userId !== userId) throw new ForbiddenException();

    return this.prisma.travelAnnouncement.update({
      where: { id },
      data: { status: TravelStatus.CLOSED },
    });
  }
}
