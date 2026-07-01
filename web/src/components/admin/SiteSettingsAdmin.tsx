"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Database,
  Globe,
  Loader2,
  Palette,
  Rocket,
  Save,
  Shield,
  ToggleLeft,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { APP_FEATURE_KEYS, APP_FEATURE_LABELS } from "@/lib/uygulamalar-config";
import { EMPTY_SITE_SETTINGS, type SiteSettings, type SiteSettingsForm } from "@/lib/site-settings";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

type Section = "general" | "brand" | "launch" | "analytics" | "maintenance" | "features";

const TABS: { id: Section; label: string; href: string; icon: typeof Globe }[] = [
  { id: "general", label: "Genel & SEO", href: "/admin/site-ayarlari", icon: Globe },
  { id: "brand", label: "Marka & Footer", href: "/admin/site-ayarlari/marka", icon: Palette },
  { id: "launch", label: "Lansman", href: "/admin/site-ayarlari/lansman", icon: Rocket },
  { id: "analytics", label: "Analytics", href: "/admin/site-ayarlari/analytics", icon: BarChart3 },
  { id: "maintenance", label: "Bakım & Cache", href: "/admin/site-ayarlari/bakim", icon: Database },
  { id: "features", label: "Özellikler", href: "/admin/site-ayarlari/ozellikler", icon: ToggleLeft },
];

function pathToSection(pathname: string): Section {
  if (pathname.includes("/marka")) return "brand";
  if (pathname.includes("/lansman")) return "launch";
  if (pathname.includes("/analytics")) return "analytics";
  if (pathname.includes("/bakim")) return "maintenance";
  if (pathname.includes("/ozellikler")) return "features";
  return "general";
}

function toDatetimeLocal(value: string | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-border bg-surface p-4">
      <div>
        <p className="font-medium text-text">{label}</p>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary"
      />
    </label>
  );
}

export function SiteSettingsAdmin() {
  const pathname = usePathname();
  const section = pathToSection(pathname);
  const { token } = useAuth();
  const [form, setForm] = useState<SiteSettingsForm>(EMPTY_SITE_SETTINGS);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [cacheClearedAt, setCacheClearedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const me = await api.get<{ role: string }>("/users/me", token);
      setIsAdmin(me.role === "ADMIN");
      if (me.role !== "ADMIN") {
        setError("Site ayarları yalnızca ADMIN rolü tarafından düzenlenebilir.");
        return;
      }
      const data = await api.get<SiteSettings>("/admin/site-settings", token);
      setForm({
        siteName: data.siteName ?? "",
        siteTagline: data.siteTagline ?? "",
        contactEmail: data.contactEmail ?? "",
        supportEmail: data.supportEmail ?? "",
        metaTitle: data.metaTitle ?? "",
        metaDescription: data.metaDescription ?? "",
        metaKeywords: data.metaKeywords ?? "",
        ogImageUrl: data.ogImageUrl ?? "",
        canonicalUrl: data.canonicalUrl ?? "",
        robotsAllowIndex: data.robotsAllowIndex,
        customHeadHtml: data.customHeadHtml ?? "",
        googleAnalyticsId: data.googleAnalyticsId ?? "",
        googleTagManagerId: data.googleTagManagerId ?? "",
        googleAdsId: data.googleAdsId ?? "",
        googleAdsConversionLabel: data.googleAdsConversionLabel ?? "",
        googleSearchConsoleVerification: data.googleSearchConsoleVerification ?? "",
        facebookPixelId: data.facebookPixelId ?? "",
        maintenanceMode: data.maintenanceMode,
        maintenanceMessage: data.maintenanceMessage ?? "",
        maintenanceAllowAdmins: data.maintenanceAllowAdmins,
        cacheEnabled: data.cacheEnabled,
        cacheTtlMinutes: data.cacheTtlMinutes,
        registrationEnabled: data.registrationEnabled,
        forumEnabled: data.forumEnabled,
        chatEnabled: data.chatEnabled,
        eventsEnabled: data.eventsEnabled,
        appStateNewsEnabled: data.appStateNewsEnabled,
        appCityNewsEnabled: data.appCityNewsEnabled,
        appEventCalendarEnabled: data.appEventCalendarEnabled,
        appPublicHolidaysEnabled: data.appPublicHolidaysEnabled,
        appConsulatesEnabled: data.appConsulatesEnabled,
        appOfficialInstitutionsEnabled: data.appOfficialInstitutionsEnabled,
        appTravelGuideEnabled: data.appTravelGuideEnabled,
        logoUrl: data.logoUrl ?? "",
        instagramUrl: data.instagramUrl ?? "",
        facebookUrl: data.facebookUrl ?? "",
        telegramUrl: data.telegramUrl ?? "",
        whatsappNumber: data.whatsappNumber ?? "",
        footerTagline: data.footerTagline ?? "",
        footerCopyrightText: data.footerCopyrightText ?? "",
        launchBadgeText: data.launchBadgeText ?? "",
        launchHeadline: data.launchHeadline ?? "",
        launchDescription: data.launchDescription ?? "",
        launchPromoCode: data.launchPromoCode ?? "LAUNCH100",
        userMembershipPriceEur: data.userMembershipPriceEur ?? 10,
        businessMembershipPriceEur: data.businessMembershipPriceEur ?? 50,
        maintenanceStartAt: toDatetimeLocal(data.maintenanceStartAt),
        maintenanceEndAt: toDatetimeLocal(data.maintenanceEndAt),
      });
      setUpdatedAt(data.updatedAt);
      setCacheClearedAt(data.cacheClearedAt);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ayarlar yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  function setField<K extends keyof SiteSettingsForm>(key: K, value: SiteSettingsForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function save() {
    if (!token || !isAdmin) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const { ...payload } = form;
      const res = await api.patch<SiteSettings>(
        "/admin/site-settings",
        {
          ...payload,
          maintenanceStartAt: form.maintenanceStartAt
            ? new Date(form.maintenanceStartAt).toISOString()
            : "",
          maintenanceEndAt: form.maintenanceEndAt
            ? new Date(form.maintenanceEndAt).toISOString()
            : "",
        },
        token,
      );
      setUpdatedAt(res.updatedAt);
      setCacheClearedAt(res.cacheClearedAt);
      setSuccess("Ayarlar kaydedildi.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kaydedilemedi");
    } finally {
      setSaving(false);
    }
  }

  async function clearCache() {
    if (!token || !isAdmin) return;
    setClearing(true);
    try {
      const res = await api.post<{ message: string; cacheClearedAt?: string }>(
        "/admin/site-settings/clear-cache",
        {},
        token,
      );
      setSuccess(res.message);
      if (res.cacheClearedAt) setCacheClearedAt(res.cacheClearedAt);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Önbellek temizlenemedi");
    } finally {
      setClearing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Site Ayarları</h1>
          <p className="mt-1 text-sm text-muted">
            SEO, analytics, bakım modu, cache ve platform özellikleri
          </p>
          {updatedAt && (
            <p className="mt-1 text-xs text-muted">
              Son güncelleme: {new Date(updatedAt).toLocaleString("tr-TR")}
            </p>
          )}
        </div>
        {isAdmin && (
          <Button onClick={() => void save()} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-1.5 h-4 w-4" />
            )}
            Kaydet
          </Button>
        )}
      </div>

      <div className="mt-6 flex flex-wrap gap-2 border-b border-border pb-4">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = section === tab.id;
          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted hover:bg-surface hover:text-text",
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </Link>
          );
        })}
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}
      {success && (
        <p className="mt-4 rounded-lg border border-success/30 bg-success/5 px-4 py-3 text-sm text-success">
          {success}
        </p>
      )}

      {!isAdmin ? (
        <div className="mt-8 flex items-center gap-3 rounded-xl border border-border bg-surface p-6">
          <Shield className="h-8 w-8 text-muted" />
          <p className="text-sm text-muted">
            Bu bölüm yalnızca site yöneticileri (ADMIN) tarafından düzenlenebilir.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-5">
          {section === "general" && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Site adı"
                  value={form.siteName}
                  onChange={(e) => setField("siteName", e.target.value)}
                />
                <Input
                  label="Slogan / tagline"
                  value={form.siteTagline}
                  onChange={(e) => setField("siteTagline", e.target.value)}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="İletişim e-postası"
                  type="email"
                  value={form.contactEmail}
                  onChange={(e) => setField("contactEmail", e.target.value)}
                />
                <Input
                  label="Destek e-postası"
                  type="email"
                  value={form.supportEmail}
                  onChange={(e) => setField("supportEmail", e.target.value)}
                />
              </div>
              <hr className="border-border" />
              <h2 className="font-semibold">SEO & Meta</h2>
              <Input
                label="Meta başlık (title)"
                value={form.metaTitle}
                onChange={(e) => setField("metaTitle", e.target.value)}
                placeholder="Türk Expatlar — Almanya Türkçe Topluluk Platformu"
              />
              <div>
                <label className="block text-sm font-medium">Meta açıklama (description)</label>
                <textarea
                  value={form.metaDescription}
                  onChange={(e) => setField("metaDescription", e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
              </div>
              <Input
                label="Meta anahtar kelimeler (virgülle)"
                value={form.metaKeywords}
                onChange={(e) => setField("metaKeywords", e.target.value)}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Open Graph görsel URL"
                  value={form.ogImageUrl}
                  onChange={(e) => setField("ogImageUrl", e.target.value)}
                  placeholder="https://..."
                />
                <Input
                  label="Canonical URL"
                  value={form.canonicalUrl}
                  onChange={(e) => setField("canonicalUrl", e.target.value)}
                  placeholder="https://turkexpatlar.de"
                />
              </div>
              <Toggle
                label="Arama motorlarında indeksle (robots index)"
                description="Kapalıyken site noindex olarak işaretlenir."
                checked={form.robotsAllowIndex}
                onChange={(v) => setField("robotsAllowIndex", v)}
              />
              <div>
                <label className="block text-sm font-medium">Özel &lt;head&gt; HTML (opsiyonel)</label>
                <textarea
                  value={form.customHeadHtml}
                  onChange={(e) => setField("customHeadHtml", e.target.value)}
                  rows={4}
                  placeholder="Ek meta etiketleri, doğrulama kodları..."
                  className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono text-xs focus:border-primary focus:outline-none"
                />
              </div>
            </>
          )}

          {section === "brand" && (
            <>
              <Input
                label="Logo URL"
                value={form.logoUrl}
                onChange={(e) => setField("logoUrl", e.target.value)}
                placeholder="https://..."
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Instagram URL"
                  value={form.instagramUrl}
                  onChange={(e) => setField("instagramUrl", e.target.value)}
                />
                <Input
                  label="Facebook URL"
                  value={form.facebookUrl}
                  onChange={(e) => setField("facebookUrl", e.target.value)}
                />
                <Input
                  label="Telegram URL"
                  value={form.telegramUrl}
                  onChange={(e) => setField("telegramUrl", e.target.value)}
                />
                <Input
                  label="WhatsApp numarası"
                  value={form.whatsappNumber}
                  onChange={(e) => setField("whatsappNumber", e.target.value)}
                  placeholder="491234567890"
                />
              </div>
              <hr className="border-border" />
              <h2 className="font-semibold">Footer metinleri</h2>
              <div>
                <label className="block text-sm font-medium">Footer açıklama</label>
                <textarea
                  value={form.footerTagline}
                  onChange={(e) => setField("footerTagline", e.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
              </div>
              <Input
                label="Telif metni"
                value={form.footerCopyrightText}
                onChange={(e) => setField("footerCopyrightText", e.target.value)}
                placeholder="Türk Expatlar. Tüm hakları saklıdır."
              />
            </>
          )}

          {section === "launch" && (
            <>
              <p className="text-sm text-muted">
                Ana sayfadaki lansman bandı metinleri. Değişkenler:{" "}
                <code className="rounded bg-surface px-1">{"{remaining}"}</code>,{" "}
                <code className="rounded bg-surface px-1">{"{price}"}</code>,{" "}
                <code className="rounded bg-surface px-1">{"{userPrice}"}</code>,{" "}
                <code className="rounded bg-surface px-1">{"{businessPrice}"}</code>,{" "}
                <code className="rounded bg-surface px-1">{"{promoCode}"}</code>
              </p>
              <Input
                label="Rozet metni"
                value={form.launchBadgeText}
                onChange={(e) => setField("launchBadgeText", e.target.value)}
                placeholder="Lansman — Son {remaining} kişi ücretsiz"
              />
              <Input
                label="Başlık"
                value={form.launchHeadline}
                onChange={(e) => setField("launchHeadline", e.target.value)}
              />
              <div>
                <label className="block text-sm font-medium">Açıklama</label>
                <textarea
                  value={form.launchDescription}
                  onChange={(e) => setField("launchDescription", e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
              </div>
              <Input
                label="Promo kodu"
                value={form.launchPromoCode}
                onChange={(e) => setField("launchPromoCode", e.target.value)}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Kullanıcı üyeliği (€/yıl)"
                  type="number"
                  min={0}
                  value={String(form.userMembershipPriceEur)}
                  onChange={(e) =>
                    setField("userMembershipPriceEur", parseInt(e.target.value, 10) || 0)
                  }
                />
                <Input
                  label="İşletme üyeliği (€/yıl)"
                  type="number"
                  min={0}
                  value={String(form.businessMembershipPriceEur)}
                  onChange={(e) =>
                    setField("businessMembershipPriceEur", parseInt(e.target.value, 10) || 0)
                  }
                />
              </div>
            </>
          )}

          {section === "analytics" && (
            <>
              <p className="text-sm text-muted">
                Google Analytics 4, Tag Manager, Ads dönüşüm takibi ve Search Console doğrulama kodları.
                GTM tanımlıysa GA4 scripti otomatik devre dışı kalır.
              </p>
              <Input
                label="Google Tag Manager ID"
                value={form.googleTagManagerId}
                onChange={(e) => setField("googleTagManagerId", e.target.value)}
                placeholder="GTM-XXXXXXX"
              />
              <Input
                label="Google Analytics 4 ID"
                value={form.googleAnalyticsId}
                onChange={(e) => setField("googleAnalyticsId", e.target.value)}
                placeholder="G-XXXXXXXXXX"
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Google Ads dönüşüm ID"
                  value={form.googleAdsId}
                  onChange={(e) => setField("googleAdsId", e.target.value)}
                  placeholder="AW-XXXXXXXXX"
                />
                <Input
                  label="Google Ads dönüşüm etiketi"
                  value={form.googleAdsConversionLabel}
                  onChange={(e) => setField("googleAdsConversionLabel", e.target.value)}
                />
              </div>
              <Input
                label="Google Search Console doğrulama kodu"
                value={form.googleSearchConsoleVerification}
                onChange={(e) => setField("googleSearchConsoleVerification", e.target.value)}
                placeholder="google-site-verification meta content değeri"
              />
              <Input
                label="Facebook Pixel ID (opsiyonel)"
                value={form.facebookPixelId}
                onChange={(e) => setField("facebookPixelId", e.target.value)}
              />
            </>
          )}

          {section === "maintenance" && (
            <>
              <Toggle
                label="Bakım modu"
                description="Aktifken ziyaretçiler bakım mesajı görür. Admin ve giriş sayfaları etkilenmez."
                checked={form.maintenanceMode}
                onChange={(v) => setField("maintenanceMode", v)}
              />
              <Toggle
                label="Admin kullanıcılar siteyi görebilsin"
                checked={form.maintenanceAllowAdmins}
                onChange={(v) => setField("maintenanceAllowAdmins", v)}
              />
              <div>
                <label className="block text-sm font-medium">Bakım mesajı</label>
                <textarea
                  value={form.maintenanceMessage}
                  onChange={(e) => setField("maintenanceMessage", e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Bakım başlangıcı (opsiyonel)"
                  type="datetime-local"
                  value={form.maintenanceStartAt}
                  onChange={(e) => setField("maintenanceStartAt", e.target.value)}
                />
                <Input
                  label="Bakım bitişi (opsiyonel)"
                  type="datetime-local"
                  value={form.maintenanceEndAt}
                  onChange={(e) => setField("maintenanceEndAt", e.target.value)}
                />
              </div>
              <p className="text-xs text-muted">
                Başlangıç/bitiş tanımlıysa bakım modu yalnızca bu aralıkta aktif olur.
              </p>
              <hr className="border-border" />
              <h2 className="font-semibold">Önbellek (Cache)</h2>
              <Toggle
                label="Cache etkin"
                description="Haber akışı ve etkinlik takvimi gibi harici veriler önbelleğe alınır."
                checked={form.cacheEnabled}
                onChange={(v) => setField("cacheEnabled", v)}
              />
              <Input
                label="Cache süresi (dakika)"
                type="number"
                min={5}
                max={1440}
                value={String(form.cacheTtlMinutes)}
                onChange={(e) => setField("cacheTtlMinutes", parseInt(e.target.value, 10) || 60)}
              />
              <div className="rounded-xl border border-border bg-surface p-4">
                <p className="font-medium">Önbelleği temizle</p>
                <p className="mt-1 text-sm text-muted">
                  Etkinlik takvimi, eyalet/şehir haberleri ve ayar önbelleğini sıfırlar.
                </p>
                {cacheClearedAt && (
                  <p className="mt-2 text-xs text-muted">
                    Son temizlik: {new Date(cacheClearedAt).toLocaleString("tr-TR")}
                  </p>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  disabled={clearing}
                  onClick={() => void clearCache()}
                >
                  {clearing ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="mr-1.5 h-4 w-4" />
                  )}
                  Cache temizle
                </Button>
              </div>
            </>
          )}

          {section === "features" && (
            <>
              <p className="text-sm text-muted">
                Kapalı modüller menüden gizlenir; ilgili sayfalar ve API uçları devre dışı kalır.
              </p>
              <Toggle
                label="Yeni kayıt açık"
                checked={form.registrationEnabled}
                onChange={(v) => setField("registrationEnabled", v)}
              />
              <Toggle
                label="Forum etkin"
                checked={form.forumEnabled}
                onChange={(v) => setField("forumEnabled", v)}
              />
              <Toggle
                label="Sohbet etkin"
                checked={form.chatEnabled}
                onChange={(v) => setField("chatEnabled", v)}
              />
              <Toggle
                label="Etkinlikler etkin"
                checked={form.eventsEnabled}
                onChange={(v) => setField("eventsEnabled", v)}
              />
              <div className="rounded-xl border border-border bg-background/50 p-4">
                <p className="font-medium text-text">Uygulamalar (/uygulamalar)</p>
                <p className="mt-1 text-sm text-muted">
                  Kapalı uygulamalar listeden gizlenir; doğrudan URL ile erişim engellenir.
                </p>
                <div className="mt-4 space-y-3">
                  {APP_FEATURE_KEYS.map((key) => (
                    <Toggle
                      key={key}
                      label={APP_FEATURE_LABELS[key].adminLabel}
                      checked={form[key]}
                      onChange={(v) => setField(key, v)}
                    />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
