import { Image, Text, View } from "react-native";
import { avatarUrl, getInitials } from "@/lib/utils";

type Props = {
  name: string;
  url?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
};

const SIZE_MAP = {
  xs: { outer: "h-7 w-7", text: "text-xs" },
  sm: { outer: "h-9 w-9", text: "text-sm" },
  md: { outer: "h-11 w-11", text: "text-base" },
  lg: { outer: "h-14 w-14", text: "text-lg" },
  xl: { outer: "h-20 w-20", text: "text-2xl" },
};

const SIZE_PX = { xs: 28, sm: 36, md: 44, lg: 56, xl: 80 };

const BG_COLORS = [
  "bg-blue-500", "bg-green-500", "bg-purple-500",
  "bg-orange-500", "bg-pink-500", "bg-teal-500",
];

function pickColor(name: string) {
  let hash = 0;
  for (const c of name) hash = c.charCodeAt(0) + ((hash << 5) - hash);
  return BG_COLORS[Math.abs(hash) % BG_COLORS.length];
}

export function Avatar({ name, url, size = "md" }: Props) {
  const src = avatarUrl(url);
  const { outer, text } = SIZE_MAP[size];
  const px = SIZE_PX[size];

  if (src) {
    return (
      <Image
        source={{ uri: src }}
        style={{ width: px, height: px, borderRadius: px / 2 }}
        className="rounded-full"
      />
    );
  }

  return (
    <View className={`${outer} ${pickColor(name)} rounded-full items-center justify-center`}>
      <Text className={`${text} font-bold text-white`}>{getInitials(name)}</Text>
    </View>
  );
}
