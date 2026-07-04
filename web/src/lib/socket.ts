import { io, Socket } from "socket.io-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3201";

let socket: Socket | null = null;
let currentToken: string | null | undefined = undefined;

export function getSocket(token?: string | null): Socket {
  // Token değiştiyse eski bağlantıyı kapat, yenisini oluştur
  if (socket && currentToken !== token) {
    socket.disconnect();
    socket = null;
  }

  if (socket) return socket;

  currentToken = token;

  socket = io(`${API_URL}/chat`, {
    auth: token ? { token } : {},
    transports: ["websocket", "polling"],
    autoConnect: true,
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

// ── Yolculuk Telsiz (walkie-talkie) — ayrı namespace ─────────────────────────
let telsizSocket: Socket | null = null;
let telsizToken: string | null | undefined = undefined;

export function getTelsizSocket(token?: string | null): Socket {
  if (telsizSocket && telsizToken !== token) {
    telsizSocket.disconnect();
    telsizSocket = null;
  }
  if (telsizSocket) return telsizSocket;

  telsizToken = token;
  telsizSocket = io(`${API_URL}/telsiz`, {
    auth: token ? { token } : {},
    transports: ["websocket", "polling"],
    autoConnect: true,
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
  telsizToken = undefined;
}
