import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

function isNonEmptyString(value: unknown): boolean {
  return typeof value === 'string' && value.trim() !== '';
}

export class UpdateSiteSettingsDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  siteName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  siteTagline?: string;

  @IsOptional()
  @ValidateIf((_, v) => isNonEmptyString(v))
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @ValidateIf((_, v) => isNonEmptyString(v))
  @IsEmail()
  supportEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  metaTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  metaDescription?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  metaKeywords?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  ogImageUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  canonicalUrl?: string;

  @IsOptional()
  @IsBoolean()
  robotsAllowIndex?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  customHeadHtml?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  googleAnalyticsId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  googleTagManagerId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  googleAdsId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  googleAdsConversionLabel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  googleSearchConsoleVerification?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  facebookPixelId?: string;

  @IsOptional()
  @IsBoolean()
  maintenanceMode?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  maintenanceMessage?: string;

  @IsOptional()
  @IsBoolean()
  maintenanceAllowAdmins?: boolean;

  @IsOptional()
  @IsBoolean()
  cacheEnabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(1440)
  cacheTtlMinutes?: number;

  @IsOptional()
  @IsBoolean()
  registrationEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  forumEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  chatEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  eventsEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  appStateNewsEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  appCityNewsEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  appEventCalendarEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  appPublicHolidaysEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  appConsulatesEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  appOfficialInstitutionsEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  appTravelGuideEnabled?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  logoUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  instagramUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  facebookUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  telegramUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  whatsappNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  footerTagline?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  footerCopyrightText?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  launchBadgeText?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  launchHeadline?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  launchDescription?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  launchPromoCode?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(9999)
  userMembershipPriceEur?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(9999)
  businessMembershipPriceEur?: number;

  @IsOptional()
  @IsString()
  maintenanceStartAt?: string;

  @IsOptional()
  @IsString()
  maintenanceEndAt?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  trDefaultAllowedPages?: string[];
}
