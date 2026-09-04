import { Injectable, Logger } from '@nestjs/common';
import { ChatType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ChatService } from './chat.service';

const CHAT_BOT_EMAILS = [
  'bot-derya@turkexpatlar.de',
  'bot-reply-merve@turkexpatlar.de',
  'bot-reply-ahmet@turkexpatlar.de',
  'bot-reply-leyla@turkexpatlar.de',
  'bot-reply-can@turkexpatlar.de',
  'bot-reply-sude@turkexpatlar.de',
  'bot-reply-ozan@turkexpatlar.de',
  'bot-reply-ece@turkexpatlar.de',
  'bot-reply-deniz@turkexpatlar.de',
  'bot-reply-gokhan@turkexpatlar.de',
  'bot-reply-irem@turkexpatlar.de',
];

const PUBLIC_CHAT_TYPES: ChatType[] = [
  ChatType.GLOBAL,
  ChatType.STATE,
  ChatType.CITY,
];

const ROOM_COOLDOWN_MS = 2_000;
const MIN_DELAY_MS = 3_000;
const MAX_DELAY_MS = 7_000;
const PERSONAL_CLAIM_PATTERN =
  /\b(ben|bende|benim|biz|tanıdığım|arkadaşım|yaşadım|yaptım|aldım|gittim|bekledim|kullandım)\b/i;
const CS_TONE_PATTERN =
  /size nasıl yardımcı|nasıl yardımcı olabilirim|buyurun size|müşteri temsil|size yardımcı olmaktan/i;

const GREETING_CORE =
  /^(merhaba|selamlar|selam|slm|selamün? aleyk[uü]m|sa|günaydın|iyi (akşamlar|günler|geceler)|hey+|hi+|hello|naber|nbr|nasılsın|nasilsin|ne haber|hoş geldiniz?|hos geldiniz?)$/i;

const GREETING_BANK = [
  'Merhaba, hoş geldin.',
  'Selam, hoş geldin.',
  'Merhaba! Hoş geldin.',
  'Selamlar, hoş geldin.',
];

const REPLY_BANK = [
  'Hangi şehirdesin? Oraya göre daha net bakılır.',
  'Bu işler şehirden şehre değişiyor; resmi sayfadan bir bak, şehir ve tarihi yazarsan devam ederiz.',
  'Evrak listesini resmi kaynaktan kontrol etmek en kolayı. Takıldığın yeri yaz.',
  'Anladım. Şehir, tarih ve hangi kurum olduğunu eklersen daha net olur.',
  'Benzer sorular sık geliyor. Önce resmi sayfaya bir bak, sonra buradan devam ederiz.',
  'Tamam. Şehir ve işlem türünü yazarsan daha isabetli olur.',
  'Acele etme, önce resmi kaynaktan teyit. Takıldığın noktayı yaz.',
];

type ChatBot = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  postalCountry: string | null;
  stateId: string | null;
  cityId: string | null;
};

export type ChatBotPresence = {
  userId: string;
  displayName: string;
  avatarUrl?: string | null;
  postalCountry?: string | null;
  socketId: string;
};

export type ChatBotTrigger = {
  chatId: string;
  senderId: string;
  body: string;
};

export function normalizeChatText(body: string): string {
  return body
    .trim()
    .toLocaleLowerCase('tr-TR')
    .replace(/[!?.,…:~]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isGreetingOnly(body: string): boolean {
  const text = normalizeChatText(body);
  if (!text || text.length > 48) return false;
  if (GREETING_CORE.test(text)) return true;
  const words = text.split(' ');
  if (words.length > 5) return false;
  return words.every((word) => GREETING_CORE.test(word));
}

export function hasCustomerServiceTone(text: string): boolean {
  return CS_TONE_PATTERN.test(text);
}

@Injectable()
export class ChatBotService {
  private readonly logger = new Logger(ChatBotService.name);
  private bots: ChatBot[] | null = null;
  private nextBotIndex = 0;
  private lastReplyAt = new Map<string, number>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly chatService: ChatService,
  ) {}

  async maybeReply(trigger: ChatBotTrigger) {
    try {
      const assignment = await this.findAssignment(trigger);
      if (!assignment) return null;

      const delay =
        MIN_DELAY_MS +
        Math.floor(Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS));
      await new Promise((resolve) => setTimeout(resolve, delay));

      const body = await this.resolveReply(trigger.body);
      const message = await this.chatService.saveMessage(
        trigger.chatId,
        assignment.id,
        body,
      );
      this.lastReplyAt.set(trigger.chatId, Date.now());
      this.logger.log(
        `${assignment.displayName} sohbet cevabı yazdı: ${trigger.chatId}`,
      );
      return message;
    } catch (err) {
      this.logger.error('Sohbet botu hatası:', err);
      return null;
    }
  }

  async shouldReply(trigger: ChatBotTrigger): Promise<boolean> {
    return (await this.findAssignment(trigger)) !== null;
  }

  async getOnlinePresence(chatId: string): Promise<ChatBotPresence[]> {
    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId },
      select: {
        type: true,
        stateId: true,
        cityId: true,
        city: { select: { stateId: true } },
      },
    });
    if (!chat || !PUBLIC_CHAT_TYPES.includes(chat.type)) return [];

    const eligible = this.eligibleBots(await this.getBots(), chat);
    if (eligible.length === 0) return [];

    const count = chat.type === ChatType.GLOBAL ? 3 : 2;
    const picked = eligible.slice(0, Math.min(count, eligible.length));
    return picked.map((bot) => ({
      userId: bot.id,
      displayName: bot.displayName,
      avatarUrl: bot.avatarUrl,
      postalCountry: bot.postalCountry,
      socketId: `bot:${bot.id}`,
    }));
  }

  private async findAssignment(
    trigger: ChatBotTrigger,
  ): Promise<ChatBot | null> {
    const body = trigger.body.trim();
    const greeting = isGreetingOnly(body);
    if (!greeting && body.length < 8) return null;
    if (greeting && body.length < 2) return null;

    const sender = await this.prisma.user.findUnique({
      where: { id: trigger.senderId },
      select: { isBot: true, deletedAt: true },
    });
    if (!sender || sender.deletedAt || sender.isBot) return null;

    const chat = await this.prisma.chat.findUnique({
      where: { id: trigger.chatId },
      select: {
        type: true,
        stateId: true,
        cityId: true,
        city: { select: { stateId: true } },
      },
    });
    if (!chat || !PUBLIC_CHAT_TYPES.includes(chat.type)) return null;

    const lastReply = this.lastReplyAt.get(trigger.chatId) ?? 0;
    if (Date.now() - lastReply < ROOM_COOLDOWN_MS) return null;

    const bots = await this.getBots();
    if (bots.length === 0) return null;

    const eligible = this.eligibleBots(bots, chat);
    if (eligible.length === 0) return null;

    const bot = eligible[this.nextBotIndex % eligible.length];
    this.nextBotIndex = (this.nextBotIndex + 1) % eligible.length;
    return bot;
  }

  private eligibleBots(
    bots: ChatBot[],
    chat: {
      type: ChatType;
      stateId: string | null;
      cityId: string | null;
      city: { stateId: string } | null;
    },
  ): ChatBot[] {
    const matched = bots.filter((bot) => {
      if (chat.type === ChatType.GLOBAL) return true;
      if (chat.type === ChatType.STATE) {
        return !chat.stateId || bot.stateId === chat.stateId;
      }
      if (chat.type === ChatType.CITY) {
        const stateId = chat.stateId ?? chat.city?.stateId ?? null;
        return (
          !chat.cityId ||
          bot.cityId === chat.cityId ||
          (stateId ? bot.stateId === stateId : false)
        );
      }
      return false;
    });
    return matched.length > 0 ? matched : bots;
  }

  private async getBots(): Promise<ChatBot[]> {
    if (this.bots) return this.bots;
    const users = await this.prisma.user.findMany({
      where: { email: { in: CHAT_BOT_EMAILS }, isBot: true, deletedAt: null },
      select: {
        id: true,
        email: true,
        profile: {
          select: {
            displayName: true,
            avatarUrl: true,
            postalCountry: true,
            stateId: true,
            cityId: true,
          },
        },
      },
    });
    const byEmail = new Map(users.map((user) => [user.email, user]));
    this.bots = CHAT_BOT_EMAILS.flatMap((email) => {
      const user = byEmail.get(email);
      return user
        ? [
            {
              id: user.id,
              displayName: user.profile?.displayName ?? email,
              avatarUrl: user.profile?.avatarUrl ?? null,
              postalCountry: user.profile?.postalCountry ?? null,
              stateId: user.profile?.stateId ?? null,
              cityId: user.profile?.cityId ?? null,
            },
          ]
        : [];
    });
    return this.bots;
  }

  private async resolveReply(humanBody: string): Promise<string> {
    if (isGreetingOnly(humanBody)) {
      return GREETING_BANK[Math.floor(Math.random() * GREETING_BANK.length)];
    }

    const aiReply = await this.generateAiReply(humanBody);
    if (
      aiReply &&
      !PERSONAL_CLAIM_PATTERN.test(aiReply) &&
      !hasCustomerServiceTone(aiReply)
    ) {
      return aiReply;
    }

    for (let attempt = 0; attempt < 6; attempt += 1) {
      const candidate =
        REPLY_BANK[Math.floor(Math.random() * REPLY_BANK.length)];
      if (!PERSONAL_CLAIM_PATTERN.test(candidate)) return candidate;
    }
    return REPLY_BANK[0];
  }

  private async generateAiReply(humanBody: string): Promise<string | null> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return null;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
          messages: [
            {
              role: 'system',
              content:
                'Sen Türk Expatlar genel sohbetinde "Otomatik hesap" etiketiyle görünen bir topluluk üyesisin. Türkçe, samimi, doğal, 1-2 kısa cümle yaz. Müşteri temsilcisi gibi konuşma. "Size nasıl yardımcı olabilirim", "Nasıl yardımcı olabilirim", "Buyurun" deme. Selamlaşmaya sadece "Merhaba, hoş geldin" gibi karşılık ver. İnsanmış gibi kişisel deneyim uydurma. Kesin hukuki/tıbbi tavsiye verme. Sadece mesaj metnini yaz.',
            },
            {
              role: 'user',
              content: `Kullanıcı mesajı: ${humanBody}\n\nKısa ve doğal bir sohbet cevabı yaz.`,
            },
          ],
          max_tokens: 120,
          temperature: 0.8,
        }),
        signal: controller.signal,
      });
      if (!res.ok) return null;
      const data = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const raw = data.choices?.[0]?.message?.content;
      if (typeof raw !== 'string') return null;
      const cleaned = raw.trim().replace(/^["'“”]+|["'“”]+$/g, '');
      return cleaned.length >= 5 ? cleaned.slice(0, 280) : null;
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }
}
