import { UserAvatar, type UserAvatarSize } from "@/components/user/UserAvatar";

export function ChatAvatar({
  name,
  url,
  role,
  size = "md",
}: {
  name: string;
  url?: string | null;
  role?: string | null;
  size?: UserAvatarSize;
}) {
  return (
    <UserAvatar name={name} avatarUrl={url} role={role} size={size} />
  );
}
