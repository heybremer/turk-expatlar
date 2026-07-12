import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { ChatService } from './chat.service';

describe('ChatService — mesaj düzenleme ve okundu işareti', () => {
  let service: ChatService;
  let prisma: {
    message: { findUnique: jest.Mock; update: jest.Mock };
    chat: { findUnique: jest.Mock };
    chatMember: { updateMany: jest.Mock };
    chatReadState: { upsert: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      message: { findUnique: jest.fn(), update: jest.fn() },
      chat: { findUnique: jest.fn() },
      chatMember: { updateMany: jest.fn() },
      chatReadState: { upsert: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ChatService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<ChatService>(ChatService);
  });

  describe('getEditableMessage', () => {
    const baseMsg = {
      id: 'm1',
      chatId: 'c1',
      userId: 'u1',
      deletedAt: null,
      attachments: [],
    };

    it('pencere içindeki kendi mesajını düzenlenebilir sayar', async () => {
      prisma.message.findUnique.mockResolvedValue({
        ...baseMsg,
        createdAt: new Date(Date.now() - 60_000),
      });
      await expect(service.getEditableMessage('m1', 'u1')).resolves.toEqual({
        chatId: 'c1',
        hasAttachments: false,
      });
    });

    it('başkasının mesajını reddeder', async () => {
      prisma.message.findUnique.mockResolvedValue({
        ...baseMsg,
        createdAt: new Date(),
      });
      await expect(service.getEditableMessage('m1', 'u2')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('15 dakikadan eski mesajı reddeder', async () => {
      prisma.message.findUnique.mockResolvedValue({
        ...baseMsg,
        createdAt: new Date(Date.now() - 16 * 60 * 1000),
      });
      await expect(service.getEditableMessage('m1', 'u1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('silinmiş veya bulunamayan mesajı reddeder', async () => {
      prisma.message.findUnique.mockResolvedValue(null);
      await expect(service.getEditableMessage('m1', 'u1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('markRead', () => {
    it("DM'de ChatMember.lastReadAt günceller ve isDm=true döner", async () => {
      prisma.chat.findUnique.mockResolvedValue({ type: 'DIRECT' });
      prisma.chatMember.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.markRead('c1', 'u1');
      expect(result.isDm).toBe(true);
      expect(prisma.chatReadState.upsert).not.toHaveBeenCalled();
    });

    it('kanalda ChatReadState upsert eder ve isDm=false döner', async () => {
      // Hem markRead hem checkRoomAccess aynı chat kaydını okur
      prisma.chat.findUnique.mockResolvedValue({
        type: 'GLOBAL',
        stateId: null,
        cityId: null,
        members: [],
      });
      prisma.chatReadState.upsert.mockResolvedValue({});

      const result = await service.markRead('c1', 'u1');
      expect(result.isDm).toBe(false);
      expect(prisma.chatReadState.upsert).toHaveBeenCalledTimes(1);
      expect(prisma.chatMember.updateMany).not.toHaveBeenCalled();
    });

    it('var olmayan sohbeti reddeder', async () => {
      prisma.chat.findUnique.mockResolvedValue(null);
      await expect(service.markRead('yok', 'u1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
