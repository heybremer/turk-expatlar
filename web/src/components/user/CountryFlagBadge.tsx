import type { PostalCountry } from "@/lib/postal-country";
import { COUNTRY_FLAGS, COUNTRY_LABELS } from "@/lib/postal-country";
import { cn } from "@/lib/utils";

type Props = {
  country?: PostalCountry | null;
  className?: string;
};

export function CountryFlagBadge({ country, className }: Props) {
  if (!country) return null;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center text-base leading-none",
        className,
      )}
      title={COUNTRY_LABELS[country]}
      aria-label={COUNTRY_LABELS[country]}
      role="img"
    >
      {COUNTRY_FLAGS[country]}
    </span>
  );
}
