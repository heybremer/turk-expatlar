import { fetchPublicSiteSettings, type PublicSiteSettings } from "@/lib/site-settings";
import {
  FeatureDisabled,
  isFeatureEnabled,
  type FeatureKey,
} from "./FeatureDisabled";

const LABELS: Record<FeatureKey, { title: string; description: string }> = {
  forumEnabled: {
    title: "Forum geçici olarak kapalı",
    description: "Forum bölümü bakım veya güncelleme nedeniyle geçici olarak devre dışı.",
  },
  chatEnabled: {
    title: "Sohbet geçici olarak kapalı",
    description: "Sohbet odaları şu an kullanılamıyor.",
  },
  eventsEnabled: {
    title: "Etkinlikler geçici olarak kapalı",
    description: "Etkinlik listesi ve takvim geçici olarak devre dışı.",
  },
  registrationEnabled: {
    title: "Kayıt geçici olarak kapalı",
    description: "Yeni üyelik oluşturma şu an kapalı. Mevcut hesabınızla giriş yapabilirsiniz.",
  },
};

export async function FeatureGate({
  feature,
  children,
}: {
  feature: FeatureKey;
  children: React.ReactNode;
}) {
  const settings = await fetchPublicSiteSettings();
  if (isFeatureEnabled(settings, feature)) {
    return <>{children}</>;
  }
  const meta = LABELS[feature];
  return <FeatureDisabled title={meta.title} description={meta.description} />;
}

export type { PublicSiteSettings };
