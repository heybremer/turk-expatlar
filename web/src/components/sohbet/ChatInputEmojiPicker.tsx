"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";

const Picker = dynamic(() => import("@emoji-mart/react"), { ssr: false });

type Props = {
  open: boolean;
  anchorRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
  onSelect: (emoji: string) => void;
};

/** Mesaj kutusu emoji seçici — overflow-hidden kırpmasını önlemek için portal ile body'ye render edilir. */
export function ChatInputEmojiPicker({ open, anchorRef, onClose, onSelect }: Props) {
  const pickerRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ bottom: 0, left: 0 });
  const [data, setData] = useState<object | null>(null);
  const [i18n, setI18n] = useState<object | null>(null);

  // Locale verisi CDN'den değil, paketle birlikte gelen dosyadan alınır: CSP connect-src
  // kısıtlaması jsdelivr.net'e erişimi engellediği için picker sessizce hiç render olmuyordu.
  useEffect(() => {
    if (!open) return;
    void import("@emoji-mart/data").then((mod) => setData(mod.default));
    void import("@emoji-mart/data/i18n/tr.json").then((mod) => setI18n(mod.default));
  }, [open]);

  useEffect(() => {
    if (!open || !anchorRef.current) return;

    function updatePosition() {
      const rect = anchorRef.current!.getBoundingClientRect();
      setPos({
        bottom: window.innerHeight - rect.top + 8,
        left: Math.max(8, Math.min(rect.left, window.innerWidth - 352)),
      });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.visualViewport?.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.visualViewport?.removeEventListener("resize", updatePosition);
    };
  }, [open, anchorRef]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (anchorRef.current?.contains(target)) return;
      if (pickerRef.current?.contains(target)) return;
      onClose();
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, onClose, anchorRef]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={pickerRef}
      className="fixed z-[200] shadow-xl rounded-xl overflow-hidden border border-border"
      style={{ bottom: pos.bottom, left: pos.left }}
    >
      {data && i18n ? (
        <Picker
          data={data}
          i18n={i18n}
          locale="tr"
          theme="light"
          previewPosition="none"
          skinTonePosition="none"
          onEmojiSelect={(emoji: { native: string }) => {
            onSelect(emoji.native);
            onClose();
          }}
        />
      ) : (
        <div className="flex h-[350px] w-[352px] items-center justify-center bg-surface text-sm text-muted">
          Yükleniyor…
        </div>
      )}
    </div>,
    document.body,
  );
}
