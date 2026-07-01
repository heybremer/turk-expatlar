import { AppFeatureGate } from "@/components/site/AppFeatureGate";

export default function EtkinlikTakvimiLayout({ children }: { children: React.ReactNode }) {
  return <AppFeatureGate feature="appEventCalendarEnabled">{children}</AppFeatureGate>;
}
