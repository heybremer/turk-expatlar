import { useState } from "react";
import { Alert, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ForumReply } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { renderForumBody, extractFirstUrl } from "@/lib/forum-markdown";
import { Avatar } from "@/components/ui/Avatar";
import { ForumLinkPreview } from "@/components/forum/ForumLinkPreview";

type Props = {
  reply: ForumReply;
  isOwner: boolean;
  currentUserId?: string;
  topicStatus: string;
  canReply: boolean;
  nested?: boolean;
  onVote: (replyId: string) => void;
  onMarkSolved: (replyId: string) => void;
  onReplyTo: (replyId: string, displayName: string) => void;
  onReport: (replyId: string, reason: string) => void;
  onEdit: (replyId: string, body: string) => void;
};

export function ForumReplyCard({
  reply,
  isOwner,
  currentUserId,
  topicStatus,
  canReply,
  nested = false,
  onVote,
  onMarkSolved,
  onReplyTo,
  onReport,
  onEdit,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState(reply.body);
  const name = reply.user?.profile?.displayName ?? "Kullanıcı";
  const previewUrl = extractFirstUrl(reply.body);
  const isOwnReply = !!currentUserId && reply.user?.id === currentUserId;

  function startEdit() {
    setEditBody(reply.body);
    setEditing(true);
  }

  function saveEdit() {
    if (editBody.trim().length < 2) return;
    onEdit(reply.id, editBody.trim());
    setEditing(false);
  }

  return (
    <View className={nested ? "ml-6 mt-3 pl-3.5 border-l-2 border-border" : "mt-3"}>
      <View
        className={`rounded-2xl border p-4 ${
          reply.isBest && !nested ? "border-success bg-green-50" : "border-border bg-surface"
        }`}
        style={{
          shadowColor: "#111827",
          shadowOpacity: 0.04,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 2 },
          elevation: 1,
        }}
      >
        {reply.isBest && !nested && (
          <View className="flex-row items-center gap-1.5 mb-3">
            <Ionicons name="checkmark-circle" size={15} color="#16a34a" />
            <Text className="text-xs font-semibold text-success">En iyi cevap</Text>
          </View>
        )}

        <View className="flex-row gap-3">
          <Avatar name={name} url={reply.user?.profile?.avatarUrl} size={nested ? "xs" : "sm"} />
          <View className="flex-1 min-w-0">
            <View className="flex-row items-center justify-between gap-2">
              <View className="flex-row items-center gap-1.5 flex-wrap flex-1 min-w-0">
                <Text className="text-sm font-semibold text-text" numberOfLines={1}>{name}</Text>
                <Text className="text-xs text-muted">· {formatDate(reply.createdAt)}</Text>
                {reply._optimistic && <Text className="text-xs text-muted italic">gönderiliyor…</Text>}
              </View>
              {isOwnReply && !reply._optimistic && !editing && (
                <TouchableOpacity onPress={startEdit} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                  <Ionicons name="pencil-outline" size={15} color="#9ca3af" />
                </TouchableOpacity>
              )}
            </View>

            {editing ? (
              <View className="mt-2.5 gap-2">
                <TextInput
                  value={editBody}
                  onChangeText={setEditBody}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  autoFocus
                  className="bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-text min-h-[80]"
                />
                <View className="flex-row gap-2">
                  <TouchableOpacity onPress={saveEdit} className="bg-primary rounded-lg px-3.5 py-1.5">
                    <Text className="text-xs font-semibold text-white">Kaydet</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setEditing(false)} className="border border-border rounded-lg px-3.5 py-1.5">
                    <Text className="text-xs text-muted">İptal</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View className="mt-2">{renderForumBody(reply.body)}</View>
            )}
            {!editing && previewUrl && <ForumLinkPreview url={previewUrl} />}

            {!editing && (
              <View className="mt-3.5 pt-3 border-t border-border/70 flex-row items-center gap-4 flex-wrap">
                <TouchableOpacity
                  onPress={() => !reply._optimistic && onVote(reply.id)}
                  disabled={reply._optimistic}
                  className="flex-row items-center gap-1"
                >
                  <Ionicons name="thumbs-up-outline" size={14} color={reply.userVoted ? "#1a56db" : "#6b7280"} />
                  <Text className={`text-xs ${reply.userVoted ? "text-primary font-semibold" : "text-muted"}`}>
                    Faydalı{reply.voteCount ? ` (${reply.voteCount})` : ""}
                  </Text>
                </TouchableOpacity>

                {canReply && !nested && (
                  <TouchableOpacity onPress={() => onReplyTo(reply.id, name)} className="flex-row items-center gap-1">
                    <Ionicons name="return-down-forward-outline" size={14} color="#6b7280" />
                    <Text className="text-xs text-muted">Yanıtla</Text>
                  </TouchableOpacity>
                )}

                {isOwner && topicStatus !== "SOLVED" && !reply._optimistic && (
                  <TouchableOpacity onPress={() => onMarkSolved(reply.id)} className="flex-row items-center gap-1">
                    <Ionicons name="sparkles-outline" size={14} color="#16a34a" />
                    <Text className="text-xs text-success">En iyi seç</Text>
                  </TouchableOpacity>
                )}

                {!reply._optimistic && (
                  <TouchableOpacity
                    className="ml-auto"
                    onPress={() =>
                      Alert.alert("Şikayet et", "Bu cevabı şikayet etme sebebiniz nedir?", [
                        { text: "Vazgeç", style: "cancel" },
                        { text: "Spam veya reklam", onPress: () => onReport(reply.id, "Spam veya reklam") },
                        { text: "Hakaret / nefret söylemi", onPress: () => onReport(reply.id, "Hakaret / nefret söylemi") },
                        { text: "Diğer", onPress: () => onReport(reply.id, "Diğer") },
                      ])
                    }
                  >
                    <Ionicons name="flag-outline" size={14} color="#9ca3af" />
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </View>
      </View>

      {(reply.children ?? []).map((child) => (
        <ForumReplyCard
          key={child.id}
          reply={child}
          isOwner={isOwner}
          currentUserId={currentUserId}
          topicStatus={topicStatus}
          canReply={canReply}
          nested
          onVote={onVote}
          onMarkSolved={onMarkSolved}
          onReplyTo={onReplyTo}
          onReport={onReport}
          onEdit={onEdit}
        />
      ))}
    </View>
  );
}
