"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square, X } from "lucide-react";

const MAX_SECONDS = 120;

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  // Chrome/Firefox: webm+opus; Safari: mp4 (AAC)
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t));
}

/**
 * Bas-kaydet sesli mesaj butonu. Kayıt MediaRecorder ile yapılır; durunca
 * elde edilen ses dosyası onRecorded ile yukarı iletilir (yükleme sayfada).
 */
export function VoiceRecorderButton({
  disabled,
  onRecorded,
  onError,
}: {
  disabled?: boolean;
  onRecorded: (file: File) => void;
  onError?: (message: string) => void;
}) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const cancelledRef = useRef(false);

  // Kayıt süresi sayacı + üst sınırda otomatik durdurma
  useEffect(() => {
    if (!recording) return;
    const id = setInterval(() => {
      setSeconds((s) => {
        if (s + 1 >= MAX_SECONDS) {
          recorderRef.current?.stop();
          return s + 1;
        }
        return s + 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [recording]);

  // Sayfadan ayrılırken açık kaydı iptal et (mikrofonu serbest bırak)
  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      if (recorderRef.current?.state === "recording") {
        recorderRef.current.stop();
      }
    };
  }, []);

  async function startRecording() {
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      onError?.("Tarayıcınız sesli mesaj kaydını desteklemiyor.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickMimeType();
      const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      cancelledRef.current = false;

      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        if (cancelledRef.current || chunksRef.current.length === 0) return;
        const fullType = rec.mimeType || mimeType || "audio/webm";
        // "audio/webm;codecs=opus" → sunucu allowlist'i için temel MIME
        const baseType = fullType.split(";")[0];
        const ext = baseType.includes("mp4") ? "m4a" : "webm";
        const blob = new Blob(chunksRef.current, { type: baseType });
        onRecorded(
          new File([blob], `sesli-mesaj-${Date.now()}.${ext}`, { type: baseType }),
        );
      };

      recorderRef.current = rec;
      rec.start();
      setSeconds(0);
      setRecording(true);
    } catch {
      onError?.("Mikrofona erişilemedi. Tarayıcı izinlerini kontrol edin.");
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
  }

  function cancelRecording() {
    cancelledRef.current = true;
    recorderRef.current?.stop();
  }

  if (recording) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return (
      <div className="flex flex-shrink-0 items-center gap-1 rounded-lg bg-danger/10 px-1.5 py-0.5">
        <span className="h-2 w-2 animate-pulse rounded-full bg-danger" />
        <span className="min-w-[36px] text-xs font-semibold tabular-nums text-danger">
          {m}:{String(s).padStart(2, "0")}
        </span>
        <button
          type="button"
          onClick={cancelRecording}
          title="İptal"
          aria-label="Kaydı iptal et"
          className="flex h-7 w-7 items-center justify-center rounded-full text-muted hover:bg-background hover:text-text"
        >
          <X className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={stopRecording}
          title="Kaydı bitir ve ekle"
          aria-label="Kaydı bitir ve ekle"
          className="flex h-7 w-7 items-center justify-center rounded-full bg-danger text-white hover:bg-danger/90"
        >
          <Square className="h-3 w-3" />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      title="Sesli mesaj"
      disabled={disabled}
      onClick={() => void startRecording()}
      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-muted hover:bg-background hover:text-primary disabled:opacity-40 active:bg-background"
    >
      <Mic className="h-4 w-4" />
    </button>
  );
}
