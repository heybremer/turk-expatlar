import { FeatureGate } from "@/components/site/FeatureGate";

export default function EtkinliklerLayout({ children }: { children: React.ReactNode }) {
  return <FeatureGate feature="eventsEnabled">{children}</FeatureGate>;
}
