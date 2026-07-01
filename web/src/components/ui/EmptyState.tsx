import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { Button } from "./Button";

type EmptyStateProps = {
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
};

export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
}: EmptyStateProps) {
  return (
    <div className="col-span-full rounded-2xl border border-dashed border-border bg-surface/50 px-6 py-12 text-center">
      <p className="font-medium text-text">{title}</p>
      {description && <p className="mx-auto mt-2 max-w-md text-sm text-muted">{description}</p>}
      {actionLabel && actionHref && (
        <Link href={actionHref} className="mt-5 inline-block">
          <Button size="sm">
            <Plus className="mr-1.5 h-4 w-4" />
            {actionLabel}
          </Button>
        </Link>
      )}
    </div>
  );
}

export function EmptyStateInline({
  message,
  actionLabel,
  actionHref,
}: {
  message: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-border p-6 text-center">
      <p className="text-sm text-muted">{message}</p>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          {actionLabel}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}
