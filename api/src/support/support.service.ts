import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';

@Injectable()
export class SupportService {
  constructor(private prisma: PrismaService) {}

  create(userId: string, dto: CreateSupportTicketDto) {
    return this.prisma.supportTicket.create({
      data: {
        userId,
        category: dto.category,
        subject: dto.subject.trim(),
        message: dto.message.trim(),
      },
      select: {
        id: true,
        category: true,
        subject: true,
        status: true,
        createdAt: true,
      },
    });
  }
}
