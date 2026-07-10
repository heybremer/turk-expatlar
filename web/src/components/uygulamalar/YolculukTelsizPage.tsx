"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Radio,
  Mic,
  Volume2,
  VolumeX,
  Users,
  Wifi,
  WifiOff,
  ChevronRight,
} from "lucide-react";
import type { Socket } from "socket.io-client";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth";
import { getTelsizSocket, disconnectTelsizSocket } from "@/lib/socket";
import { TELSIZ_CHANNELS, type TelsizChannel } from "@/lib/telsiz-channels";

type Member = { userId: string; displayName: string; avatarUrl?: string | null };
type Speaker = { userId: string; displayName: string };

const MAX_TALK_MS = 30_000;
// İletim örnekleme hızı — 16 kHz mono Int16 ≈ 32 KB/sn (konuşma için yeterli)
const TARGET_RATE = 16_000;

// ── PCM yardımcıları ─────────────────────────────────────────────────────────

/** Kaba alçak geçiren filtre ile yeniden örnekleme (ortalama alma) */
function downsample(input: Float32Array, fromRate: number, toRate: number): Float32Array {
  if (fromRate === toRate) return new Float32Array(input);
  const ratio = fromRate / toRate;
  const outLen = Math.floor(input.length / ratio);
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const start = Math.floor(i * ratio);
    const end = Math.min(Math.floor((i + 1) * ratio), input.length);
    let sum = 0;
    for (let j = start; j < end; j++) sum += input[j];
    out[i] = sum / Math.max(1, end - start);
  }
  return out;
}

function floatToInt16(input: Float32Array): Int16Array {
  const out = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}

function int16ToBase64(int16: Int16Array): string {
  const bytes = new Uint8Array(int16.buffer, int16.byteOffset, int16.byteLength);
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

function base64ToInt16(b64: string): Int16Array | null {
  try {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Int16Array(bytes.buffer, 0, Math.floor(bytes.length / 2));
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────

export function YolculukTelsizPage() {
  const { token, user } = useAuth();

  const [channel, setChannel] = useState<TelsizChannel | null>(null);
  const [connected, setConnected] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [speaker, setSpeaker] = useState<Speaker | null>(null);
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [receiving, setReceiving] = useState(false);
  const [muted, setMuted] = useState(false);
  const [micError, setMicError] = useState("");
  const [busyNotice, setBusyNotice] = useState("");

  const socketRef = useRef<Socket | null>(null);
  const channelIdRef = useRef<string | null>(null);

  // Ses altyapısı — tek paylaşılan AudioContext (kayıt + oynatma)
  const ctxRef = useRef<AudioContext | null>(null);
  const audioUnlockedRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const silentGainRef = useRef<GainNode | null>(null);

  const talkingRef = useRef(false);
  const grantedRef = useRef(false);
  const pendingChunksRef = useRef<string[]>([]);
  const mutedRef = useRef(false);
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speakerGuardRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Canlı oynatma zamanlaması (jitter tamponu ile ardışık planlama)
  const nextPlayTimeRef = useRef(0);
  const receivingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  mutedRef.current = muted;

  const isMe = useCallback(
    (userId: string) => !!user && user.id === userId,
    [user],
  );

  const getCtx = useCallback((): AudioContext => {
    if (!ctxRef.current || ctxRef.current.state === "closed") {
      const AC =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      ctxRef.current = new AC();
    }
    return ctxRef.current;
  }, []);

  /** iOS/Android: ses çıkışının kilidi kullanıcı dokunuşu sırasında açılmalı */
  const unlockAudio = useCallback(() => {
    const ctx = getCtx();
    if (ctx.state === "suspended") void ctx.resume();
    if (!audioUnlockedRef.current) {
      const buf = ctx.createBuffer(1, 1, 8000);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.start(0);
      audioUnlockedRef.current = true;
    }
  }, [getCtx]);

  // ── Canlı oynatma: gelen PCM parçalarını ardışık planla ───────────────────
  const playChunk = useCallback(
    (pcmB64: string, rate: number) => {
      if (mutedRef.current) return;
      const int16 = base64ToInt16(pcmB64);
      if (!int16 || int16.length === 0) return;

      const ctx = getCtx();
      if (ctx.state === "suspended") void ctx.resume();

      const f32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) f32[i] = int16[i] / 0x8000;

      const buf = ctx.createBuffer(1, f32.length, rate);
      buf.getChannelData(0).set(f32);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);

      // Parçaları boşluksuz ardışık çal; geride kaldıysak küçük jitter
      // tamponuyla yeniden hizala
      const now = ctx.currentTime;
      let t = nextPlayTimeRef.current;
      if (t < now + 0.02) t = now + 0.12;
      try {
        src.start(t);
        nextPlayTimeRef.current = t + buf.duration;
      } catch {
        // start zamanı geçersizse (nadiren) hemen çal
        try {
          src.start();
          nextPlayTimeRef.current = ctx.currentTime + buf.duration;
        } catch {
          /* parçayı atla */
        }
      }

      setReceiving(true);
      if (receivingTimerRef.current) clearTimeout(receivingTimerRef.current);
      receivingTimerRef.current = setTimeout(() => setReceiving(false), 700);
    },
    [getCtx],
  );

  // ── Kayıt: mikrofon → PCM parçaları → socket ──────────────────────────────

  async function ensureStream(): Promise<MediaStream | null> {
    // Mobilde hoparlör kullanımı sonrası mikrofon track'i ölebilir — doğrula
    const existing = streamRef.current;
    if (existing) {
      const track = existing.getAudioTracks()[0];
      if (track && track.readyState === "live" && !track.muted) return existing;
      existing.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;
      setMicError("");
      return stream;
    } catch {
      setMicError(
        "Mikrofona erişilemedi. Tarayıcı izinlerinden mikrofonu etkinleştirin.",
      );
      return null;
    }
  }

  function stopCapture() {
    talkingRef.current = false;
    grantedRef.current = false;
    pendingChunksRef.current = [];
    if (autoStopRef.current) {
      clearTimeout(autoStopRef.current);
      autoStopRef.current = null;
    }
    try {
      processorRef.current?.disconnect();
      sourceRef.current?.disconnect();
      silentGainRef.current?.disconnect();
    } catch {
      /* zaten kopuk */
    }
    processorRef.current = null;
    sourceRef.current = null;
    silentGainRef.current = null;
    setIsTransmitting(false);
  }

  async function startTalking() {
    unlockAudio();
    const id = channelIdRef.current;
    const sock = socketRef.current;
    if (!id || !sock || !token) return;
    if (talkingRef.current) return;
    if (speaker) {
      setBusyNotice(`${speaker.displayName} konuşuyor, biraz bekleyin`);
      setTimeout(() => setBusyNotice(""), 2000);
      return;
    }

    const stream = await ensureStream();
    if (!stream) return;
    // İzin beklerken kullanıcı bırakmış olabilir
    if (channelIdRef.current !== id) return;

    const ctx = getCtx();
    if (ctx.state === "suspended") {
      try {
        await ctx.resume();
      } catch {
        /* kullanıcı dokunuşuyla tekrar denenir */
      }
    }

    talkingRef.current = true;
    grantedRef.current = false;
    pendingChunksRef.current = [];
    sock.emit("ptt_start", { channelId: id });

    const source = ctx.createMediaStreamSource(stream);
    // ScriptProcessor: tüm mobil/masaüstü tarayıcılarda çalışır
    const processor = ctx.createScriptProcessor(4096, 1, 1);
    // Bazı tarayıcılar düğüm çıkışa bağlı değilse callback çalıştırmaz;
    // sıfır kazançla bağlayarak yankıyı önle
    const silent = ctx.createGain();
    silent.gain.value = 0;

    processor.onaudioprocess = (e) => {
      if (!talkingRef.current) return;
      const input = e.inputBuffer.getChannelData(0);
      const down = downsample(input, ctx.sampleRate, TARGET_RATE);
      const b64 = int16ToBase64(floatToInt16(down));
      if (grantedRef.current) {
        sock.emit("ptt_chunk", { channelId: id, pcm: b64, rate: TARGET_RATE });
      } else {
        // Kilit onayı gelene kadar biriktir (ilk heceler kaybolmasın)
        pendingChunksRef.current.push(b64);
        if (pendingChunksRef.current.length > 40) pendingChunksRef.current.shift();
      }
    };

    source.connect(processor);
    processor.connect(silent);
    silent.connect(ctx.destination);

    sourceRef.current = source;
    processorRef.current = processor;
    silentGainRef.current = silent;

    setIsTransmitting(true);

    // Güvenlik: azami konuşma süresi dolunca otomatik bırak
    autoStopRef.current = setTimeout(() => stopTalking(), MAX_TALK_MS);
  }

  function stopTalking() {
    if (!talkingRef.current) return;
    const id = channelIdRef.current;
    stopCapture();
    if (id) socketRef.current?.emit("ptt_end", { channelId: id });
  }

  // ── Socket bağlantısı ve olay dinleyicileri ───────────────────────────────
  useEffect(() => {
    if (!token) return;
    const sock = getTelsizSocket(token);
    socketRef.current = sock;

    const onConnect = () => {
      setConnected(true);
      if (channelIdRef.current) {
        sock.emit("join_channel", { channelId: channelIdRef.current });
      }
    };
    const onDisconnect = () => {
      setConnected(false);
      setSpeaker(null);
      stopCapture();
    };
    const onPresence = (data: { channelId: string; users: Member[] }) => {
      if (data.channelId !== channelIdRef.current) return;
      setMembers(data.users);
    };
    const onSpeakerStart = (data: Speaker & { channelId: string }) => {
      if (data.channelId !== channelIdRef.current) return;
      if (isMe(data.userId)) return;
      setSpeaker({ userId: data.userId, displayName: data.displayName });
      // speaker_end kaybolursa buton süresiz kilitli kalmasın
      if (speakerGuardRef.current) clearTimeout(speakerGuardRef.current);
      speakerGuardRef.current = setTimeout(
        () => setSpeaker(null),
        MAX_TALK_MS + 5_000,
      );
    };
    const onSpeakerEnd = (data: { channelId: string }) => {
      if (data.channelId !== channelIdRef.current) return;
      if (speakerGuardRef.current) {
        clearTimeout(speakerGuardRef.current);
        speakerGuardRef.current = null;
      }
      setSpeaker(null);
    };
    const onVoiceChunk = (data: {
      channelId: string;
      userId: string;
      pcm: string;
      rate?: number;
    }) => {
      if (data.channelId !== channelIdRef.current) return;
      if (isMe(data.userId)) return;
      playChunk(data.pcm, data.rate ?? TARGET_RATE);
    };
    const onPttGranted = () => {
      grantedRef.current = true;
      // Onay beklerken biriken parçaları sırayla gönder
      const id = channelIdRef.current;
      if (id && pendingChunksRef.current.length > 0) {
        for (const b64 of pendingChunksRef.current) {
          sock.emit("ptt_chunk", { channelId: id, pcm: b64, rate: TARGET_RATE });
        }
        pendingChunksRef.current = [];
      }
    };
    const onPttDenied = (data: { displayName: string }) => {
      stopCapture();
      setBusyNotice(`${data.displayName} konuşuyor, biraz bekleyin`);
      setTimeout(() => setBusyNotice(""), 2000);
    };

    sock.on("connect", onConnect);
    sock.on("disconnect", onDisconnect);
    sock.on("presence", onPresence);
    sock.on("speaker_start", onSpeakerStart);
    sock.on("speaker_end", onSpeakerEnd);
    sock.on("voice_chunk", onVoiceChunk);
    sock.on("ptt_granted", onPttGranted);
    sock.on("ptt_denied", onPttDenied);
    if (sock.connected) onConnect();

    return () => {
      sock.off("connect", onConnect);
      sock.off("disconnect", onDisconnect);
      sock.off("presence", onPresence);
      sock.off("speaker_start", onSpeakerStart);
      sock.off("speaker_end", onSpeakerEnd);
      sock.off("voice_chunk", onVoiceChunk);
      sock.off("ptt_granted", onPttGranted);
      sock.off("ptt_denied", onPttDenied);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, isMe, playChunk]);

  // Sayfadan çıkarken her şeyi serbest bırak
  useEffect(() => {
    return () => {
      stopCapture();
      if (speakerGuardRef.current) clearTimeout(speakerGuardRef.current);
      if (receivingTimerRef.current) clearTimeout(receivingTimerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      void ctxRef.current?.close().catch(() => {});
      ctxRef.current = null;
      disconnectTelsizSocket();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function selectChannel(ch: TelsizChannel) {
    // Kanal seçimi bir kullanıcı dokunuşu — ses çıkış kilidini burada aç
    unlockAudio();
    channelIdRef.current = ch.id;
    setChannel(ch);
    setMembers([]);
    setSpeaker(null);
    setBusyNotice("");
    socketRef.current?.emit("join_channel", { channelId: ch.id });
  }

  function leaveChannel() {
    stopTalking();
    const id = channelIdRef.current;
    if (id) socketRef.current?.emit("leave_channel", { channelId: id });
    channelIdRef.current = null;
    setChannel(null);
    setMembers([]);
    setSpeaker(null);
  }

  // Boşluk tuşu ile bas-konuş
  useEffect(() => {
    if (!channel) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.code !== "Space" || e.repeat) return;
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      )
        return;
      e.preventDefault();
      void startTalking();
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.code !== "Space") return;
      stopTalking();
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel, speaker]);

  const someoneElseTalking = !!speaker && !isTransmitting;
  const pttDisabled = someoneElseTalking;

  return (
    <PageContainer>
      <Link
        href="/uygulamalar"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-text"
      >
        <ArrowLeft className="h-4 w-4" />
        Uygulamalar
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10">
            <Radio className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Yolculuk Telsiz</h1>
            <p className="text-sm text-muted">
              Bas-konuş telsiz — yoldaki gezginlerle canlı sesli iletişim
            </p>
          </div>
        </div>
        {channel && (
          <div className="flex items-center gap-2 text-xs">
            {connected ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 font-medium text-success">
                <Wifi className="h-3.5 w-3.5" /> Bağlı
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-danger/10 px-2.5 py-1 font-medium text-danger">
                <WifiOff className="h-3.5 w-3.5" /> Bağlanıyor…
              </span>
            )}
          </div>
        )}
      </div>

      {!token ? (
        <div className="mt-10 rounded-2xl border border-border bg-surface p-8 text-center">
          <Radio className="mx-auto h-10 w-10 text-muted" />
          <p className="mt-3 font-semibold text-text">Telsizi kullanmak için giriş yapın</p>
          <p className="mt-1 text-sm text-muted">
            Bas-konuş özelliği yalnızca üyeler içindir.
          </p>
          <Link href="/giris" className="mt-4 inline-block">
            <Button>Giriş yap</Button>
          </Link>
        </div>
      ) : !channel ? (
        <ChannelPicker onSelect={selectChannel} />
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_280px]">
          {/* Ana telsiz paneli */}
          <div className="flex flex-col items-center rounded-2xl border border-border bg-surface p-6">
            <div className="flex w-full items-center justify-between">
              <button
                onClick={leaveChannel}
                className="text-sm text-muted hover:text-text"
              >
                ← Kanal değiştir
              </button>
              <button
                onClick={() => setMuted((m) => !m)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  muted
                    ? "bg-danger/10 text-danger"
                    : "bg-background text-muted hover:text-text"
                }`}
              >
                {muted ? (
                  <>
                    <VolumeX className="h-4 w-4" /> Sesi aç
                  </>
                ) : (
                  <>
                    <Volume2 className="h-4 w-4" /> Ses açık
                  </>
                )}
              </button>
            </div>

            <div className="mt-2 text-center">
              <p className="text-lg font-bold text-text">{channel.name}</p>
              <p className="text-xs text-muted">{channel.description}</p>
            </div>

            {/* Durum göstergesi */}
            <div className="mt-6 flex h-6 items-center">
              {isTransmitting ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-danger/10 px-3 py-1 text-sm font-semibold text-danger">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-danger" />
                  Yayındasınız — konuşun
                </span>
              ) : someoneElseTalking ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
                  <Volume2 className="h-4 w-4" />
                  {speaker?.displayName} konuşuyor
                </span>
              ) : receiving ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
                  <Volume2 className="h-4 w-4" /> Gelen ses çalınıyor
                </span>
              ) : (
                <span className="text-sm text-muted">Konuşmak için basılı tutun</span>
              )}
            </div>

            {/* PTT butonu */}
            <button
              type="button"
              disabled={pttDisabled}
              onMouseDown={(e) => {
                e.preventDefault();
                void startTalking();
              }}
              onMouseUp={stopTalking}
              onMouseLeave={() => {
                if (talkingRef.current) stopTalking();
              }}
              onTouchStart={(e) => {
                e.preventDefault();
                void startTalking();
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                stopTalking();
              }}
              onContextMenu={(e) => e.preventDefault()}
              className={`mt-6 flex h-44 w-44 select-none flex-col items-center justify-center rounded-full border-4 text-white shadow-lg transition-all touch-none ${
                isTransmitting
                  ? "scale-95 border-danger bg-danger"
                  : pttDisabled
                    ? "cursor-not-allowed border-border bg-muted/40"
                    : "border-primary-dark bg-primary hover:bg-primary-dark active:scale-95"
              }`}
            >
              <Mic className="h-14 w-14" />
              <span className="mt-1 text-sm font-semibold">
                {isTransmitting ? "KONUŞ" : "BAS KONUŞ"}
              </span>
            </button>

            <p className="mt-4 text-center text-xs text-muted">
              Butonu basılı tutun ya da{" "}
              <kbd className="rounded border border-border bg-background px-1.5 py-0.5">
                Boşluk
              </kbd>{" "}
              tuşunu kullanın. Sesiniz konuşurken canlı olarak iletilir.
            </p>

            {busyNotice && (
              <p className="mt-3 rounded-lg bg-warning/10 px-3 py-1.5 text-xs font-medium text-warning">
                {busyNotice}
              </p>
            )}
            {micError && (
              <p className="mt-3 rounded-lg bg-danger/10 px-3 py-2 text-xs font-medium text-danger">
                {micError}
              </p>
            )}
          </div>

          {/* Dinleyiciler */}
          <div className="rounded-2xl border border-border bg-surface p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-text">
              <Users className="h-4 w-4 text-primary" />
              Kanaldakiler ({members.length})
            </div>
            <div className="mt-3 space-y-1.5">
              {members.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted">
                  Şu an kanalda kimse yok. İlk siz konuşun!
                </p>
              ) : (
                members.map((m) => {
                  const talking = speaker?.userId === m.userId;
                  return (
                    <div
                      key={m.userId}
                      className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm ${
                        talking ? "bg-primary/10" : ""
                      }`}
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${
                          talking ? "animate-pulse bg-danger" : "bg-success"
                        }`}
                      />
                      <span className="truncate text-text">
                        {m.displayName}
                        {isMe(m.userId) && (
                          <span className="ml-1 text-xs text-muted">(siz)</span>
                        )}
                      </span>
                      {talking && (
                        <Mic className="ml-auto h-3.5 w-3.5 text-danger" />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 rounded-xl border border-border bg-background p-4 text-xs leading-relaxed text-muted">
        <strong className="text-text">Nasıl çalışır?</strong> Bir kanal seçin,
        mikrofon iznini verin ve konuşmak için butonu basılı tutun. Sesiniz
        konuşurken <em>canlı</em> olarak kanaldaki üyelere iletilir. Aynı anda
        yalnızca bir kişi konuşabilir; siz konuşurken kanal diğerleri için
        &ldquo;meşgul&rdquo; olur. Sesler kaydedilmez.
      </div>
    </PageContainer>
  );
}

function ChannelPicker({ onSelect }: { onSelect: (ch: TelsizChannel) => void }) {
  return (
    <div className="mt-6">
      <p className="mb-3 text-sm font-medium text-text">Bir kanal seçin</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {TELSIZ_CHANNELS.map((ch) => (
          <button
            key={ch.id}
            onClick={() => onSelect(ch)}
            className="group flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 text-left transition-all hover:border-primary/50 hover:shadow-md"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Radio className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-text">{ch.name}</p>
              <p className="truncate text-xs text-muted">{ch.description}</p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" />
          </button>
        ))}
      </div>
    </div>
  );
}
