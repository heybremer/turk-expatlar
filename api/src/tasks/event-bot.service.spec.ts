import { Test, TestingModule } from '@nestjs/testing';
import { EditorTeam, EventStatus, PriceType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EditorialTasksService } from './editorial-tasks.service';
import { EventBotService } from './event-bot.service';

describe('EventBotService', () => {
  let service: EventBotService;
  let prisma: {
    user: { findMany: jest.Mock };
    city: { findFirst: jest.Mock };
    event: {
      count: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      findMany: jest.Mock;
    };
  };
  let editorialTasks: { scanAll: jest.Mock };

  beforeEach(async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-16T12:00:00Z'));
    prisma = {
      user: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ id: 'editor-1' }, { id: 'editor-2' }]),
      },
      city: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: 'city-1', stateId: 'state-1' }),
      },
      event: {
        count: jest.fn().mockResolvedValue(0),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: 'event-1',
            title: data.title,
            startsAt: data.startsAt,
          }),
        ),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    editorialTasks = { scanAll: jest.fn().mockResolvedValue({ created: 1 }) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventBotService,
        { provide: PrismaService, useValue: prisma },
        { provide: EditorialTasksService, useValue: editorialTasks },
      ],
    }).compile();

    service = module.get<EventBotService>(EventBotService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('şeffaf editör hesabıyla onay bekleyen ücretsiz etkinlik oluşturur', async () => {
    const result = await service.createNow();

    expect(result.created).toBe(true);
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isBot: true,
          editorTeam: EditorTeam.EVENTS,
        }),
      }),
    );
    expect(prisma.event.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizerId: expect.stringMatching(/^editor-/),
        stateId: 'state-1',
        cityId: 'city-1',
        status: EventStatus.PENDING_APPROVAL,
        priceType: PriceType.FREE,
        startsAt: expect.any(Date),
      }),
      select: { id: true, title: true, startsAt: true },
    });
    expect(editorialTasks.scanAll).toHaveBeenCalledTimes(1);
  });

  it('iki otomatik etkinlik onay bekliyorsa yeni taslak oluşturmaz', async () => {
    prisma.event.count.mockResolvedValue(2);

    const result = await service.createNow();

    expect(result).toEqual({
      created: false,
      reason: 'Onay bekleyen otomatik etkinlik sınırına ulaşıldı',
    });
    expect(prisma.event.create).not.toHaveBeenCalled();
  });

  it('aynı haftanın etkinliği zaten varsa tekrar oluşturmaz', async () => {
    prisma.event.findFirst.mockResolvedValue({ id: 'existing-event' });

    const result = await service.createNow();

    expect(result).toEqual({
      created: false,
      reason: 'Bu haftanın etkinliği zaten mevcut',
    });
    expect(prisma.event.create).not.toHaveBeenCalled();
  });
});
