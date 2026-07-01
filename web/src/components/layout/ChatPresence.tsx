"use client";

import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { disconnectSocket, getSocket } from "@/lib/socket";

/** Giriş yapmış kullanıcılar site genelinde sohbet socket'ine bağlanır → kanallarda online görünür */
export function ChatPresence() {
  const token = useAuth((s) => s.token);

  useEffect(() => {
    if (token) {
      getSocket(token);
    } else {
      disconnectSocket();
    }
  }, [token]);

  return null;
}
