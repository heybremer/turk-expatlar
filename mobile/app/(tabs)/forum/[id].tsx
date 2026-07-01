import { useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { api, ForumTopicDetail, ForumReply } from "@/lib/api";
import { formatRelative } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { DetailHeader } from "@/components/navigation/DetailHeader";

function ReplyCard({ reply, solvedReplyId, onVote }: {
  reply: ForumReply;
  solvedReplyId?: string | null;
  onVote: (id: string) => void;
}) {
  const isBest = reply.id === solvedReplyId;
  return (
    <Card className={`mb-2 ${isBest ? "border-success border-2" : ""}`}>
      {isBest && (
        <View className="flex-row items-center gap-1 mb-2">
          <Ionicons name="checkmark-circle" size={14} color="#16a34a" />
          <Text className="text-xs text-success font-semibold">En İyi Cevap</Text>
        </View>
      )}
      <View className="flex-row items-center gap-2 mb-2">
        <Avatar name={reply.user?.profile?.displayName ?? "?"} url={reply.user?.profile?.avatarUrl} size="sm" />
        <View>
          <Text className="text-sm font-medium text-text">{reply.user?.profile?.displayName ?? "Anonim"}</Text>
          <Text className="text-xs text-muted">{formatRelative(reply.createdAt)}</Text>
        </View>
      </View>
      <Text className="text-sm text-text leading-5">{reply.body}</Text>
      <View className="mt-2 flex-row items-center gap-3">
        <TouchableOpacity onPress={() => onVote(reply.id)} className="flex-row items-center gap-1">
          <Ionicons name="arrow-up-circle" size={16} color={reply.userVoted ? "#1a56db" : "#6b7280"} />
          <Text className={`text-sm ${reply.userVoted ? "text-primary font-semibold" : "text-muted"}`}>{reply.voteCount ?? 0}</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );
}

export default function ForumTopicScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token, user } = useAuth();
  const qc = useQueryClient();
  const [replyBody, setReplyBody] = useState("");

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["forum-topic", id],
    queryFn: () => api.get<ForumTopicDetail>(`/forum/topics/${id}`, token),
    enabled: !!token && !!id,
  });

  const replyMut = useMutation({
    mutationFn: (body: string) => api.post(`/forum/topics/${id}/replies`, { body }, token),
    onSuccess: () => {
      setReplyBody("");
      void qc.invalidateQueries({ queryKey: ["forum-topic", id] });
    },
    onError: () => Alert.alert("Hata", "Cevap gönderilemedi"),
  });

  const voteMut = useMutation({
    mutationFn: (replyId: string) => api.post(`/forum/replies/${replyId}/vote`, {}, token),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["forum-topic", id] }),
  });

  if (isLoading || !data) return <LoadingScreen />;

  const header = (
    <View>
      <DetailHeader title="Forum" />

      <View className="bg-surface p-4 mb-2">
        <View className="flex-row flex-wrap gap-2 mb-3">
          <Badge label={data.category.name} color="primary" />
          {data.status === "SOLVED" && <Badge label="Çözüldü" color="success" />}
        </View>
        <Text className="text-lg font-bold text-text mb-2">{data.title}</Text>
        <View className="flex-row items-center gap-2 mb-3">
          <Avatar name={data.user?.profile?.displayName ?? "?"} url={data.user?.profile?.avatarUrl} size="sm" />
          <View>
            <Text className="text-sm font-medium text-text">{data.user?.profile?.displayName ?? "Anonim"}</Text>
            <Text className="text-xs text-muted">{formatRelative(data.createdAt)}</Text>
          </View>
        </View>
        <Text className="text-sm text-text leading-6">{data.body}</Text>
      </View>

      <View className="px-4 pb-2">
        <Text className="text-sm font-semibold text-muted">{data.replies.length} CEVAP</Text>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView className="flex-1 bg-background" behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <FlatList
        data={data.replies}
        keyExtractor={(r) => r.id}
        ListHeaderComponent={header}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor="#1a56db" />}
        renderItem={({ item }) => (
          <ReplyCard reply={item} solvedReplyId={data.solvedReplyId} onVote={(rid) => voteMut.mutate(rid)} />
        )}
      />

      {token && (
        <View className="bg-surface border-t border-border px-4 py-3 flex-row items-end gap-3">
          <TextInput
            value={replyBody}
            onChangeText={setReplyBody}
            placeholder="Cevabınızı yazın…"
            placeholderTextColor="#9ca3af"
            multiline
            className="flex-1 bg-background rounded-xl border border-border px-3 py-2 text-sm text-text min-h-[40] max-h-[100]"
          />
          <TouchableOpacity
            onPress={() => { if (replyBody.trim()) replyMut.mutate(replyBody.trim()); }}
            disabled={!replyBody.trim() || replyMut.isPending}
            className={`bg-primary rounded-xl px-4 py-2.5 ${(!replyBody.trim() || replyMut.isPending) ? "opacity-50" : ""}`}
          >
            <Text className="text-white font-semibold text-sm">Gönder</Text>
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}
