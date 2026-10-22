import { io, Socket } from "socket.io-client";
import { API_URL } from "./api";

const WS_URL =
  process.env.EXPO_PUBLIC_WS_URL ??
  API_URL.replace(/\/api\/?$/, "");

let socket: Socket | null = null;
let currentToken: string | null | undefined = undefined;

// Backend ChatGateway "/chat" namespace'inde çalışıyor (bkz. api/src/chat/chat.gateway.ts)
export function getSocket(token?: string | null): Socket {
  // Token değiştiyse eski bağlantıyı kapat, yenisiyle aç (web client ile aynı davranış)
  if (socket && currentToken !== token) {
    socket.disconnect();
    socket = null;
  }

  if (socket) return socket;

  currentToken = token;

  socket = io(`${WS_URL}/chat`, {
    transports: ["websocket", "polling"],
    auth: token ? { token } : {},
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    timeout: 10000,
  });

  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
  currentToken = undefined;
}

let telsizSocket: Socket | null = null;
let telsizToken: string | null = null;

/** Yolculuk Telsiz bas-konuş gateway'i ("/telsiz" namespace). */
export function getTelsizSocket(token: string): Socket {
  if (telsizSocket && telsizToken !== token) {
    telsizSocket.disconnect();
    telsizSocket = null;
  }
  if (telsizSocket) return telsizSocket;
  telsizToken = token;
  telsizSocket = io(`${WS_URL}/telsiz`, {
    transports: ["websocket", "polling"],
    auth: { token },
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    timeout: 10000,
  });
  return telsizSocket;
}

export function disconnectTelsizSocket() {
  telsizSocket?.disconnect();
  telsizSocket = null;
  telsizToken = null;
}

export function isSocketConnected(): boolean {
  return socket?.connected ?? false;
}
