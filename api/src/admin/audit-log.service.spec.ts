import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from './audit-log.service';

describe('AuditLogService', () => {
  let service: AuditLogService;
  let prisma: { auditLog: { create: jest.Mock } };

  beforeEach(async () => {
    prisma = { auditLog: { create: jest.fn() } };

    const module: TestingModule = await Test.createTestingModule({
      providers: [AuditLogService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<AuditLogService>(AuditLogService);
  });

  it('writes an audit log entry with the given fields', async () => {
    prisma.auditLog.create.mockResolvedValue({});

    await service.log({
      userId: 'admin-1',
      action: 'user.ban',
      entityType: 'User',
      entityId: 'user-2',
      metadata: { until: null },
    });

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        userId: 'admin-1',
        action: 'user.ban',
        entityType: 'User',
        entityId: 'user-2',
        metadata: { until: null },
      },
    });
  });

  it('swallows database errors so the underlying admin action never fails because of logging', async () => {
    prisma.auditLog.create.mockRejectedValue(new Error('db down'));

    await expect(
      service.log({ action: 'user.delete', entityType: 'User', entityId: 'user-3' }),
    ).resolves.toBeUndefined();
  });
});
