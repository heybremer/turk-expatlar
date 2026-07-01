import type { PublicSiteSettings } from "@/lib/site-settings";

export function FeatureDisabled({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 py-20 text-center">
      <div className="max-w-lg rounded-2xl border border-border bg-surface p-10">
        <p className="text-sm font-medium uppercase tracking-wide text-primary">Geçici olarak kapalı</p>
        <h1 className="mt-3 text-2xl font-bold">{title}</h1>
        <p className="mt-3 text-muted">
          {description ?? "Bu bölüm şu an kullanılamıyor. Lütfen daha sonra tekrar deneyin."}
        </p>
      </div>
    </div>
  );
}

export type FeatureKey = keyof Pick<
  PublicSiteSettings,
  "forumEnabled" | "chatEnabled" | "eventsEnabled" | "registrationEnabled"
>;

export function isFeatureEnabled(
  settings: PublicSiteSettings,
  feature: FeatureKey,
): boolean {
  return settings[feature] !== false;
}
