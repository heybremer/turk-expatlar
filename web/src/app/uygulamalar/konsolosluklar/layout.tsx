import { AppFeatureGate } from "@/components/site/AppFeatureGate";

export default function KonsolosluklarLayout({ children }: { children: React.ReactNode }) {
  return <AppFeatureGate feature="appConsulatesEnabled">{children}</AppFeatureGate>;
}
