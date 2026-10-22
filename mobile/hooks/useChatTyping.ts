import { useCallback, useEffect, useRef } from "react";
import { getSocket } from "@/lib/socket";

/** Sunucu 3 sn içinde yeni "typing" gelmezse user_typing_stop yayınlar; bu aralıktan kısa tutulmalı. */
const TYPING_REFRESH_MS = 2000;
const TYPING_IDLE_MS = 3000;

/** Backend ChatGateway'deki typing/typing_stop event'leriyle birebir uyumlu (bkz. web useChatTyping.ts) */
export function useChatTyping(
  chatId: string | null | undefined,
  token: string | null | undefined,
  input: string,
  enabled: boolean,
) {
  const idleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);
  const lastEmitRef = useRef(0);
  const chatIdRef = useRef(chatId);
  const tokenRef = useRef(token);

  chatIdRef.current = chatId;
  tokenRef.current = token;

  const stopTyping = useCallback((cid: string | null | undefined = chatIdRef.current) => {
    if (idleTimeoutRef.current) {
      clearTimeout(idleTimeoutRef.current);
      idleTimeoutRef.current = null;
    }
    if (isTypingRef.current && cid) {
      getSocket(tokenRef.current).emit("typing_stop", { chatId: cid });
    }
    isTypingRef.current = false;
    lastEmitRef.current = 0;
  }, []);

  useEffect(() => {
    if (!chatId || !enabled) return;

    if (!input.trim()) {
      stopTyping(chatId);
      return;
    }

    const now = Date.now();
    if (!isTypingRef.current || now - lastEmitRef.current >= TYPING_REFRESH_MS) {
      getSocket(token).emit("typing", { chatId });
      isTypingRef.current = true;
      lastEmitRef.current = now;
    }

    if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
    idleTimeoutRef.current = setTimeout(() => stopTyping(chatId), TYPING_IDLE_MS);
  }, [input, chatId, token, enabled, stopTyping]);

  // Oda değişince veya ekran kapanınca karşı tarafta "yazıyor" asılı kalmasın
  useEffect(() => {
    if (!chatId) return;
    return () => stopTyping(chatId);
  }, [chatId, stopTyping]);

  return useCallback(() => stopTyping(), [stopTyping]);
}

export function formatTypingLabel(names: string[]) {
  if (names.length === 0) return "";
  if (names.length === 1) return `${names[0]} yazıyor…`;
  if (names.length === 2) return `${names[0]} ve ${names[1]} yazıyor…`;
  if (names.length > 3) return `${names.slice(0, 2).join(", ")} ve ${names.length - 2} kişi yazıyor…`;
  return `${names.slice(0, -1).join(", ")} ve ${names[names.length - 1]} yazıyor…`;
}
