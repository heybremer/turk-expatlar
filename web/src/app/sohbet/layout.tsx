import { FeatureGate } from "@/components/site/FeatureGate";

export default function SohbetLayout({ children }: { children: React.ReactNode }) {
  return <FeatureGate feature="chatEnabled">{children}</FeatureGate>;
}
