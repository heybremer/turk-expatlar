import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Animated, Linking, Pressable, Text, View } from "react-native";
import { Send, Trash2 } from "lucide-react-native";
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import { colors } from "@/lib/colors";
import { haptics } from "@/lib/haptics";

type Props = {
  onCancel: () => void;
  onSend: (uri: string, durationSec: number) => void;
};

/** Sunucu yükleme sınırı 10 MB; yüksek kalitede ~5 dk güvenli üst sınır. */
const MAX_DURATION_MS = 5 * 60 * 1000;
const MIN_DURATION_MS = 1000;
const LEVEL_COUNT = 24;

function formatDuration(ms: number) {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Metering değeri dB cinsinden (-160…0); 0…1 aralığına indirgenir. */
function normalizeLevel(db: number | undefined) {
  if (db === undefined || !Number.isFinite(db)) return 0.15;
  return Math.min(1, Math.max(0.08, (db + 50) / 50));
}

function restoreAudioMode() {
  void setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
}

export function VoiceRecorderBar({ onCancel, onSend }: Props) {
  const recorder = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true });
  const recorderState = useAudioRecorderState(recorder, 150);
  const [ready, setReady] = useState(false);
  const [sending, setSending] = useState(false);
  const [levels, setLevels] = useState<number[]>(() => Array(LEVEL_COUNT).fill(0.15));
  const startedRef = useRef(false);
  const finishedRef = useRef(false);
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.3, duration: 600, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const perm = await AudioModule.requestRecordingPermissionsAsync();
        if (cancelled) return;
        if (!perm.granted) {
          haptics.warning();
          Alert.alert(
            "Mikrofon izni gerekli",
            "Sesli mesaj göndermek için mikrofon erişimine izin vermelisiniz.",
            perm.canAskAgain
              ? [{ text: "Tamam" }]
              : [
                  { text: "Vazgeç", style: "cancel" },
                  { text: "Ayarları aç", onPress: () => void Linking.openSettings() },
                ],
          );
          onCancel();
          return;
        }
        await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
        if (cancelled) return;
        await recorder.prepareToRecordAsync();
        if (cancelled) return;
        recorder.record();
        startedRef.current = true;
        haptics.tap();
        setReady(true);
      } catch {
        if (cancelled) return;
        haptics.error();
        Alert.alert("Kayıt başlatılamadı", "Mikrofon şu anda kullanılamıyor, lütfen tekrar deneyin.");
        restoreAudioMode();
        onCancel();
      }
    })();
    return () => {
      cancelled = true;
      if (startedRef.current && !finishedRef.current) {
        void recorder.stop().catch(() => {});
      }
      restoreAudioMode();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ready || !recorderState.isRecording) return;
    const level = normalizeLevel(recorderState.metering);
    setLevels((prev) => [...prev.slice(1), level]);
  }, [recorderState.durationMillis, recorderState.metering, recorderState.isRecording, ready]);

  useEffect(() => {
    if (ready && recorderState.durationMillis >= MAX_DURATION_MS) void handleSend();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recorderState.durationMillis, ready]);

  async function handleCancel() {
    if (finishedRef.current) return;
    finishedRef.current = true;
    haptics.tap();
    if (startedRef.current) await recorder.stop().catch(() => {});
    restoreAudioMode();
    onCancel();
  }

  async function handleSend() {
    if (!ready || finishedRef.current) return;
    finishedRef.current = true;
    setSending(true);
    const durationMs = recorderState.durationMillis;
    await recorder.stop().catch(() => {});
    restoreAudioMode();
    const uri = recorder.uri;
    if (!uri || durationMs < MIN_DURATION_MS) {
      haptics.warning();
      Alert.alert("Kayıt çok kısa", "Göndermek için en az 1 saniye kaydedin.");
      onCancel();
      return;
    }
    onSend(uri, durationMs / 1000);
  }

  return (
    <View className="flex-row items-center gap-2">
      <Pressable
        onPress={() => void handleCancel()}
        disabled={sending}
        accessibilityRole="button"
        accessibilityLabel="Kaydı iptal et"
        className="h-11 w-11 items-center justify-center rounded-full bg-danger/10 active:opacity-70"
      >
        <Trash2 size={19} color={colors.danger} />
      </Pressable>

      <View className="min-h-11 flex-1 flex-row items-center gap-2.5 rounded-3xl bg-background px-4">
        <Animated.View
          style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.danger, opacity: ready ? pulse : 0.4 }}
        />
        <Text
          className="text-[15px] font-semibold text-text"
          style={{ fontVariant: ["tabular-nums"] }}
          accessibilityLiveRegion="polite"
        >
          {ready ? formatDuration(recorderState.durationMillis) : "Hazırlanıyor…"}
        </Text>
        <View className="h-6 flex-1 flex-row items-center justify-end gap-[2px]" accessible={false}>
          {levels.map((lvl, i) => (
            <View
              key={i}
              style={{
                width: 2.5,
                height: Math.max(3, lvl * 22),
                borderRadius: 2,
                backgroundColor: ready ? colors.primary : colors.border,
                opacity: 0.35 + (i / LEVEL_COUNT) * 0.65,
              }}
            />
          ))}
        </View>
      </View>

      <Pressable
        onPress={() => void handleSend()}
        disabled={!ready || sending}
        accessibilityRole="button"
        accessibilityLabel="Sesli mesajı gönder"
        accessibilityState={{ disabled: !ready || sending }}
        style={{ opacity: ready ? 1 : 0.5 }}
        className="h-11 w-11 items-center justify-center rounded-full bg-primary active:opacity-80"
      >
        {sending ? (
          <ActivityIndicator size="small" color={colors.white} />
        ) : (
          <Send size={18} color={colors.white} style={{ marginLeft: -2 }} />
        )}
      </Pressable>
    </View>
  );
}
