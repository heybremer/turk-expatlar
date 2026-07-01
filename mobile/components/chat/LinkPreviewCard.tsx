import { useEffect, useState } from "react";
import { Image, Linking, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/lib/api";

type Preview = { url: string; title?: string; description?: string; image?: string; siteName?: string };

const cache = new Map<string, Preview | null>();

export function LinkPreviewCard({ url, token, isMe }: { url: string; token: string | null; isMe: boolean }) {
  const [preview, setPreview] = useState<Preview | null>(cache.get(url) ?? null);
  const [loading, setLoading] = useState(!cache.has(url));
  const [failed, setFailed] = useState(cache.get(url) === null);

  useEffect(() => {
    if (cache.has(url) || !token) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    api
      .get<Preview>(`/chat/link-preview?url=${encodeURIComponent(url)}`, token)
      .then((res) => {
        if (cancelled) return;
        cache.set(url, res);
        setPreview(res);
      })
      .catch(() => {
        if (cancelled) return;
        cache.set(url, null);
        setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [url, token]);

  if (failed || (!loading && !preview)) return null;
  if (loading) return null;
  if (!preview || (!preview.title && !preview.description && !preview.image)) return null;

  return (
    <TouchableOpacity
      onPress={() => Linking.openURL(preview.url).catch(() => {})}
      className={`mt-1.5 rounded-xl overflow-hidden border ${isMe ? "border-white/30 bg-white/10" : "border-border bg-background"}`}
    >
      {preview.image && (
        <Image source={{ uri: preview.image }} className="w-full h-32" resizeMode="cover" />
      )}
      <View className="px-2.5 py-2 gap-0.5">
        <View className="flex-row items-center gap-1">
          <Ionicons name="link-outline" size={11} color={isMe ? "rgba(255,255,255,0.7)" : "#9ca3af"} />
          <Text
            className={`text-[10px] ${isMe ? "text-white/70" : "text-muted"}`}
            numberOfLines={1}
          >
            {preview.siteName ?? new URL(preview.url).hostname}
          </Text>
        </View>
        {preview.title && (
          <Text className={`text-xs font-semibold ${isMe ? "text-white" : "text-text"}`} numberOfLines={2}>
            {preview.title}
          </Text>
        )}
        {preview.description && (
          <Text className={`text-[11px] ${isMe ? "text-white/80" : "text-muted"}`} numberOfLines={2}>
            {preview.description}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}
