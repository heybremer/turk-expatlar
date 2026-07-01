import { AppFeatureGate } from "@/components/site/AppFeatureGate";

export default function GezginRehberiLayout({ children }: { children: React.ReactNode }) {
  return <AppFeatureGate feature="appTravelGuideEnabled">{children}</AppFeatureGate>;
}
