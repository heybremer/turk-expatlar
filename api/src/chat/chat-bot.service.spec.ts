import { Test, TestingModule } from '@nestjs/testing';
import { ChatType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ChatBotService } from './chat-bot.service';
import { ChatService } from './chat.service';

describe('ChatBotService', () => {
  let service: ChatBotService;
  let prisma: {
    user: { findUnique: jest.Mock; findMany: jest.Mock };
    chat: { findUnique: jest.Mock };
    message: { findMany: jest.Mock };
  };
  let chatService: { saveMessage: jest.Mock };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ isBot: false, deletedAt: null }),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'bot-1',
            email: 'bot-derya@turkexpatlar.de',
            profile: {
              displayName: 'Derya Arslan',
              stateId: 'st-1',
              cityId: 'ct-1',
            },
          },
        ]),
      },
      chat: {
        findUnique: jest.fn().mockResolvedValue({
          type: ChatType.GLOBAL,
          stateId: null,
          cityId: null,
          city: null,
        }),
      },
      message: { findMany: jest.fn().mockResolvedValue([]) },
    };
    chatService = { saveMessage: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatBotService,
        { provide: PrismaService, useValue: prisma },
        { provide: ChatService, useValue: chatService },
      ],
    }).compile();

    service = module.get(ChatBotService);
  });

  it('gerçek kullanıcı mesajında genel kanalda cevap verebilir', async () => {
    await expect(
      service.shouldReply({
        chatId: 'chat-1',
        senderId: 'human-1',
        body: 'Berlin’de Anmeldung için randevu nasıl bulunuyor?',
      }),
    ).resolves.toBe(true);
  });

  it('bot mesajına cevap vermez', async () => {
    prisma.user.findUnique.mockResolvedValue({ isBot: true, deletedAt: null });
    await expect(
      service.shouldReply({
        chatId: 'chat-1',
        senderId: 'bot-1',
        body: 'Berlin’de Anmeldung için randevu nasıl bulunuyor?',
      }),
    ).resolves.toBe(false);
  });

  it('özel mesaja cevap vermez', async () => {
    prisma.chat.findUnique.mockResolvedValue({
      type: ChatType.DIRECT,
      stateId: null,
      cityId: null,
      city: null,
    });
    await expect(
      service.shouldReply({
        chatId: 'dm-1',
        senderId: 'human-1',
        body: 'Merhaba, özelden yazıyorum yardımcı olur musun?',
      }),
    ).resolves.toBe(false);
  });

  it('çok kısa mesaja cevap vermez', async () => {
    await expect(
      service.shouldReply({
        chatId: 'chat-1',
        senderId: 'human-1',
        body: 'ok',
      }),
    ).resolves.toBe(false);
  });
});
