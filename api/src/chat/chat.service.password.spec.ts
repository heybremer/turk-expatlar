import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { ChatService } from './chat.service';

describe('ChatService — oda şifreleri', () => {
  let service: ChatService;
  let prisma: {
    chat: { findUnique: jest.Mock; update: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      chat: { findUnique: jest.fn(), update: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ChatService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<ChatService>(ChatService);
  });

  it('verifyRoomPassword: şifresiz odada her zaman true döner', async () => {
    prisma.chat.findUnique.mockResolvedValue({ password: null });
    await expect(service.verifyRoomPassword('c1', '')).resolves.toBe(true);
  });

  it('verifyRoomPassword: bcrypt hash ile doğru/yanlış şifreyi ayırt eder', async () => {
    const hash = await bcrypt.hash('gizli123', 10);
    prisma.chat.findUnique.mockResolvedValue({ password: hash });

    await expect(service.verifyRoomPassword('c1', 'gizli123')).resolves.toBe(
      true,
    );
    await expect(service.verifyRoomPassword('c1', 'yanlis')).resolves.toBe(
      false,
    );
    expect(prisma.chat.update).not.toHaveBeenCalled();
  });

  it('verifyRoomPassword: eski düz metin kaydı ilk başarılı girişte hashler', async () => {
    prisma.chat.findUnique.mockResolvedValue({ password: 'duzmetin' });
    prisma.chat.update.mockResolvedValue({});

    await expect(service.verifyRoomPassword('c1', 'duzmetin')).resolves.toBe(
      true,
    );

    expect(prisma.chat.update).toHaveBeenCalledTimes(1);
    const updateArg = (
      prisma.chat.update.mock.calls as unknown as [
        { data: { password: string } },
      ][]
    )[0][0];
    expect(updateArg.data.password.startsWith('$2')).toBe(true);
    await expect(
      bcrypt.compare('duzmetin', updateArg.data.password),
    ).resolves.toBe(true);
  });

  it('verifyRoomPassword: eski düz metin kayıtta yanlış şifreyi reddeder', async () => {
    prisma.chat.findUnique.mockResolvedValue({ password: 'duzmetin' });
    await expect(service.verifyRoomPassword('c1', 'baska')).resolves.toBe(
      false,
    );
    expect(prisma.chat.update).not.toHaveBeenCalled();
  });
});
