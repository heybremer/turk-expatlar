import { cn } from "@/lib/utils";
import { InputHTMLAttributes } from "react";

export function Input({
  className,
  label,
  error,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
}) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-text">{label}</label>
      )}
      <input
        className={cn(
          "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
          error && "border-danger",
          className,
        )}
        {...props}
        suppressHydrationWarning
      />
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
