import Link from "next/link";
import { UserAvatar } from "@/components/user/UserAvatar";

type Props = {
  name: string;
  userId?: string;
  avatarUrl?: string | null;
  role?: string | null;
  size?: "sm" | "md" | "lg";
};

export function ForumAvatar({ name, userId, avatarUrl, role, size = "md" }: Props) {
  const avatarSize = size === "sm" ? "sm" : size === "lg" ? "lg" : "md";
  const inner = (
    <UserAvatar
      name={name}
      avatarUrl={avatarUrl}
      role={role}
      size={avatarSize}
    />
  );

  if (userId) {
    return (
      <Link href={`/kullanici/${userId}`} className="flex-shrink-0 hover:opacity-90">
        {inner}
      </Link>
    );
  }
  return inner;
}
