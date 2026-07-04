"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function StarRating({
  value,
  size = "sm",
  className,
}: {
  value: number;
  size?: "sm" | "md";
  className?: string;
}) {
  const dim = size === "md" ? "h-5 w-5" : "h-3.5 w-3.5";
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(
            dim,
            i <= Math.round(value) ? "fill-warning text-warning" : "text-border",
          )}
        />
      ))}
    </span>
  );
}

export function StarRatingInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <span className="inline-flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i)}
          className="transition-transform hover:scale-110"
          aria-label={`${i} yıldız`}
        >
          <Star
            className={cn(
              "h-6 w-6",
              i <= value ? "fill-warning text-warning" : "text-border",
            )}
          />
        </button>
      ))}
    </span>
  );
}
