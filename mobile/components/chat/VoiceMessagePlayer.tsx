import { useEffect } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";

function formatTime(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

export function VoiceMessagePlayer({ url, isMe, fallbackDurationSec }: { url: string; isMe: boolean; fallbackDurationSec?: number }) {
  const player = useAudioPlayer(url);
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    if (status.didJustFinish) {
      player.pause();
      void player.seekTo(0);
    }
  }, [status.didJustFinish, player]);

  const duration = status.duration > 0 ? status.duration : fallbackDurationSec ?? 0;
  const progress = duration > 0 ? Math.min(1, status.currentTime / duration) : 0;

  return (
    <TouchableOpacity
      onPress={() => (status.playing ? player.pause() : player.play())}
      className="flex-row items-center gap-2 min-w-[160px] py-1"
    >
      <View className={`w-8 h-8 rounded-full items-center justify-center ${isMe ? "bg-white/20" : "bg-primary/10"}`}>
        <Ionicons name={status.playing ? "pause" : "play"} size={15} color={isMe ? "#fff" : "#1a56db"} />
      </View>
      <View className="flex-1 gap-1">
        <View className={`h-1 rounded-full ${isMe ? "bg-white/25" : "bg-border"}`}>
          <View
            className={`h-1 rounded-full ${isMe ? "bg-white" : "bg-primary"}`}
            style={{ width: `${progress * 100}%` }}
          />
        </View>
        <Text className={`text-[10px] ${isMe ? "text-white/80" : "text-muted"}`}>
          {formatTime(status.playing || status.currentTime > 0 ? status.currentTime : duration)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
