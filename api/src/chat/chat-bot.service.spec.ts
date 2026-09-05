import { Test, TestingModule } from '@nestjs/testing';
import { ChatType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  ChatBotService,
  hasCustomerServiceTone,
  isGreetingOnly,
  pickGreetingReply,
  resolveChatModel,
  shouldAddSecondVoice,
  startsWithGreeting,
  stripLeadingGreeting,
} from './chat-bot.service';
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

  it('sadece merhaba denince cevap verir', async () => {
    await expect(
      service.shouldReply({
        chatId: 'chat-1',
        senderId: 'human-1',
        body: 'merhaba',
      }),
    ).resolves.toBe(true);
  });

  it('ilk cevaptan kısa süre sonra ikinci soruya da cevap verir', async () => {
    const previousKey = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    jest.useFakeTimers();
    chatService.saveMessage.mockResolvedValue({ id: 'bot-msg-1' });

    try {
      const first = service.maybeReply({
        chatId: 'chat-1',
        senderId: 'human-1',
        body: 'Berlin’de Anmeldung için randevu nasıl bulunuyor?',
      });
      await jest.advanceTimersByTimeAsync(8_000);
      await expect(first).resolves.toEqual([
        expect.objectContaining({ id: 'bot-msg-1' }),
      ]);

      await jest.advanceTimersByTimeAsync(2_500);
      await expect(
        service.shouldReply({
          chatId: 'chat-1',
          senderId: 'human-1',
          body: 'Peki Steuer-ID ne zaman geliyor?',
        }),
      ).resolves.toBe(true);
    } finally {
      jest.useRealTimers();
      if (previousKey === undefined) delete process.env.OPENAI_API_KEY;
      else process.env.OPENAI_API_KEY = previousKey;
    }
  });

  it('genel kanalda birkaç botu çevrimiçi gösterir', async () => {
    prisma.user.findMany.mockResolvedValue([
      {
        id: 'bot-1',
        email: 'bot-derya@turkexpatlar.de',
        profile: {
          displayName: 'Derya Arslan',
          avatarUrl: null,
          postalCountry: 'DE',
          stateId: 'st-1',
          cityId: 'ct-1',
        },
      },
      {
        id: 'bot-2',
        email: 'bot-reply-merve@turkexpatlar.de',
        profile: {
          displayName: 'Merve Karaca',
          avatarUrl: null,
          postalCountry: 'DE',
          stateId: 'st-2',
          cityId: 'ct-2',
        },
      },
      {
        id: 'bot-3',
        email: 'bot-reply-ahmet@turkexpatlar.de',
        profile: {
          displayName: 'Ahmet Eren',
          avatarUrl: null,
          postalCountry: 'DE',
          stateId: 'st-3',
          cityId: 'ct-3',
        },
      },
    ]);

    await expect(service.getOnlinePresence('chat-1')).resolves.toEqual([
      expect.objectContaining({ userId: 'bot-1', displayName: 'Derya Arslan' }),
      expect.objectContaining({ userId: 'bot-2', displayName: 'Merve Karaca' }),
      expect.objectContaining({ userId: 'bot-3', displayName: 'Ahmet Eren' }),
    ]);
  });

  it('bir soruya en fazla 3 kişilik kadrodan 2 bot yazar', async () => {
    prisma.user.findMany.mockResolvedValue([
      {
        id: 'bot-1',
        email: 'bot-derya@turkexpatlar.de',
        profile: { displayName: 'Derya Arslan', stateId: 'st-1', cityId: 'ct-1' },
      },
      {
        id: 'bot-2',
        email: 'bot-reply-merve@turkexpatlar.de',
        profile: { displayName: 'Merve Karaca', stateId: 'st-2', cityId: 'ct-2' },
      },
      {
        id: 'bot-3',
        email: 'bot-reply-ahmet@turkexpatlar.de',
        profile: { displayName: 'Ahmet Eren', stateId: 'st-3', cityId: 'ct-3' },
      },
    ]);

    const plan = await service.planReply({
      chatId: 'chat-1',
      senderId: 'human-1',
      body: 'Berlin’de Anmeldung için randevu nasıl bulunuyor?',
    });
    expect(plan?.primary.id).toBeTruthy();
    expect(plan?.secondary?.id).toBeTruthy();
    expect(plan?.secondary?.id).not.toBe(plan?.primary.id);
    expect(plan?.kind).toBe('answer');
  });

  it('selamda ikinci bot yazmaz', async () => {
    prisma.user.findMany.mockResolvedValue([
      {
        id: 'bot-1',
        email: 'bot-derya@turkexpatlar.de',
        profile: { displayName: 'Derya Arslan', stateId: 'st-1', cityId: 'ct-1' },
      },
      {
        id: 'bot-2',
        email: 'bot-reply-merve@turkexpatlar.de',
        profile: { displayName: 'Merve Karaca', stateId: 'st-2', cityId: 'ct-2' },
      },
    ]);

    const plan = await service.planReply({
      chatId: 'chat-1',
      senderId: 'human-1',
      body: 'merhaba',
    });
    expect(plan?.kind).toBe('greeting');
    expect(plan?.secondary).toBeNull();
  });

  it('yazarken typing olaylarını yayınlar', async () => {
    const previousKey = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    jest.useFakeTimers();
    chatService.saveMessage.mockResolvedValue({ id: 'bot-msg-1' });
    const typing: string[] = [];

    try {
      const pending = service.maybeReply(
        {
          chatId: 'chat-1',
          senderId: 'human-1',
          body: 'Berlin’de Anmeldung için randevu nasıl bulunuyor?',
        },
        {
          onTyping: (user) => typing.push(`start:${user.displayName}`),
          onTypingStop: (userId) => typing.push(`stop:${userId}`),
        },
      );
      await jest.advanceTimersByTimeAsync(8_000);
      await pending;
      expect(typing[0]).toMatch(/^start:/);
      expect(typing).toContain('stop:bot-1');
    } finally {
      jest.useRealTimers();
      if (previousKey === undefined) delete process.env.OPENAI_API_KEY;
      else process.env.OPENAI_API_KEY = previousKey;
    }
  });
});

describe('sohbet botu selamlaşma', () => {
  it('yalnızca selamı tanır', () => {
    expect(isGreetingOnly('merhaba')).toBe(true);
    expect(isGreetingOnly('Merhaba!')).toBe(true);
    expect(isGreetingOnly('selam nasılsın')).toBe(true);
    expect(isGreetingOnly('ok')).toBe(false);
    expect(isGreetingOnly('Merhaba, Berlin’de Anmeldung nasıl yapılır?')).toBe(
      false,
    );
  });

  it('müşteri temsilcisi tonunu yakalar', () => {
    expect(hasCustomerServiceTone('Merhaba, size nasıl yardımcı olabilirim?')).toBe(
      true,
    );
    expect(hasCustomerServiceTone('Merhaba, hoş geldin.')).toBe(false);
  });

  it('tekrar selamda merhaba ile başlamaz', () => {
    expect(startsWithGreeting(pickGreetingReply(true))).toBe(false);
    expect(stripLeadingGreeting('Merhaba, Berlin’de bakayım.')).toBe(
      'Berlin’de bakayım.',
    );
    expect(shouldAddSecondVoice('merhaba')).toBe(false);
    expect(
      shouldAddSecondVoice('Berlin’de Anmeldung nasıl bulunuyor?'),
    ).toBe(true);
  });

  it('sohbet için gpt-4.1 kullanır', () => {
    const previous = process.env.OPENAI_CHAT_MODEL;
    delete process.env.OPENAI_CHAT_MODEL;
    expect(resolveChatModel()).toBe('gpt-4.1');
    process.env.OPENAI_CHAT_MODEL = 'gpt-4o';
    expect(resolveChatModel()).toBe('gpt-4o');
    if (previous === undefined) delete process.env.OPENAI_CHAT_MODEL;
    else process.env.OPENAI_CHAT_MODEL = previous;
  });
});
