import { AppFeatureGate } from "@/components/site/AppFeatureGate";

export default function TatilGunleriLayout({ children }: { children: React.ReactNode }) {
  return <AppFeatureGate feature="appPublicHolidaysEnabled">{children}</AppFeatureGate>;
}
