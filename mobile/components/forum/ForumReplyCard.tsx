import { useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import {
  CircleCheck,
  Flag,
  Pencil,
  Reply,
  Sparkles,
  ThumbsUp,
  Trash2,
  type LucideIcon,
} from "lucide-react-native";
import { ForumReply } from "@/lib/api";
import { colors } from "@/lib/colors";
import { formatDate } from "@/lib/utils";
import { renderForumBody, extractFirstUrl } from "@/lib/forum-markdown";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { ForumLinkPreview } from "@/components/forum/ForumLinkPreview";

const REPORT_REASONS = ["Spam veya reklam", "Hakaret / nefret söylemi", "Yanlış veya yanıltıcı bilgi", "Diğer"];

type Props = {
  reply: ForumReply;
  /** Konu sahibi mi (en iyi cevap seçebilir). */
  isOwner: boolean;
  /** Admin/moderatör: her cevabı düzenleyip silebilir. */
  canModerate?: boolean;
  currentUserId?: string;
  topicStatus: string;
  canReply: boolean;
  nested?: boolean;
  votePendingId?: string | null;
  onVote: (replyId: string) => void;
  onMarkSolved: (replyId: string) => void;
  onReplyTo: (replyId: string, displayName: string) => void;
  onReport: (replyId: string, reason: string) => void;
  /** Başarılıysa resolve, hata varsa ApiError fırlatır. */
  onEdit: (replyId: string, body: string) => Promise<unknown>;
  onDelete: (replyId: string) => void;
};

function ActionChip({
  icon: Icon,
  label,
  onPress,
  active = false,
  color = colors.muted,
  disabled,
  accessibilityLabel,
}: {
  icon: LucideIcon;
  label?: string;
  onPress: () => void;
  active?: boolean;
  color?: string;
  disabled?: boolean;
  accessibilityLabel?: string;
}) {
  const tint = active ? colors.primary : color;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={4}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected: active, disabled: !!disabled }}
      className={`min-h-9 min-w-9 flex-row items-center justify-center gap-1.5 rounded-full px-3 active:opacity-70 ${
        active ? "bg-primary/10" : "bg-background"
      } ${disabled ? "opacity-50" : "opacity-100"}`}
    >
      <Icon size={14} color={tint} strokeWidth={2.2} />
      {label ? (
        <Text className="text-xs font-semibold" style={{ color: tint }}>
          {label}
        </Text>
      ) : null}
    </Pressable>
  );
}

export function ForumReplyCard(props: Props) {
  const {
    reply,
    isOwner,
    canModerate = false,
    currentUserId,
    topicStatus,
    canReply,
    nested = false,
    votePendingId,
    onVote,
    onMarkSolved,
    onReplyTo,
    onReport,
    onEdit,
    onDelete,
  } = props;
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState(reply.body);
  const [editError, setEditError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const name = reply.user?.profile?.displayName ?? "Kullanıcı";
  const previewUrl = extractFirstUrl(reply.body);
  const isOwnReply = !!currentUserId && reply.user?.id === currentUserId;
  const canManage = (isOwnReply || canModerate) && !reply._optimistic;
  const highlighted = reply.isBest && !nested;
  const canMarkBest = isOwner && !nested && !reply.isBest && !reply._optimistic && topicStatus !== "LOCKED";

  function startEdit() {
    setEditBody(reply.body);
    setEditError(null);
    setEditing(true);
  }

  async function saveEdit() {
    const body = editBody.trim();
    if (body.length < 5) {
      setEditError("Cevap en az 5 karakter olmalı");
      return;
    }
    if (body === reply.body.trim()) {
      setEditing(false);
      return;
    }
    setSaving(true);
    setEditError(null);
    try {
      await onEdit(reply.id, body);
      setEditing(false);
    } catch (e) {
      setEditError(e instanceof Error ? e.message : "Cevap güncellenemedi");
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete() {
    Alert.alert("Cevabı sil", "Bu cevabı silmek istediğinize emin misiniz?", [
      { text: "Vazgeç", style: "cancel" },
      { text: "Sil", style: "destructive", onPress: () => onDelete(reply.id) },
    ]);
  }

  function confirmBest() {
    Alert.alert(
      "En iyi cevap",
      topicStatus === "SOLVED"
        ? "Bu cevabı yeni en iyi cevap olarak seçmek istiyor musunuz?"
        : "Bu cevabı en iyi cevap olarak işaretlemek istiyor musunuz? Konu “Çözüldü” olarak işaretlenir.",
      [
        { text: "Vazgeç", style: "cancel" },
        { text: "İşaretle", onPress: () => onMarkSolved(reply.id) },
      ],
    );
  }

  function openReport() {
    Alert.alert("Şikayet et", "Bu cevabı şikayet etme sebebiniz nedir?", [
      ...REPORT_REASONS.map((reason) => ({ text: reason, onPress: () => onReport(reply.id, reason) })),
      { text: "Vazgeç", style: "cancel" as const },
    ]);
  }

  return (
    <View className={nested ? "ml-5 mt-3 border-l-2 border-border pl-3" : "mt-3"}>
      <View
        className={`rounded-3xl border p-4 ${highlighted ? "border-success/40 bg-success/5" : "border-border bg-surface"}`}
      >
        {highlighted ? (
          <View className="mb-3 flex-row items-center gap-1.5">
            <CircleCheck size={15} color={colors.success} />
            <Text className="text-xs font-bold text-success">En iyi cevap</Text>
          </View>
        ) : null}

        <View className="flex-row gap-3">
          <Avatar name={name} url={reply.user?.profile?.avatarUrl} size={nested ? "xs" : "sm"} />
          <View className="min-w-0 flex-1">
            <View className="flex-row items-center justify-between gap-2">
              <View className="min-w-0 flex-1">
                <Text className="text-sm font-semibold text-text" numberOfLines={1}>
                  {name}
                </Text>
                <Text className="text-xs text-muted">
                  {formatDate(reply.createdAt)}
                  {reply._optimistic ? " · gönderiliyor…" : ""}
                </Text>
              </View>
              {canManage && !editing ? (
                <View className="flex-row gap-1">
                  <Pressable
                    onPress={startEdit}
                    hitSlop={6}
                    accessibilityRole="button"
                    accessibilityLabel="Cevabı düzenle"
                    className="h-9 w-9 items-center justify-center rounded-full bg-background active:opacity-70"
                  >
                    <Pencil size={15} color={colors.muted} />
                  </Pressable>
                  <Pressable
                    onPress={confirmDelete}
                    hitSlop={6}
                    accessibilityRole="button"
                    accessibilityLabel="Cevabı sil"
                    className="h-9 w-9 items-center justify-center rounded-full bg-danger/10 active:opacity-70"
                  >
                    <Trash2 size={15} color={colors.danger} />
                  </Pressable>
                </View>
              ) : null}
            </View>

            {editing ? (
              <View className="mt-3">
                <TextField
                  value={editBody}
                  onChangeText={(v) => {
                    setEditBody(v);
                    if (editError) setEditError(null);
                  }}
                  multiline
                  numberOfLines={4}
                  autoFocus
                  error={editError}
                  accessibilityLabel="Cevabı düzenle"
                />
                <View className="flex-row gap-2">
                  <Button label="Kaydet" size="sm" loading={saving} onPress={() => void saveEdit()} />
                  <Button
                    label="İptal"
                    size="sm"
                    variant="secondary"
                    disabled={saving}
                    onPress={() => setEditing(false)}
                  />
                </View>
              </View>
            ) : (
              <View className="mt-2">{renderForumBody(reply.body)}</View>
            )}
            {!editing && previewUrl ? <ForumLinkPreview url={previewUrl} /> : null}

            {!editing ? (
              <View className="mt-3 flex-row flex-wrap items-center gap-2">
                <ActionChip
                  icon={ThumbsUp}
                  label={`Faydalı${reply.voteCount ? ` (${reply.voteCount})` : ""}`}
                  accessibilityLabel={`Faydalı olarak işaretle, ${reply.voteCount ?? 0} oy`}
                  active={!!reply.userVoted}
                  disabled={!!reply._optimistic || votePendingId === reply.id || !currentUserId}
                  onPress={() => onVote(reply.id)}
                />

                {canReply && !nested && !reply._optimistic ? (
                  <ActionChip icon={Reply} label="Yanıtla" onPress={() => onReplyTo(reply.id, name)} />
                ) : null}

                {canMarkBest ? (
                  <ActionChip icon={Sparkles} label="En iyi seç" color={colors.success} onPress={confirmBest} />
                ) : null}

                {!reply._optimistic && !isOwnReply && currentUserId ? (
                  <View className="ml-auto">
                    <ActionChip
                      icon={Flag}
                      color={colors.mutedLight}
                      accessibilityLabel="Cevabı şikayet et"
                      onPress={openReport}
                    />
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
        </View>
      </View>

      {(reply.children ?? []).map((child) => (
        <ForumReplyCard key={child.id} {...props} reply={child} nested />
      ))}
    </View>
  );
}
