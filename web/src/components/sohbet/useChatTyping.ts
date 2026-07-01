import { useCallback, useEffect, useRef } from "react";
import { getSocket } from "@/lib/socket";

export function useChatTyping(
  chatId: string | null | undefined,
  token: string | null | undefined,
  input: string,
  enabled: boolean,
) {
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);
  const chatIdRef = useRef(chatId);
  const tokenRef = useRef(token);

  chatIdRef.current = chatId;
  tokenRef.current = token;

  useEffect(() => {
    if (!chatId || !token || !enabled) return;

    const sock = getSocket(token);

    function stopTyping() {
      if (!isTypingRef.current) return;
      sock.emit("typing_stop", { chatId });
      isTypingRef.current = false;
    }

    if (!input.trim()) {
      stopTyping();
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      return;
    }

    if (!isTypingRef.current) {
      sock.emit("typing", { chatId });
      isTypingRef.current = true;
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(stopTyping, 3000);

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [input, chatId, token, enabled]);

  return useCallback(() => {
    const cid = chatIdRef.current;
    const tok = tokenRef.current;
    if (!cid || !tok) return;
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    if (isTypingRef.current) {
      getSocket(tok).emit("typing_stop", { chatId: cid });
      isTypingRef.current = false;
    }
  }, []);
}

export function formatTypingLabel(names: string[]) {
  if (names.length === 0) return "";
  if (names.length === 1) return `${names[0]} yazıyor…`;
  if (names.length === 2) return `${names[0]} ve ${names[1]} yazıyor…`;
  return `${names.slice(0, -1).join(", ")} ve ${names[names.length - 1]} yazıyor…`;
}
