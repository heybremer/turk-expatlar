"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const EMOJI_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "😡", "🙏", "🎉"];

type Props = {
  open: boolean;
  anchorRef: React.RefObject<HTMLElement | null>;
  align: "left" | "right";
  onClose: () => void;
  onSelect: (emoji: string) => void;
};

/**
 * WhatsApp'taki gibi bir mesajın üstünde beliren hızlı reaksiyon çubuğu.
 * Kırpılmayı (overflow-hidden konteynerler yüzünden) önlemek için body'ye portal ile render edilir.
 */
export function ChatReactionBar({ open, anchorRef, align, onClose, onSelect }: Props) {
  const barRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!open || !anchorRef.current) return;

    function updatePosition() {
      const rect = anchorRef.current!.getBoundingClientRect();
      const barWidth = 280;
      const left =
        align === "right"
          ? Math.min(rect.right - barWidth, window.innerWidth - barWidth - 8)
          : Math.max(8, rect.left);
      setPos({ top: rect.top - 52, left: Math.max(8, left) });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, anchorRef, align]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (anchorRef.current?.contains(target)) return;
      if (barRef.current?.contains(target)) return;
      onClose();
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, onClose, anchorRef]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={barRef}
      style={{ top: pos.top, left: pos.left, animation: "chat-reaction-pop 0.12s ease-out" }}
      className="fixed z-[200] flex items-center gap-0.5 rounded-full border border-border bg-surface p-1.5 shadow-xl"
    >
      {EMOJI_REACTIONS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => {
            onSelect(emoji);
            onClose();
          }}
          className="flex h-8 w-8 items-center justify-center rounded-full text-lg transition-transform hover:scale-125 hover:bg-background"
        >
          {emoji}
        </button>
      ))}
    </div>,
    document.body,
  );
}
