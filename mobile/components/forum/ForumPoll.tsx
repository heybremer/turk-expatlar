import { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api, ForumPoll as ForumPollType } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/utils";

export function ForumPoll({ initialPoll }: { initialPoll: ForumPollType | null }) {
  const { token } = useAuth();
  const [poll, setPoll] = useState<ForumPollType | null>(initialPoll);
  const [voting, setVoting] = useState(false);

  if (!poll) return null;

  const isEnded = poll.endsAt ? new Date(poll.endsAt) < new Date() : false;
  const hasVoted = !!poll.userVotedOptionId;
  const showResults = hasVoted || isEnded;

  async function vote(optionId: string) {
    if (!token || voting || isEnded || hasVoted) return;
    setVoting(true);
    try {
      const updated = await api.post<ForumPollType>(`/forum/polls/${optionId}/vote`, {}, token);
      setPoll(updated);
    } catch {
      // sessizce yut, kullanıcı tekrar deneyebilir
    } finally {
      setVoting(false);
    }
  }

  return (
    <View className="mt-4 rounded-xl border border-border bg-background p-3.5">
      <View className="flex-row items-center gap-2">
        <Ionicons name="bar-chart-outline" size={16} color="#1a56db" />
        <Text className="text-sm font-semibold text-text flex-1">{poll.question}</Text>
      </View>

      <View className="mt-3 gap-2">
        {poll.options.map((option) => (
          <TouchableOpacity
            key={option.id}
            onPress={() => void vote(option.id)}
            disabled={hasVoted || isEnded || voting}
            className={`relative overflow-hidden rounded-lg border ${
              option.userVoted ? "border-primary" : "border-border"
            }`}
          >
            {showResults && (
              <View
                className={`absolute inset-y-0 left-0 ${option.userVoted ? "bg-primary/15" : "bg-border/40"}`}
                style={{ width: `${option.percent}%` }}
              />
            )}
            <View className="relative flex-row items-center justify-between px-3 py-2.5">
              <View className="flex-row items-center gap-2 flex-1 min-w-0">
                {option.userVoted && <Ionicons name="checkmark-circle" size={15} color="#1a56db" />}
                <Text className="text-sm text-text flex-shrink" numberOfLines={2}>
                  {option.text}
                </Text>
              </View>
              {showResults && <Text className="text-xs font-medium text-muted">{option.percent}%</Text>}
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <View className="mt-2.5 flex-row items-center gap-3">
        <Text className="text-xs text-muted">{poll.totalVotes} oy</Text>
        {poll.endsAt && (
          <Text className="text-xs text-muted">
            {isEnded ? "Sona erdi" : `${formatDate(poll.endsAt)} tarihine kadar`}
          </Text>
        )}
      </View>
    </View>
  );
}
