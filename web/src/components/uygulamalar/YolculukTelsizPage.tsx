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

function pickMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  // MP4/AAC her platformda (özellikle iOS Safari) çalınabildiği için önceliklidir.
  // Android'in varsayılanı WebM/Opus iPhone'da ÇALINAMAZ — bu yüzden webm
  // yalnızca mp4 desteklenmiyorsa son çare olarak kullanılır.
  const candidates = [
    "audio/mp4;codecs=mp4a.40.2",
    "audio/mp4",
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
  ];
  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return "";
}

// Kısa sessiz WAV — iOS'ta ses çalmayı kullanıcı dokunuşuyla "kilidini açmak" için
const SILENT_WAV =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";

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
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const talkingRef = useRef(false);
  const grantedRef = useRef(false);
  const mutedRef = useRef(false);
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Gelen ses klipleri sırayla çalınır
  const audioQueueRef = useRef<{ url: string; durationMs: number }[]>([]);
  const playingRef = useRef(false);
  // Karşı tarafın "konuşuyor" kilidi sunucudan speaker_end gelmezse
  // takılı kalmasın diye emniyet zamanlayıcısı
  const speakerGuardRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeRef = useRef(0);
  // iOS: programatik ses çalma ancak kullanıcı dokunuşuyla "kilidi açılmış"
  // tek bir Audio elemanı üzerinden güvenilir çalışır
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const audioUnlockedRef = useRef(false);

  mutedRef.current = muted;

  const isMe = useCallback(
    (userId: string) => !!user && user.id === userId,
    [user],
  );

  const unlockAudio = useCallback(() => {
    if (audioUnlockedRef.current) return;
    if (!audioElRef.current) audioElRef.current = new Audio();
    const audio = audioElRef.current;
    audio.src = SILENT_WAV;
    void audio
      .play()
      .then(() => {
        audioUnlockedRef.current = true;
      })
      .catch(() => {
        // Sonraki dokunuşta tekrar denenir
      });
  }, []);

  const playNext = useCallback(() => {
    if (playingRef.current) return;
    const item = audioQueueRef.current.shift();
    if (!item) {
      setReceiving(false);
      return;
    }
    playingRef.current = true;
    setReceiving(true);
    if (!audioElRef.current) audioElRef.current = new Audio();
    const audio = audioElRef.current;
    let finished = false;
    // Bekçi: onended/onerror hiç ateşlenmezse (mobilde takılı kalan
    // yükleme) kuyruk sonsuza dek kilitlenmesin
    const watchdog = setTimeout(
      () => done(),
      Math.max(10_000, item.durationMs + 5_000),
    );
    const done = () => {
      if (finished) return;
      finished = true;
      clearTimeout(watchdog);
      audio.onended = null;
      audio.onerror = null;
      URL.revokeObjectURL(item.url);
      playingRef.current = false;
      playNext();
    };
    audio.onended = done;
    audio.onerror = done;
    audio.src = item.url;
    void audio.play().catch(done);
  }, []);

  const enqueueAudio = useCallback(
    (base64: string, mime: string, durationMs: number) => {
      if (mutedRef.current) return;
      // base64 → Blob: büyük kliplerde data: URL sınırına takılmamak için
      // blob: URL üzerinden çalınır (CSP media-src blob: ile uyumlu)
      try {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const blob = new Blob([bytes], { type: mime || "audio/webm" });
        audioQueueRef.current.push({
          url: URL.createObjectURL(blob),
          durationMs: durationMs || 0,
        });
        playNext();
      } catch {
        // bozuk base64 — klibi atla
      }
    },
    [playNext],
  );

  // Socket bağlantısı ve olay dinleyicileri
  useEffect(() => {
    if (!token) return;
    const sock = getTelsizSocket(token);
    socketRef.current = sock;

    const onConnect = () => {
      setConnected(true);
      // Yeniden bağlanınca aktif kanala geri katıl
      if (channelIdRef.current) {
        sock.emit("join_channel", { channelId: channelIdRef.current });
      }
    };
    const onDisconnect = () => {
      setConnected(false);
      setSpeaker(null);
    };
    const onPresence = (data: {
      channelId: string;
      users: Member[];
    }) => {
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
    const onVoice = (data: {
      channelId: string;
      userId: string;
      audio: string;
      mime: string;
      durationMs?: number;
    }) => {
      if (data.channelId !== channelIdRef.current) return;
      if (isMe(data.userId)) return;
      enqueueAudio(data.audio, data.mime, data.durationMs ?? 0);
    };
    const onPttGranted = () => {
      grantedRef.current = true;
    };
    const onPttDenied = (data: { displayName: string }) => {
      grantedRef.current = false;
      setBusyNotice(`${data.displayName} konuşuyor, biraz bekleyin`);
      setTimeout(() => setBusyNotice(""), 2000);
      // Reddedildi — kaydı iptal et
      abortRecording();
    };

    sock.on("connect", onConnect);
    sock.on("disconnect", onDisconnect);
    sock.on("presence", onPresence);
    sock.on("speaker_start", onSpeakerStart);
    sock.on("speaker_end", onSpeakerEnd);
    sock.on("voice", onVoice);
    sock.on("ptt_granted", onPttGranted);
    sock.on("ptt_denied", onPttDenied);
    if (sock.connected) onConnect();

    return () => {
      sock.off("connect", onConnect);
      sock.off("disconnect", onDisconnect);
      sock.off("presence", onPresence);
      sock.off("speaker_start", onSpeakerStart);
      sock.off("speaker_end", onSpeakerEnd);
      sock.off("voice", onVoice);
      sock.off("ptt_granted", onPttGranted);
      sock.off("ptt_denied", onPttDenied);
    };
  }, [token, isMe, enqueueAudio]);

  // Sayfadan çıkarken bağlantıyı kapat, mikrofonu serbest bırak
  useEffect(() => {
    return () => {
      if (autoStopRef.current) clearTimeout(autoStopRef.current);
      if (speakerGuardRef.current) clearTimeout(speakerGuardRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      disconnectTelsizSocket();
    };
  }, []);

  function selectChannel(ch: TelsizChannel) {
    // Kanal seçimi bir kullanıcı dokunuşu — iOS ses çalma kilidini burada aç
    unlockAudio();
    channelIdRef.current = ch.id;
    setChannel(ch);
    setMembers([]);
    setSpeaker(null);
    setBusyNotice("");
    socketRef.current?.emit("join_channel", { channelId: ch.id });
  }

  function leaveChannel() {
    const id = channelIdRef.current;
    if (id) socketRef.current?.emit("leave_channel", { channelId: id });
    channelIdRef.current = null;
    setChannel(null);
    setMembers([]);
    setSpeaker(null);
  }

  async function ensureStream(): Promise<MediaStream | null> {
    // Mobil tarayıcılarda (özellikle iOS) hoparlörden ses çalındıktan sonra
    // eldeki mikrofon track'i sessizce ölebilir/muted olabilir.
    // Track canlı değilse akışı bırakıp yeniden al.
    const existing = streamRef.current;
    if (existing) {
      const track = existing.getAudioTracks()[0];
      if (track && track.readyState === "live" && !track.muted) {
        return existing;
      }
      existing.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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

  function abortRecording() {
    talkingRef.current = false;
    grantedRef.current = false;
    if (autoStopRef.current) {
      clearTimeout(autoStopRef.current);
      autoStopRef.current = null;
    }
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") {
      rec.onstop = null;
      rec.stop();
    }
    recorderRef.current = null;
    chunksRef.current = [];
    setIsTransmitting(false);
  }

  async function startTalking() {
    unlockAudio();
    const id = channelIdRef.current;
    const sock = socketRef.current;
    if (!id || !sock || !token) return;
    if (talkingRef.current) return;
    // Başkası konuşuyorsa engelle (yarı çift yönlü)
    if (speaker) {
      setBusyNotice(`${speaker.displayName} konuşuyor, biraz bekleyin`);
      setTimeout(() => setBusyNotice(""), 2000);
      return;
    }

    const stream = await ensureStream();
    if (!stream) return;

    // Kullanıcı kaydı basılı tutup çabuk bıraktıysa
    // (async izin sırasında) tekrar kontrol et
    talkingRef.current = true;
    grantedRef.current = false;
    sock.emit("ptt_start", { channelId: id });

    const mimeType = pickMimeType();
    let recorder: MediaRecorder;
    try {
      recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
    } catch {
      setMicError("Ses kaydı bu tarayıcıda desteklenmiyor.");
      abortRecording();
      return;
    }
    recorderRef.current = recorder;
    chunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };
    // Kayıt sırasında hata olursa (ör. mikrofon track'i öldü) kanal
    // kilidini mutlaka bırak — yoksa 30 sn boyunca kimse konuşamaz
    recorder.onerror = () => {
      abortRecording();
      sock.emit("ptt_end", { channelId: id });
    };
    recorder.onstop = () => {
      const wasGranted = grantedRef.current;
      const chunks = chunksRef.current;
      chunksRef.current = [];
      const blob = new Blob(chunks, {
        type: recorder.mimeType || "audio/webm",
      });
      const durationMs = Date.now() - startTimeRef.current;
      setIsTransmitting(false);
      // Kanal kilidi her koşulda bırakılmalı
      const finish = () => sock.emit("ptt_end", { channelId: id });
      // İzin verildiyse ve ses varsa yayınla
      if (wasGranted && blob.size > 0 && channelIdRef.current === id) {
        const reader = new FileReader();
        reader.onloadend = () => {
          try {
            const result =
              typeof reader.result === "string" ? reader.result : "";
            const base64 = result.split(",")[1] ?? "";
            if (base64) {
              sock.emit("ptt_audio", {
                channelId: id,
                audio: base64,
                mime: blob.type,
                durationMs,
              });
            }
          } finally {
            finish();
          }
        };
        reader.onerror = finish;
        reader.readAsDataURL(blob);
      } else {
        finish();
      }
      grantedRef.current = false;
    };

    startTimeRef.current = Date.now();
    recorder.start();
    setIsTransmitting(true);

    // Güvenlik: azami konuşma süresi dolunca otomatik bırak
    autoStopRef.current = setTimeout(() => stopTalking(), MAX_TALK_MS);
  }

  function stopTalking() {
    if (!talkingRef.current) return;
    talkingRef.current = false;
    if (autoStopRef.current) {
      clearTimeout(autoStopRef.current);
      autoStopRef.current = null;
    }
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") {
      rec.stop();
    } else {
      const id = channelIdRef.current;
      if (id) socketRef.current?.emit("ptt_end", { channelId: id });
    }
    recorderRef.current = null;
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
                  <Volume2 className="h-4 w-4" /> Gelen mesaj çalınıyor
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
              tuşunu kullanın. Bıraktığınızda mesaj gönderilir.
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
        mikrofon iznini verin ve konuşmak için butonu basılı tutun. Aynı anda
        yalnızca bir kişi konuşabilir; siz konuşurken kanal diğerleri için
        &ldquo;meşgul&rdquo; olur. Sesler yalnızca aynı kanaldaki üyelere iletilir
        ve kaydedilmez.
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
