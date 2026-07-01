import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CourierAcceptanceStatus,
  CourierDirection,
  CourierStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AcceptCourierDto } from './dto/accept-courier.dto';
import { CreateCourierRequestDto } from './dto/create-courier-request.dto';

@Injectable()
export class CourierService {
  constructor(private prisma: PrismaService) {}

  async findRequests(params: {
    page?: number;
    limit?: number;
    direction?: CourierDirection;
    search?: string;
    status?: CourierStatus | CourierStatus[];
  }) {
    const page = params.page ?? 1;
    const limit = Math.min(params.limit ?? 20, 50);
    const skip = (page - 1) * limit;

    const statuses = params.status
      ? Array.isArray(params.status)
        ? params.status
        : [params.status]
      : [CourierStatus.OPEN];

    const where = {
      deletedAt: null,
      status: statuses.length === 1 ? statuses[0] : { in: statuses },
      ...(params.direction && { direction: params.direction }),
      ...(params.search && {
        OR: [
          { itemName: { contains: params.search, mode: 'insensitive' as const } },
          { fromArea: { contains: params.search, mode: 'insensitive' as const } },
          { toArea: { contains: params.search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const showTraveler = statuses.some(
      (s) => s === CourierStatus.MATCHED || s === CourierStatus.COMPLETED,
    );

    const orderBy =
      statuses.length === 1 && statuses[0] === CourierStatus.OPEN
        ? [{ preferredDate: 'asc' as const }, { createdAt: 'desc' as const }]
        : [{ updatedAt: 'desc' as const }];

    const [items, total] = await Promise.all([
      this.prisma.courierRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          owner: {
            select: {
              id: true,
              profile: { select: { displayName: true, trustScore: true, postalCountry: true } },
            },
          },
          _count: { select: { acceptances: true } },
          ...(showTraveler && {
            confirmed: {
              select: {
                id: true,
                travelDate: true,
                traveler: {
                  select: {
                    id: true,
                    profile: {
                      select: {
                        displayName: true,
                        trustScore: true,
                        postalCountry: true,
                        avatarUrl: true,
                      },
                    },
                  },
                },
              },
            },
          }),
        },
      }),
      this.prisma.courierRequest.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async findRequest(id: string, currentUserId?: string) {
    const req = await this.prisma.courierRequest.findFirst({
      where: { id, deletedAt: null },
      include: {
        owner: {
          select: {
            id: true,
            profile: {
              select: { displayName: true, trustScore: true, avatarUrl: true },
            },
          },
        },
        acceptances: {
          orderBy: { createdAt: 'desc' },
          include: {
            traveler: {
              select: {
                id: true,
                profile: {
                  select: {
                    displayName: true,
                    trustScore: true,
                    avatarUrl: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!req) throw new NotFoundException('Talep bulunamadı');

    const isOwner = currentUserId === req.ownerId;
    const myAcceptance = currentUserId
      ? req.acceptances.find((a) => a.travelerId === currentUserId)
      : undefined;

    return {
      ...req,
      acceptances: isOwner ? req.acceptances : [],
      acceptanceCount: req.acceptances.length,
      isOwner,
      myAcceptance,
    };
  }

  createRequest(ownerId: string, dto: CreateCourierRequestDto) {
    if (!dto.forbiddenItemsAcknowledged) {
      throw new BadRequestException(
        'Yasaklı eşya beyanını onaylamanız gerekiyor',
      );
    }

    return this.prisma.courierRequest.create({
      data: {
        ownerId,
        direction: dto.direction,
        fromArea: dto.fromArea,
        toArea: dto.toArea,
        itemName: dto.itemName,
        itemCategory: dto.itemCategory,
        weightKg: dto.weightKg,
        estimatedValueEur: dto.estimatedValueEur,
        paymentType: dto.paymentType,
        paymentAmount: dto.paymentAmount,
        notes: dto.notes,
        preferredDate: dto.preferredDate ? new Date(dto.preferredDate) : undefined,
        status: CourierStatus.OPEN,
      },
    });
  }

  async accept(requestId: string, travelerId: string, dto: AcceptCourierDto) {
    const req = await this.prisma.courierRequest.findUnique({
      where: { id: requestId },
    });
    if (!req || req.deletedAt) throw new NotFoundException();
    if (req.status !== CourierStatus.OPEN) {
      throw new ConflictException('Bu talep artık açık değil');
    }
    if (req.ownerId === travelerId) {
      throw new ForbiddenException('Kendi talebinizi kabul edemezsiniz');
    }

    try {
      const acceptance = await this.prisma.courierAcceptance.create({
        data: {
          requestId,
          travelerId,
          message: dto.message,
          travelDate: dto.travelDate ? new Date(dto.travelDate) : undefined,
        },
      });

      await this.prisma.notification.create({
        data: {
          userId: req.ownerId,
          title: 'Talebine yeni taşıyıcı teklifi',
          body: `"${req.itemName}" için biri taşımak istediğini bildirdi.`,
          link: `/seyahat/${requestId}`,
        },
      });

      return acceptance;
    } catch {
      throw new ConflictException('Zaten bu talebe teklif verdiniz');
    }
  }

  async confirm(requestId: string, acceptanceId: string, ownerId: string) {
    const req = await this.prisma.courierRequest.findUnique({
      where: { id: requestId },
    });
    if (!req) throw new NotFoundException();
    if (req.ownerId !== ownerId) throw new ForbiddenException();
    if (req.status !== CourierStatus.OPEN) {
      throw new ConflictException('Talep zaten eşleşmiş');
    }

    const acceptance = await this.prisma.courierAcceptance.findFirst({
      where: { id: acceptanceId, requestId },
    });
    if (!acceptance) throw new NotFoundException('Teklif bulunamadı');

    const [updatedAcceptance] = await this.prisma.$transaction([
      this.prisma.courierAcceptance.update({
        where: { id: acceptanceId },
        data: { status: CourierAcceptanceStatus.CONFIRMED },
      }),
      this.prisma.courierAcceptance.updateMany({
        where: { requestId, id: { not: acceptanceId } },
        data: { status: CourierAcceptanceStatus.DECLINED },
      }),
      this.prisma.courierRequest.update({
        where: { id: requestId },
        data: {
          status: CourierStatus.MATCHED,
          confirmedAcceptanceId: acceptanceId,
        },
      }),
      this.prisma.notification.create({
        data: {
          userId: acceptance.travelerId,
          title: 'Teklifin onaylandı!',
          body: `"${req.itemName}" taşıma teklifin onaylandı. Detayları görebilirsin.`,
          link: `/seyahat/${requestId}`,
        },
      }),
    ]);

    return updatedAcceptance;
  }

  async complete(requestId: string, userId: string) {
    const req = await this.prisma.courierRequest.findUnique({
      where: { id: requestId },
      include: { confirmed: true },
    });
    if (!req) throw new NotFoundException();
    if (req.status !== CourierStatus.MATCHED)
      throw new ConflictException('Talep eşleşmiş durumda değil');

    const isOwner = req.ownerId === userId;
    const isTraveler = req.confirmed?.travelerId === userId;
    if (!isOwner && !isTraveler) throw new ForbiddenException();

    return this.prisma.courierRequest.update({
      where: { id: requestId },
      data: { status: CourierStatus.COMPLETED },
    });
  }

  async cancel(requestId: string, userId: string) {
    const req = await this.prisma.courierRequest.findUnique({
      where: { id: requestId },
    });
    if (!req) throw new NotFoundException();
    if (req.ownerId !== userId) throw new ForbiddenException();

    return this.prisma.courierRequest.update({
      where: { id: requestId },
      data: { status: CourierStatus.CANCELLED },
    });
  }
}
