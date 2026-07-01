import { Crown } from "lucide-react";
import { cn, resolveMediaUrl } from "@/lib/utils";

export type UserAvatarSize = "sm" | "md" | "lg" | "xl";

const SIZE: Record<UserAvatarSize, string> = {
  sm: "h-7 w-7 text-xs",
  md: "h-8 w-8 text-sm",
  lg: "h-10 w-10 text-base",
  xl: "h-14 w-14 text-xl",
};

const CROWN: Record<UserAvatarSize, string> = {
  sm: "h-3.5 w-3.5 -bottom-0.5 -right-1 p-0.5",
  md: "h-4 w-4 -bottom-0.5 -right-1 p-0.5",
  lg: "h-4 w-4 -bottom-1 -right-1 p-0.5",
  xl: "h-6 w-6 -bottom-1 -right-1 p-1",
};

export function isAdminRole(role?: string | null) {
  return role === "ADMIN";
}

type Props = {
  name: string;
  avatarUrl?: string | null;
  role?: string | null;
  size?: UserAvatarSize;
  className?: string;
};

export function UserAvatar({
  name,
  avatarUrl,
  role,
  size = "md",
  className,
}: Props) {
  const isAdmin = isAdminRole(role);
  const cls = SIZE[size];
  const src = resolveMediaUrl(avatarUrl);

  const inner = src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name}
      className={cn(cls, "rounded-full object-cover", isAdmin && "ring-1 ring-amber-200/80")}
    />
  ) : (
    <div
      className={cn(
        cls,
        "flex items-center justify-center rounded-full font-bold",
        isAdmin
          ? "bg-gradient-to-br from-amber-100 via-amber-300 to-amber-600 text-amber-950 shadow-inner"
          : "bg-primary/15 text-primary",
      )}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );

  if (!isAdmin) {
    return <span className={cn("inline-flex flex-shrink-0", className)}>{inner}</span>;
  }

  return (
    <span className={cn("relative inline-flex flex-shrink-0", className)}>
      <span
        className={cn(
          "rounded-full bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-600 p-[2.5px]",
          "shadow-md shadow-amber-500/30",
        )}
      >
        <span className="block rounded-full bg-surface">{inner}</span>
      </span>
      <span
        className={cn(
          "absolute flex items-center justify-center rounded-full",
          "bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-sm ring-1 ring-amber-200",
          CROWN[size],
        )}
        title="Site yöneticisi"
        aria-hidden
      >
        <Crown className="h-full w-full fill-current stroke-[1.5]" />
      </span>
    </span>
  );
}
