import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Animated, Easing, Pressable, Text, View } from "react-native";
import {
  AudioModule,
  AudioQuality,
  IOSOutputFormat,
  setAudioModeAsync,
  useAudioRecorder,
  type RecordingOptions,
} from "expo-audio";
import { File } from "expo-file-system";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import {
  ChevronRight,
  Flag,
  Hand,
  Mic,
  Radio,
  Users,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
} from "lucide-react-native";
import type { Socket } from "socket.io-client";

import { Screen } from "@/components/ui/Screen";
import { SectionLabel, TipBox, ToolHero } from "@/components/ui/kit";
import { useAuth } from "@/lib/auth";
import { colors } from "@/lib/colors";
import { TELSIZ_CHANNELS, type TelsizChannel } from "@/lib/data/telsiz-channels";
import { disconnectTelsizSocket, getTelsizSocket } from "@/lib/socket";
import { TelsizPlaybackQueue } from "@/lib/telsiz-audio";

type Member = { userId: string; displayName: string; avatarUrl?: string | null };
type Speaker = { userId: string; displayName: string };

const MAX_TALK_MS = 29_000;
const PCM_FLUSH_MS = 900;
const DEFAULT_PCM_RATE = 16_000;

const TELSIZ_RECORDING: RecordingOptions = {
  extension: ".m4a",
  sampleRate: 22050,
  numberOfChannels: 1,
  bitRate: 48000,
  android: { outputFormat: "mpeg4", audioEncoder: "aac" },
  ios: { outputFormat: IOSOutputFormat.MPEG4AAC, audioQuality: AudioQuality.MEDIUM },
  web: { mimeType: "audio/webm", bitsPerSecond: 48000 },
};

export default function TelsizScreen() {
  const token = useAuth((s) => s.token);
  const myId = useAuth((s) => s.user?.id);
  const router = useRouter();
  const recorder = useAudioRecorder(TELSIZ_RECORDING);

  const [channel, setChannel] = useState<TelsizChannel | null>(null);
  const [connected, setConnected] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [speaker, setSpeaker] = useState<Speaker | null>(null);
  const [transmitting, setTransmitting] = useState(false);
  const [receiving, setReceiving] = useState(false);
  const [muted, setMuted] = useState(false);
  const [notice, setNotice] = useState("");
  const [handRaises, setHandRaises] = useState<Set<string>>(new Set());

  const socketRef = useRef<Socket | null>(null);
  const channelIdRef = useRef<string | null>(null);
  const queueRef = useRef<TelsizPlaybackQueue | null>(null);
  const pcmBufferRef = useRef<{ chunks: string[]; rate: number }>({ chunks: [], rate: DEFAULT_PCM_RATE });
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const talkingRef = useRef(false);
  const pressedRef = useRef(false);
  const grantedRef = useRef(false);
  const talkStartRef = useRef(0);
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pulse = useRef(new Animated.Value(0)).current;

  const showNotice = useCallback((text: string, ms = 2500) => {
    setNotice(text);
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = setTimeout(() => setNotice(""), ms);
  }, []);

  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  useEffect(() => {
    const queue = new TelsizPlaybackQueue();
    queue.onActiveChange = setReceiving;
    queue.setMuted(mutedRef.current);
    queueRef.current = queue;
    return () => {
      queue.dispose();
      if (queueRef.current === queue) queueRef.current = null;
      setReceiving(false);
    };
  }, []);

  useEffect(() => {
    queueRef.current?.setMuted(muted);
  }, [muted]);

  useEffect(() => {
    if (!transmitting) {
      pulse.stopAnimation();
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: 1200,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [transmitting, pulse]);

  const flushPcm = useCallback(() => {
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }
    const { chunks, rate } = pcmBufferRef.current;
    if (chunks.length === 0) return;
    pcmBufferRef.current = { chunks: [], rate };
    queueRef.current?.enqueuePcm(chunks, rate);
  }, []);

  const resetCapture = useCallback(() => {
    talkingRef.current = false;
    grantedRef.current = false;
    if (autoStopRef.current) {
      clearTimeout(autoStopRef.current);
      autoStopRef.current = null;
    }
    setTransmitting(false);
  }, []);

  const stopRecorderSafely = useCallback(async () => {
    try {
      if (recorder.isRecording) await recorder.stop();
    } catch {
      // kayıt zaten durmuş
    }
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => undefined);
  }, [recorder]);

  const stopTalking = useCallback(async () => {
    if (!talkingRef.current) return;
    const channelId = channelIdRef.current;
    const granted = grantedRef.current;
    const durationMs = Date.now() - talkStartRef.current;
    resetCapture();
    await stopRecorderSafely();

    const sock = socketRef.current;
    if (!sock || !channelId) return;
    if (granted && recorder.uri && durationMs > 300) {
      try {
        const audio = await new File(recorder.uri).base64();
        sock.emit("ptt_audio", { channelId, audio, mime: "audio/mp4", durationMs });
      } catch {
        showNotice("Ses gönderilemedi, tekrar deneyin.");
      }
    }
    sock.emit("ptt_end", { channelId });
  }, [recorder, resetCapture, showNotice, stopRecorderSafely]);

  const startTalking = useCallback(async () => {
    const channelId = channelIdRef.current;
    const sock = socketRef.current;
    if (!channelId || !sock || talkingRef.current) return;
    if (speaker) {
      showNotice(`${speaker.displayName} konuşuyor, biraz bekleyin`);
      return;
    }

    const perm = await AudioModule.requestRecordingPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Mikrofon izni gerekli", "Telsizde konuşmak için ayarlardan mikrofon izni verin.");
      return;
    }
    if (!pressedRef.current) return;

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    talkingRef.current = true;
    grantedRef.current = false;
    talkStartRef.current = Date.now();
    setTransmitting(true);
    sock.emit("ptt_start", { channelId });

    try {
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      if (!talkingRef.current) {
        await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
        return;
      }
      recorder.record();
    } catch {
      resetCapture();
      sock.emit("ptt_end", { channelId });
      showNotice("Kayıt başlatılamadı.");
      return;
    }
    autoStopRef.current = setTimeout(() => void stopTalking(), MAX_TALK_MS);
  }, [recorder, resetCapture, showNotice, speaker, stopTalking]);

  useEffect(() => {
    if (!token) return;
    const sock = getTelsizSocket(token);
    socketRef.current = sock;

    const isMe = (userId: string) => userId === myId;
    const onConnect = () => {
      setConnected(true);
      if (channelIdRef.current) sock.emit("join_channel", { channelId: channelIdRef.current });
    };
    const onDisconnect = () => {
      setConnected(false);
      setSpeaker(null);
      if (talkingRef.current) void stopTalking();
    };
    const onPresence = (d: { channelId: string; users: Member[] }) => {
      if (d.channelId === channelIdRef.current) setMembers(d.users);
    };
    const onSpeakerStart = (d: Speaker & { channelId: string }) => {
      if (d.channelId !== channelIdRef.current || isMe(d.userId)) return;
      setSpeaker({ userId: d.userId, displayName: d.displayName });
    };
    const onSpeakerEnd = (d: { channelId: string }) => {
      if (d.channelId !== channelIdRef.current) return;
      setSpeaker(null);
      flushPcm();
    };
    const onVoiceChunk = (d: { channelId: string; userId: string; pcm: string; rate?: number }) => {
      if (d.channelId !== channelIdRef.current || isMe(d.userId)) return;
      const rate = d.rate ?? DEFAULT_PCM_RATE;
      if (pcmBufferRef.current.rate !== rate) flushPcm();
      pcmBufferRef.current.rate = rate;
      pcmBufferRef.current.chunks.push(d.pcm);
      if (!flushTimerRef.current) flushTimerRef.current = setTimeout(flushPcm, PCM_FLUSH_MS);
    };
    const onVoiceClip = (d: { channelId: string; userId: string; audio: string; mime: string }) => {
      if (d.channelId !== channelIdRef.current || isMe(d.userId)) return;
      queueRef.current?.enqueueClip(d.audio, d.mime);
    };
    const onGranted = () => {
      grantedRef.current = true;
    };
    const onDenied = (d: { displayName: string; muted?: boolean }) => {
      if (talkingRef.current) {
        resetCapture();
        void stopRecorderSafely();
      }
      showNotice(d.muted ? d.displayName : `${d.displayName} konuşuyor — el kaldırdınız`);
    };
    const onHandRaises = (d: { channelId: string; userIds: string[] }) => {
      if (d.channelId === channelIdRef.current) setHandRaises(new Set(d.userIds));
    };
    const onReportResult = (d: { message: string }) => showNotice(d.message, 3500);
    const onTelsizError = (d: { message?: string }) => showNotice(d?.message || "Telsiz hatası", 3500);

    sock.on("connect", onConnect);
    sock.on("disconnect", onDisconnect);
    sock.on("presence", onPresence);
    sock.on("speaker_start", onSpeakerStart);
    sock.on("speaker_end", onSpeakerEnd);
    sock.on("voice_chunk", onVoiceChunk);
    sock.on("voice", onVoiceClip);
    sock.on("ptt_granted", onGranted);
    sock.on("ptt_denied", onDenied);
    sock.on("hand_raises", onHandRaises);
    sock.on("report_result", onReportResult);
    sock.on("telsiz_error", onTelsizError);
    if (sock.connected) onConnect();

    return () => {
      sock.off("connect", onConnect);
      sock.off("disconnect", onDisconnect);
      sock.off("presence", onPresence);
      sock.off("speaker_start", onSpeakerStart);
      sock.off("speaker_end", onSpeakerEnd);
      sock.off("voice_chunk", onVoiceChunk);
      sock.off("voice", onVoiceClip);
      sock.off("ptt_granted", onGranted);
      sock.off("ptt_denied", onDenied);
      sock.off("hand_raises", onHandRaises);
      sock.off("report_result", onReportResult);
      sock.off("telsiz_error", onTelsizError);
    };
  }, [token, myId, flushPcm, resetCapture, showNotice, stopRecorderSafely, stopTalking]);

  const stopRecorderRef = useRef(stopRecorderSafely);
  stopRecorderRef.current = stopRecorderSafely;

  useEffect(
    () => () => {
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
      if (autoStopRef.current) clearTimeout(autoStopRef.current);
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
      if (talkingRef.current) {
        talkingRef.current = false;
        void stopRecorderRef.current().catch(() => undefined);
      }
      disconnectTelsizSocket();
    },
    [],
  );

  const selectChannel = (ch: TelsizChannel) => {
    if (!token) {
      router.push("/(auth)/giris");
      return;
    }
    channelIdRef.current = ch.id;
    setChannel(ch);
    setMembers([]);
    setSpeaker(null);
    setHandRaises(new Set());
    socketRef.current?.emit("join_channel", { channelId: ch.id });
  };

  const leaveChannel = () => {
    void stopTalking();
    const id = channelIdRef.current;
    if (id) socketRef.current?.emit("leave_channel", { channelId: id });
    channelIdRef.current = null;
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }
    queueRef.current?.clear();
    pcmBufferRef.current.chunks = [];
    setChannel(null);
    setMembers([]);
    setSpeaker(null);
    setHandRaises(new Set());
  };

  const report = (member: Member) => {
    Alert.alert("Şikayet et", `${member.displayName} uygunsuz dil kullandı mı?`, [
      { text: "Vazgeç", style: "cancel" },
      {
        text: "Şikayet et",
        style: "destructive",
        onPress: () =>
          socketRef.current?.emit("telsiz_report", {
            channelId: channelIdRef.current,
            reportedUserId: member.userId,
          }),
      },
    ]);
  };

  const someoneElseTalking = !!speaker && !transmitting;
  const statusText = transmitting
    ? "Yayındasınız — konuşun"
    : someoneElseTalking
      ? `${speaker?.displayName} konuşuyor`
      : receiving
        ? "Gelen ses çalınıyor"
        : "Konuşmak için basılı tutun";

  if (!channel) {
    return (
      <Screen title="Yolculuk Telsizi" subtitle="Bas-konuş sesli iletişim">
        <ToolHero
          icon={Radio}
          tint="#EA580C"
          title="Yolculuk Telsiz"
          subtitle="Yoldaki gezginlerle bas-konuş sesli iletişim. Bir kanal seç ve katıl."
        />
        <SectionLabel>Kanallar</SectionLabel>
        {TELSIZ_CHANNELS.map((ch) => (
          <Pressable
            key={ch.id}
            onPress={() => selectChannel(ch)}
            accessibilityRole="button"
            className="mb-3 min-h-20 flex-row items-center gap-4 rounded-2xl border border-border bg-surface p-4 active:bg-background"
          >
            <View className="h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
              <Radio size={22} color={colors.primary} />
            </View>
            <View className="flex-1">
              <Text className="text-base font-bold text-text">{ch.name}</Text>
              <Text className="mt-0.5 text-sm text-muted" numberOfLines={1}>
                {ch.description}
              </Text>
            </View>
            <ChevronRight size={18} color={colors.mutedLight} />
          </Pressable>
        ))}
        <View className="mt-2">
          <TipBox title="Nasıl çalışır?">
            Konuşmak için butonu basılı tutun, bitince bırakın; sesiniz kanaldaki üyelere iletilir. Aynı anda
            yalnızca bir kişi konuşabilir. Sesler kaydedilmez.
          </TipBox>
        </View>
      </Screen>
    );
  }

  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.35] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] });
  const buttonColor = transmitting ? colors.danger : someoneElseTalking ? colors.mutedLight : colors.primary;

  return (
    <Screen
      title={channel.name}
      subtitle={channel.description}
      action={
        <Pressable
          onPress={() => setMuted((m) => !m)}
          accessibilityRole="button"
          accessibilityLabel={muted ? "Sesi aç" : "Sesi kapat"}
          className={`h-11 w-11 items-center justify-center rounded-xl ${muted ? "bg-danger/10" : "bg-background"}`}
        >
          {muted ? <VolumeX size={18} color={colors.danger} /> : <Volume2 size={18} color={colors.muted} />}
        </Pressable>
      }
    >
      <View className="items-center rounded-3xl border border-border bg-surface px-5 pb-6 pt-4">
        <View className="w-full flex-row items-center justify-between">
          <Pressable
            onPress={leaveChannel}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Kanaldan çık ve kanal değiştir"
            className="min-h-11 justify-center"
          >
            <Text className="text-sm font-semibold text-primary">← Kanal değiştir</Text>
          </Pressable>
          <View
            className={`flex-row items-center gap-1 rounded-full px-2.5 py-1 ${connected ? "bg-success/10" : "bg-danger/10"}`}
          >
            {connected ? <Wifi size={13} color={colors.success} /> : <WifiOff size={13} color={colors.danger} />}
            <Text className={`text-xs font-bold ${connected ? "text-success" : "text-danger"}`}>
              {connected ? "Bağlı" : "Bağlanıyor…"}
            </Text>
          </View>
        </View>

        <View
          className={`mt-4 min-h-8 flex-row items-center gap-2 rounded-full px-3 py-1.5 ${
            transmitting ? "bg-danger/10" : someoneElseTalking || receiving ? "bg-primary/10" : ""
          }`}
        >
          {transmitting ? <View className="h-2 w-2 rounded-full bg-danger" /> : null}
          {(someoneElseTalking || receiving) && !transmitting ? <Volume2 size={15} color={colors.primary} /> : null}
          <Text
            className={`text-sm font-semibold ${
              transmitting ? "text-danger" : someoneElseTalking || receiving ? "text-primary" : "text-muted"
            }`}
          >
            {statusText}
          </Text>
        </View>

        <View className="my-8 h-48 w-48 items-center justify-center">
          <Animated.View
            pointerEvents="none"
            style={{
              position: "absolute",
              width: 192,
              height: 192,
              borderRadius: 96,
              backgroundColor: colors.danger,
              opacity: ringOpacity,
              transform: [{ scale: ringScale }],
            }}
          />
          <Pressable
            onPressIn={() => {
              pressedRef.current = true;
              void startTalking();
            }}
            onPressOut={() => {
              pressedRef.current = false;
              void stopTalking();
            }}
            disabled={someoneElseTalking || !connected}
            accessibilityRole="button"
            accessibilityLabel="Bas konuş"
            accessibilityHint="Konuşmak için basılı tutun"
            style={{
              width: 176,
              height: 176,
              borderRadius: 88,
              backgroundColor: buttonColor,
              alignItems: "center",
              justifyContent: "center",
              transform: [{ scale: transmitting ? 0.96 : 1 }],
              shadowColor: buttonColor,
              shadowOpacity: 0.35,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 8 },
              elevation: 8,
            }}
          >
            <Mic size={56} color={colors.white} />
            <Text className="mt-1 text-sm font-extrabold tracking-wider text-white">
              {transmitting ? "KONUŞ" : "BAS KONUŞ"}
            </Text>
          </Pressable>
        </View>

        {notice ? (
          <Text className="rounded-xl bg-warning/10 px-3 py-2 text-center text-xs font-semibold text-warning">
            {notice}
          </Text>
        ) : (
          <Text className="text-center text-xs text-muted">En fazla 30 saniye konuşabilirsiniz.</Text>
        )}
      </View>

      <View className="mt-4 rounded-3xl border border-border bg-surface p-4">
        <View className="mb-2 flex-row items-center gap-2">
          <Users size={16} color={colors.primary} />
          <Text className="text-sm font-bold text-text">Kanaldakiler ({members.length})</Text>
        </View>
        {members.length === 0 ? (
          <Text className="py-4 text-center text-sm text-muted">Şu an kanalda kimse yok. İlk siz konuşun!</Text>
        ) : (
          members.map((m) => {
            const talking = speaker?.userId === m.userId || (transmitting && m.userId === myId);
            const mine = m.userId === myId;
            return (
              <View
                key={m.userId}
                className={`min-h-11 flex-row items-center gap-3 rounded-xl px-2 ${talking ? "bg-primary/10" : ""}`}
              >
                <View className={`h-2.5 w-2.5 rounded-full ${talking ? "bg-danger" : "bg-success"}`} />
                <Text className="flex-1 text-sm text-text" numberOfLines={1}>
                  {m.displayName}
                  {mine ? <Text className="text-xs text-muted"> (siz)</Text> : null}
                </Text>
                {handRaises.has(m.userId) ? <Hand size={15} color={colors.warning} /> : null}
                {talking ? <Mic size={15} color={colors.danger} /> : null}
                {!mine ? (
                  <Pressable
                    onPress={() => report(m)}
                    accessibilityRole="button"
                    accessibilityLabel={`${m.displayName} şikayet et`}
                    className="h-11 w-11 items-center justify-center"
                  >
                    <Flag size={15} color={colors.mutedLight} />
                  </Pressable>
                ) : null}
              </View>
            );
          })
        )}
      </View>
    </Screen>
  );
}
