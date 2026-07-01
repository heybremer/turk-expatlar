import { Eye, Hand, MessageSquare } from "lucide-react";
import { ForumTopic } from "@/lib/api";
import { Badge } from "../ui/Badge";
import { Card } from "../ui/Card";

const statusLabels: Record<string, { label: string; variant: "default" | "success" | "warning" | "muted" }> = {
  OPEN: { label: "Açık", variant: "default" },
  ANSWERED: { label: "Cevaplandı", variant: "warning" },
  SOLVED: { label: "Çözüldü", variant: "success" },
  LOCKED: { label: "Kilitli", variant: "muted" },
};

export function ForumTopicCard({ topic }: { topic: ForumTopic }) {
  const status = statusLabels[topic.status] ?? statusLabels.OPEN;

  return (
    <Card href={`/forum/${topic.id}`}>
      <div className="flex items-center gap-2">
        <Badge variant="muted">{topic.category.name}</Badge>
        <Badge variant={status.variant}>{status.label}</Badge>
      </div>
      <h3 className="mt-2 font-semibold text-text line-clamp-2">{topic.title}</h3>
      <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
        <span className="inline-flex items-center gap-1">
          <Eye className="h-3.5 w-3.5" />
          {topic.viewCount ?? 0}
        </span>
        <span className="inline-flex items-center gap-1">
          <MessageSquare className="h-3.5 w-3.5" />
          {topic._count?.replies ?? 0} cevap
        </span>
        <span className="inline-flex items-center gap-1">
          <Hand className="h-3.5 w-3.5" />
          {topic._count?.interests ?? 0}
        </span>
        {topic.city && <span>{topic.city.name}</span>}
      </p>
    </Card>
  );
}
