import { AppFeatureGate } from "@/components/site/AppFeatureGate";

export default function ResmiKurumlarLayout({ children }: { children: React.ReactNode }) {
  return <AppFeatureGate feature="appOfficialInstitutionsEnabled">{children}</AppFeatureGate>;
}
