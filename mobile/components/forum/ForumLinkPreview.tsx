import { useEffect, useState } from "react";
import { Image, Linking, Pressable, Text, View } from "react-native";
import { Link } from "lucide-react-native";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { colors } from "@/lib/colors";

type Preview = { url: string; title?: string; description?: string; image?: string; siteName?: string };

const cache = new Map<string, Preview | null>();

function hostnameOf(url: string) {
  const match = /^[a-z][a-z0-9+.-]*:\/\/([^/?#:]+)/i.exec(url);
  return (match?.[1] ?? url).replace(/^www\./, "");
}

export function ForumLinkPreview({ url }: { url: string }) {
  const { token } = useAuth();
  const [preview, setPreview] = useState<Preview | null>(cache.get(url) ?? null);
  const [loading, setLoading] = useState(!cache.has(url));
  const [failed, setFailed] = useState(cache.get(url) === null);

  useEffect(() => {
    if (cache.has(url)) {
      const cached = cache.get(url) ?? null;
      setPreview(cached);
      setFailed(cached === null);
      setLoading(false);
      return;
    }
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setFailed(false);
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

  if (loading || failed || !preview || (!preview.title && !preview.description && !preview.image)) return null;

  return (
    <Pressable
      onPress={() => Linking.openURL(preview.url || url).catch(() => {})}
      accessibilityRole="link"
      accessibilityLabel={preview.title ?? (preview.url || url)}
      className="mt-3 overflow-hidden rounded-2xl border border-border bg-background active:opacity-70"
    >
      {preview.image && <Image source={{ uri: preview.image }} className="h-32 w-full" resizeMode="cover" />}
      <View className="gap-0.5 px-3.5 py-2.5">
        <View className="flex-row items-center gap-1">
          <Link size={11} color={colors.mutedLight} />
          <Text className="text-[11px] text-muted" numberOfLines={1}>
            {preview.siteName ?? hostnameOf(preview.url || url)}
          </Text>
        </View>
        {preview.title && (
          <Text className="text-sm font-semibold text-text" numberOfLines={2}>
            {preview.title}
          </Text>
        )}
        {preview.description && (
          <Text className="text-xs text-muted" numberOfLines={2}>
            {preview.description}
          </Text>
        )}
      </View>
    </Pressable>
  );
}
