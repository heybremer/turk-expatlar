import { io, Socket } from "socket.io-client";

const WS_URL = "https://api.turkexpatlar.de";

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
    transports: ["websocket"],
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

export function isSocketConnected(): boolean {
  return socket?.connected ?? false;
}
