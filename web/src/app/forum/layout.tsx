import { FeatureGate } from "@/components/site/FeatureGate";

export default function ForumLayout({ children }: { children: React.ReactNode }) {
  return <FeatureGate feature="forumEnabled">{children}</FeatureGate>;
}
