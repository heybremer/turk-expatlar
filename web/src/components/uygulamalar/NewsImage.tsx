import { Building2, Newspaper } from "lucide-react";

type Props = {
  imageUrl?: string;
  title: string;
  variant?: "card" | "modal";
};

export function NewsImageWithFallback({ imageUrl, title, variant = "card" }: Props) {
  const sizeClass =
    variant === "modal" ? "max-h-52 min-h-40" : "aspect-[16/9] max-h-44";

  if (!imageUrl) {
    return (
      <div
        className={`flex w-full items-center justify-center rounded-lg border border-border bg-gradient-to-br from-primary/10 via-surface to-accent/10 ${sizeClass}`}
      >
        {variant === "card" ? (
          <Building2 className="h-8 w-8 text-primary/35" />
        ) : (
          <Newspaper className="h-10 w-10 text-primary/35" />
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt={title}
        referrerPolicy="no-referrer"
        loading="lazy"
        className={`w-full rounded-lg border border-border object-cover ${sizeClass}`}
        onError={(e) => {
          e.currentTarget.style.display = "none";
          e.currentTarget.parentElement
            ?.querySelector("[data-fallback]")
            ?.classList.remove("hidden");
        }}
      />
      <div
        data-fallback
        className={`hidden flex w-full items-center justify-center rounded-lg border border-border bg-gradient-to-br from-primary/10 via-surface to-accent/10 ${sizeClass}`}
      >
        <Newspaper className="h-8 w-8 text-primary/35" />
      </div>
    </div>
  );
}
