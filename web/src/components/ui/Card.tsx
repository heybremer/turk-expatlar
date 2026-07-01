import { cn } from "@/lib/utils";

export function Card({
  children,
  className,
  href,
}: {
  children: React.ReactNode;
  className?: string;
  href?: string;
}) {
  const classes = cn(
    "rounded-xl border border-border bg-surface p-5 shadow-sm transition-shadow hover:shadow-md",
    className,
  );

  if (href) {
    return (
      <a href={href} className={cn(classes, "block")}>
        {children}
      </a>
    );
  }

  return <div className={classes}>{children}</div>;
}
