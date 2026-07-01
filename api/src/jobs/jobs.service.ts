import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JobListingType, JobStatus, JobType, WorkMode } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateJobDto } from './dto/create-job.dto';

@Injectable()
export class JobsService {
  constructor(private prisma: PrismaService) {}

  async findJobs(params: {
    page?: number;
    limit?: number;
    cityId?: string;
    stateId?: string;
    jobType?: JobType;
    workMode?: WorkMode;
    category?: string;
    listingType?: JobListingType;
    turkishFriendly?: boolean;
    search?: string;
  }) {
    const page = params.page ?? 1;
    const limit = Math.min(params.limit ?? 20, 50);
    const skip = (page - 1) * limit;

    const where = {
      deletedAt: null,
      status: JobStatus.PUBLISHED,
      ...(params.cityId && { cityId: params.cityId }),
      ...(params.stateId && { stateId: params.stateId }),
      ...(params.jobType && { jobType: params.jobType }),
      ...(params.workMode && { workMode: params.workMode }),
      ...(params.category && { category: params.category }),
      ...(params.listingType && { listingType: params.listingType }),
      ...(params.turkishFriendly && { turkishFriendly: true }),
      ...(params.search && {
        OR: [
          { title: { contains: params.search, mode: 'insensitive' as const } },
          { company: { contains: params.search, mode: 'insensitive' as const } },
          { description: { contains: params.search, mode: 'insensitive' as const } },
          { briefInfo: { contains: params.search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.jobPosting.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ turkishFriendly: 'desc' }, { createdAt: 'desc' }],
        include: { city: true, state: true },
      }),
      this.prisma.jobPosting.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findJob(id: string) {
    const job = await this.prisma.jobPosting.findFirst({
      where: { id, deletedAt: null },
      include: {
        city: true,
        state: true,
        owner: {
          select: {
            id: true,
            profile: { select: { displayName: true, trustScore: true } },
          },
        },
      },
    });
    if (!job) throw new NotFoundException('İlan bulunamadı');

    await this.prisma.jobPosting.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });

    return job;
  }

  createJob(ownerId: string, dto: CreateJobDto) {
    const listingType = dto.listingType ?? JobListingType.EMPLOYER;

    if (listingType === JobListingType.SEEKER) {
      if (!dto.briefInfo?.trim()) {
        throw new BadRequestException('Kısa bilgi zorunludur');
      }
      if (!dto.cvUrl?.trim()) {
        throw new BadRequestException('CV yüklemeniz gerekiyor');
      }
    } else {
      if (!dto.company?.trim()) {
        throw new BadRequestException('Şirket / işveren adı zorunludur');
      }
      if (!dto.description?.trim() || dto.description.trim().length < 30) {
        throw new BadRequestException('Açıklama en az 30 karakter olmalıdır');
      }
    }

    const description =
      listingType === JobListingType.SEEKER
        ? (dto.description?.trim() || dto.briefInfo!.trim())
        : dto.description!.trim();

    return this.prisma.jobPosting.create({
      data: {
        ownerId,
        listingType,
        company: dto.company?.trim() || null,
        title: dto.title.trim(),
        description,
        briefInfo: dto.briefInfo?.trim() || null,
        cvUrl: dto.cvUrl?.trim() || null,
        cvFileName: dto.cvFileName?.trim() || null,
        category: dto.category,
        jobType: dto.jobType,
        workMode: dto.workMode,
        stateId: dto.stateId,
        cityId: dto.cityId,
        salaryRange: dto.salaryRange,
        turkishFriendly: dto.turkishFriendly ?? false,
        germanLevel: dto.germanLevel,
        contactMethod: dto.contactMethod,
        contactValue: dto.contactValue,
        status: JobStatus.PUBLISHED,
      },
      include: { city: true, state: true },
    });
  }

  async closeJob(id: string, userId: string) {
    const job = await this.prisma.jobPosting.findUnique({ where: { id } });
    if (!job) throw new NotFoundException();
    if (job.ownerId !== userId) throw new ForbiddenException();

    return this.prisma.jobPosting.update({
      where: { id },
      data: { status: JobStatus.CLOSED },
    });
  }
}
