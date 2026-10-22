import { useEffect, useState } from "react";
import { Image, Linking, Pressable, Text, View } from "react-native";
import { Link } from "lucide-react-native";
import { api } from "@/lib/api";
import { colors } from "@/lib/colors";

type Preview = { url: string; title?: string; description?: string; image?: string; siteName?: string };

const MAX_CACHE = 200;
const cache = new Map<string, Preview | null>();

function remember(url: string, value: Preview | null) {
  if (cache.size >= MAX_CACHE) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(url, value);
}

function hostnameOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function LinkPreviewCard({ url, token, isMe }: { url: string; token: string | null; isMe: boolean }) {
  const [preview, setPreview] = useState<Preview | null>(() => cache.get(url) ?? null);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
    if (cache.has(url)) {
      setPreview(cache.get(url) ?? null);
      return;
    }
    setPreview(null);
    if (!token) return;
    let cancelled = false;
    api
      .get<Preview>(`/chat/link-preview?url=${encodeURIComponent(url)}`, token)
      .then((res) => {
        remember(url, res);
        if (!cancelled) setPreview(res);
      })
      .catch(() => {
        remember(url, null);
      });
    return () => {
      cancelled = true;
    };
  }, [url, token]);

  if (!preview || (!preview.title && !preview.description && !preview.image)) return null;

  const target = preview.url || url;
  const showImage = !!preview.image && !imageFailed;

  return (
    <Pressable
      onPress={() => void Linking.openURL(target).catch(() => {})}
      accessibilityRole="link"
      accessibilityLabel={`Bağlantıyı aç: ${preview.title ?? hostnameOf(target)}`}
      className={`mt-1.5 overflow-hidden rounded-2xl active:opacity-80 ${isMe ? "bg-white/15" : "border border-border bg-background"}`}
    >
      {showImage ? (
        <Image
          source={{ uri: preview.image }}
          style={{ width: "100%", height: 128 }}
          resizeMode="cover"
          onError={() => setImageFailed(true)}
        />
      ) : null}
      <View className="gap-0.5 px-3 py-2">
        <View className="flex-row items-center gap-1">
          <Link size={11} color={isMe ? colors.white : colors.mutedLight} opacity={isMe ? 0.75 : 1} />
          <Text className={`flex-1 text-[10px] ${isMe ? "text-white/70" : "text-muted"}`} numberOfLines={1}>
            {preview.siteName ?? hostnameOf(target)}
          </Text>
        </View>
        {preview.title ? (
          <Text className={`text-xs font-semibold ${isMe ? "text-white" : "text-text"}`} numberOfLines={2}>
            {preview.title}
          </Text>
        ) : null}
        {preview.description ? (
          <Text className={`text-[11px] ${isMe ? "text-white/80" : "text-muted"}`} numberOfLines={2}>
            {preview.description}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
