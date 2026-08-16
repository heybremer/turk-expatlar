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
  isBot?: boolean;
  editorTeam?: string | null;
};

const TEAM_LABELS: Record<string, string> = {
  EVENTS: "Etkinlik Editörü",
  GUIDE: "Rehber Editörü",
  JOBS: "İş İlanı Editörü",
  TRAVEL: "Seyahat Editörü",
};

export function UserDisplayName({
  name,
  userId,
  postalCountry,
  className,
  nameClassName,
  linkToProfile = true,
  isBot = false,
  editorTeam,
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
      {(isBot || editorTeam) && (
        <span
          className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary"
          title="Bu hesap otomasyon destekli ve ekip tarafından denetlenir"
        >
          {editorTeam ? TEAM_LABELS[editorTeam] ?? "Editör" : "Otomatik hesap"}
        </span>
      )}
    </span>
  );
}
