import { useEffect, useRef, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";

type Props = {
  onCancel: () => void;
  onSend: (uri: string, durationSec: number) => void;
};

function formatDuration(ms: number) {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function VoiceRecorderBar({ onCancel, onSend }: Props) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 200);
  const [ready, setReady] = useState(false);
  const startedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const perm = await AudioModule.requestRecordingPermissionsAsync();
      if (!perm.granted) {
        onCancel();
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      if (cancelled) return;
      await recorder.prepareToRecordAsync();
      if (cancelled) return;
      recorder.record();
      startedRef.current = true;
      setReady(true);
    })();
    return () => {
      cancelled = true;
      if (startedRef.current && recorder.isRecording) {
        void recorder.stop();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCancel() {
    if (recorder.isRecording) await recorder.stop().catch(() => {});
    onCancel();
  }

  async function handleSend() {
    if (!ready) return;
    const durationSec = recorderState.durationMillis / 1000;
    await recorder.stop().catch(() => {});
    const uri = recorder.uri;
    if (!uri || durationSec < 1) {
      onCancel();
      return;
    }
    onSend(uri, durationSec);
  }

  return (
    <View className="flex-row items-center gap-2.5 px-3 py-2 border-t border-border bg-surface">
      <TouchableOpacity onPress={handleCancel} className="w-9 h-9 items-center justify-center">
        <Ionicons name="trash-outline" size={20} color="#dc2626" />
      </TouchableOpacity>

      <View className="flex-1 flex-row items-center gap-2 bg-background rounded-full px-3.5 py-2.5">
        <View className="w-2.5 h-2.5 rounded-full bg-danger" />
        <Text className="text-sm text-text font-medium">
          {ready ? formatDuration(recorderState.durationMillis) : "Hazırlanıyor…"}
        </Text>
        <Text className="text-xs text-muted flex-1 text-right">Ses kaydediliyor…</Text>
      </View>

      <TouchableOpacity
        onPress={handleSend}
        disabled={!ready}
        className={`bg-primary w-10 h-10 rounded-full items-center justify-center ${!ready ? "opacity-50" : ""}`}
      >
        <Ionicons name="arrow-up" size={18} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}
