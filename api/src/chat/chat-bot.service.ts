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
const CAST_SIZE = 3;
const FIRST_MIN_DELAY_MS = 2_500;
const FIRST_MAX_DELAY_MS = 5_000;
const SECOND_GAP_MIN_MS = 1_200;
const SECOND_GAP_MAX_MS = 2_800;
const SECOND_TYPE_MIN_MS = 2_000;
const SECOND_TYPE_MAX_MS = 4_000;
const PERSONAL_CLAIM_PATTERN =
  /\b(tanıdığım|arkadaşım|yaşadım|yaptım|aldım|gittim|bekledim|kullandım)\b/i;
const CS_TONE_PATTERN =
  /size nasıl yardımcı|nasıl yardımcı olabilirim|buyurun size|müşteri temsil|size yardımcı olmaktan/i;
const GREETING_LEAD = /^(merhaba|selamlar|selam)([,.!]|\s)+/i;
const BOT_GREETING_BODY = /\b(merhaba|hoş geldin|hos geldin)\b/i;

const GREETING_CORE =
  /^(merhaba|selamlar|selam|slm|selamün? aleyk[uü]m|sa|günaydın|iyi (akşamlar|günler|geceler)|hey+|hi+|hello|naber|nbr|nasılsın|nasilsin|ne haber|hoş geldiniz?|hos geldiniz?)$/i;

const GREETING_BANK = [
  'Merhaba, hoş geldin.',
  'Selam, hoş geldin.',
  'Merhaba! Hoş geldin.',
];

const GREETING_AGAIN = [
  'Nasılsın?',
  'Hey, ne var ne yok?',
  'Sorunu yaz, bakalım.',
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

const FOLLOW_BANK = [
  'Doğru, şehir burada önemli.',
  'Evet, resmi sayfadan bakmak en temizi.',
  'Aynen, tarihi de yazınca netleşir.',
  'Kısa tutayım: evrak listesi resmi kaynakta duruyor.',
];

const DEFAULT_CHAT_MODEL = 'gpt-4.1';

export function resolveChatModel(): string {
  return (
    process.env.OPENAI_CHAT_MODEL?.trim() ||
    DEFAULT_CHAT_MODEL
  );
}

type ChatBot = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  postalCountry: string | null;
  stateId: string | null;
  cityId: string | null;
};

type RecentLine = {
  body: string;
  userId: string;
  isBot: boolean;
  name: string;
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

export type ChatBotLiveEvents = {
  onTyping?: (user: { userId: string; displayName: string }) => void;
  onTypingStop?: (userId: string) => void;
  onMessage?: (message: unknown) => void;
};

export type ChatBotPlan = {
  primary: ChatBot;
  secondary: ChatBot | null;
  kind: 'greeting' | 'answer';
  alreadyGreeted: boolean;
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

export function startsWithGreeting(text: string): boolean {
  return GREETING_LEAD.test(text.trim());
}

export function stripLeadingGreeting(text: string): string {
  const stripped = text.trim().replace(GREETING_LEAD, '').trim();
  return stripped.length >= 5 ? stripped : text.trim();
}

export function pickGreetingReply(alreadyGreeted: boolean): string {
  const bank = alreadyGreeted ? GREETING_AGAIN : GREETING_BANK;
  return bank[Math.floor(Math.random() * bank.length)];
}

export function shouldAddSecondVoice(body: string): boolean {
  return !isGreetingOnly(body) && body.trim().length >= 12;
}

@Injectable()
export class ChatBotService {
  private readonly logger = new Logger(ChatBotService.name);
  private bots: ChatBot[] | null = null;
  private lastReplyAt = new Map<string, number>();
  private busyRooms = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly chatService: ChatService,
  ) {}

  async maybeReply(trigger: ChatBotTrigger, events?: ChatBotLiveEvents) {
    const messages: unknown[] = [];
    try {
      const plan = await this.planReply(trigger);
      if (!plan) return messages;
      if (this.busyRooms.has(trigger.chatId)) return messages;
      this.busyRooms.add(trigger.chatId);

      const recent = await this.loadRecent(trigger.chatId);
      const first = await this.speak(
        trigger.chatId,
        plan.primary,
        events,
        FIRST_MIN_DELAY_MS,
        FIRST_MAX_DELAY_MS,
        () =>
          this.resolveReply(
            trigger.body,
            plan.kind,
            plan.alreadyGreeted,
            recent,
            'primary',
            plan.primary.displayName,
          ),
      );
      if (first) messages.push(first);

      if (plan.secondary && first) {
        await this.sleep(this.jitter(SECOND_GAP_MIN_MS, SECOND_GAP_MAX_MS));
        const firstBody =
          typeof first === 'object' &&
          first &&
          'body' in first &&
          typeof first.body === 'string'
            ? first.body
            : '';
        const followRecent = [
          {
            body: firstBody,
            userId: plan.primary.id,
            isBot: true,
            name: plan.primary.displayName,
          },
          ...recent,
        ];
        const second = await this.speak(
          trigger.chatId,
          plan.secondary,
          events,
          SECOND_TYPE_MIN_MS,
          SECOND_TYPE_MAX_MS,
          () =>
            this.resolveReply(
              trigger.body,
              'answer',
              true,
              followRecent,
              'follow',
              plan.secondary!.displayName,
              plan.primary.displayName,
              firstBody,
            ),
        );
        if (second) messages.push(second);
      }

      this.lastReplyAt.set(trigger.chatId, Date.now());
      return messages;
    } catch (err) {
      this.logger.error('Sohbet botu hatası:', err);
      return messages;
    } finally {
      this.busyRooms.delete(trigger.chatId);
    }
  }

  async shouldReply(trigger: ChatBotTrigger): Promise<boolean> {
    return (await this.planReply(trigger)) !== null;
  }

  async planReply(trigger: ChatBotTrigger): Promise<ChatBotPlan | null> {
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
    if (this.busyRooms.has(trigger.chatId)) return null;

    const cast = await this.getRoomCast(trigger.chatId, chat);
    if (cast.length === 0) return null;

    const recent = await this.loadRecent(trigger.chatId);
    const lastBotId = recent.find((line) => line.isBot)?.userId;
    const primary =
      cast.find((bot) => bot.id !== lastBotId) ??
      cast[0];
    const secondary =
      greeting || !shouldAddSecondVoice(body)
        ? null
        : (cast.find((bot) => bot.id !== primary.id) ?? null);
    const alreadyGreeted = recent.some(
      (line) => line.isBot && BOT_GREETING_BODY.test(line.body),
    );

    return {
      primary,
      secondary,
      kind: greeting ? 'greeting' : 'answer',
      alreadyGreeted,
    };
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

    const cast = await this.getRoomCast(chatId, chat);
    return cast.map((bot) => ({
      userId: bot.id,
      displayName: bot.displayName,
      avatarUrl: bot.avatarUrl,
      postalCountry: bot.postalCountry,
      socketId: `bot:${bot.id}`,
    }));
  }

  private async getRoomCast(
    _chatId: string,
    chat: {
      type: ChatType;
      stateId: string | null;
      cityId: string | null;
      city: { stateId: string } | null;
    },
  ): Promise<ChatBot[]> {
    const eligible = this.eligibleBots(await this.getBots(), chat);
    return eligible.slice(0, CAST_SIZE);
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
    if (matched.length >= CAST_SIZE) return matched;
    const extras = bots.filter(
      (bot) => !matched.some((item) => item.id === bot.id),
    );
    const filled = [...matched, ...extras];
    return filled.length > 0 ? filled : bots;
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

  private async loadRecent(chatId: string): Promise<RecentLine[]> {
    const rows = await this.prisma.message.findMany({
      where: { chatId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 16,
      select: {
        body: true,
        userId: true,
        user: {
          select: {
            isBot: true,
            profile: { select: { displayName: true } },
          },
        },
      },
    });
    return rows.map((row) => ({
      body: row.body,
      userId: row.userId,
      isBot: row.user.isBot,
      name: row.user.profile?.displayName ?? 'Üye',
    }));
  }

  private async resolveReply(
    humanBody: string,
    kind: 'greeting' | 'answer',
    alreadyGreeted: boolean,
    recent: RecentLine[],
    voice: 'primary' | 'follow',
    speakerName: string,
    otherName?: string,
    otherBody?: string,
  ): Promise<string> {
    if (kind === 'greeting' && voice === 'primary') {
      return pickGreetingReply(alreadyGreeted);
    }

    const aiReply = await this.generateAiReply(
      humanBody,
      recent,
      voice,
      speakerName,
      otherName,
      otherBody,
    );
    const cleaned = this.sanitizeReply(aiReply, alreadyGreeted || voice === 'follow');
    if (cleaned) return cleaned;

    if (voice === 'follow') {
      return FOLLOW_BANK[Math.floor(Math.random() * FOLLOW_BANK.length)];
    }
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const candidate =
        REPLY_BANK[Math.floor(Math.random() * REPLY_BANK.length)];
      if (!PERSONAL_CLAIM_PATTERN.test(candidate)) return candidate;
    }
    return REPLY_BANK[0];
  }

  private sanitizeReply(
    raw: string | null,
    forbidGreeting: boolean,
  ): string | null {
    if (!raw) return null;
    let text = raw.trim();
    if (forbidGreeting && startsWithGreeting(text)) {
      text = stripLeadingGreeting(text);
    }
    if (
      PERSONAL_CLAIM_PATTERN.test(text) ||
      hasCustomerServiceTone(text) ||
      text.length < 5
    ) {
      return null;
    }
    return text.slice(0, 280);
  }

  private async generateAiReply(
    humanBody: string,
    recent: RecentLine[],
    voice: 'primary' | 'follow',
    speakerName: string,
    otherName?: string,
    otherBody?: string,
  ): Promise<string | null> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return null;

    const history = [...recent]
      .reverse()
      .slice(-8)
      .map((line) => `${line.name}: ${line.body}`)
      .join('\n');
    const firstName = speakerName.split(' ')[0] || speakerName;
    const model = resolveChatModel();

    const system =
      voice === 'follow'
        ? `Sen ${firstName} adıyla Türk Expatlar sohbetindesin; profilinde "Otomatik hesap" yazıyor. WhatsApp grubundaki biri gibi 1 kısa cümle yaz: ${otherName ?? 'diğerinin'} sözüne katıl veya tek somut ayrıntı ekle. Günlük konuşma dili, küçük harf/nokta serbest. Merhaba/selam ile başlama. Müşteri temsilcisi gibi konuşma. Yaşanmış hikaye, tanıdık veya kimlik uydurma. Sadece mesaj metnini yaz.`
        : `Sen ${firstName} adıyla Türk Expatlar sohbetindesin; profilinde "Otomatik hesap" yazıyor. WhatsApp grubundaki biri gibi yaz: kısa, somut, günlük Türkçe, 1-2 cümle. Soruya gerçekten cevap ver; genel geçer "şehir yaz" ile kaçma. Cevaba merhaba/selam ile başlama. Müşteri temsilcisi gibi konuşma, "nasıl yardımcı olabilirim" deme. Yaşanmış hikaye, tanıdık veya kimlik uydurma. Kesin hukuki/tıbbi/vergi hükmü verme; resmi kaynağa yönlendir. Sadece mesaj metnini yaz.`;

    const user =
      voice === 'follow'
        ? `Son konuşma:\n${history || '(yok)'}\n\n${otherName ?? 'Biri'}: ${otherBody ?? ''}\nKullanıcı: ${humanBody}\n\n${firstName} olarak kısa bir ek cümle yaz, merhaba deme.`
        : `Son konuşma:\n${history || '(yok)'}\n\nKullanıcı: ${humanBody}\n\n${firstName} olarak doğal, işe yarar bir sohbet cevabı yaz. Merhaba ile başlama.`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 14_000);
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
          max_tokens: 160,
          temperature: 0.9,
          presence_penalty: 0.35,
          frequency_penalty: 0.2,
        }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        this.logger.warn(
          `Sohbet AI isteği başarısız (${model}, ${res.status}): ${errText.slice(0, 180)}`,
        );
        return null;
      }
      const data = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const raw = data.choices?.[0]?.message?.content;
      if (typeof raw !== 'string') return null;
      const cleaned = raw.trim().replace(/^["'“”]+|["'“”]+$/g, '');
      return cleaned.length >= 5 ? cleaned.slice(0, 280) : null;
    } catch (err) {
      this.logger.warn(`Sohbet AI çağrısı hata verdi (${model}): ${String(err)}`);
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async speak(
    chatId: string,
    bot: ChatBot,
    events: ChatBotLiveEvents | undefined,
    minDelay: number,
    maxDelay: number,
    compose: () => Promise<string>,
  ) {
    events?.onTyping?.({ userId: bot.id, displayName: bot.displayName });
    try {
      const [body] = await Promise.all([
        compose(),
        this.sleep(this.jitter(minDelay, maxDelay)),
      ]);
      const message = await this.chatService.saveMessage(chatId, bot.id, body);
      events?.onMessage?.(message);
      this.logger.log(`${bot.displayName} sohbet cevabı yazdı (${resolveChatModel()}): ${chatId}`);
      return message;
    } finally {
      events?.onTypingStop?.(bot.id);
    }
  }

  private jitter(min: number, max: number) {
    return min + Math.floor(Math.random() * (max - min));
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
