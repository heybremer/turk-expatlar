import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { GamificationService } from '../gamification/gamification.service';
import { TasksService } from './tasks.service';

describe('TasksService', () => {
  let service: TasksService;
  let prisma: {
    message: { deleteMany: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      message: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: GamificationService,
          useValue: { awardEventCompleted: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
  });

  describe('purgeExpiredChatMessages', () => {
    it('yalnızca süresi geçmiş süreli mesajları kalıcı siler', async () => {
      await service.purgeExpiredChatMessages();

      expect(prisma.message.deleteMany).toHaveBeenCalledTimes(1);
      const arg = (
        prisma.message.deleteMany.mock.calls as unknown as [
          { where: { expiresAt: { not: null; lt: Date } } },
        ][]
      )[0][0];
      expect(arg.where.expiresAt.not).toBeNull();
      expect(arg.where.expiresAt.lt).toBeInstanceOf(Date);
    });
  });
});
