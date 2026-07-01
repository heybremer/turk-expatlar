import { AppFeatureGate } from "@/components/site/AppFeatureGate";

export default function EyaletHaberleriLayout({ children }: { children: React.ReactNode }) {
  return <AppFeatureGate feature="appStateNewsEnabled">{children}</AppFeatureGate>;
}
