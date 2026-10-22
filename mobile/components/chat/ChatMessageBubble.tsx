import { memo, useEffect, useState } from "react";
import { Image, Linking, Pressable, Text, View } from "react-native";
import { AlertCircle, Check, CheckCheck, Clock, FileText, RotateCw, Timer } from "lucide-react-native";
import { ChatAttachment, ChatMessage } from "@/lib/api";
import { avatarUrl, extractFirstUrl } from "@/lib/utils";
import { colors } from "@/lib/colors";
import { Avatar } from "@/components/ui/Avatar";
import { LinkPreviewCard } from "@/components/chat/LinkPreviewCard";
import { VoiceMessagePlayer } from "@/components/chat/VoiceMessagePlayer";

/** Backend ChatGateway.react_message ALLOWED listesiyle birebir aynı olmalı. */
export const EMOJI_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "😡", "🙏", "🎉"];

/** Metni olmayan mesajlar için kısa açıklama (DM listesi, yanıt önizlemesi, işlem menüsü). */
export function attachmentSummary(attachments?: ChatAttachment[] | null): string {
  const list = attachments ?? [];
  if (list.length === 0) return "";
  const first = list[0];
  if (first.type === "image") return list.length > 1 ? `📷 ${list.length} fotoğraf` : "📷 Fotoğraf";
  if (first.type === "audio") return "🎤 Sesli mesaj";
  return `📎 ${first.name || "Dosya"}`;
}

const LINK_SPLIT = /(https?:\/\/[^\s]+)/gi;

function cleanUrl(url: string) {
  return url.replace(/[).,!?;:'"]+$/, "");
}

function LinkifiedText({ text, isMe }: { text: string; isMe: boolean }) {
  const parts = text.split(LINK_SPLIT);
  return (
    <Text className={`text-[15px] leading-5 ${isMe ? "text-white" : "text-text"}`}>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <Text
            key={i}
            onPress={() => void Linking.openURL(cleanUrl(part)).catch(() => {})}
            accessibilityRole="link"
            className={`underline ${isMe ? "text-white" : "text-primary"}`}
          >
            {part}
          </Text>
        ) : (
          part
        ),
      )}
    </Text>
  );
}

function formatRemaining(rem: number) {
  if (rem >= 3600) {
    const h = Math.floor(rem / 3600);
    const m = Math.floor((rem % 3600) / 60);
    return m > 0 ? `${h}sa ${m}dk` : `${h}sa`;
  }
  const m = Math.floor(rem / 60);
  const s = rem % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, "0")}` : `${s}sn`;
}

function ExpiryCountdown({ expiresAt, isMe }: { expiresAt: string; isMe: boolean }) {
  const calc = () => Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
  const [rem, setRem] = useState(calc);
  useEffect(() => {
    setRem(calc());
    const id = setInterval(() => setRem(calc()), 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expiresAt]);
  if (rem <= 0) {
    return <Text className={`text-[10px] ${isMe ? "text-white/80" : "text-danger"}`}>siliniyor…</Text>;
  }
  return (
    <View
      className={`flex-row items-center gap-0.5 rounded-full px-1.5 py-px ${isMe ? "bg-white/15" : "bg-warning/10"}`}
      accessibilityLabel={`Kendini imha eden mesaj, ${formatRemaining(rem)} kaldı`}
    >
      <Timer size={10} color={isMe ? colors.white : colors.warning} strokeWidth={2.4} />
      <Text className={`text-[10px] font-semibold ${isMe ? "text-white" : "text-warning"}`}>{formatRemaining(rem)}</Text>
    </View>
  );
}

function formatSize(bytes: number) {
  if (!bytes) return "";
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
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
  onUserPress?: () => void;
  /** Alıntılanan mesaja dokununca o mesaja gitmek için. */
  onReplyPress?: () => void;
  highlighted?: boolean;
  token?: string | null;
};

export const ChatMessageBubble = memo(function ChatMessageBubble({
  message,
  isMe,
  grouped,
  tickState,
  onLongPress,
  onReact,
  onImagePress,
  onRetry,
  onUserPress,
  onReplyPress,
  highlighted,
  token,
}: Props) {
  const name = message.user.profile?.displayName ?? "Anonim";
  const time = new Date(message.createdAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  const editedAt = (message as ChatMessage & { editedAt?: string | null }).editedAt;
  const reactions = message.reactions ?? [];
  const attachments = message.attachments ?? [];
  const linkUrl = !message.pending && !message.failed ? extractFirstUrl(message.body) : null;
  const onlyImages = !message.body && attachments.length > 0 && attachments.every((a) => a.type === "image");
  const a11ySummary = `${isMe ? "Siz" : name}: ${message.body || attachmentSummary(attachments)}, ${time}${
    editedAt ? ", düzenlendi" : ""
  }${tickState === "read" ? ", görüldü" : ""}`;

  return (
    <View className={`${grouped ? "mt-0.5" : "mt-3"} flex-row ${isMe ? "justify-end" : "justify-start"}`}>
      {!isMe && (
        <View className="mr-2 w-8 self-end">
          {!grouped ? (
            <Pressable
              onPress={onUserPress}
              disabled={!onUserPress}
              accessibilityRole={onUserPress ? "button" : undefined}
              accessibilityLabel={`${name} profilini aç`}
            >
              <Avatar name={name} url={message.user.profile?.avatarUrl} size="xs" />
            </Pressable>
          ) : null}
        </View>
      )}

      <View className={`max-w-[78%] ${isMe ? "items-end" : "items-start"}`}>
        {!grouped && !isMe && (
          <Pressable onPress={onUserPress} disabled={!onUserPress} hitSlop={4} accessibilityRole="button">
            <Text className="mb-1 px-3 text-xs font-bold text-primary-700" numberOfLines={1}>
              {name}
            </Text>
          </Pressable>
        )}

        <Pressable
          onLongPress={onLongPress}
          delayLongPress={300}
          accessibilityLabel={a11ySummary}
          accessibilityHint={onLongPress ? "Seçenekler için basılı tutun" : undefined}
          style={highlighted ? { borderWidth: 2, borderColor: colors.warning, margin: isMe ? -2 : -1 } : undefined}
          className={`rounded-3xl ${onlyImages ? "p-1" : "px-3.5 py-2"} active:opacity-90 ${
            isMe ? "rounded-br-md bg-primary" : "rounded-bl-md border border-border bg-surface"
          }`}
        >
          {message.replyTo && (
            <Pressable
              onPress={onReplyPress}
              disabled={!onReplyPress || !!message.replyTo.deletedAt}
              accessibilityRole="button"
              accessibilityLabel="Alıntılanan mesaja git"
              className={`mb-1.5 rounded-xl border-l-[3px] px-2.5 py-1.5 ${
                isMe ? "border-white/60 bg-white/15" : "border-primary bg-primary/5"
              }`}
            >
              <Text
                className={`text-[11px] font-bold ${isMe ? "text-white" : "text-primary-700"}`}
                numberOfLines={1}
              >
                {message.replyTo.deletedAt ? "Silinmiş mesaj" : message.replyTo.user.profile?.displayName ?? "Anonim"}
              </Text>
              {!message.replyTo.deletedAt && (
                <Text className={`text-xs ${isMe ? "text-white/80" : "text-muted"}`} numberOfLines={1}>
                  {message.replyTo.body || "📎 Ek"}
                </Text>
              )}
            </Pressable>
          )}
          {message.body ? <LinkifiedText text={message.body} isMe={isMe} /> : null}

          {linkUrl && <LinkPreviewCard url={linkUrl} token={token ?? null} isMe={isMe} />}

          {attachments.length > 0 && (
            <View className={`gap-1.5 ${message.body ? "mt-1.5" : ""}`}>
              {attachments.map((att, i) =>
                att.type === "image" ? (
                  <Pressable
                    key={att.url || i}
                    onPress={() => onImagePress?.(avatarUrl(att.url) ?? att.url)}
                    onLongPress={onLongPress}
                    delayLongPress={300}
                    accessibilityRole="imagebutton"
                    accessibilityLabel="Görseli büyüt"
                  >
                    <Image
                      source={{ uri: avatarUrl(att.url) ?? att.url }}
                      style={{ width: 220, height: 170, borderRadius: 20, backgroundColor: isMe ? "rgba(255,255,255,0.15)" : colors.background }}
                      resizeMode="cover"
                    />
                  </Pressable>
                ) : att.type === "audio" ? (
                  <VoiceMessagePlayer
                    key={att.url || i}
                    url={avatarUrl(att.url) ?? att.url}
                    isMe={isMe}
                    fallbackDurationSec={att.durationSec}
                  />
                ) : (
                  <Pressable
                    key={att.url || i}
                    onPress={() => void Linking.openURL(avatarUrl(att.url) ?? att.url).catch(() => {})}
                    onLongPress={onLongPress}
                    delayLongPress={300}
                    accessibilityRole="link"
                    accessibilityLabel={`${att.name} dosyasını aç`}
                    className={`flex-row items-center gap-2.5 rounded-2xl px-2.5 py-2 ${
                      isMe ? "bg-white/15" : "bg-background"
                    }`}
                  >
                    <View className={`h-9 w-9 items-center justify-center rounded-xl ${isMe ? "bg-white/20" : "bg-primary/10"}`}>
                      <FileText size={17} color={isMe ? colors.white : colors.primary} />
                    </View>
                    <View className="min-w-0 flex-1">
                      <Text className={`text-[13px] font-semibold ${isMe ? "text-white" : "text-text"}`} numberOfLines={1}>
                        {att.name}
                      </Text>
                      {att.size ? (
                        <Text className={`text-[11px] ${isMe ? "text-white/70" : "text-muted"}`}>{formatSize(att.size)}</Text>
                      ) : null}
                    </View>
                  </Pressable>
                ),
              )}
            </View>
          )}

          <View className={`mt-0.5 flex-row items-center justify-end gap-1 ${onlyImages ? "px-2 pb-1" : ""}`}>
            {message.expiresAt ? <ExpiryCountdown expiresAt={message.expiresAt} isMe={isMe} /> : null}
            {editedAt ? (
              <Text className={`text-[10px] italic ${isMe ? "text-white/75" : "text-muted-light"}`}>düzenlendi</Text>
            ) : null}
            <Text className={`text-[10px] ${isMe ? "text-white/75" : "text-muted-light"}`}>{time}</Text>
            {message.pending ? (
              <Clock size={11} color={isMe ? colors.white : colors.mutedLight} opacity={0.75} accessibilityLabel="Gönderiliyor" />
            ) : message.failed ? (
              <AlertCircle size={12} color={isMe ? colors.white : colors.danger} accessibilityLabel="Gönderilemedi" />
            ) : isMe && tickState ? (
              tickState === "read" ? (
                <CheckCheck size={14} color={colors.white} strokeWidth={2.4} accessibilityLabel="Görüldü" />
              ) : (
                <Check size={14} color={colors.white} opacity={0.75} strokeWidth={2.4} accessibilityLabel="Gönderildi" />
              )
            ) : null}
          </View>
        </Pressable>

        {message.failed && (
          <Pressable
            onPress={onRetry}
            disabled={!onRetry}
            accessibilityRole="button"
            accessibilityLabel="Gönderilemedi, tekrar dene"
            hitSlop={6}
            className="mt-1 flex-row items-center gap-1 rounded-full bg-danger/10 px-2.5 py-1 active:opacity-70"
          >
            <RotateCw size={12} color={colors.danger} />
            <Text className="text-[11px] font-semibold text-danger">Gönderilemedi · Tekrar dene</Text>
          </Pressable>
        )}

        {reactions.length > 0 && (
          <View className={`-mt-1.5 flex-row flex-wrap gap-1 px-2 ${isMe ? "justify-end" : "justify-start"}`}>
            {reactions.map((r) => (
              <Pressable
                key={r.emoji}
                onPress={() => onReact?.(r.emoji)}
                accessibilityRole="button"
                accessibilityLabel={`${r.emoji} tepkisi, ${r.count} kişi. Değiştirmek için dokunun`}
                style={{
                  shadowColor: colors.text,
                  shadowOpacity: 0.06,
                  shadowRadius: 2,
                  shadowOffset: { width: 0, height: 1 },
                  elevation: 1,
                }}
                className="flex-row items-center gap-0.5 rounded-full border border-border bg-surface px-2 py-0.5 active:opacity-70"
              >
                <Text className="text-xs">{r.emoji}</Text>
                {r.count > 1 ? <Text className="text-[11px] font-semibold text-muted">{r.count}</Text> : null}
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </View>
  );
});
