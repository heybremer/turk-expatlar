import { Injectable } from '@nestjs/common';
import {
  ChatModerationReason,
  ChatType,
  UserRole,
  UserStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type ModerationResult =
  | { allowed: true }
  | {
      allowed: false;
      code: string;
      message: string;
      bannedUntil?: Date;
      clearInput?: boolean;
    };

const BAN_DURATION_MS = 60 * 60 * 1000;
const RATE_LIMIT_COUNT = 8;
const RATE_LIMIT_WINDOW_MS = 10 * 1000;
const CACHE_TTL_MS = 30_000;

const SOCIAL_PATTERNS: { re: RegExp; label: string }[] = [
  { re: /\binsta(?:gram)?(?:\.com)?\b/i, label: 'Instagram' },
  { re: /\binsta\s*[:@]/i, label: 'Instagram' },
  { re: /\bfacebook(?:\.com)?\b/i, label: 'Facebook' },
  { re: /\bfb(?:\.com|\.me)\b/i, label: 'Facebook' },
  { re: /\btelegram\b/i, label: 'Telegram' },
  { re: /\bt\.me\/\w+/i, label: 'Telegram' },
  { re: /\btelegram\.me\b/i, label: 'Telegram' },
  { re: /\bwhatsapp\b/i, label: 'WhatsApp' },
  { re: /\bwa\.me\b/i, label: 'WhatsApp' },
];

const PHONE_PATTERNS: RegExp[] = [
  /\+?\d[\d\s().\-/]{8,}\d/,
  /\b0\d{2,4}[\s\-/]?\d{3,4}[\s\-/]?\d{3,4}[\s\-/]?\d{0,4}\b/,
  /\b\+90[\s\-]?\d{3}[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}\b/,
  /\b\+49[\s\-]?\d{2,4}[\s\-]?\d{3,8}\b/,
  /\b\d{3}[\s\-]\d{3}[\s\-]\d{2}[\s\-]\d{2}\b/,
];

@Injectable()
export class ChatModerationService {
  private bannedWordsCache: {
    words: { word: string; severity: string }[];
    loadedAt: number;
  } | null = null;

  private recentMessages = new Map<
    string,
    { body: string; at: number }[]
  >();

  constructor(private prisma: PrismaService) {}

  async checkMessage(
    userId: string,
    chatId: string,
    body: string,
  ): Promise<ModerationResult> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { status: true, role: true, bannedUntil: true, deletedAt: true },
    });

    if (!user || user.deletedAt) {
      return {
        allowed: false,
        code: 'BANNED',
        message: 'Hesabınız sohbet kullanımına kapalı.',
        clearInput: true,
      };
    }

    if (user.role === UserRole.ADMIN || user.role === UserRole.MODERATOR) {
      return { allowed: true };
    }

    await this.clearExpiredChatBan(userId, user.status, user.bannedUntil);
    const effectiveStatus =
      user.status === UserStatus.SUSPENDED &&
      user.bannedUntil &&
      user.bannedUntil <= new Date()
        ? UserStatus.ACTIVE
        : user.status;
    const effectiveBannedUntil =
      effectiveStatus === UserStatus.ACTIVE ? null : user.bannedUntil;

    const banCheck = this.checkUserBan(effectiveStatus, effectiveBannedUntil);
    if (banCheck) return banCheck;

    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId },
      select: { type: true },
    });
    if (!chat) {
      return { allowed: false, code: 'INVALID_CHAT', message: 'Oda bulunamadı.' };
    }

    const isChannel =
      chat.type === ChatType.GLOBAL ||
      chat.type === ChatType.STATE ||
      chat.type === ChatType.CITY ||
      chat.type === ChatType.EVENT;

    const normalized = this.normalizeText(body);

    const wordHit = await this.matchBannedWord(normalized);
    if (wordHit) {
      return this.handleBannedWordViolation(userId, chatId, wordHit, body);
    }

    if (isChannel) {
      const socialHit = this.matchSocialMedia(body);
      if (socialHit) {
        return this.warnOnly(
          userId,
          chatId,
          ChatModerationReason.SOCIAL_MEDIA,
          socialHit,
          body,
          `${socialHit} paylaşımı sohbet kanallarında yasaktır.`,
        );
      }

      const phoneHit = this.matchPhoneNumber(body);
      if (phoneHit) {
        return this.warnOnly(
          userId,
          chatId,
          ChatModerationReason.PHONE_NUMBER,
          'telefon numarası',
          body,
          'Telefon numarası paylaşımı sohbet kanallarında yasaktır.',
        );
      }
    }

    const rateHit = this.checkRateLimit(userId);
    if (rateHit) {
      return this.warnOnly(
        userId,
        chatId,
        ChatModerationReason.RATE_LIMIT,
        'hızlı mesaj',
        body,
        'Çok hızlı mesaj gönderiyorsunuz. Lütfen yavaşlayın.',
      );
    }

    const spamHit = this.checkDuplicateSpam(userId, body);
    if (spamHit) {
      return this.warnOnly(
        userId,
        chatId,
        ChatModerationReason.SPAM,
        'tekrarlayan mesaj',
        body,
        'Aynı mesajı tekrar tekrar göndermek yasaktır.',
      );
    }

    this.trackMessage(userId, body);
    return { allowed: true };
  }

  async checkCanJoin(userId: string): Promise<ModerationResult> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { status: true, role: true, bannedUntil: true, deletedAt: true },
    });
    if (!user || user.deletedAt) {
      return {
        allowed: false,
        code: 'BANNED',
        message: 'Hesabınız sohbet kullanımına kapalı.',
      };
    }
    if (user.role === UserRole.ADMIN || user.role === UserRole.MODERATOR) {
      return { allowed: true };
    }
    await this.clearExpiredChatBan(userId, user.status, user.bannedUntil);
    const effectiveStatus =
      user.status === UserStatus.SUSPENDED &&
      user.bannedUntil &&
      user.bannedUntil <= new Date()
        ? UserStatus.ACTIVE
        : user.status;
    const effectiveBannedUntil =
      effectiveStatus === UserStatus.ACTIVE ? null : user.bannedUntil;
    const banCheck = this.checkUserBan(effectiveStatus, effectiveBannedUntil);
    if (banCheck) return banCheck;
    return { allowed: true };
  }

  private async clearExpiredChatBan(
    userId: string,
    status: UserStatus,
    bannedUntil: Date | null,
  ) {
    if (
      status === UserStatus.SUSPENDED &&
      bannedUntil &&
      bannedUntil <= new Date()
    ) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { status: UserStatus.ACTIVE, bannedUntil: null },
      });
    }
  }

  invalidateBannedWordsCache() {
    this.bannedWordsCache = null;
  }

  private checkUserBan(
    status: UserStatus,
    bannedUntil: Date | null,
  ): ModerationResult | null {
    const now = new Date();
    if (status === UserStatus.BANNED) {
      return {
        allowed: false,
        code: 'BANNED',
        message: 'Hesabınız banlı. Sohbete katılamazsınız.',
        clearInput: true,
      };
    }
    if (status === UserStatus.SUSPENDED) {
      if (bannedUntil && bannedUntil > now) {
        return {
          allowed: false,
          code: 'BANNED',
          message: `Sohbet yasağınız devam ediyor. Bitiş: ${bannedUntil.toLocaleString('tr-TR')}`,
          bannedUntil,
          clearInput: true,
        };
      }
      if (!bannedUntil) {
        return {
          allowed: false,
          code: 'BANNED',
          message: 'Hesabınız askıya alınmış.',
          clearInput: true,
        };
      }
    }
    if (bannedUntil && bannedUntil > now) {
      return {
        allowed: false,
        code: 'BANNED',
        message: `Geçici sohbet yasağınız var. Bitiş: ${bannedUntil.toLocaleString('tr-TR')}`,
        bannedUntil,
        clearInput: true,
      };
    }
    return null;
  }

  /** Yasaklı kelime: 1. ihlal uyarı, aynı kelime 2. kez → 1 saat ban */
  private async handleBannedWordViolation(
    userId: string,
    chatId: string,
    word: string,
    body: string,
  ): Promise<ModerationResult> {
    const priorSameWord = await this.prisma.chatModerationLog.count({
      where: {
        userId,
        reason: ChatModerationReason.BANNED_WORD,
        detail: word,
      },
    });

    await this.logViolation(userId, chatId, ChatModerationReason.BANNED_WORD, word, body);

    if (priorSameWord >= 1) {
      const bannedUntil = await this.applyChatBan(userId, chatId);
      return {
        allowed: false,
        code: 'AUTO_BANNED',
        message: `Aynı uygunsuz kelimeyi tekrar kullandınız. 1 saat sohbet yasağı uygulandı. Bitiş: ${bannedUntil.toLocaleString('tr-TR')}`,
        bannedUntil,
        clearInput: true,
      };
    }

    return {
      allowed: false,
      code: 'WARNING',
      message:
        'Mesajınız uygunsuz kelime içerdiği için engellendi ve silindi. Aynı kelimeyi tekrar kullanırsanız 1 saat sohbet yasağı uygulanır.',
      clearInput: true,
    };
  }

  private async warnOnly(
    userId: string,
    chatId: string,
    reason: ChatModerationReason,
    detail: string,
    body: string,
    message: string,
  ): Promise<ModerationResult> {
    await this.logViolation(userId, chatId, reason, detail, body);
    return {
      allowed: false,
      code: 'WARNING',
      message: `${message} Mesajınız gönderilmedi.`,
      clearInput: true,
    };
  }

  private async logViolation(
    userId: string,
    chatId: string,
    reason: ChatModerationReason,
    detail: string,
    body: string,
  ) {
    await this.prisma.chatModerationLog.create({
      data: {
        userId,
        chatId,
        reason,
        detail,
        messageSnippet: body.slice(0, 200),
      },
    });
  }

  private async applyChatBan(userId: string, chatId: string): Promise<Date> {
    const bannedUntil = new Date(Date.now() + BAN_DURATION_MS);
    await this.prisma.user.update({
      where: { id: userId },
      data: { status: UserStatus.SUSPENDED, bannedUntil },
    });
    await this.prisma.chatModerationLog.create({
      data: {
        userId,
        chatId,
        reason: ChatModerationReason.SPAM,
        detail: 'aynı yasaklı kelime tekrarı — otomatik 1 saat ban',
        autoBanned: true,
        bannedUntil,
      },
    });
    return bannedUntil;
  }

  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .replace(/[^a-z0-9çğıöşü\s]/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private async getBannedWords() {
    const now = Date.now();
    if (
      this.bannedWordsCache &&
      now - this.bannedWordsCache.loadedAt < CACHE_TTL_MS
    ) {
      return this.bannedWordsCache.words;
    }
    const words = await this.prisma.chatBannedWord.findMany({
      where: { isActive: true },
      select: { word: true, severity: true },
    });
    this.bannedWordsCache = { words, loadedAt: now };
    return words;
  }

  private async matchBannedWord(normalized: string): Promise<string | null> {
    const words = await this.getBannedWords();
    for (const { word, severity } of words) {
      if (severity !== 'CRITICAL') continue;
      const normalizedWord = this.normalizeText(word);
      if (!normalizedWord) continue;
      if (this.containsToken(normalized, normalizedWord)) {
        return normalizedWord;
      }
    }
    return null;
  }

  private containsToken(text: string, token: string): boolean {
    if (token.includes(' ')) return text.includes(token);
    const parts = text.split(' ');
    if (parts.some((p) => p === token)) return true;
    return text.replace(/\s/g, '').includes(token.replace(/\s/g, ''));
  }

  private matchSocialMedia(body: string): string | null {
    for (const { re, label } of SOCIAL_PATTERNS) {
      if (re.test(body)) return label;
    }
    return null;
  }

  private matchPhoneNumber(body: string): boolean {
    const digitsOnly = body.replace(/\D/g, '');
    if (digitsOnly.length < 9) return false;
    return PHONE_PATTERNS.some((re) => re.test(body));
  }

  private checkRateLimit(userId: string): boolean {
    const now = Date.now();
    const list = (this.recentMessages.get(userId) ?? []).filter(
      (m) => now - m.at < RATE_LIMIT_WINDOW_MS,
    );
    return list.length >= RATE_LIMIT_COUNT;
  }

  private checkDuplicateSpam(userId: string, body: string): boolean {
    const now = Date.now();
    const list = (this.recentMessages.get(userId) ?? []).filter(
      (m) => now - m.at < 60_000,
    );
    const normalized = this.normalizeText(body);
    const sameCount = list.filter(
      (m) => this.normalizeText(m.body) === normalized,
    ).length;
    return sameCount >= 2;
  }

  private trackMessage(userId: string, body: string) {
    const now = Date.now();
    const list = (this.recentMessages.get(userId) ?? []).filter(
      (m) => now - m.at < 60_000,
    );
    list.push({ body, at: now });
    this.recentMessages.set(userId, list);
  }
}
