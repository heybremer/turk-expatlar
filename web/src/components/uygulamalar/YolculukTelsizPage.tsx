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
  Flag,
  Hand,
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

/** Tercih sırası: MP4/AAC her platformda çalınabilir; WebM ise son çare */
function pickMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = [
    "audio/mp4;codecs=mp4a.40.2",
    "audio/mp4",
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
  ];
  for (const c of candidates) if (MediaRecorder.isTypeSupported(c)) return c;
  return "";
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
  const [handRaises, setHandRaises] = useState<Set<string>>(new Set());
  const [reportNotice, setReportNotice] = useState("");

  const socketRef = useRef<Socket | null>(null);
  const channelIdRef = useRef<string | null>(null);

  // Ses aktyarısı
  const ctxRef = useRef<AudioContext | null>(null);
  const audioUnlockedRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Oynatma kuyruğu (AudioContext zamanlayıcısıyla boşluksuz çalma)
  const nextPlayRef = useRef(0);
  const receivingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const talkingRef = useRef(false);
  const grantedRef = useRef(false);
  const mutedRef = useRef(false);
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speakerGuardRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reportingRef = useRef<Set<string>>(new Set());
  const startTimeRef = useRef(0);

  mutedRef.current = muted;

  const isMe = useCallback(
    (uid: string) => !!user && user.id === uid,
    [user],
  );

  // ── AudioContext ──────────────────────────────────────────────────────────

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

  /**
   * iOS/Android: sesi etkinleştirmek için ilk kullanıcı dokunuşunda
   * 1 örneklik sessiz bir buffer çal.
   */
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

  // ── Oynatma kuyruğu ───────────────────────────────────────────────────────

  /**
   * Base64 ses klibi → AudioBuffer → ardışık zamanlanmış çalma.
   * decodeAudioData tarayıcının kendi codec'ini kullanır; format
   * dönüşümü veya blob URL gerekmez.
   */
  const enqueueAudio = useCallback(
    (b64: string, mime: string) => {
      if (mutedRef.current) return;
      // Base64 → ArrayBuffer
      let binary: string;
      try {
        binary = atob(b64);
      } catch {
        return;
      }
      const ab = new ArrayBuffer(binary.length);
      const view = new Uint8Array(ab);
      for (let i = 0; i < binary.length; i++) view[i] = binary.charCodeAt(i);

      const ctx = getCtx();
      if (ctx.state === "suspended") void ctx.resume();

      ctx.decodeAudioData(
        ab,
        (audioBuf) => {
          const src = ctx.createBufferSource();
          src.buffer = audioBuf;
          src.connect(ctx.destination);

          const now = ctx.currentTime;
          let t = nextPlayRef.current;
          if (t < now + 0.02) t = now + 0.08;

          try {
            src.start(t);
          } catch {
            try { src.start(); } catch { return; }
            t = ctx.currentTime;
          }
          nextPlayRef.current = t + audioBuf.duration;

          setReceiving(true);
          if (receivingTimerRef.current) clearTimeout(receivingTimerRef.current);
          receivingTimerRef.current = setTimeout(
            () => setReceiving(false),
            (audioBuf.duration * 1000 + 800) | 0,
          );
        },
        () => { /* bozuk klip — atla */ },
      );
    },
    [getCtx],
  );

  // ── Mikrofon ──────────────────────────────────────────────────────────────

  async function ensureStream(): Promise<MediaStream | null> {
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
      setMicError("Mikrofona erişilemedi. Tarayıcı izinlerinden mikrofonu etkinleştirin.");
      return null;
    }
  }

  function abortRecording() {
    talkingRef.current = false;
    grantedRef.current = false;
    chunksRef.current = [];
    if (autoStopRef.current) { clearTimeout(autoStopRef.current); autoStopRef.current = null; }
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") {
      rec.onstop = null;
      rec.onerror = null;
      rec.stop();
    }
    recorderRef.current = null;
    setIsTransmitting(false);
  }

  // ── Konuşma ───────────────────────────────────────────────────────────────

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
    // İzin süresince kullanıcı butonu bırakmışsa veya kanal değiştiyse iptal
    if (channelIdRef.current !== id || talkingRef.current) return;

    talkingRef.current = true;
    grantedRef.current = false;
    chunksRef.current = [];
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
      sock.emit("ptt_end", { channelId: id });
      return;
    }
    recorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onerror = () => {
      abortRecording();
      sock.emit("ptt_end", { channelId: id });
    };

    recorder.onstop = () => {
      const wasGranted = grantedRef.current;
      const chunks = chunksRef.current;
      chunksRef.current = [];
      const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
      const durationMs = Date.now() - startTimeRef.current;
      setIsTransmitting(false);

      const finish = () => sock.emit("ptt_end", { channelId: id });

      if (wasGranted && blob.size > 0 && channelIdRef.current === id) {
        const reader = new FileReader();
        reader.onloadend = () => {
          try {
            const res = typeof reader.result === "string" ? reader.result : "";
            const base64 = res.split(",")[1] ?? "";
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
    autoStopRef.current = setTimeout(() => stopTalking(), MAX_TALK_MS);
  }

  function stopTalking() {
    if (!talkingRef.current) return;
    talkingRef.current = false;
    if (autoStopRef.current) { clearTimeout(autoStopRef.current); autoStopRef.current = null; }
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") {
      rec.stop();
    } else {
      const id = channelIdRef.current;
      if (id) socketRef.current?.emit("ptt_end", { channelId: id });
      setIsTransmitting(false);
    }
    recorderRef.current = null;
  }

  // ── Socket olayları ───────────────────────────────────────────────────────

  useEffect(() => {
    if (!token) return;
    const sock = getTelsizSocket(token);
    socketRef.current = sock;

    const onConnect = () => {
      setConnected(true);
      if (channelIdRef.current) sock.emit("join_channel", { channelId: channelIdRef.current });
    };
    const onDisconnect = () => {
      setConnected(false);
      setSpeaker(null);
      abortRecording();
    };
    const onPresence = (d: { channelId: string; users: Member[] }) => {
      if (d.channelId !== channelIdRef.current) return;
      setMembers(d.users);
    };
    const onSpeakerStart = (d: Speaker & { channelId: string }) => {
      if (d.channelId !== channelIdRef.current) return;
      if (isMe(d.userId)) return;
      setSpeaker({ userId: d.userId, displayName: d.displayName });
      if (speakerGuardRef.current) clearTimeout(speakerGuardRef.current);
      speakerGuardRef.current = setTimeout(() => setSpeaker(null), MAX_TALK_MS + 5_000);
    };
    const onSpeakerEnd = (d: { channelId: string }) => {
      if (d.channelId !== channelIdRef.current) return;
      if (speakerGuardRef.current) { clearTimeout(speakerGuardRef.current); speakerGuardRef.current = null; }
      setSpeaker(null);
    };
    const onVoice = (d: { channelId: string; userId: string; audio: string; mime: string }) => {
      if (d.channelId !== channelIdRef.current) return;
      if (isMe(d.userId)) return;
      enqueueAudio(d.audio, d.mime);
    };
    const onPttGranted = () => { grantedRef.current = true; };
    const onPttDenied = (d: { displayName: string; muted?: boolean }) => {
      if (d.muted) {
        abortRecording();
        setBusyNotice(d.displayName); // sunucu "Susturuldunuz — N dk kaldı" mesajını displayName'e koyuyor
      } else {
        grantedRef.current = false;
        abortRecording();
        setBusyNotice(`${d.displayName} konuşuyor, biraz bekleyin`);
      }
      setTimeout(() => setBusyNotice(""), 3000);
    };
    const onHandRaises = (d: { channelId: string; userIds: string[] }) => {
      if (d.channelId !== channelIdRef.current) return;
      setHandRaises(new Set(d.userIds));
    };
    const onReportResult = (d: { success: boolean; message: string }) => {
      setReportNotice(d.message);
      setTimeout(() => setReportNotice(""), 3500);
    };

    sock.on("connect", onConnect);
    sock.on("disconnect", onDisconnect);
    sock.on("presence", onPresence);
    sock.on("speaker_start", onSpeakerStart);
    sock.on("speaker_end", onSpeakerEnd);
    sock.on("voice", onVoice);
    sock.on("ptt_granted", onPttGranted);
    sock.on("ptt_denied", onPttDenied);
    sock.on("hand_raises", onHandRaises);
    sock.on("report_result", onReportResult);
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
      sock.off("hand_raises", onHandRaises);
      sock.off("report_result", onReportResult);
    };
  }, [token, isMe, enqueueAudio]);

  useEffect(() => {
    return () => {
      abortRecording();
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

  // ── Kanal yönetimi ────────────────────────────────────────────────────────

  function selectChannel(ch: TelsizChannel) {
    unlockAudio();
    channelIdRef.current = ch.id;
    setChannel(ch);
    setMembers([]);
    setSpeaker(null);
    setBusyNotice("");
    setHandRaises(new Set());
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
    setHandRaises(new Set());
  }

  function sendReport(reportedUserId: string) {
    const id = channelIdRef.current;
    const sock = socketRef.current;
    if (!id || !sock || reportingRef.current.has(reportedUserId)) return;
    reportingRef.current.add(reportedUserId);
    sock.emit("telsiz_report", { channelId: id, reportedUserId });
    setTimeout(() => reportingRef.current.delete(reportedUserId), 5000);
  }

  // Boşluk tuşu PTT
  useEffect(() => {
    if (!channel) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.code !== "Space" || e.repeat) return;
      const t = e.target as HTMLElement;
      if (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable) return;
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

  // ── UI ────────────────────────────────────────────────────────────────────

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
          <p className="mt-1 text-sm text-muted">Bas-konuş özelliği yalnızca üyeler içindir.</p>
          <Link href="/giris" className="mt-4 inline-block">
            <Button>Giriş yap</Button>
          </Link>
        </div>
      ) : !channel ? (
        <ChannelPicker onSelect={selectChannel} />
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_280px]">
          {/* Ana panel */}
          <div className="flex flex-col items-center rounded-2xl border border-border bg-surface p-6">
            <div className="flex w-full items-center justify-between">
              <button onClick={leaveChannel} className="text-sm text-muted hover:text-text">
                ← Kanal değiştir
              </button>
              <button
                onClick={() => setMuted((m) => !m)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  muted ? "bg-danger/10 text-danger" : "bg-background text-muted hover:text-text"
                }`}
              >
                {muted ? <><VolumeX className="h-4 w-4" /> Sesi aç</> : <><Volume2 className="h-4 w-4" /> Ses açık</>}
              </button>
            </div>

            <div className="mt-2 text-center">
              <p className="text-lg font-bold text-text">{channel.name}</p>
              <p className="text-xs text-muted">{channel.description}</p>
            </div>

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
              onMouseDown={(e) => { e.preventDefault(); void startTalking(); }}
              onMouseUp={stopTalking}
              onMouseLeave={() => { if (talkingRef.current) stopTalking(); }}
              onTouchStart={(e) => { e.preventDefault(); void startTalking(); }}
              onTouchEnd={(e) => { e.preventDefault(); stopTalking(); }}
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
              <kbd className="rounded border border-border bg-background px-1.5 py-0.5">Boşluk</kbd>{" "}
              tuşunu kullanın. Bıraktığınızda ses iletilir.
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

          {/* Üye listesi */}
          <div className="rounded-2xl border border-border bg-surface p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-text">
              <Users className="h-4 w-4 text-primary" />
              Kanaldakiler ({members.length})
            </div>
            <div className="mt-3 space-y-1">
              {members.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted">
                  Şu an kanalda kimse yok. İlk siz konuşun!
                </p>
              ) : (
                members.map((m) => {
                  const talking = speaker?.userId === m.userId;
                  const raisingHand = handRaises.has(m.userId);
                  const mine = isMe(m.userId);
                  return (
                    <div
                      key={m.userId}
                      className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors ${
                        talking ? "bg-primary/10" : ""
                      }`}
                    >
                      <span
                        className={`h-2 w-2 shrink-0 rounded-full ${
                          talking ? "animate-pulse bg-danger" : "bg-success"
                        }`}
                      />
                      <span className="min-w-0 flex-1 truncate text-text">
                        {m.displayName}
                        {mine && <span className="ml-1 text-xs text-muted">(siz)</span>}
                      </span>
                      {raisingHand && (
                        <span title="Konuşmak istiyor">
                          <Hand className="h-3.5 w-3.5 shrink-0 text-warning" />
                        </span>
                      )}
                      {talking && <Mic className="h-3.5 w-3.5 shrink-0 text-danger" />}
                      {!mine && (
                        <button
                          type="button"
                          onClick={() => sendReport(m.userId)}
                          title="Uygunsuz dil — şikayet et"
                          className="ml-0.5 rounded p-0.5 text-muted hover:text-danger transition-colors"
                        >
                          <Flag className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
            {reportNotice && (
              <p className="mt-3 rounded-lg bg-primary/10 px-3 py-2 text-xs font-medium text-primary">
                {reportNotice}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="mt-8 rounded-xl border border-border bg-background p-4 text-xs leading-relaxed text-muted">
        <strong className="text-text">Nasıl çalışır?</strong> Bir kanal seçin,
        mikrofon iznini verin ve konuşmak için butonu basılı tutun. Bıraktığınızda
        ses kanaldaki üyelere iletilir. Aynı anda yalnızca bir kişi
        konuşabilir. Sesler kaydedilmez.
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
