import { FeatureGate } from "@/components/site/FeatureGate";

export default function KayitLayout({ children }: { children: React.ReactNode }) {
  return <FeatureGate feature="registrationEnabled">{children}</FeatureGate>;
}
