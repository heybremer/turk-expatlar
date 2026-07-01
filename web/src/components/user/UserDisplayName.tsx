import Link from "next/link";
import type { PostalCountry } from "@/lib/postal-country";
import { cn } from "@/lib/utils";
import { CountryFlagBadge } from "./CountryFlagBadge";

type Props = {
  name: string;
  userId?: string | null;
  postalCountry?: PostalCountry | null;
  className?: string;
  nameClassName?: string;
  linkToProfile?: boolean;
};

export function UserDisplayName({
  name,
  userId,
  postalCountry,
  className,
  nameClassName,
  linkToProfile = true,
}: Props) {
  const nameEl = (
    <span className={cn("font-medium text-text", nameClassName)}>{name}</span>
  );

  return (
    <span className={cn("inline-flex flex-wrap items-center gap-1.5", className)}>
      {linkToProfile && userId ? (
        <Link href={`/kullanici/${userId}`} className="hover:text-primary hover:underline">
          {nameEl}
        </Link>
      ) : (
        nameEl
      )}
      <CountryFlagBadge country={postalCountry} />
    </span>
  );
}
