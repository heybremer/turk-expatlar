import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ChatType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  async getOrCreateRoomChat(type: 'STATE' | 'CITY', id: string) {
    const where = type === 'STATE' ? { stateId: id } : { cityId: id };
    const chatType: ChatType = type === 'STATE' ? ChatType.STATE : ChatType.CITY;
    const existing = await this.prisma.chat.findFirst({ where: { type: chatType, ...where } });
    if (existing) return existing;
    return this.prisma.chat.create({ data: { type: chatType, ...where } });
  }

  async listPublicRooms() {
    const globalChats = await this.prisma.chat.findMany({
      where: { type: ChatType.GLOBAL, isPublic: true },
      orderBy: { createdAt: 'asc' },
    });
    const global =
      globalChats[0] ?? (await this.getOrCreateGlobalChat());
    const extraGlobals = globalChats.filter((c) => c.id !== global.id);

    const states = await this.prisma.federalState.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
    const cities = await this.prisma.city.findMany({
      select: { id: true, name: true, stateId: true },
      orderBy: { name: 'asc' },
    });
    return {
      global: { chatId: global.id, name: global.name ?? 'Genel Sohbet' },
      extraGlobals: extraGlobals.map((c) => ({
        chatId: c.id,
        name: c.name ?? 'Genel Kanal',
      })),
      states,
      cities,
    };
  }

  async listAccessibleRooms(userId?: string) {
    const global = await this.getOrCreateGlobalChat();
    const result = {
      global: { chatId: global.id, name: global.name ?? 'Genel Sohbet' },
      states: [] as { id: string; name: string }[],
      cities: [] as { id: string; name: string; stateId: string }[],
    };

    if (!userId) return result;

    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      select: { stateId: true, cityId: true },
    });

    if (!profile?.stateId) return result;

    const state = await this.prisma.federalState.findUnique({
      where: { id: profile.stateId },
      select: { id: true, name: true },
    });
    if (state) result.states = [state];

    // Yalnızca kullanıcının kayıtlı şehri
    if (profile.cityId) {
      const city = await this.prisma.city.findUnique({
        where: { id: profile.cityId },
        select: { id: true, name: true, stateId: true },
      });
      if (city) result.cities = [city];
    }

    return result;
  }

  async getOrCreateGlobalChat() {
    const existing = await this.prisma.chat.findFirst({
      where: { type: ChatType.GLOBAL },
    });
    if (existing) return existing;
    return this.prisma.chat.create({
      data: { type: ChatType.GLOBAL, name: 'Genel Sohbet' },
    });
  }

  /** Sohbet presence ve üye listesi için profil özeti */
  async getUserChatProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        deletedAt: true,
        profile: {
          select: {
            displayName: true,
            avatarUrl: true,
            postalCountry: true,
          },
        },
      },
    });
    if (!user || user.deletedAt || !user.profile) return null;
    return user.profile;
  }

  /** Giriş yapmış kullanıcının site genelinde online görüneceği kanallar */
  async getPresenceChatIds(userId: string): Promise<string[]> {
    const ids: string[] = [];
    const global = await this.getOrCreateGlobalChat();
    ids.push(global.id);

    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      select: { stateId: true, cityId: true },
    });

    if (profile?.stateId) {
      const stateChat = await this.getOrCreateRoomChat('STATE', profile.stateId);
      ids.push(stateChat.id);
    }
    if (profile?.cityId) {
      const cityChat = await this.getOrCreateRoomChat('CITY', profile.cityId);
      ids.push(cityChat.id);
    }

    return [...new Set(ids)];
  }

  async getMessages(chatId: string, limit = 50, before?: string) {
    const chat = await this.prisma.chat.findUnique({ where: { id: chatId } });
    if (!chat) throw new NotFoundException('Oda bulunamadı');

    const now = new Date();
    const messages = await this.prisma.message.findMany({
      where: {
        chatId,
        deletedAt: null,
        user: { deletedAt: null },
        // Süresi dolmuş zamanlayıcılı mesajları hariç tut
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        ...(before && { createdAt: { lt: new Date(before) } }),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            role: true,
            profile: { select: { displayName: true, avatarUrl: true, postalCountry: true } },
          },
        },
        replyTo: {
          select: {
            id: true,
            body: true,
            deletedAt: true,
            user: { select: { profile: { select: { displayName: true } } } },
          },
        },
      },
    });

    if (messages.length === 0) return messages;

    // Reaksiyonları toplu çek ve mesaj başına grupla (toggleReaction ile aynı şekil)
    const reactionRows = await this.prisma.messageReaction.groupBy({
      by: ['messageId', 'emoji'],
      where: { messageId: { in: messages.map((m) => m.id) } },
      _count: { emoji: true },
    });
    const reactionsByMessage = new Map<string, { emoji: string; count: number }[]>();
    for (const row of reactionRows) {
      const list = reactionsByMessage.get(row.messageId) ?? [];
      list.push({ emoji: row.emoji, count: row._count.emoji });
      reactionsByMessage.set(row.messageId, list);
    }

    return messages.map((m) => ({
      ...m,
      reactions: reactionsByMessage.get(m.id) ?? [],
    }));
  }

  // Konum koruması: null = erişim verildi, obje = reddedildi + detay
  async checkRoomAccess(
    chatId: string,
    userId: string,
  ): Promise<{ reason: string; requiredLocation?: string } | null> {
    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        state: { select: { id: true, name: true } },
        city: { select: { id: true, name: true } },
        members: { select: { userId: true } },
      },
    });

    if (chat?.type === ChatType.DIRECT) {
      const partner = chat.members.find((m) => m.userId !== userId);
      if (partner && (await this.isBlockedEitherWay(userId, partner.userId))) {
        return { reason: 'blocked' };
      }
      return null;
    }

    // GLOBAL veya EVENT odaları herkese açık
    if (!chat || chat.type === ChatType.GLOBAL || chat.type === ChatType.EVENT) {
      return null;
    }

    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      select: { stateId: true, cityId: true, postalCode: true },
    });

    // Profil konumu tanımsızsa erişim engelle — profil tamamlama yönlendirmesi
    if (!profile?.stateId) {
      const locationName =
        chat.type === ChatType.STATE
          ? chat.state?.name ?? 'bu eyalet'
          : chat.city?.name ?? 'bu şehir';
      return {
        reason: 'no_location',
        requiredLocation: locationName,
      };
    }

    if (chat.type === ChatType.STATE && chat.stateId) {
      if (profile.stateId !== chat.stateId) {
        return {
          reason: 'wrong_location',
          requiredLocation: chat.state?.name ?? 'bu eyalet',
        };
      }
    }

    if (chat.type === ChatType.CITY && chat.cityId) {
      // Tam cityId eşleşmesi: en güvenli kontrol
      if (profile.cityId === chat.cityId) return null;

      // cityId profilde yoksa veya yanlışsa → şehrin eyaletiyle karşılaştır
      // Aynı eyaletteyse (cityId eksik ama stateId doğruysa) izin ver
      const chatCity = await this.prisma.city.findUnique({
        where: { id: chat.cityId },
        select: { stateId: true },
      });
      if (chatCity && profile.stateId === chatCity.stateId) {
        // Aynı eyalette → şehir odasına girebilir
        return null;
      }

      return {
        reason: 'wrong_location',
        requiredLocation: chat.city?.name ?? 'bu şehir',
      };
    }

    return null;
  }

  // O oda (eyalet/şehir) ile eşleşen kullanıcıları döndür (max 100)
  async getRegionUsers(chatId: string) {
    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId },
      include: { city: { select: { stateId: true } } },
    });
    if (!chat) return [];

    if (chat.type === ChatType.GLOBAL) {
      const profiles = await this.prisma.profile.findMany({
        where: { user: { deletedAt: null } },
        take: 100,
        orderBy: { updatedAt: 'desc' },
        select: {
          userId: true,
          displayName: true,
          avatarUrl: true,
          postalCountry: true,
        },
      });
      return profiles;
    }

    let profileWhere: Record<string, unknown> = { user: { deletedAt: null } };

    if (chat.type === ChatType.STATE && chat.stateId) {
      profileWhere = { ...profileWhere, stateId: chat.stateId };
    } else if (chat.type === ChatType.CITY && chat.cityId) {
      // Şehir odasında: stateId eşleşimi yeterli (checkRoomAccess ile uyumlu)
      const stateId = chat.city?.stateId ?? null;
      if (stateId) profileWhere = { ...profileWhere, stateId };
    } else {
      return [];
    }

    const profiles = await this.prisma.profile.findMany({
      where: profileWhere,
      take: 100,
      orderBy: { updatedAt: 'desc' },
      select: {
        userId: true,
        displayName: true,
        avatarUrl: true,
        cityId: true,
        stateId: true,
        postalCountry: true,
      },
    });

    return profiles;
  }

  async saveMessage(
    chatId: string,
    userId: string,
    body: string,
    attachments: { url: string; name: string; size: number; type: string; mime: string }[] = [],
    expiresAt?: Date,
    replyToId?: string | null,
  ) {
    // Yanıtlanan mesaj aynı sohbette ve silinmemiş olmalı; aksi halde yanıt bağı yok sayılır
    let validReplyToId: string | null = null;
    if (replyToId) {
      const target = await this.prisma.message.findFirst({
        where: { id: replyToId, chatId, deletedAt: null },
        select: { id: true },
      });
      if (target) validReplyToId = target.id;
    }

    const message = await this.prisma.message.create({
      data: {
        chatId,
        userId,
        body,
        attachments,
        expiresAt: expiresAt ?? null,
        replyToId: validReplyToId,
      },
      include: {
        user: {
          select: {
            id: true,
            role: true,
            profile: { select: { displayName: true, avatarUrl: true, postalCountry: true } },
          },
        },
        replyTo: {
          select: {
            id: true,
            body: true,
            deletedAt: true,
            user: { select: { profile: { select: { displayName: true } } } },
          },
        },
      },
    });

    // Özel mesaj: yalnızca alıcı gizlemişse, gelen mesajla tekrar görünsün (gönderen silmişse listeye dönmesin)
    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId },
      select: { type: true },
    });
    if (chat?.type === ChatType.DIRECT) {
      await this.prisma.chatMember.updateMany({
        where: { chatId, userId: { not: userId }, hiddenAt: { not: null } },
        data: { hiddenAt: null },
      });
    }

    return message;
  }

  async deleteMessage(messageId: string, userId: string, isAdmin = false) {
    const msg = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: { chat: { select: { type: true } } },
    });
    if (!msg || msg.deletedAt) throw new NotFoundException('Mesaj bulunamadı');
    if (msg.chat.type === ChatType.DIRECT && !isAdmin) {
      throw new ForbiddenException('Özel mesajlarda mesaj silinemez');
    }
    if (!isAdmin && msg.userId !== userId) throw new ForbiddenException('Bu mesajı silemezsiniz');
    return this.prisma.message.update({
      where: { id: messageId },
      data: { deletedAt: new Date() },
    });
  }

  /** Bir oda/genel sohbetteki tüm mesajları temizler. Yalnızca admin için, DM'lerde kullanılamaz. */
  async clearRoomMessages(chatId: string, userId: string) {
    const requester = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (requester?.role !== 'ADMIN') {
      throw new ForbiddenException('Bu işlemi yalnızca yöneticiler yapabilir');
    }

    const chat = await this.prisma.chat.findUnique({ where: { id: chatId }, select: { type: true } });
    if (!chat) throw new NotFoundException('Sohbet bulunamadı');
    if (chat.type === ChatType.DIRECT) {
      throw new ForbiddenException('Özel mesajlar bu şekilde temizlenemez');
    }

    const result = await this.prisma.message.updateMany({
      where: { chatId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    return { chatId, deletedCount: result.count };
  }

  /** DIRECT sohbette gönderenin karşı tarafının userId'sini döndürür (push bildirimi için). */
  async getDmRecipientId(chatId: string, senderId: string): Promise<string | null> {
    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId },
      select: { type: true },
    });
    if (!chat || chat.type !== ChatType.DIRECT) return null;

    const otherMember = await this.prisma.chatMember.findFirst({
      where: { chatId, userId: { not: senderId } },
      select: { userId: true },
    });
    return otherMember?.userId ?? null;
  }

  async setRoomPassword(chatId: string, userId: string, password: string | null) {
    const chat = await this.prisma.chat.findUnique({ where: { id: chatId } });
    if (!chat) throw new NotFoundException('Sohbet bulunamadı');

    if (chat.type === ChatType.DIRECT) {
      const member = await this.prisma.chatMember.findFirst({ where: { chatId, userId } });
      if (!member) throw new ForbiddenException('Bu sohbete erişiminiz yok');
    }

    return this.prisma.chat.update({
      where: { id: chatId },
      data: { password: password?.trim() ? password.trim() : null },
    });
  }

  async getRoomPassword(chatId: string): Promise<string | null> {
    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId },
      select: { password: true },
    });
    return chat?.password ?? null;
  }

  async resolveChatId(type: 'state' | 'city' | 'global', slug: string) {
    if (type === 'global') {
      const chat = await this.getOrCreateGlobalChat();
      return { chatId: chat.id, name: chat.name ?? 'Genel Sohbet' };
    }
    if (type === 'state') {
      const state = await this.prisma.federalState.findFirst({ where: { slug } });
      if (!state) throw new NotFoundException();
      const chat = await this.getOrCreateRoomChat('STATE', state.id);
      return { chatId: chat.id, name: `${state.name} Genel Sohbet` };
    } else {
      const city = await this.prisma.city.findFirst({ where: { slug } });
      if (!city) throw new NotFoundException();
      const chat = await this.getOrCreateRoomChat('CITY', city.id);
      return { chatId: chat.id, name: `${city.name} Sohbet` };
    }
  }

  // DM: iki kullanıcı arasında DIRECT chat bul veya oluştur
  async getOrCreateDirectChat(userAId: string, userBId: string) {
    // Her iki kullanıcının da üye olduğu DIRECT odayı bul
    const existing = await this.prisma.chat.findFirst({
      where: {
        type: ChatType.DIRECT,
        members: { every: { userId: { in: [userAId, userBId] } } },
      },
      include: { members: true },
    });

    if (existing && existing.members.length === 2) return existing;

    // Yoksa oluştur ve her iki kullanıcıyı üye yap
    return this.prisma.chat.create({
      data: {
        type: ChatType.DIRECT,
        members: {
          create: [{ userId: userAId }, { userId: userBId }],
        },
      },
      include: { members: true },
    });
  }

  async isBlockedEitherWay(userAId: string, userBId: string) {
    const block = await this.prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: userAId, blockedId: userBId },
          { blockerId: userBId, blockedId: userAId },
        ],
      },
    });
    return !!block;
  }

  async resolveDmChat(myId: string, targetUserId: string) {
    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        role: true,
        deletedAt: true,
        profile: { select: { displayName: true, avatarUrl: true, postalCountry: true } },
      },
    });
    if (!targetUser || targetUser.deletedAt) throw new NotFoundException('Kullanıcı bulunamadı');

    if (await this.isBlockedEitherWay(myId, targetUserId)) {
      throw new ForbiddenException('Bu kullanıcıyla mesajlaşamazsınız');
    }

    const chat = await this.getOrCreateDirectChat(myId, targetUserId);

    const partnerMember = await this.prisma.chatMember.findFirst({
      where: { chatId: chat.id, userId: targetUserId },
      select: { lastReadAt: true },
    });

    return {
      chatId: chat.id,
      name: targetUser.profile?.displayName ?? 'Anonim',
      targetUser,
      hasPassword: !!chat.password,
      partnerLastReadAt: partnerMember?.lastReadAt?.toISOString() ?? null,
      muted: await this.isMuted(chat.id, myId),
    };
  }

  async setMute(chatId: string, userId: string, muted: boolean) {
    const member = await this.prisma.chatMember.findFirst({ where: { chatId, userId } });
    if (!member) throw new NotFoundException('Sohbet bulunamadı');
    await this.prisma.chatMember.update({
      where: { id: member.id },
      data: { mutedUntil: muted ? new Date('2099-01-01') : null },
    });
    return { muted };
  }

  async isMuted(chatId: string, userId: string) {
    const member = await this.prisma.chatMember.findFirst({
      where: { chatId, userId },
      select: { mutedUntil: true },
    });
    if (!member?.mutedUntil) return false;
    return member.mutedUntil.getTime() > Date.now();
  }

  async hideDmConversation(chatId: string, userId: string) {
    const member = await this.prisma.chatMember.findFirst({
      where: { chatId, userId },
      include: { chat: { select: { type: true } } },
    });
    if (!member || member.chat.type !== ChatType.DIRECT) {
      throw new NotFoundException('Sohbet bulunamadı');
    }
    return this.prisma.chatMember.update({
      where: { id: member.id },
      data: { hiddenAt: new Date() },
    });
  }

  // Kullanıcının DM geçmişi (son mesajıyla birlikte)
  async listMyDms(userId: string) {
    const memberships = await this.prisma.chatMember.findMany({
      where: { userId, hiddenAt: null },
      include: {
        chat: {
          include: {
            members: {
              where: {
                userId: { not: userId },
                user: { deletedAt: null },
              },
              include: {
                user: {
                  select: {
                    id: true,
                    role: true,
                    deletedAt: true,
                    profile: { select: { displayName: true, avatarUrl: true, postalCountry: true } },
                  },
                },
              },
            },
            messages: {
              where: { deletedAt: null, user: { deletedAt: null } },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });

    const dms = memberships.filter((m) => m.chat.type === ChatType.DIRECT);

    const results = await Promise.all(
      dms.map(async (m) => {
        const partner = m.chat.members[0]?.user ?? null;
        if (!partner || partner.deletedAt) return null;
        const unread = m.lastReadAt
          ? await this.prisma.message.count({
              where: {
                chatId: m.chat.id,
                deletedAt: null,
                user: { deletedAt: null },
                userId: { not: userId },
                createdAt: { gt: m.lastReadAt },
              },
            })
          : await this.prisma.message.count({
              where: {
                chatId: m.chat.id,
                deletedAt: null,
                user: { deletedAt: null },
                userId: { not: userId },
              },
            });
        return {
          chatId: m.chat.id,
          partner,
          lastMessage: m.chat.messages[0] ?? null,
          unread,
        };
      }),
    );

    return results.filter((dm) => dm !== null);
  }

  async getDmUnreadCount(userId: string): Promise<number> {
    const memberships = await this.prisma.chatMember.findMany({
      where: { userId, hiddenAt: null, chat: { type: ChatType.DIRECT } },
      select: { chatId: true, lastReadAt: true },
    });

    let total = 0;
    for (const m of memberships) {
      const count = await this.prisma.message.count({
        where: {
          chatId: m.chatId,
          deletedAt: null,
          user: { deletedAt: null },
          userId: { not: userId },
          ...(m.lastReadAt ? { createdAt: { gt: m.lastReadAt } } : {}),
        },
      });
      total += count;
    }
    return total;
  }

  async markDmRead(chatId: string, userId: string) {
    const now = new Date();
    await this.prisma.chatMember.updateMany({
      where: { chatId, userId },
      data: { lastReadAt: now },
    });
    return { lastReadAt: now.toISOString() };
  }

  async toggleReaction(messageId: string, userId: string, emoji: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      select: { id: true, chatId: true, deletedAt: true },
    });
    if (!message || message.deletedAt) return null;

    const existing = await this.prisma.messageReaction.findFirst({
      where: { messageId, userId, emoji },
    });

    if (existing) {
      await this.prisma.messageReaction.delete({ where: { id: existing.id } });
    } else {
      await this.prisma.messageReaction.create({ data: { messageId, userId, emoji } });
    }

    // Mesajın güncel reaksiyon özetini döndür
    const reactions = await this.prisma.messageReaction.groupBy({
      by: ['emoji'],
      where: { messageId },
      _count: { emoji: true },
    });

    return {
      chatId: message.chatId,
      reactions: reactions.map((r) => ({ emoji: r.emoji, count: r._count.emoji })),
    };
  }
}
