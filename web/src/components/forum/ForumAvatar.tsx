import Link from "next/link";
import { UserAvatar, type UserAvatarSize } from "@/components/user/UserAvatar";

type Props = {
  name: string;
  userId?: string;
  avatarUrl?: string | null;
  role?: string | null;
  size?: UserAvatarSize;
};

export function ForumAvatar({ name, userId, avatarUrl, role, size = "md" }: Props) {
  const inner = (
    <UserAvatar
      name={name}
      avatarUrl={avatarUrl}
      role={role}
      size={size}
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
