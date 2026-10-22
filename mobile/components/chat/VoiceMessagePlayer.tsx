import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { Pause, Play } from "lucide-react-native";
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus, type AudioPlayer } from "expo-audio";
import { colors } from "@/lib/colors";

const BAR_COUNT = 28;
const RATES = [1, 1.5, 2] as const;

/** Aynı anda tek sesli mesaj çalsın: yenisi başlarken önceki duraklatılır. */
let activePlayer: AudioPlayer | null = null;

function claimPlayback(player: AudioPlayer) {
  if (activePlayer && activePlayer !== player) {
    try {
      activePlayer.pause();
    } catch {
      // önceki oynatıcı kaldırılmış olabilir
    }
  }
  activePlayer = player;
}

function formatTime(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

/** URL'den türetilen sabit, dalga formu görünümlü çubuk yükseklikleri. */
function barHeights(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return Array.from({ length: BAR_COUNT }, (_, i) => {
    h = (h * 1103515245 + 12345 + i) | 0;
    return 5 + (Math.abs(h) % 17);
  });
}

export function VoiceMessagePlayer({ url, isMe, fallbackDurationSec }: { url: string; isMe: boolean; fallbackDurationSec?: number }) {
  const player = useAudioPlayer(url);
  const status = useAudioPlayerStatus(player);
  const [rateIndex, setRateIndex] = useState(0);
  const [trackWidth, setTrackWidth] = useState(0);
  const bars = useMemo(() => barHeights(url), [url]);
  const playerRef = useRef(player);
  playerRef.current = player;

  useEffect(() => {
    if (status.didJustFinish) {
      player.pause();
      void player.seekTo(0);
    }
  }, [status.didJustFinish, player]);

  useEffect(
    () => () => {
      if (activePlayer === playerRef.current) activePlayer = null;
    },
    [],
  );

  const duration = status.duration > 0 ? status.duration : fallbackDurationSec ?? 0;
  const progress = duration > 0 ? Math.min(1, status.currentTime / duration) : 0;
  const started = status.playing || status.currentTime > 0.05;
  const loading = !status.isLoaded || (status.playing && status.isBuffering);
  const Icon = status.playing ? Pause : Play;
  const rate = RATES[rateIndex];

  async function togglePlay() {
    if (status.playing) {
      player.pause();
      return;
    }
    claimPlayback(player);
    await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false }).catch(() => {});
    if (duration > 0 && status.currentTime >= duration - 0.1) await player.seekTo(0);
    player.setPlaybackRate(rate);
    player.play();
  }

  function cycleRate() {
    const next = (rateIndex + 1) % RATES.length;
    setRateIndex(next);
    player.setPlaybackRate(RATES[next]);
  }

  function seekFromPress(x: number) {
    if (!trackWidth || duration <= 0) return;
    const ratio = Math.min(1, Math.max(0, x / trackWidth));
    void player.seekTo(ratio * duration);
  }

  const playedColor = isMe ? colors.white : colors.primary;
  const restColor = isMe ? "rgba(255,255,255,0.4)" : colors.border;

  return (
    <View className="min-w-[200px] flex-row items-center gap-2.5 py-1">
      <Pressable
        onPress={() => void togglePlay()}
        accessibilityRole="button"
        accessibilityLabel={status.playing ? "Sesli mesajı duraklat" : "Sesli mesajı oynat"}
        hitSlop={6}
        className={`h-9 w-9 items-center justify-center rounded-full active:opacity-80 ${isMe ? "bg-white" : "bg-primary"}`}
      >
        {loading && status.playing ? (
          <ActivityIndicator size="small" color={isMe ? colors.primary : colors.white} />
        ) : (
          <Icon
            size={15}
            color={isMe ? colors.primary : colors.white}
            fill={isMe ? colors.primary : colors.white}
            style={status.playing ? undefined : { marginLeft: 2 }}
          />
        )}
      </Pressable>
      <View className="flex-1 gap-1">
        <Pressable
          onPress={(e) => seekFromPress(e.nativeEvent.locationX)}
          onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
          accessibilityRole="adjustable"
          accessibilityLabel="Sesli mesaj ilerlemesi"
          accessibilityValue={{ min: 0, max: Math.round(duration), now: Math.round(status.currentTime) }}
          accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
          onAccessibilityAction={(e) => {
            const delta = e.nativeEvent.actionName === "increment" ? 5 : -5;
            void player.seekTo(Math.min(duration, Math.max(0, status.currentTime + delta)));
          }}
          className="h-6 flex-row items-center justify-between"
        >
          {bars.map((height, i) => (
            <View
              key={i}
              style={{
                width: 2.5,
                height,
                borderRadius: 2,
                backgroundColor: (i + 0.5) / BAR_COUNT <= progress ? playedColor : restColor,
              }}
            />
          ))}
        </Pressable>
        <View className="flex-row items-center justify-between">
          <Text
            className={`text-[11px] font-medium ${isMe ? "text-white/80" : "text-muted"}`}
            style={{ fontVariant: ["tabular-nums"] }}
          >
            {formatTime(started ? status.currentTime : duration)}
          </Text>
          {started ? (
            <Pressable
              onPress={cycleRate}
              accessibilityRole="button"
              accessibilityLabel={`Oynatma hızı ${rate} kat, değiştirmek için dokunun`}
              hitSlop={6}
              className={`rounded-full px-1.5 py-px ${isMe ? "bg-white/20" : "bg-primary/10"}`}
            >
              <Text className={`text-[10px] font-bold ${isMe ? "text-white" : "text-primary"}`}>{rate}×</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}
