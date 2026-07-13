import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Admin/moderatör aksiyonlarını kayıt altına alır. Loglama hata verse bile
   * asıl işlemi engellememeli — bu yüzden hatalar burada yutulur.
   */
  async log(params: {
    userId?: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    metadata?: Record<string, unknown>;
  }) {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: params.userId ?? null,
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId ?? null,
          metadata: params.metadata as never,
        },
      });
    } catch (err) {
      this.logger.warn(
        `Audit log yazılamadı: ${params.action} ${params.entityType} — ${
          err instanceof Error ? err.message : err
        }`,
      );
    }
  }
}
