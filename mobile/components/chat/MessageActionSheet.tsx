import { useRef } from "react";
import { Modal, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { Copy, Forward, Pencil, Reply, Trash2, type LucideIcon } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { ChatMessage } from "@/lib/api";
import { colors } from "@/lib/colors";
import { EMOJI_REACTIONS, attachmentSummary } from "@/components/chat/ChatMessageBubble";
import { IconTile } from "@/components/ui/kit";

type Props = {
  visible: boolean;
  canDelete: boolean;
  canCopy?: boolean;
  onClose: () => void;
  onReact: (emoji: string) => void;
  onDelete: () => void;
  onReply: () => void;
  onCopy?: () => void;
  onForward?: () => void;
  /** Verilirse üstte mesaj önizlemesi ve tam gönderim zamanı (bilgi) gösterilir. */
  message?: ChatMessage | null;
  canEdit?: boolean;
  onEdit?: () => void;
  /** Başkasının mesajını silen yönetici için "Herkes için sil" gibi özel metin. */
  deleteLabel?: string;
};

function ActionRow({
  icon,
  label,
  onPress,
  destructive = false,
  first = false,
}: {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  destructive?: boolean;
  first?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      className={`min-h-14 flex-row items-center gap-3 px-4 py-2.5 active:bg-background ${first ? "" : "border-t border-border"}`}
    >
      <IconTile icon={icon} tint={destructive ? colors.danger : colors.primary} size={36} />
      <Text className={`text-[15px] font-semibold ${destructive ? "text-danger" : "text-text"}`}>{label}</Text>
    </Pressable>
  );
}

function formatFullTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("tr-TR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
}

export function MessageActionSheet({
  visible,
  canDelete,
  canCopy,
  onClose,
  onReact,
  onDelete,
  onReply,
  onCopy,
  onForward,
  message,
  canEdit = false,
  onEdit,
  deleteLabel = "Mesajı sil",
}: Props) {
  const insets = useSafeAreaInsets();
  const pendingActionRef = useRef<(() => void) | null>(null);
  // iOS kapanmakta olan bir Modal'ın üstüne yenisini (ör. İlet) açamaz; eylem onDismiss'te çalışır
  const run = (fn: () => void) => () => {
    if (Platform.OS === "ios") {
      pendingActionRef.current = fn;
      onClose();
    } else {
      onClose();
      fn();
    }
  };
  const flushPending = () => {
    const fn = pendingActionRef.current;
    pendingActionRef.current = null;
    fn?.();
  };

  // Kapanış animasyonu sırasında içerik boşalmasın
  const lastMessageRef = useRef(message);
  if (message) lastMessageRef.current = message;
  const shown = message ?? (visible ? null : lastMessageRef.current);

  const editedAt = (shown as (ChatMessage & { editedAt?: string | null }) | null | undefined)?.editedAt;
  const preview = shown ? shown.body || attachmentSummary(shown.attachments) : "";

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} onDismiss={flushPending}>
      <Pressable onPress={onClose} className="flex-1 justify-end bg-black/40" accessibilityLabel="Kapat">
        <Pressable
          onPress={() => {}}
          className="rounded-t-3xl bg-surface px-4 pt-2.5"
          style={{ paddingBottom: insets.bottom + 12 }}
        >
          <View className="mb-4 h-1.5 w-10 self-center rounded-full bg-border" />

          {shown ? (
            <View className="mb-3 rounded-2xl bg-background px-3.5 py-2.5">
              <View className="flex-row items-center justify-between gap-2">
                <Text className="flex-1 text-xs font-bold text-primary-700" numberOfLines={1}>
                  {shown.user.profile?.displayName ?? "Anonim"}
                </Text>
                <Text className="text-[11px] text-muted">{formatFullTime(shown.createdAt)}</Text>
              </View>
              {preview ? (
                <Text className="mt-0.5 text-[13px] leading-[18px] text-text" numberOfLines={3}>
                  {preview}
                </Text>
              ) : null}
              {editedAt ? (
                <Text className="mt-1 text-[11px] text-muted">Düzenlendi · {formatFullTime(editedAt)}</Text>
              ) : null}
            </View>
          ) : null}

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mb-3 rounded-full bg-background"
            contentContainerStyle={{ flexGrow: 1, justifyContent: "space-between", paddingHorizontal: 8, paddingVertical: 6 }}
          >
            {EMOJI_REACTIONS.map((emoji) => (
              <Pressable
                key={emoji}
                onPress={run(() => onReact(emoji))}
                accessibilityRole="button"
                accessibilityLabel={`${emoji} tepkisi ver`}
                className="h-10 w-10 items-center justify-center rounded-full active:bg-border"
              >
                <Text className="text-[26px]">{emoji}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <View className="overflow-hidden rounded-3xl border border-border bg-surface">
            <ActionRow first icon={Reply} label="Yanıtla" onPress={run(onReply)} />
            {canCopy && onCopy ? <ActionRow icon={Copy} label="Kopyala" onPress={run(onCopy)} /> : null}
            {onForward ? <ActionRow icon={Forward} label="İlet" onPress={run(onForward)} /> : null}
            {canEdit && onEdit ? <ActionRow icon={Pencil} label="Düzenle" onPress={run(onEdit)} /> : null}
            {canDelete ? <ActionRow icon={Trash2} label={deleteLabel} destructive onPress={run(onDelete)} /> : null}
          </View>

          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            className="mt-3 min-h-12 items-center justify-center rounded-2xl bg-background active:opacity-70"
          >
            <Text className="text-[15px] font-semibold text-muted">Kapat</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
