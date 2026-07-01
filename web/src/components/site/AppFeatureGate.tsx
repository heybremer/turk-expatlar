import { fetchPublicSiteSettingsLive } from "@/lib/site-settings";
import {
  APP_FEATURE_LABELS,
  type AppFeatureKey,
  isAppFeatureEnabled,
} from "@/lib/uygulamalar-config";
import { FeatureDisabled } from "./FeatureDisabled";

export async function AppFeatureGate({
  feature,
  children,
}: {
  feature: AppFeatureKey;
  children: React.ReactNode;
}) {
  const settings = await fetchPublicSiteSettingsLive();
  if (isAppFeatureEnabled(settings, feature)) {
    return <>{children}</>;
  }
  const meta = APP_FEATURE_LABELS[feature];
  return <FeatureDisabled title={meta.title} description={meta.description} />;
}
