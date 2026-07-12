import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  Share,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/lib/auth";
import { api, ForumReply, ForumTopicDetail } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { renderForumBody, extractFirstUrl } from "@/lib/forum-markdown";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { ErrorState } from "@/components/ui/ErrorState";
import { DetailHeader } from "@/components/navigation/DetailHeader";
import { ForumLinkPreview } from "@/components/forum/ForumLinkPreview";
import { ForumPoll } from "@/components/forum/ForumPoll";
import { ForumReplyCard } from "@/components/forum/ForumReplyCard";

const STATUS_LABELS: Record<string, { label: string; color: "primary" | "success" | "warning" | "muted" }> = {
  OPEN: { label: "Açık", color: "primary" },
  ANSWERED: { label: "Cevaplandı", color: "warning" },
  SOLVED: { label: "Çözüldü", color: "success" },
  LOCKED: { label: "Kilitli", color: "muted" },
};

export default function ForumTopicScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token, user } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  const [replyBody, setReplyBody] = useState("");
  const [parentId, setParentId] = useState<string | null>(null);
  const [replyToName, setReplyToName] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [androidKeyboardHeight, setAndroidKeyboardHeight] = useState(0);

  useEffect(() => {
    if (Platform.OS !== "android") return;
    const showSub = Keyboard.addListener("keyboardDidShow", (e) => setAndroidKeyboardHeight(e.endCoordinates?.height ?? 0));
    const hideSub = Keyboard.addListener("keyboardDidHide", () => setAndroidKeyboardHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["forum-topic", id],
    queryFn: () => api.get<ForumTopicDetail>(`/forum/topics/${id}`, token),
    enabled: !!token && !!id,
  });

  const replyMut = useMutation({
    mutationFn: (vars: { body: string; parentId?: string }) =>
      api.post(`/forum/topics/${id}/replies`, { body: vars.body, parentId: vars.parentId }, token),
    onSuccess: () => {
      setReplyBody("");
      setParentId(null);
      setReplyToName(null);
      void qc.invalidateQueries({ queryKey: ["forum-topic", id] });
    },
    onError: () => Alert.alert("Hata", "Cevap gönderilemedi"),
  });

  const voteMut = useMutation({
    mutationFn: (replyId: string) => api.post(`/forum/replies/${replyId}/vote`, {}, token),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["forum-topic", id] }),
  });

  const editReplyMut = useMutation({
    mutationFn: (vars: { replyId: string; body: string }) =>
      api.patch(`/forum/replies/${vars.replyId}`, { body: vars.body }, token),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["forum-topic", id] }),
    onError: () => Alert.alert("Hata", "Cevap güncellenemedi"),
  });

  const solveMut = useMutation({
    mutationFn: (replyId: string) => api.post(`/forum/topics/${id}/solve/${replyId}`, {}, token),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["forum-topic", id] }),
    onError: () => Alert.alert("Hata", "İşaretlenemedi"),
  });

  const interestMut = useMutation({
    mutationFn: () => api.post(`/forum/topics/${id}/me-too`, {}, token),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["forum-topic", id] }),
  });

  const editMut = useMutation({
    mutationFn: () => api.patch<ForumTopicDetail>(`/forum/topics/${id}`, { title: editTitle, body: editBody }, token),
    onSuccess: () => {
      setEditMode(false);
      void qc.invalidateQueries({ queryKey: ["forum-topic", id] });
    },
    onError: () => Alert.alert("Hata", "Güncellenemedi"),
  });

  const deleteMut = useMutation({
    mutationFn: () => api.delete(`/forum/topics/${id}`, token),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["forum-topics"] });
      router.back();
    },
    onError: () => Alert.alert("Hata", "Silinemedi"),
  });

  const { bestReply, otherReplies } = useMemo(() => {
    if (!data?.replies.length) return { bestReply: null as ForumReply | null, otherReplies: [] as ForumReply[] };
    const best = data.replies.find((r) => r.isBest) ?? null;
    return { bestReply: best, otherReplies: data.replies.filter((r) => !r.isBest) };
  }, [data?.replies]);

  function submitReply() {
    if (!token) return;
    if (replyBody.trim().length < 5) {
      Alert.alert("Uyarı", "Cevap en az 5 karakter olmalı");
      return;
    }
    replyMut.mutate({ body: replyBody.trim(), parentId: parentId ?? undefined });
  }

  function startReplyTo(replyId: string, name: string) {
    setParentId(replyId);
    setReplyToName(name);
    setReplyBody((prev) => (prev.startsWith("@") ? prev : `@${name} `));
  }

  function report(targetType: "FORUM_TOPIC" | "FORUM_REPLY", targetId: string, reason: string) {
    if (!token) return;
    api
      .post("/reports", { targetType, targetId, reason }, token)
      .then(() => Alert.alert("Teşekkürler", "Şikayetiniz alındı."))
      .catch(() => Alert.alert("Hata", "Şikayet gönderilemedi"));
  }

  function handleShare() {
    if (!data) return;
    void Share.share({
      title: data.title,
      message: `${data.title}\n\nTürk Expatlar Forum: https://turkexpatlar.de/forum/${id}`,
    });
  }

  function handleDeleteTopic() {
    Alert.alert("Konuyu sil", "Konuyu silmek istediğinizden emin misiniz?", [
      { text: "Vazgeç", style: "cancel" },
      { text: "Sil", style: "destructive", onPress: () => deleteMut.mutate() },
    ]);
  }

  if (isLoading) return <LoadingScreen />;
  if (!data) {
    return (
      <View className="flex-1 bg-background">
        <DetailHeader title="Forum" />
        <ErrorState title="Konu yüklenemedi" onRetry={() => void refetch()} />
      </View>
    );
  }

  const status = STATUS_LABELS[data.status] ?? STATUS_LABELS.OPEN;
  const isOwner = user?.id === data.user?.id;
  const interestCount = data._count?.interests ?? 0;
  const topicPreviewUrl = extractFirstUrl(data.body);

  const header = (
    <View className="gap-3 pb-1">
      <Card>
        <View className="flex-row flex-wrap gap-2 mb-3">
          <Badge label={data.category.name} color="muted" />
          <Badge label={status.label} color={status.color} />
          {data.city && <Badge label={data.city.name} color="muted" />}
        </View>

        {editMode ? (
          <View className="gap-2">
            <TextInput
              value={editTitle}
              onChangeText={setEditTitle}
              className="bg-background border border-border rounded-lg px-3 py-2 text-text font-semibold"
            />
            <TextInput
              value={editBody}
              onChangeText={setEditBody}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              className="bg-background border border-border rounded-lg px-3 py-2 text-text min-h-[120]"
            />
            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={() => editMut.mutate()}
                disabled={editMut.isPending}
                className="bg-primary rounded-lg px-4 py-2"
              >
                <Text className="text-white text-sm font-semibold">
                  {editMut.isPending ? "Kaydediliyor…" : "Kaydet"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setEditMode(false)} className="border border-border rounded-lg px-4 py-2">
                <Text className="text-sm text-muted">İptal</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            <View className="flex-row items-start justify-between gap-3">
              <Text className="flex-1 text-lg font-bold text-text">{data.title}</Text>
              {isOwner && (
                <View className="flex-row gap-3 pt-0.5">
                  <TouchableOpacity
                    onPress={() => { setEditTitle(data.title); setEditBody(data.body); setEditMode(true); }}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Ionicons name="pencil-outline" size={17} color="#6b7280" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleDeleteTopic} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                    <Ionicons name="trash-outline" size={17} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <View className="flex-row items-center gap-2 mt-3 mb-3">
              <Avatar name={data.user?.profile?.displayName ?? "?"} url={data.user?.profile?.avatarUrl} size="sm" />
              <View className="flex-1 min-w-0">
                <Text className="text-sm font-medium text-text">{data.user?.profile?.displayName ?? "Anonim"}</Text>
                <Text className="text-xs text-muted">{formatDate(data.createdAt)}</Text>
              </View>
              <TouchableOpacity
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                onPress={() =>
                  Alert.alert("Şikayet et", "Bu konuyu şikayet etme sebebiniz nedir?", [
                    { text: "Vazgeç", style: "cancel" },
                    { text: "Spam veya reklam", onPress: () => report("FORUM_TOPIC", data.id, "Spam veya reklam") },
                    { text: "Hakaret / nefret söylemi", onPress: () => report("FORUM_TOPIC", data.id, "Hakaret / nefret söylemi") },
                    { text: "Diğer", onPress: () => report("FORUM_TOPIC", data.id, "Diğer") },
                  ])
                }
              >
                <Ionicons name="flag-outline" size={16} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            <View>{renderForumBody(data.body, "text-sm text-text leading-6")}</View>
            {topicPreviewUrl && <ForumLinkPreview url={topicPreviewUrl} />}
            {data.poll && <ForumPoll initialPoll={data.poll} />}
          </>
        )}

        <View className="mt-4 pt-3.5 border-t border-border flex-row items-center gap-3 flex-wrap">
          <TouchableOpacity
            onPress={() => interestMut.mutate()}
            disabled={interestMut.isPending}
            className={`flex-row items-center gap-1.5 rounded-full border px-3.5 py-2 ${
              data.userInterested ? "border-primary bg-primary/10" : "border-border"
            }`}
          >
            <Ionicons name="hand-left-outline" size={15} color={data.userInterested ? "#1a56db" : "#6b7280"} />
            <Text className={`text-xs font-medium ${data.userInterested ? "text-primary" : "text-muted"}`}>
              Ben de yaşıyorum ({interestCount})
            </Text>
          </TouchableOpacity>

          <View className="flex-row items-center gap-1">
            <Ionicons name="chatbubble-outline" size={14} color="#6b7280" />
            <Text className="text-xs text-muted">{data._count?.replies ?? data.replies.length} cevap</Text>
          </View>

          <TouchableOpacity onPress={handleShare} className="ml-auto flex-row items-center gap-1" hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
            <Ionicons name="share-outline" size={16} color="#6b7280" />
            <Text className="text-xs text-muted">Paylaş</Text>
          </TouchableOpacity>
        </View>
      </Card>

      {bestReply && (
        <View>
          <View className="flex-row items-center gap-1.5 mb-1.5 px-0.5">
            <Ionicons name="checkmark-circle" size={15} color="#16a34a" />
            <Text className="text-sm font-semibold text-success">En iyi cevap</Text>
          </View>
          <ForumReplyCard
            reply={bestReply}
            isOwner={isOwner}
            currentUserId={user?.id}
            topicStatus={data.status}
            canReply={!!token}
            onVote={(rid) => voteMut.mutate(rid)}
            onMarkSolved={(rid) => solveMut.mutate(rid)}
            onReplyTo={startReplyTo}
            onReport={(rid, reason) => report("FORUM_REPLY", rid, reason)}
            onEdit={(rid, body) => editReplyMut.mutate({ replyId: rid, body })}
          />
        </View>
      )}

      <Text className="text-xs font-semibold text-muted px-0.5">
        {bestReply ? "DİĞER CEVAPLAR" : "CEVAPLAR"}
        {otherReplies.length > 0 ? ` (${otherReplies.length})` : ""}
      </Text>
    </View>
  );

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={Platform.OS === "android" ? { paddingBottom: androidKeyboardHeight } : undefined}
    >
      <DetailHeader title={data.title} subtitle={data.category.name} />
      <FlatList
        data={otherReplies}
        keyExtractor={(r) => r.id}
        ListHeaderComponent={header}
        contentContainerStyle={{ padding: 16, paddingBottom: 20, gap: 10 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor="#1a56db" />}
        ListEmptyComponent={
          data.replies.length === 0 ? (
            <Text className="text-sm text-muted text-center py-6">Henüz cevap yok. İlk cevabı sen yaz.</Text>
          ) : bestReply ? (
            <Text className="text-sm text-muted text-center py-2">Başka cevap yok.</Text>
          ) : null
        }
        renderItem={({ item }) => (
          <ForumReplyCard
            reply={item}
            isOwner={isOwner}
            currentUserId={user?.id}
            topicStatus={data.status}
            canReply={!!token}
            onVote={(rid) => voteMut.mutate(rid)}
            onMarkSolved={(rid) => solveMut.mutate(rid)}
            onReplyTo={startReplyTo}
            onReport={(rid, reason) => report("FORUM_REPLY", rid, reason)}
            onEdit={(rid, body) => editReplyMut.mutate({ replyId: rid, body })}
          />
        )}
      />

      {token && (
        <View
          className="bg-surface border-t border-border px-4 pt-2.5"
          style={{ paddingBottom: Math.max(insets.bottom, 12) }}
        >
          {replyToName && (
            <View className="flex-row items-center gap-2 bg-background rounded-xl px-3 py-2 mb-2 border-l-2 border-primary">
              <Text className="flex-1 text-xs text-muted">
                <Text className="font-semibold text-primary">{replyToName}</Text> kişisine yanıt veriyorsunuz
              </Text>
              <TouchableOpacity onPress={() => { setParentId(null); setReplyToName(null); }}>
                <Ionicons name="close-circle" size={16} color="#9ca3af" />
              </TouchableOpacity>
            </View>
          )}
          <View className="flex-row items-end gap-2.5">
            <TextInput
              value={replyBody}
              onChangeText={setReplyBody}
              placeholder="Cevabınızı yazın…"
              placeholderTextColor="#9ca3af"
              multiline
              className="flex-1 bg-background rounded-2xl border border-border px-3.5 py-2.5 text-sm text-text min-h-[42] max-h-[100]"
            />
            <TouchableOpacity
              onPress={submitReply}
              disabled={!replyBody.trim() || replyMut.isPending}
              className={`bg-primary w-10 h-10 rounded-full items-center justify-center ${(!replyBody.trim() || replyMut.isPending) ? "opacity-50" : ""}`}
            >
              {replyMut.isPending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Ionicons name="arrow-up" size={18} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}
