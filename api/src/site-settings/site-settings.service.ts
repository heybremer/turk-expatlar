import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventCalendarService } from '../event-calendar/event-calendar.service';
import { NewsService } from '../news/news.service';
import { UpdateSiteSettingsDto } from './dto/update-site-settings.dto';
import {
  DEFAULT_SITE_SETTINGS,
  isMaintenanceActive,
  PublicSiteSettings,
} from './site-settings.defaults';
import {
  setCacheConfig,
  setFeatureFlags,
  setAppFeatureFlags,
  setMaintenanceState,
} from './runtime-config.store';

const SETTINGS_ID = 'default';
const MEMORY_CACHE_MS = 30_000;

@Injectable()
export class SiteSettingsService implements OnModuleInit {
  private readonly logger = new Logger(SiteSettingsService.name);
  private memoryCache: { data: Awaited<ReturnType<SiteSettingsService['loadFromDb']>>; at: number } | null =
    null;

  constructor(
    private prisma: PrismaService,
    private eventCalendar: EventCalendarService,
    private news: NewsService,
  ) {}

  async onModuleInit() {
    const settings = await this.loadFromDb();
    this.syncRuntimeConfig(settings);
  }

  async getSettings() {
    return this.getCachedSettings();
  }

  async getPublicSettings(): Promise<PublicSiteSettings> {
    const s = await this.getCachedSettings();
    return {
      siteName: s.siteName,
      siteTagline: s.siteTagline,
      metaTitle: s.metaTitle,
      metaDescription: s.metaDescription,
      metaKeywords: s.metaKeywords,
      ogImageUrl: s.ogImageUrl,
      canonicalUrl: s.canonicalUrl,
      robotsAllowIndex: s.robotsAllowIndex,
      customHeadHtml: s.customHeadHtml,
      logoUrl: s.logoUrl,
      instagramUrl: s.instagramUrl,
      facebookUrl: s.facebookUrl,
      telegramUrl: s.telegramUrl,
      whatsappNumber: s.whatsappNumber,
      footerTagline: s.footerTagline,
      footerCopyrightText: s.footerCopyrightText,
      launchBadgeText: s.launchBadgeText,
      launchHeadline: s.launchHeadline,
      launchDescription: s.launchDescription,
      launchPromoCode: s.launchPromoCode,
      userMembershipPriceEur: s.userMembershipPriceEur,
      businessMembershipPriceEur: s.businessMembershipPriceEur,
      googleAnalyticsId: s.googleAnalyticsId,
      googleTagManagerId: s.googleTagManagerId,
      googleAdsId: s.googleAdsId,
      googleAdsConversionLabel: s.googleAdsConversionLabel,
      googleSearchConsoleVerification: s.googleSearchConsoleVerification,
      facebookPixelId: s.facebookPixelId,
      maintenanceMode: isMaintenanceActive(s),
      maintenanceMessage: s.maintenanceMessage,
      maintenanceAllowAdmins: s.maintenanceAllowAdmins,
      maintenanceStartAt: s.maintenanceStartAt?.toISOString() ?? null,
      maintenanceEndAt: s.maintenanceEndAt?.toISOString() ?? null,
      registrationEnabled: s.registrationEnabled,
      forumEnabled: s.forumEnabled,
      chatEnabled: s.chatEnabled,
      eventsEnabled: s.eventsEnabled,
      appStateNewsEnabled: s.appStateNewsEnabled,
      appCityNewsEnabled: s.appCityNewsEnabled,
      appEventCalendarEnabled: s.appEventCalendarEnabled,
      appPublicHolidaysEnabled: s.appPublicHolidaysEnabled,
      appConsulatesEnabled: s.appConsulatesEnabled,
      appOfficialInstitutionsEnabled: s.appOfficialInstitutionsEnabled,
      appTravelGuideEnabled: s.appTravelGuideEnabled,
      trDefaultAllowedPages: s.trDefaultAllowedPages,
    };
  }

  async updateSettings(userId: string, dto: UpdateSiteSettingsDto) {
    const dateFields = new Set(['maintenanceStartAt', 'maintenanceEndAt']);
    const data: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(dto)) {
      if (value === undefined) continue;
      if (dateFields.has(key)) {
        const raw = typeof value === 'string' ? value.trim() : '';
        data[key] = raw ? new Date(raw) : null;
        continue;
      }
      data[key] = typeof value === 'string' ? value.trim() || null : value;
    }

    const updated = await this.prisma.siteSettings.upsert({
      where: { id: SETTINGS_ID },
      create: { id: SETTINGS_ID, ...DEFAULT_SITE_SETTINGS, ...data, updatedById: userId },
      update: { ...data, updatedById: userId },
    });

    this.invalidateMemoryCache();
    this.syncRuntimeConfig(updated);
    this.logger.log(`Site settings updated by ${userId}`);
    return updated;
  }

  async clearCaches() {
    this.eventCalendar.clearCache();
    this.news.clearCache();
    this.invalidateMemoryCache();

    await this.prisma.siteSettings.update({
      where: { id: SETTINGS_ID },
      data: { cacheClearedAt: new Date() },
    });

    const settings = await this.getCachedSettings();
    return {
      message: 'Önbellek temizlendi',
      cleared: ['event-calendar', 'news-feeds', 'settings-memory'],
      cacheClearedAt: settings.cacheClearedAt,
    };
  }

  async isCacheEnabled(): Promise<boolean> {
    const s = await this.getCachedSettings();
    return s.cacheEnabled;
  }

  async getCacheTtlMs(): Promise<number> {
    const s = await this.getCachedSettings();
    return Math.max(5, s.cacheTtlMinutes) * 60 * 1000;
  }

  private syncRuntimeConfig(settings: Awaited<ReturnType<SiteSettingsService['loadFromDb']>>) {
    setCacheConfig(settings.cacheEnabled, settings.cacheTtlMinutes);
    setFeatureFlags({
      registrationEnabled: settings.registrationEnabled,
      forumEnabled: settings.forumEnabled,
      chatEnabled: settings.chatEnabled,
      eventsEnabled: settings.eventsEnabled,
    });
    setAppFeatureFlags({
      appStateNewsEnabled: settings.appStateNewsEnabled,
      appCityNewsEnabled: settings.appCityNewsEnabled,
      appEventCalendarEnabled: settings.appEventCalendarEnabled,
      appPublicHolidaysEnabled: settings.appPublicHolidaysEnabled,
      appConsulatesEnabled: settings.appConsulatesEnabled,
      appOfficialInstitutionsEnabled: settings.appOfficialInstitutionsEnabled,
      appTravelGuideEnabled: settings.appTravelGuideEnabled,
    });
    setMaintenanceState(
      isMaintenanceActive(settings),
      settings.maintenanceMessage,
    );
  }

  private async getCachedSettings() {
    if (this.memoryCache && Date.now() - this.memoryCache.at < MEMORY_CACHE_MS) {
      return this.memoryCache.data;
    }
    const data = await this.loadFromDb();
    this.memoryCache = { data, at: Date.now() };
    this.syncRuntimeConfig(data);
    return data;
  }

  private invalidateMemoryCache() {
    this.memoryCache = null;
  }

  private async loadFromDb() {
    const row = await this.prisma.siteSettings.findUnique({ where: { id: SETTINGS_ID } });
    if (row) return row;

    return this.prisma.siteSettings.create({
      data: { id: SETTINGS_ID, ...DEFAULT_SITE_SETTINGS },
    });
  }
}
