import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import {
  BusinessStatus,
  EditorTeam,
  EditorialTaskStatus,
  EditorialTaskType,
  EventStatus,
  JobStatus,
  Prisma,
  TravelStatus,
  CourierStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type TaskInput = {
  team: EditorTeam;
  type: EditorialTaskType;
  title: string;
  description?: string;
  entityType: string;
  entityId: string;
  dueAt?: Date;
};

@Injectable()
export class EditorialTasksService {
  private readonly logger = new Logger(EditorialTasksService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Yeni kullanıcı içeriklerini ekiplerin şeffaf inceleme kuyruğuna alır. */
  @Cron('*/30 * * * *')
  async scanScheduled() {
    const result = await this.scanAll();
    if (result.created > 0) {
      this.logger.log(`${result.created} yeni editör görevi oluşturuldu`);
    }
  }

  async scanAll() {
    const [events, jobs, travels, couriers, capacityEvents, businesses] =
      await Promise.all([
        this.prisma.event.findMany({
          where: { status: EventStatus.PENDING_APPROVAL, deletedAt: null },
          select: { id: true, title: true, startsAt: true },
          take: 100,
        }),
        this.prisma.jobPosting.findMany({
          where: { status: JobStatus.PENDING, deletedAt: null },
          select: { id: true, title: true, company: true },
          take: 100,
        }),
        this.prisma.travelAnnouncement.findMany({
          where: {
            status: TravelStatus.OPEN,
            departureDate: { gt: new Date() },
          },
          select: {
            id: true,
            fromCity: true,
            toCity: true,
            departureDate: true,
          },
          take: 100,
        }),
        this.prisma.courierRequest.findMany({
          where: { status: CourierStatus.OPEN, deletedAt: null },
          select: { id: true, itemName: true, fromArea: true, toArea: true },
          take: 100,
        }),
        this.prisma.event.findMany({
          where: {
            status: EventStatus.PUBLISHED,
            startsAt: { gt: new Date() },
            capacity: { not: null },
            deletedAt: null,
          },
          select: {
            id: true,
            title: true,
            capacity: true,
            _count: { select: { attendees: true } },
          },
          take: 100,
        }),
        this.prisma.business.findMany({
          where: { status: BusinessStatus.PENDING },
          select: { id: true, name: true },
          take: 100,
        }),
      ]);

    const tasks: TaskInput[] = [
      ...events.map((event) => ({
        team: EditorTeam.EVENTS,
        type: EditorialTaskType.EVENT_REVIEW,
        title: `Etkinlik incele: ${event.title}`,
        description:
          'Tarih, konum ve açıklamayı doğrula; uygunsa admin panelinden onayla.',
        entityType: 'EVENT',
        entityId: event.id,
        dueAt: event.startsAt,
      })),
      ...jobs.map((job) => ({
        team: EditorTeam.JOBS,
        type: EditorialTaskType.JOB_REVIEW,
        title: `İş ilanı incele: ${job.title}`,
        description: `${job.company ?? 'İş arayan'} kaydının gerçekliğini ve iletişim bilgisini doğrula.`,
        entityType: 'JOB',
        entityId: job.id,
      })),
      ...travels.map((travel) => ({
        team: EditorTeam.TRAVEL,
        type: EditorialTaskType.TRAVEL_REVIEW,
        title: `Yolculuk kontrolü: ${travel.fromCity} → ${travel.toCity}`,
        description:
          'Tarih ve rota bilgisini kontrol et. Şüpheli içerikleri admin moderasyonuna bildir.',
        entityType: 'TRAVEL',
        entityId: travel.id,
        dueAt: travel.departureDate,
      })),
      ...couriers.map((courier) => ({
        team: EditorTeam.TRAVEL,
        type: EditorialTaskType.COURIER_REVIEW,
        title: `Eşya talebi kontrolü: ${courier.itemName}`,
        description: `${courier.fromArea} → ${courier.toArea} talebini yasaklı eşya ve güvenlik açısından kontrol et.`,
        entityType: 'COURIER',
        entityId: courier.id,
      })),
      ...capacityEvents
        .filter(
          (event) =>
            event.capacity !== null && event._count.attendees >= event.capacity,
        )
        .map((event) => ({
          team: EditorTeam.EVENTS,
          type: EditorialTaskType.EVENT_ATTENDEE_REVIEW,
          title: `Katılımcı kontrolü: ${event.title}`,
          description: `Kapasite ${event.capacity}; mevcut katılım ${event._count.attendees}. Listeyi kontrol et.`,
          entityType: 'EVENT',
          entityId: event.id,
        })),
      ...businesses.map((business) => ({
        team: EditorTeam.GUIDE,
        type: EditorialTaskType.GUIDE_REVIEW,
        title: `Rehber kaydı incele: ${business.name}`,
        description:
          'İşletme bilgisini, kategoriyi ve iletişim kanallarını doğrula; uygunsa rehbere al.',
        entityType: 'BUSINESS',
        entityId: business.id,
      })),
    ];

    const weekKey = this.getWeekKey(new Date());
    tasks.push({
      team: EditorTeam.GUIDE,
      type: EditorialTaskType.GUIDE_DRAFT,
      title: `Haftalık rehber içeriği hazırla (${weekKey})`,
      description:
        'Resmî kaynakları doğrulayarak bir rehber taslağı hazırla. Kaynak bağlantısı olmadan yayınlama.',
      entityType: 'GUIDE_WEEK',
      entityId: weekKey,
    });

    const memberMap = await this.getTeamMembers();
    const rows = tasks.map((task, index) => {
      const members = memberMap.get(task.team) ?? [];
      const assignedToId = members.length
        ? members[index % members.length].id
        : undefined;
      return { ...task, assignedToId };
    });
    const result = await this.prisma.editorialTask.createMany({
      data: rows,
      skipDuplicates: true,
    });

    return { scanned: tasks.length, created: result.count };
  }

  async listTasks(params: {
    team?: EditorTeam;
    status?: EditorialTaskStatus;
    page?: number;
  }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = 30;
    const where: Prisma.EditorialTaskWhereInput = {
      ...(params.team ? { team: params.team } : {}),
      status: params.status ?? {
        in: [EditorialTaskStatus.OPEN, EditorialTaskStatus.IN_PROGRESS],
      },
    };
    const [items, total] = await Promise.all([
      this.prisma.editorialTask.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          assignedTo: {
            select: {
              id: true,
              isBot: true,
              editorTeam: true,
              profile: { select: { displayName: true } },
            },
          },
        },
      }),
      this.prisma.editorialTask.count({ where }),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async updateTask(
    id: string,
    data: {
      status?: EditorialTaskStatus;
      assignedToId?: string | null;
    },
  ) {
    if (data.assignedToId) {
      const task = await this.prisma.editorialTask.findUniqueOrThrow({
        where: { id },
        select: { team: true },
      });
      await this.prisma.user.findFirstOrThrow({
        where: {
          id: data.assignedToId,
          editorTeam: task.team,
          deletedAt: null,
        },
      });
    }
    return this.prisma.editorialTask.update({
      where: { id },
      data: {
        ...data,
        completedAt:
          data.status === EditorialTaskStatus.DONE ||
          data.status === EditorialTaskStatus.DISMISSED
            ? new Date()
            : data.status
              ? null
              : undefined,
      },
    });
  }

  private async getTeamMembers() {
    const users = await this.prisma.user.findMany({
      where: { editorTeam: { not: null }, status: 'ACTIVE', deletedAt: null },
      select: { id: true, editorTeam: true },
      orderBy: { email: 'asc' },
    });
    const map = new Map<EditorTeam, { id: string }[]>();
    for (const user of users) {
      if (!user.editorTeam) continue;
      map.set(user.editorTeam, [
        ...(map.get(user.editorTeam) ?? []),
        { id: user.id },
      ]);
    }
    return map;
  }

  private getWeekKey(date: Date) {
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const day = Math.floor((date.getTime() - yearStart.getTime()) / 86_400_000);
    const week = Math.ceil((day + yearStart.getUTCDay() + 1) / 7);
    return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
  }
}
