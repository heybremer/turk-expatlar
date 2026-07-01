import { useEffect, useState } from "react";
import { Image, Linking, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ChatMessage } from "@/lib/api";
import { avatarUrl, extractFirstUrl } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
import { LinkPreviewCard } from "@/components/chat/LinkPreviewCard";
import { VoiceMessagePlayer } from "@/components/chat/VoiceMessagePlayer";

export const EMOJI_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "😡", "🙏", "🎉"];

function ExpiryCountdown({ expiresAt }: { expiresAt: string }) {
  const [rem, setRem] = useState(() => Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)));
  useEffect(() => {
    const id = setInterval(() => setRem((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(id);
  }, [expiresAt]);
  if (rem <= 0) return <Text className="text-[10px] text-danger">siliniyor…</Text>;
  const m = Math.floor(rem / 60);
  const s = rem % 60;
  return (
    <View className="flex-row items-center gap-0.5">
      <Ionicons name="time-outline" size={10} color="#ca8a04" />
      <Text className="text-[10px] text-yellow-700">{m > 0 ? `${m}:${String(s).padStart(2, "0")}` : `${s}s`}</Text>
    </View>
  );
}

type Props = {
  message: ChatMessage;
  isMe: boolean;
  grouped: boolean;
  /** DM'lerde "gönderildi/görüldü" tikleri için; oda mesajlarında gösterilmez */
  tickState?: "sent" | "read" | null;
  onLongPress?: () => void;
  onReact?: (emoji: string) => void;
  onImagePress?: (url: string) => void;
  onRetry?: () => void;
  highlighted?: boolean;
  token?: string | null;
};

export function ChatMessageBubble({
  message,
  isMe,
  grouped,
  tickState,
  onLongPress,
  onReact,
  onImagePress,
  onRetry,
  highlighted,
  token,
}: Props) {
  const name = message.user.profile?.displayName ?? "Anonim";
  const time = new Date(message.createdAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  const reactions = message.reactions ?? [];
  const attachments = message.attachments ?? [];
  const linkUrl = !message.pending && !message.failed ? extractFirstUrl(message.body) : null;

  return (
    <View className={`${grouped ? "mt-0.5" : "mt-3"} flex-row ${isMe ? "justify-end" : "justify-start"}`}>
      {!isMe && (
        <View className="w-8 mr-2 self-end">
          {!grouped ? <Avatar name={name} url={message.user.profile?.avatarUrl} size="xs" /> : null}
        </View>
      )}

      <View className={`max-w-[78%] ${isMe ? "items-end" : "items-start"}`}>
        {!grouped && !isMe && (
          <Text className="text-xs font-semibold text-text mb-1 px-1">{name}</Text>
        )}

        <TouchableOpacity
          activeOpacity={0.85}
          onLongPress={onLongPress}
          delayLongPress={300}
          style={highlighted ? { borderWidth: 2, borderColor: "#facc15" } : undefined}
          className={`rounded-2xl px-3 py-2 ${isMe ? "bg-primary rounded-br-md" : "bg-surface border border-border rounded-bl-md"}`}
        >
          {message.replyTo && (
            <View
              className={`mb-1.5 rounded-lg border-l-2 px-2 py-1 ${
                isMe ? "border-white/50 bg-white/10" : "border-primary bg-background"
              }`}
            >
              <Text className={`text-[11px] font-semibold ${isMe ? "text-white/90" : "text-primary"}`} numberOfLines={1}>
                {message.replyTo.deletedAt ? "Silinmiş mesaj" : message.replyTo.user.profile?.displayName ?? "Anonim"}
              </Text>
              {!message.replyTo.deletedAt && (
                <Text className={`text-xs ${isMe ? "text-white/80" : "text-muted"}`} numberOfLines={1}>
                  {message.replyTo.body || "📎 Ek"}
                </Text>
              )}
            </View>
          )}
          {message.body ? (
            <Text className={`text-sm leading-5 ${isMe ? "text-white" : "text-text"}`}>{message.body}</Text>
          ) : null}

          {linkUrl && <LinkPreviewCard url={linkUrl} token={token ?? null} isMe={isMe} />}

          {attachments.length > 0 && (
            <View className={`gap-1.5 ${message.body ? "mt-1.5" : ""}`}>
              {attachments.map((att, i) =>
                att.type === "image" ? (
                  <TouchableOpacity key={i} onPress={() => onImagePress?.(avatarUrl(att.url) ?? att.url)}>
                    <Image
                      source={{ uri: avatarUrl(att.url) ?? att.url }}
                      style={{ width: 180, height: 140, borderRadius: 10 }}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                ) : att.type === "audio" ? (
                  <VoiceMessagePlayer key={i} url={avatarUrl(att.url) ?? att.url} isMe={isMe} fallbackDurationSec={att.durationSec} />
                ) : (
                  <TouchableOpacity
                    key={i}
                    onPress={() => void Linking.openURL(avatarUrl(att.url) ?? att.url)}
                    className={`flex-row items-center gap-2 rounded-lg px-2.5 py-2 ${isMe ? "bg-white/10" : "bg-background border border-border"}`}
                  >
                    <Ionicons name="document-text-outline" size={16} color={isMe ? "#fff" : "#6b7280"} />
                    <Text className={`text-xs flex-1 ${isMe ? "text-white" : "text-muted"}`} numberOfLines={1}>
                      {att.name}
                    </Text>
                    <Text className={`text-xs ${isMe ? "text-white/70" : "text-muted"}`}>{(att.size / 1024).toFixed(0)} KB</Text>
                  </TouchableOpacity>
                ),
              )}
            </View>
          )}

          <View className="flex-row items-center justify-end gap-1.5 mt-1">
            <Text className={`text-[10px] ${isMe ? "text-blue-100" : "text-muted"}`}>{time}</Text>
            {message.expiresAt ? <ExpiryCountdown expiresAt={message.expiresAt} /> : null}
            {message.pending ? (
              <Ionicons name="time-outline" size={12} color="rgba(255,255,255,0.75)" />
            ) : message.failed ? null : isMe && tickState ? (
              <Ionicons
                name={tickState === "read" ? "checkmark-done" : "checkmark"}
                size={13}
                color={tickState === "read" ? "#34d399" : "rgba(255,255,255,0.75)"}
              />
            ) : null}
          </View>
        </TouchableOpacity>

        {message.failed && (
          <TouchableOpacity onPress={onRetry} className="flex-row items-center gap-1 mt-0.5 px-1">
            <Ionicons name="alert-circle" size={12} color="#dc2626" />
            <Text className="text-[11px] text-danger">Gönderilemedi · Tekrar dene</Text>
          </TouchableOpacity>
        )}

        {reactions.length > 0 && (
          <View className={`flex-row flex-wrap gap-1 mt-1 px-1 ${isMe ? "justify-end" : "justify-start"}`}>
            {reactions.map((r) => (
              <TouchableOpacity
                key={r.emoji}
                onPress={() => onReact?.(r.emoji)}
                className="flex-row items-center gap-0.5 rounded-full border border-border bg-surface px-2 py-0.5"
              >
                <Text className="text-xs">{r.emoji}</Text>
                <Text className="text-xs text-muted">{r.count}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}
