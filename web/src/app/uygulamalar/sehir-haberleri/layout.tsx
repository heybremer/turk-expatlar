import { AppFeatureGate } from "@/components/site/AppFeatureGate";

export default function SehirHaberleriLayout({ children }: { children: React.ReactNode }) {
  return <AppFeatureGate feature="appCityNewsEnabled">{children}</AppFeatureGate>;
}
