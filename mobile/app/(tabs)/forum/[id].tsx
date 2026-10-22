import { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  Share,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  ArrowUp,
  CircleCheck,
  Flag,
  Lock,
  MapPin,
  MessageCircle,
  MessagesSquare,
  Pencil,
  Share2,
  ThumbsUp,
  Trash2,
  X,
} from "lucide-react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import Animated from "react-native-reanimated";
import { useComposerInset } from "@/hooks/useComposerInset";
import { useAuth } from "@/lib/auth";
import { api, ApiError, ForumReply, ForumTopicDetail } from "@/lib/api";
import { colors } from "@/lib/colors";
import { formatDate } from "@/lib/utils";
import { renderForumBody, extractFirstUrl } from "@/lib/forum-markdown";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { TextField } from "@/components/ui/TextField";
import { SectionLabel } from "@/components/ui/kit";
import { DetailHeader } from "@/components/navigation/DetailHeader";
import { HeaderIconButton } from "@/components/navigation/AppHeader";
import { ForumLinkPreview } from "@/components/forum/ForumLinkPreview";
import { ForumPoll } from "@/components/forum/ForumPoll";
import { ForumReplyCard } from "@/components/forum/ForumReplyCard";

const STATUS_LABELS: Record<string, { label: string; color: "primary" | "success" | "warning" | "muted" }> = {
  OPEN: { label: "Açık", color: "primary" },
  ANSWERED: { label: "Cevaplandı", color: "warning" },
  SOLVED: { label: "Çözüldü", color: "success" },
  LOCKED: { label: "Kilitli", color: "muted" },
  UNDER_REVIEW: { label: "İncelemede", color: "muted" },
};

const REPORT_REASONS = ["Spam veya reklam", "Hakaret / nefret söylemi", "Yanlış veya yanıltıcı bilgi", "Diğer"];

function errorMessage(e: unknown, fallback: string) {
  return e instanceof ApiError && e.message ? e.message : fallback;
}

function patchReply(list: ForumReply[], replyId: string, patch: (r: ForumReply) => ForumReply): ForumReply[] {
  return list.map((r) => {
    if (r.id === replyId) return patch(r);
    if (!r.children?.length) return r;
    return { ...r, children: r.children.map((c) => (c.id === replyId ? patch(c) : c)) };
  });
}

function removeReply(list: ForumReply[], replyId: string): ForumReply[] {
  return list
    .filter((r) => r.id !== replyId)
    .map((r) => (r.children?.some((c) => c.id === replyId) ? { ...r, children: r.children.filter((c) => c.id !== replyId) } : r));
}

export default function ForumTopicScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token, user } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const inputRef = useRef<TextInput>(null);
  const [replyBody, setReplyBody] = useState("");
  const [parentId, setParentId] = useState<string | null>(null);
  const [replyToName, setReplyToName] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editErrors, setEditErrors] = useState<{ title?: string; body?: string }>({});
  const composerInsetStyle = useComposerInset(12, 10);
  const topicKey = ["forum-topic", id];

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: topicKey,
    queryFn: () => api.get<ForumTopicDetail>(`/forum/topics/${id}`, token),
    enabled: !!token && !!id,
  });

  const setTopic = (fn: (prev: ForumTopicDetail) => ForumTopicDetail) =>
    qc.setQueryData<ForumTopicDetail>(topicKey, (prev) => (prev ? fn(prev) : prev));

  const invalidateLists = () => void qc.invalidateQueries({ queryKey: ["forum-topics"] });

  const replyMut = useMutation({
    mutationFn: (vars: { body: string; parentId?: string }) =>
      api.post<ForumReply>(`/forum/topics/${id}/replies`, { body: vars.body, parentId: vars.parentId }, token),
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: topicKey });
      const previous = qc.getQueryData<ForumTopicDetail>(topicKey);
      const optimistic: ForumReply = {
        id: `temp-${Date.now()}`,
        body: vars.body,
        isBest: false,
        createdAt: new Date().toISOString(),
        parentId: vars.parentId ?? null,
        voteCount: 0,
        userVoted: false,
        _optimistic: true,
        children: [],
        user: user
          ? { id: user.id, profile: { displayName: user.profile?.displayName ?? "Ben", avatarUrl: user.profile?.avatarUrl } }
          : null,
      };
      setTopic((prev) => ({
        ...prev,
        status: prev.status === "OPEN" ? "ANSWERED" : prev.status,
        _count: { ...prev._count, replies: (prev._count?.replies ?? prev.replies.length) + 1 },
        replies: vars.parentId
          ? prev.replies.map((r) => (r.id === vars.parentId ? { ...r, children: [...(r.children ?? []), optimistic] } : r))
          : [...prev.replies, optimistic],
      }));
      setReplyBody("");
      setParentId(null);
      setReplyToName(null);
      return { previous, vars };
    },
    onError: (e, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(topicKey, ctx.previous);
      if (ctx?.vars) setReplyBody(ctx.vars.body);
      Alert.alert("Cevap gönderilemedi", errorMessage(e, "Lütfen tekrar deneyin."));
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: topicKey });
      invalidateLists();
    },
  });

  const voteMut = useMutation({
    mutationFn: (replyId: string) => api.post<{ voted: boolean; count: number }>(`/forum/replies/${replyId}/vote`, {}, token),
    onMutate: (replyId) => {
      const previous = qc.getQueryData<ForumTopicDetail>(topicKey);
      setTopic((prev) => ({
        ...prev,
        replies: patchReply(prev.replies, replyId, (r) => ({
          ...r,
          userVoted: !r.userVoted,
          voteCount: Math.max(0, (r.voteCount ?? 0) + (r.userVoted ? -1 : 1)),
        })),
      }));
      return { previous };
    },
    onSuccess: (res, replyId) =>
      setTopic((prev) => ({
        ...prev,
        replies: patchReply(prev.replies, replyId, (r) => ({ ...r, userVoted: res.voted, voteCount: res.count })),
      })),
    onError: (e, _replyId, ctx) => {
      if (ctx?.previous) qc.setQueryData(topicKey, ctx.previous);
      Alert.alert("Hata", errorMessage(e, "Oy verilemedi"));
    },
  });

  const editReplyMut = useMutation({
    mutationFn: (vars: { replyId: string; body: string }) =>
      api.patch<ForumReply>(`/forum/replies/${vars.replyId}`, { body: vars.body }, token),
    onSuccess: (_res, vars) =>
      setTopic((prev) => ({ ...prev, replies: patchReply(prev.replies, vars.replyId, (r) => ({ ...r, body: vars.body })) })),
  });

  const deleteReplyMut = useMutation({
    mutationFn: (replyId: string) => api.delete(`/forum/replies/${replyId}`, token),
    onSuccess: (_res, replyId) => {
      setTopic((prev) => ({
        ...prev,
        replies: removeReply(prev.replies, replyId),
        _count: { ...prev._count, replies: Math.max(0, (prev._count?.replies ?? 1) - 1) },
      }));
      void qc.invalidateQueries({ queryKey: topicKey });
      invalidateLists();
    },
    onError: (e) => Alert.alert("Hata", errorMessage(e, "Cevap silinemedi")),
  });

  const solveMut = useMutation({
    mutationFn: (replyId: string) => api.post(`/forum/topics/${id}/solve/${replyId}`, {}, token),
    onSuccess: (_res, replyId) => {
      setTopic((prev) => ({
        ...prev,
        status: "SOLVED",
        solvedReplyId: replyId,
        replies: prev.replies.map((r) => ({ ...r, isBest: r.id === replyId })),
      }));
      invalidateLists();
    },
    onError: (e) => Alert.alert("Hata", errorMessage(e, "En iyi cevap işaretlenemedi")),
  });

  const interestMut = useMutation({
    mutationFn: () => api.post<{ interested: boolean; count: number }>(`/forum/topics/${id}/me-too`, {}, token),
    onMutate: () => {
      const previous = qc.getQueryData<ForumTopicDetail>(topicKey);
      setTopic((prev) => ({
        ...prev,
        userInterested: !prev.userInterested,
        _count: {
          ...prev._count,
          replies: prev._count?.replies ?? prev.replies.length,
          interests: Math.max(0, (prev._count?.interests ?? 0) + (prev.userInterested ? -1 : 1)),
        },
      }));
      return { previous };
    },
    onSuccess: (res) =>
      setTopic((prev) => ({
        ...prev,
        userInterested: res.interested,
        _count: { ...prev._count, replies: prev._count?.replies ?? prev.replies.length, interests: res.count },
      })),
    onError: (e, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(topicKey, ctx.previous);
      Alert.alert("Hata", errorMessage(e, "İşlem başarısız"));
    },
    onSettled: invalidateLists,
  });

  const editMut = useMutation({
    mutationFn: (vars: { title: string; body: string }) =>
      api.patch<ForumTopicDetail>(`/forum/topics/${id}`, vars, token),
    onSuccess: (_res, vars) => {
      setTopic((prev) => ({ ...prev, title: vars.title, body: vars.body }));
      setEditMode(false);
      invalidateLists();
    },
    onError: (e) => Alert.alert("Güncellenemedi", errorMessage(e, "Lütfen tekrar deneyin.")),
  });

  const deleteMut = useMutation({
    mutationFn: () => api.delete(`/forum/topics/${id}`, token),
    onSuccess: () => {
      invalidateLists();
      qc.removeQueries({ queryKey: topicKey });
      router.back();
    },
    onError: (e) => Alert.alert("Hata", errorMessage(e, "Konu silinemedi")),
  });

  const { bestReply, otherReplies } = useMemo(() => {
    const replies = data?.replies ?? [];
    const best = replies.find((r) => r.isBest) ?? null;
    return { bestReply: best, otherReplies: replies.filter((r) => !r.isBest) };
  }, [data?.replies]);

  function submitReply() {
    if (!token || replyMut.isPending) return;
    const body = replyBody.trim();
    if (body.length < 5) {
      Alert.alert("Uyarı", "Cevap en az 5 karakter olmalı");
      return;
    }
    replyMut.mutate({ body, parentId: parentId ?? undefined });
  }

  function startReplyTo(replyId: string, name: string) {
    setParentId(replyId);
    setReplyToName(name);
    setReplyBody((prev) => (prev.startsWith("@") ? prev : `@${name} `));
    inputRef.current?.focus();
  }

  function report(targetType: "FORUM_TOPIC" | "FORUM_REPLY", targetId: string, reason: string) {
    if (!token) return;
    api
      .post("/reports", { targetType, targetId, reason }, token)
      .then(() => Alert.alert("Teşekkürler", "Şikayetiniz moderatörlere iletildi."))
      .catch((e) => Alert.alert("Hata", errorMessage(e, "Şikayet gönderilemedi")));
  }

  function openTopicReport() {
    if (!data) return;
    Alert.alert("Şikayet et", "Bu konuyu şikayet etme sebebiniz nedir?", [
      ...REPORT_REASONS.map((reason) => ({ text: reason, onPress: () => report("FORUM_TOPIC", data.id, reason) })),
      { text: "Vazgeç", style: "cancel" as const },
    ]);
  }

  function handleShare() {
    if (!data) return;
    const url = `https://turkexpatlar.de/forum/${id}`;
    void Share.share({
      title: data.title,
      message: `${data.title}\n\nTürk Expatlar Forum: ${url}`,
      url,
    });
  }

  function handleDeleteTopic() {
    Alert.alert("Konuyu sil", "Konuyu silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.", [
      { text: "Vazgeç", style: "cancel" },
      { text: "Sil", style: "destructive", onPress: () => deleteMut.mutate() },
    ]);
  }

  function saveTopicEdit() {
    const title = editTitle.trim();
    const body = editBody.trim();
    const errs: { title?: string; body?: string } = {};
    if (title.length < 5) errs.title = "Başlık en az 5 karakter olmalı";
    if (body.length < 20) errs.body = "İçerik en az 20 karakter olmalı";
    setEditErrors(errs);
    if (errs.title || errs.body) return;
    editMut.mutate({ title, body });
  }

  if (isLoading) return <LoadingScreen />;
  if (!data) {
    const notFound = error instanceof ApiError && error.status === 404;
    return (
      <View className="flex-1 bg-background">
        <DetailHeader title="Forum" />
        {notFound ? (
          <EmptyState
            icon={MessagesSquare}
            title="Konu bulunamadı"
            subtitle="Bu konu silinmiş veya hiç oluşturulmamış olabilir."
            actionLabel="Foruma dön"
            onAction={() => router.back()}
          />
        ) : (
          <ErrorState
            title="Konu yüklenemedi"
            subtitle={error instanceof ApiError ? error.message : undefined}
            onRetry={() => void refetch()}
          />
        )}
      </View>
    );
  }

  const status = STATUS_LABELS[data.status] ?? STATUS_LABELS.OPEN;
  const isOwner = !!user?.id && user.id === data.user?.id;
  const canModerate = user?.role === "ADMIN" || user?.role === "MODERATOR";
  const canManageTopic = isOwner || canModerate;
  const isLocked = data.status === "LOCKED";
  const interestCount = data._count?.interests ?? 0;
  const replyCount = data._count?.replies ?? data.replies.length;
  const topicPreviewUrl = extractFirstUrl(data.body);
  const canSend = replyBody.trim().length >= 5 && !replyMut.isPending;
  const authorName = data.user?.profile?.displayName ?? "Anonim";

  const renderReply = (reply: ForumReply) => (
    <ForumReplyCard
      reply={reply}
      isOwner={isOwner}
      canModerate={canModerate}
      currentUserId={user?.id}
      topicStatus={data.status}
      canReply={!!token && !isLocked}
      votePendingId={voteMut.isPending ? voteMut.variables : null}
      onVote={(rid) => voteMut.mutate(rid)}
      onMarkSolved={(rid) => solveMut.mutate(rid)}
      onReplyTo={startReplyTo}
      onReport={(rid, reason) => report("FORUM_REPLY", rid, reason)}
      onEdit={(rid, body) => editReplyMut.mutateAsync({ replyId: rid, body })}
      onDelete={(rid) => deleteReplyMut.mutate(rid)}
    />
  );

  const header = (
    <View>
      <Card>
        <View className="mb-3 flex-row flex-wrap gap-2">
          <Badge label={data.category.name} color="muted" />
          <Badge label={status.label} color={status.color} />
          {data.city ? <Badge label={data.city.name} color="muted" icon={MapPin} /> : null}
        </View>

        {editMode ? (
          <View>
            <TextField
              label="Başlık"
              value={editTitle}
              onChangeText={(v) => {
                setEditTitle(v);
                if (editErrors.title) setEditErrors((p) => ({ ...p, title: undefined }));
              }}
              maxLength={150}
              error={editErrors.title}
              returnKeyType="next"
            />
            <TextField
              label="İçerik"
              value={editBody}
              onChangeText={(v) => {
                setEditBody(v);
                if (editErrors.body) setEditErrors((p) => ({ ...p, body: undefined }));
              }}
              multiline
              numberOfLines={6}
              error={editErrors.body}
            />
            <View className="flex-row gap-2">
              <Button label="Kaydet" size="sm" icon={CircleCheck} loading={editMut.isPending} onPress={saveTopicEdit} />
              <Button
                label="İptal"
                size="sm"
                variant="secondary"
                disabled={editMut.isPending}
                onPress={() => setEditMode(false)}
              />
            </View>
          </View>
        ) : (
          <>
            <Text className="text-xl font-extrabold leading-7 text-text">{data.title}</Text>

            <View className="mb-4 mt-3 flex-row items-center gap-2.5">
              <Pressable
                onPress={() => data.user?.id && router.push(`/kullanici/${data.user.id}` as never)}
                disabled={!data.user?.id}
                accessibilityRole="button"
                accessibilityLabel={`${authorName} profilini aç`}
                className="min-w-0 flex-1 flex-row items-center gap-2.5 active:opacity-70"
              >
                <Avatar name={authorName} url={data.user?.profile?.avatarUrl} size="sm" />
                <View className="min-w-0 flex-1">
                  <Text className="text-sm font-semibold text-text" numberOfLines={1}>
                    {authorName}
                  </Text>
                  <Text className="text-xs text-muted">
                    {formatDate(data.createdAt)}
                    {typeof data.viewCount === "number" ? ` · ${data.viewCount} görüntülenme` : ""}
                  </Text>
                </View>
              </Pressable>
              {canManageTopic ? (
                <>
                  <HeaderIconButton
                    icon={Pencil}
                    label="Konuyu düzenle"
                    onPress={() => {
                      setEditTitle(data.title);
                      setEditBody(data.body);
                      setEditErrors({});
                      setEditMode(true);
                    }}
                  />
                  <Pressable
                    onPress={handleDeleteTopic}
                    disabled={deleteMut.isPending}
                    accessibilityRole="button"
                    accessibilityLabel="Konuyu sil"
                    className="h-11 w-11 items-center justify-center rounded-full bg-danger/10 active:opacity-70"
                  >
                    {deleteMut.isPending ? (
                      <ActivityIndicator size="small" color={colors.danger} />
                    ) : (
                      <Trash2 size={18} color={colors.danger} />
                    )}
                  </Pressable>
                </>
              ) : null}
              {!isOwner && token ? (
                <HeaderIconButton icon={Flag} label="Konuyu şikayet et" onPress={openTopicReport} />
              ) : null}
            </View>

            <View>{renderForumBody(data.body, "text-[15px] text-text leading-6")}</View>
            {topicPreviewUrl ? <ForumLinkPreview url={topicPreviewUrl} /> : null}
            <ForumPoll topicId={data.id} />
          </>
        )}

        <View className="mt-4 flex-row flex-wrap items-center gap-2 border-t border-border pt-4">
          <Pressable
            onPress={() => interestMut.mutate()}
            disabled={interestMut.isPending || !token}
            accessibilityRole="button"
            accessibilityLabel={`Ben de yaşıyorum, ${interestCount} kişi`}
            accessibilityState={{ selected: !!data.userInterested, disabled: interestMut.isPending }}
            className={`min-h-11 flex-row items-center gap-1.5 rounded-full border px-3.5 active:opacity-70 ${
              data.userInterested ? "border-primary bg-primary/10" : "border-border bg-surface"
            }`}
          >
            <ThumbsUp size={15} color={data.userInterested ? colors.primary : colors.muted} />
            <Text className={`text-xs font-semibold ${data.userInterested ? "text-primary" : "text-muted"}`}>
              Ben de yaşıyorum ({interestCount})
            </Text>
          </Pressable>

          <View className="flex-row items-center gap-1.5 px-1">
            <MessageCircle size={14} color={colors.muted} />
            <Text className="text-xs text-muted">{replyCount} cevap</Text>
          </View>

          <Pressable
            onPress={handleShare}
            accessibilityRole="button"
            accessibilityLabel="Konuyu paylaş"
            className="ml-auto min-h-11 flex-row items-center gap-1.5 rounded-full bg-background px-3.5 active:opacity-70"
          >
            <Share2 size={15} color={colors.text} />
            <Text className="text-xs font-semibold text-text">Paylaş</Text>
          </Pressable>
        </View>
      </Card>

      {bestReply ? (
        <View className="mt-6">
          <View className="mb-1 flex-row items-center gap-1.5">
            <CircleCheck size={15} color={colors.success} />
            <Text className="text-xs font-bold uppercase tracking-wider text-success">En iyi cevap</Text>
          </View>
          {renderReply(bestReply)}
        </View>
      ) : null}

      {data.replies.length > 0 ? (
        <SectionLabel count={otherReplies.length > 0 ? otherReplies.length : undefined}>
          {bestReply ? "Diğer cevaplar" : "Cevaplar"}
        </SectionLabel>
      ) : null}
    </View>
  );

  return (
    <View className="flex-1 bg-background">
      <DetailHeader
        title={data.title}
        subtitle={data.category.name}
        action={<HeaderIconButton icon={Share2} label="Paylaş" onPress={handleShare} />}
      />
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <FlatList
          data={otherReplies}
          keyExtractor={(r) => r.id}
          ListHeaderComponent={header}
          contentContainerStyle={{ padding: 16, paddingBottom: 24, flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            data.replies.length === 0 ? (
              <EmptyState
                icon={MessagesSquare}
                title="Henüz cevap yok"
                subtitle={isLocked ? "Bu konu kilitli." : "İlk cevabı sen yaz, deneyimini paylaş."}
              />
            ) : bestReply ? (
              <Text className="py-2 text-center text-sm text-muted">Başka cevap yok.</Text>
            ) : null
          }
          renderItem={({ item }) => renderReply(item)}
        />

        {token ? (
          <Animated.View
            style={[
              {
                backgroundColor: colors.surface,
                borderTopWidth: 1,
                borderTopColor: colors.border,
                paddingHorizontal: 16,
                paddingTop: 12,
              },
              composerInsetStyle,
            ]}
          >
            {isLocked ? (
              <View className="min-h-11 flex-row items-center justify-center gap-2">
                <Lock size={15} color={colors.muted} />
                <Text className="text-sm text-muted">Bu konu kilitli, yeni cevap yazılamaz.</Text>
              </View>
            ) : (
              <>
                {replyToName ? (
                  <View className="mb-2 flex-row items-center gap-2 rounded-2xl border-l-2 border-primary bg-primary/5 px-3 py-2">
                    <Text className="flex-1 text-xs text-muted">
                      <Text className="font-semibold text-primary">{replyToName}</Text> kişisine yanıt veriyorsunuz
                    </Text>
                    <Pressable
                      onPress={() => {
                        setParentId(null);
                        setReplyToName(null);
                      }}
                      hitSlop={12}
                      accessibilityRole="button"
                      accessibilityLabel="Yanıtı iptal et"
                      className="h-6 w-6 items-center justify-center rounded-full bg-muted-light"
                    >
                      <X size={12} color={colors.white} strokeWidth={3} />
                    </Pressable>
                  </View>
                ) : null}
                <View className="flex-row items-end gap-2.5">
                  <TextInput
                    ref={inputRef}
                    value={replyBody}
                    onChangeText={setReplyBody}
                    placeholder="Cevabınızı yazın…"
                    placeholderTextColor={colors.mutedLight}
                    multiline
                    maxLength={5000}
                    accessibilityLabel="Cevap yaz"
                    className="max-h-[120px] min-h-11 flex-1 rounded-2xl bg-background px-4 py-3 text-[15px] text-text"
                  />
                  <Pressable
                    onPress={submitReply}
                    disabled={!canSend}
                    accessibilityRole="button"
                    accessibilityLabel="Cevabı gönder"
                    accessibilityState={{ disabled: !canSend, busy: replyMut.isPending }}
                    className={`h-11 w-11 items-center justify-center rounded-full bg-primary active:opacity-80 ${
                      canSend ? "opacity-100" : "opacity-40"
                    }`}
                  >
                    {replyMut.isPending ? (
                      <ActivityIndicator color={colors.white} size="small" />
                    ) : (
                      <ArrowUp size={20} color={colors.white} strokeWidth={2.6} />
                    )}
                  </Pressable>
                </View>
              </>
            )}
          </Animated.View>
        ) : null}
      </KeyboardAvoidingView>
    </View>
  );
}
