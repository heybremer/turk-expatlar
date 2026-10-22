import { Alert, Pressable, Text, View } from "react-native";
import { ChartBar, CircleCheck } from "lucide-react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError, ForumPoll as ForumPollType } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { colors } from "@/lib/colors";
import { formatDate } from "@/lib/utils";

/** Konu anketi. `GET /forum/topics/:id/poll` ayrı uçtan yüklenir; anket yoksa hiçbir şey çizmez. */
export function ForumPoll({ topicId }: { topicId: string }) {
  const { token } = useAuth();
  const qc = useQueryClient();
  const queryKey = ["forum-poll", topicId];

  const { data: poll } = useQuery({
    queryKey,
    queryFn: () => api.get<ForumPollType | null>(`/forum/topics/${topicId}/poll`, token),
    enabled: !!topicId,
  });

  const voteMut = useMutation({
    mutationFn: (optionId: string) => api.post<ForumPollType>(`/forum/polls/${optionId}/vote`, {}, token),
    onSuccess: (updated) => qc.setQueryData(queryKey, updated),
    onError: (e) => Alert.alert("Oy verilemedi", e instanceof ApiError ? e.message : "Lütfen tekrar deneyin."),
  });

  if (!poll || !poll.options?.length) return null;

  const isEnded = poll.endsAt ? new Date(poll.endsAt) < new Date() : false;
  const hasVoted = !!poll.userVotedOptionId;
  const showResults = hasVoted || isEnded;
  const canVote = !!token && !isEnded && !voteMut.isPending;

  function vote(optionId: string) {
    if (!canVote || optionId === poll?.userVotedOptionId) return;
    voteMut.mutate(optionId);
  }

  return (
    <View className="mt-4 rounded-2xl border border-border bg-background p-4">
      <View className="flex-row items-center gap-2.5">
        <View className="h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
          <ChartBar size={16} color={colors.primary} />
        </View>
        <Text className="flex-1 text-[15px] font-bold text-text">{poll.question}</Text>
      </View>

      <View className="mt-3 gap-2">
        {poll.options.map((option) => (
          <Pressable
            key={option.id}
            onPress={() => vote(option.id)}
            disabled={!canVote}
            accessibilityRole="button"
            accessibilityLabel={`${option.text}${showResults ? `, yüzde ${option.percent}` : ""}`}
            accessibilityState={{ selected: !!option.userVoted, disabled: !canVote }}
            className={`relative min-h-11 justify-center overflow-hidden rounded-2xl border bg-surface active:opacity-70 ${
              option.userVoted ? "border-primary" : "border-border"
            }`}
          >
            {showResults ? (
              <View
                className={`absolute inset-y-0 left-0 ${option.userVoted ? "bg-primary/15" : "bg-border/50"}`}
                style={{ width: `${option.percent}%` }}
              />
            ) : null}
            <View className="relative flex-row items-center justify-between px-3.5 py-2.5">
              <View className="min-w-0 flex-1 flex-row items-center gap-2">
                {option.userVoted ? <CircleCheck size={15} color={colors.primary} /> : null}
                <Text className="flex-shrink text-sm text-text" numberOfLines={2}>
                  {option.text}
                </Text>
              </View>
              {showResults ? <Text className="text-xs font-bold text-muted">{option.percent}%</Text> : null}
            </View>
          </Pressable>
        ))}
      </View>

      <View className="mt-3 flex-row flex-wrap items-center gap-x-3 gap-y-1">
        <Text className="text-xs text-muted">{poll.totalVotes} oy</Text>
        {poll.endsAt ? (
          <Text className="text-xs text-muted">
            {isEnded ? "Sona erdi" : `${formatDate(poll.endsAt)} tarihine kadar`}
          </Text>
        ) : null}
        {hasVoted && !isEnded ? <Text className="text-xs text-muted">Oyunuzu değiştirmek için başka seçeneğe dokunun</Text> : null}
      </View>
    </View>
  );
}
