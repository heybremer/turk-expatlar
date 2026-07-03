"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Ban, ChevronDown, ChevronRight, Clock, FileText, Globe,
  Hash, ImageIcon, KeyRound, Loader2, Lock, MapPin, Menu,
  MessageCircle, Send, Smile, Trash2, Users, X,
} from "lucide-react";
import { api } from "@/lib/api";
import { siteContentClass } from "@/lib/site-layout";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { getSocket } from "@/lib/socket";
import { scrollMessagesToBottom, isDeletedChatUser, setupChatViewportHeight } from "@/components/sohbet/chat-utils";
import { ChatInputEmojiPicker } from "@/components/sohbet/ChatInputEmojiPicker";
import { ChatMessageBubble } from "@/components/sohbet/ChatMessageBubble";
import { formatTypingLabel, useChatTyping } from "@/components/sohbet/useChatTyping";
import { ModerationNotice } from "@/components/sohbet/ModerationNotice";
import { ChatRulesButton } from "@/components/sohbet/ChatRulesButton";
import { ChatAvatar } from "@/components/sohbet/ChatAvatar";
import { CountryFlagBadge } from "@/components/user/CountryFlagBadge";
import type { PostalCountry } from "@/lib/postal-country";

/* ─── Types ─────────────────────────────────────────────────────── */
type Attachment = { url: string; name: string; size: number; type: "image" | "file"; mime: string };
type Message = {
  id: string; body: string;
  attachments?: Attachment[] | null;
  expiresAt?: string | null;
  createdAt: string;
  reactions?: { emoji: string; count: number }[];
  user: { id: string; role?: string; profile?: { displayName: string; avatarUrl?: string | null; postalCountry?: "DE" | "TR" | null } | null };
};
type OnlineUser = { userId: string; displayName: string; avatarUrl?: string | null; postalCountry?: "DE" | "TR" | null; socketId: string };
type OfflineMember = {
  userId: string;
  displayName: string;
  avatarUrl?: string | null;
  postalCountry?: "DE" | "TR" | null;
};
type ChatResolve = { chatId: string; name: string };
type RoomItem = { href: string; label: string; type: "global" | "state" | "city" };

const TIMER_OPTIONS = [
  { label: "Yok", value: 0 }, { label: "30 sn", value: 30 },
  { label: "1 dk", value: 60 }, { label: "5 dk", value: 300 },
  { label: "1 sa", value: 3600 }, { label: "24 sa", value: 86400 },
];
const VISIBLE_STATES = 5;
const VISIBLE_CITIES = 8;

const STATE_SLUGS: Record<string, string> = {
  "Baden-Württemberg": "baden-wuerttemberg", Bayern: "bayern", Berlin: "berlin",
  Brandenburg: "brandenburg", Bremen: "bremen", Hamburg: "hamburg",
  Hessen: "hessen", "Mecklenburg-Vorpommern": "mecklenburg-vorpommern",
  Niedersachsen: "niedersachsen", "Nordrhein-Westfalen": "nordrhein-westfalen",
  "Rheinland-Pfalz": "rheinland-pfalz", Saarland: "saarland",
  Sachsen: "sachsen", "Sachsen-Anhalt": "sachsen-anhalt",
  "Schleswig-Holstein": "schleswig-holstein", Thüringen: "thueringen",
};
function toSlug(name: string) {
  return STATE_SLUGS[name] ?? name.toLowerCase()
    .replace(/ü/g, "ue").replace(/ö/g, "oe").replace(/ä/g, "ae").replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/* ─── Channel item ──────────────────────────────────────────────── */
function ChannelItem({ room, active, onClick }: { room: RoomItem; active: boolean; onClick?: () => void }) {
  const Icon = room.type === "global" ? Globe : room.type === "state" ? MapPin : Hash;
  return (
    <Link
      href={room.href}
      onClick={onClick}
      className={`flex min-h-[40px] items-center gap-2 rounded-lg px-2 py-2 text-sm transition-colors ${
        active
          ? "bg-primary/15 font-semibold text-primary"
          : "text-muted hover:bg-surface hover:text-text"
      }`}
    >
      <Icon className="h-3.5 w-3.5 flex-shrink-0" />
      <span className="truncate">{room.label}</span>
    </Link>
  );
}

/* ─── Channels sidebar content (desktop + mobile drawer) ────────── */
function ChannelsSidebarContent({
  currentHref, stateRooms, cityRooms,
  statesExpanded, setStatesExpanded,
  citiesExpanded, setCitiesExpanded,
  token, onLinkClick,
}: {
  currentHref: string;
  stateRooms: RoomItem[];
  cityRooms: RoomItem[];
  statesExpanded: boolean;
  setStatesExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  citiesExpanded: boolean;
  setCitiesExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  token: string | null;
  onLinkClick?: () => void;
}) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
      <p className="px-2 pt-1 pb-0.5 text-[10px] font-bold uppercase tracking-widest text-muted/60">Genel</p>
      <ChannelItem
        room={{ href: "/sohbet/genel/genel", label: "Genel Sohbet", type: "global" }}
        active={currentHref === "/sohbet/genel/genel"}
        onClick={onLinkClick}
      />

      {stateRooms.length > 0 && (
        <>
          <button
            onClick={() => setStatesExpanded((v) => !v)}
            className="flex w-full items-center gap-1 px-2 pt-3 pb-0.5 text-[10px] font-bold uppercase tracking-widest text-muted/60 hover:text-muted"
          >
            {statesExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            Eyaletler
          </button>
          {(statesExpanded ? stateRooms : stateRooms.slice(0, VISIBLE_STATES)).map((r) => (
            <ChannelItem key={r.href} room={r} active={currentHref === r.href} onClick={onLinkClick} />
          ))}
          {!statesExpanded && stateRooms.length > VISIBLE_STATES && (
            <button onClick={() => setStatesExpanded(true)} className="w-full px-2 py-1 text-left text-xs text-muted hover:text-primary">
              +{stateRooms.length - VISIBLE_STATES} daha…
            </button>
          )}
        </>
      )}

      {cityRooms.length > 0 && (
        <>
          <button
            onClick={() => setCitiesExpanded((v) => !v)}
            className="flex w-full items-center gap-1 px-2 pt-3 pb-0.5 text-[10px] font-bold uppercase tracking-widest text-muted/60 hover:text-muted"
          >
            {citiesExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            Şehirler
          </button>
          {(citiesExpanded ? cityRooms : cityRooms.slice(0, VISIBLE_CITIES)).map((r) => (
            <ChannelItem key={r.href} room={r} active={currentHref === r.href} onClick={onLinkClick} />
          ))}
          {!citiesExpanded && cityRooms.length > VISIBLE_CITIES && (
            <button onClick={() => setCitiesExpanded(true)} className="w-full px-2 py-1 text-left text-xs text-muted hover:text-primary">
              +{cityRooms.length - VISIBLE_CITIES} daha…
            </button>
          )}
        </>
      )}

      {token && stateRooms.length === 0 && cityRooms.length === 0 && (
        <p className="px-2 pt-3 text-[11px] leading-relaxed text-muted">
          Bölge kanalları için{" "}
          <Link href="/profil/duzenle" onClick={onLinkClick} className="text-primary hover:underline">
            konumunuzu ekleyin
          </Link>.
        </p>
      )}

      <div className="mt-2 border-t border-border pt-2">
        <Link
          href="/sohbet/mesajlarim"
          onClick={onLinkClick}
          className="flex min-h-[40px] items-center gap-2 rounded-lg px-2 py-2 text-sm text-muted hover:bg-background hover:text-text"
        >
          <Lock className="h-3.5 w-3.5" />
          <span className="truncate">Özel Mesajlar</span>
        </Link>
      </div>
    </div>
  );
}

/* ─── Members sidebar content (desktop + mobile drawer) ─────────── */
function MembersSidebarContent({
  meOnline,
  otherOnline,
  offlineMembers,
  memberProfiles,
  user,
  onUserClick,
}: {
  meOnline: OnlineUser | undefined;
  otherOnline: OnlineUser[];
  offlineMembers: OfflineMember[];
  memberProfiles: Map<string, { avatarUrl?: string | null; postalCountry?: "DE" | "TR" | null }>;
  user: { id: string; role?: string } | null;
  onUserClick?: () => void;
}) {
  function resolveAvatar(userId: string, avatarUrl?: string | null) {
    return avatarUrl ?? memberProfiles.get(userId)?.avatarUrl ?? null;
  }

  function resolveCountry(userId: string, postalCountry?: "DE" | "TR" | null) {
    return postalCountry ?? memberProfiles.get(userId)?.postalCountry;
  }

  function MemberLink({
    userId,
    displayName,
    avatarUrl,
    postalCountry,
    isOnline,
    muted,
  }: {
    userId: string;
    displayName: string;
    avatarUrl?: string | null;
    postalCountry?: "DE" | "TR" | null;
    isOnline: boolean;
    muted?: boolean;
  }) {
    const src = resolveAvatar(userId, avatarUrl);
    const country = resolveCountry(userId, postalCountry);
    return (
      <Link
        href={`/kullanici/${userId}`}
        onClick={onUserClick}
        title="Profili görüntüle"
        className="group flex min-h-[44px] items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-background"
      >
        <div className="relative flex-shrink-0">
          <ChatAvatar name={displayName} url={src} size="sm" />
          <span
            className={cn(
              "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-surface",
              isOnline ? "bg-success" : "bg-border",
            )}
          />
        </div>
        <p className={cn("flex-1 truncate text-xs", muted ? "text-muted" : "text-text")}>
          {displayName}
          <CountryFlagBadge country={country as PostalCountry | undefined} className="ml-1 align-middle" />
        </p>
      </Link>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
      {meOnline && (
        <Link
          href="/profil"
          className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-background"
        >
          <div className="relative flex-shrink-0">
            <ChatAvatar
              name={meOnline.displayName}
              url={resolveAvatar(meOnline.userId, meOnline.avatarUrl)}
              role={user?.role}
              size="sm"
            />
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-surface bg-success" />
          </div>
          <p className="truncate text-xs font-medium text-text">
            {meOnline.displayName}
            <span className="ml-1 font-normal text-muted">(ben)</span>
          </p>
        </Link>
      )}

      {otherOnline.length > 0 && (
        <>
          <p className="px-2 pt-2 pb-0.5 text-[10px] font-bold uppercase tracking-widest text-success/70">
            Çevrimiçi — {otherOnline.length}
          </p>
          {otherOnline.map((u) => (
            <MemberLink
              key={u.userId}
              userId={u.userId}
              displayName={u.displayName}
              avatarUrl={u.avatarUrl}
              postalCountry={u.postalCountry}
              isOnline
            />
          ))}
        </>
      )}

      {offlineMembers.length > 0 && (
        <>
          <p className="px-2 pt-2 pb-0.5 text-[10px] font-bold uppercase tracking-widest text-muted/60">
            Çevrimdışı — {offlineMembers.length}
          </p>
          {offlineMembers.map((u) => (
            <MemberLink
              key={u.userId}
              userId={u.userId}
              displayName={u.displayName}
              avatarUrl={u.avatarUrl}
              postalCountry={u.postalCountry}
              isOnline={false}
              muted
            />
          ))}
        </>
      )}

      {otherOnline.length === 0 && offlineMembers.length === 0 && !meOnline && (
        <p className="px-2 pt-4 text-center text-xs text-muted">Henüz kimse yok</p>
      )}
    </div>
  );
}

/* ─── Main page ─────────────────────────────────────────────────── */
export default function SohbetOdasiPage() {
  const params = useParams<{ type: string; slug: string }>();
  const router = useRouter();
  const { token, user, logout } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [chatId, setChatId] = useState<string | null>(null);
  const [roomName, setRoomName] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [regionUsers, setRegionUsers] = useState<OfflineMember[]>([]);
  const [allRooms, setAllRooms] = useState<{
    global?: { chatId: string; name: string };
    states: { id: string; name: string }[];
    cities: { id: string; name: string; stateId: string }[];
  }>({ states: [], cities: [] });
  const [input, setInput] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("");
  const [moderationNotice, setModerationNotice] = useState("");
  const [moderationCode, setModerationCode] = useState("");
  const [accessDenied, setAccessDenied] = useState<{ reason: string; requiredLocation?: string } | null>(null);
  const [membersOpen, setMembersOpen] = useState(true);
  const [channelsOpen, setChannelsOpen] = useState(true);
  const [dmLoading, setDmLoading] = useState<string | null>(null);
  const [statesExpanded, setStatesExpanded] = useState(false);
  const [citiesExpanded, setCitiesExpanded] = useState(false);
  const isGlobalRoom = params?.type === "genel";

  const [showEmoji, setShowEmoji] = useState(false);
  const [expiresInSeconds, setExpiresInSeconds] = useState(0);
  const [showTimer, setShowTimer] = useState(false);
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const pendingPasswordRef = useRef<string>("");
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});

  // Mobile drawer state
  const [mobileChannelsOpen, setMobileChannelsOpen] = useState(false);
  const [mobileMembersOpen, setMobileMembersOpen] = useState(false);

  const messagesRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const emojiBtnRef = useRef<HTMLButtonElement>(null);

  const scrollToBottom = useCallback((smooth = false) => {
    scrollMessagesToBottom(messagesRef.current, smooth);
  }, []);
  const scrollToBottomRef = useRef(scrollToBottom);
  scrollToBottomRef.current = scrollToBottom;

  // Yeni mesaj DOM'a eklendiğinde (resim eki, uzun metin vb. yüzünden) içerik yüksekliği
  // ilk anda tam ölçülemeyebiliyor; tek seferlik scrollTo bu durumda listeyi tam en alta
  // indiremiyor. Birkaç kez tekrar deneyerek son mesajın kesin görünmesini sağlar.
  const scrollToBottomReliably = useCallback((smooth = false) => {
    scrollToBottomRef.current(smooth);
    [50, 150, 300, 600].forEach((delay) => {
      setTimeout(() => scrollToBottomRef.current(false), delay);
    });
  }, []);
  const userIdRef = useRef(user?.id);
  userIdRef.current = user?.id;

  // Sohbet sayfasında sayfayı sabit yükseklikte tut; yalnızca mesaj listesi scroll etsin.
  // Klavye açıldığında mesaj yazma alanının arkada kalmaması için gerçek görünür
  // viewport yüksekliği (visualViewport) baz alınır.
  useEffect(() => setupChatViewportHeight(), []);

  // Close mobile drawers when navigating to a different room
  useEffect(() => {
    setMobileChannelsOpen(false);
    setMobileMembersOpen(false);
  }, [params?.type, params?.slug]);

  useEffect(() => {
    if (token) {
      api.get<{
        global?: { chatId: string; name: string };
        states: { id: string; name: string }[];
        cities: { id: string; name: string; stateId: string }[];
      }>("/chat/rooms/accessible", token)
        .then(setAllRooms)
        .catch(() => setAllRooms({ states: [], cities: [] }));
    } else {
      setAllRooms({ states: [], cities: [] });
    }
  }, [token]);

  useEffect(() => {
    if (!params?.type || !params?.slug) return;
    const apiType =
      params.type === "eyalet" ? "state"
      : params.type === "sehir" ? "city"
      : params.type === "genel" ? "global"
      : params.type;
    api.get<ChatResolve>(`/chat/resolve/${apiType}/${params.slug}`)
      .then(({ chatId: id, name }) => {
        setChatId(id);
        setRoomName(name);
        api.get<OfflineMember[]>(`/chat/${id}/region-users`)
          .then((users) =>
            setRegionUsers(users.filter((u) => !isDeletedChatUser(u.displayName))),
          )
          .catch(() => null);
      })
      .catch(() => setError("Oda bulunamadı"));
  }, [params?.type, params?.slug]);

  const stopTypingNow = useChatTyping(chatId, token, input, !!token && connected);
  const stopTypingRef = useRef(stopTypingNow);
  stopTypingRef.current = stopTypingNow;

  useEffect(() => {
    if (!chatId) return;
    const sock = getSocket(token);

    function joinRoom(pwd?: string) {
      sock.emit("join_room", { chatId, password: pwd ?? pendingPasswordRef.current ?? undefined });
    }
    function onConnect() { setConnected(true); joinRoom(); }
    function onDisconnect() { setConnected(false); }
    function onAccessDenied(data: { reason: string; requiredLocation?: string }) { setAccessDenied(data); }
    function onPasswordRequired() { setPasswordRequired(true); setConnected(true); }
    function onHistory(msgs: Message[]) {
      setConnected(true);
      setMessages(msgs.filter((m) => !isDeletedChatUser(m.user.profile?.displayName)));
      setTimeout(() => scrollToBottomReliably(false), 0);
    }
    function onNewMessage(msg: Message) {
      if (isDeletedChatUser(msg.user.profile?.displayName)) return;
      if (msg.user?.id === userIdRef.current) {
        setInput("");
        setPendingAttachments([]);
        setExpiresInSeconds(0);
        setShowTimer(false);
        stopTypingRef.current();
      }
      setMessages((p) => [...p, msg]);
      setTimeout(() => scrollToBottomReliably(true), 0);
    }
    function onUserTyping(data: { userId: string; displayName?: string }) {
      if (data.userId === userIdRef.current) return;
      if (isDeletedChatUser(data.displayName)) return;
      setTypingUsers((prev) => ({ ...prev, [data.userId]: data.displayName ?? "Birisi" }));
    }
    function onUserTypingStop(data: { userId: string }) {
      setTypingUsers((prev) => { const next = { ...prev }; delete next[data.userId]; return next; });
    }
    function onOnlineUsers(users: OnlineUser[]) {
      const seen = new Set<string>();
      const deduped = users.filter((u) => {
        if (isDeletedChatUser(u.displayName)) return false;
        if (seen.has(u.userId)) return false;
        seen.add(u.userId);
        return true;
      });
      setOnlineUsers((prev) => {
        if (prev.length === deduped.length && prev.every((p, i) => p.userId === deduped[i]?.userId)) return prev;
        return deduped;
      });
    }
    function onMessageDeleted({ messageId }: { messageId: string }) {
      setMessages((p) => p.filter((m) => m.id !== messageId));
    }
    function onRoomCleared() {
      setMessages([]);
    }
    function onMessageReaction(data: { messageId: string; reactions: { emoji: string; count: number }[] }) {
      setMessages((p) => p.map((m) => (m.id === data.messageId ? { ...m, reactions: data.reactions } : m)));
    }
    function onModerationNotice(data: { message?: string; code?: string; clearInput?: boolean }) {
      if (data?.message) {
        setModerationNotice(data.message);
        setModerationCode(data.code ?? "");
        if (data.clearInput !== false) { setInput(""); setPendingAttachments([]); }
      }
    }
    function onSocketError(data: { message?: string }) {
      const msg = data?.message ?? "Bir hata oluştu";
      if (msg.toLowerCase().includes("giriş")) {
        logout();
        router.push(`/giris?redirect=${encodeURIComponent(window.location.pathname)}`);
      } else {
        setModerationNotice(msg);
        setModerationCode("ERROR");
      }
    }

    sock.on("connect", onConnect);
    sock.on("disconnect", onDisconnect);
    sock.on("access_denied", onAccessDenied);
    sock.on("password_required", onPasswordRequired);
    sock.on("history", onHistory);
    sock.on("new_message", onNewMessage);
    sock.on("user_typing", onUserTyping);
    sock.on("user_typing_stop", onUserTypingStop);
    sock.on("online_users", onOnlineUsers);
    sock.on("message_deleted", onMessageDeleted);
    sock.on("room_cleared", onRoomCleared);
    sock.on("message_reaction", onMessageReaction);
    sock.on("moderation_notice", onModerationNotice);
    sock.on("error", onSocketError);
    if (sock.connected) { setConnected(true); joinRoom(); } else { sock.connect(); }

    return () => {
      sock.emit("leave_room", { chatId });
      sock.off("connect", onConnect); sock.off("disconnect", onDisconnect);
      sock.off("access_denied", onAccessDenied); sock.off("password_required", onPasswordRequired);
      sock.off("history", onHistory); sock.off("new_message", onNewMessage);
      sock.off("user_typing", onUserTyping); sock.off("user_typing_stop", onUserTypingStop);
      sock.off("online_users", onOnlineUsers); sock.off("message_deleted", onMessageDeleted);
      sock.off("room_cleared", onRoomCleared);
      sock.off("message_reaction", onMessageReaction);
      sock.off("moderation_notice", onModerationNotice);
      sock.off("error", onSocketError);
      setTypingUsers({});
    };
  }, [chatId, token, router, scrollToBottomReliably]);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length || !chatId || !token) return;
    e.target.value = "";
    setUploading(true);
    try {
      const uploaded: Attachment[] = [];
      for (const file of files) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3201"}/api/chat/${chatId}/upload`,
          { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd },
        );
        if (res.ok) uploaded.push(await res.json());
      }
      setPendingAttachments((p) => [...p, ...uploaded]);
    } finally { setUploading(false); }
  }

  function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if ((!input.trim() && pendingAttachments.length === 0) || !chatId) return;
    if (!token) return;
    getSocket(token).emit("send_message", {
      chatId, body: input.trim(), attachments: pendingAttachments,
      ...(expiresInSeconds > 0 ? { expiresInSeconds } : {}),
    });
    setInput("");
    setPendingAttachments([]);
    stopTypingNow();
    inputRef.current?.focus();
  }

  function deleteMsg(messageId: string) { getSocket(token).emit("delete_message", { messageId }); }

  async function clearRoom() {
    if (!chatId || !token) return;
    if (!confirm("Bu odadaki tüm mesajlar herkes için silinecek. Bu işlem geri alınamaz. Devam edilsin mi?")) return;
    try {
      await api.delete(`/chat/${chatId}/messages`, token);
      setMessages([]);
    } catch {
      alert("Sohbet temizlenemedi");
    }
  }

  async function openDm(targetUserId: string) {
    if (!token) { router.push("/giris"); return; }
    setDmLoading(targetUserId);
    try { await api.post(`/chat/dm/${targetUserId}`, {}, token); router.push(`/sohbet/dm/${targetUserId}`); }
    finally { setDmLoading(null); }
  }

  function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!passwordInput.trim()) return;
    pendingPasswordRef.current = passwordInput.trim();
    getSocket(token).emit("join_room", { chatId, password: passwordInput.trim() });
    setPasswordRequired(false); setPasswordInput("");
  }

  /* ─── Channel/member list helpers ───────────────────────────────── */
  const currentHref = params ? `/sohbet/${params.type}/${params.slug}` : "";
  const channelRooms: RoomItem[] = [
    { href: "/sohbet/genel/genel", label: "Genel Sohbet", type: "global" },
    ...allRooms.states.map((s) => ({ href: `/sohbet/eyalet/${toSlug(s.name)}`, label: s.name, type: "state" as const })),
    ...allRooms.cities.map((c) => ({ href: `/sohbet/sehir/${toSlug(c.name)}`, label: c.name, type: "city" as const })),
  ];
  const stateRooms = channelRooms.filter((r) => r.type === "state");
  const cityRooms = channelRooms.filter((r) => r.type === "city");

  const onlineIds = new Set(onlineUsers.map((u) => u.userId));
  const meOnline = onlineUsers.find((u) => u.userId === user?.id);
  const otherOnline = onlineUsers.filter((u) => u.userId !== user?.id);
  const offlineMembers = regionUsers.filter((u) => u.userId !== user?.id && !onlineIds.has(u.userId));

  const memberProfiles = useMemo(() => {
    const map = new Map<string, { avatarUrl?: string | null; postalCountry?: "DE" | "TR" | null }>();
    for (const u of regionUsers) {
      map.set(u.userId, { avatarUrl: u.avatarUrl, postalCountry: u.postalCountry });
    }
    return map;
  }, [regionUsers]);

  /* ─── Error states ───────────────────────────────────────────────── */
  if (error) return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
      <p className="text-muted">{error}</p>
      <Link href="/sohbet" className="text-sm text-primary hover:underline">← Sohbete dön</Link>
    </div>
  );

  if (accessDenied) {
    const noLoc = accessDenied.reason === "no_location";
    const isBlocked = accessDenied.reason === "blocked";
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 px-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-warning/10">
          {noLoc ? <MapPin className="h-7 w-7 text-warning" /> : isBlocked ? <Ban className="h-7 w-7 text-warning" /> : <Lock className="h-7 w-7 text-warning" />}
        </div>
        <div>
          <h2 className="text-lg font-bold">{isBlocked ? "Bu sohbete erişilemiyor" : "Bu odaya erişilemiyor"}</h2>
          <p className="mt-1 max-w-sm text-sm text-muted">
            {noLoc
              ? <>Erişmek için profilinizde konum bilgisi gerekli.</>
              : isBlocked
                ? <>Bu kullanıcıyla mesajlaşamazsınız.</>
                : <><strong>{accessDenied.requiredLocation}</strong> sakinine özel oda.</>}
          </p>
        </div>
        <div className="flex gap-3">
          {noLoc && <Link href="/profil/duzenle" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white">Konum ekle</Link>}
          <Link href="/sohbet" className="rounded-lg border border-border px-4 py-2 text-sm">← Geri</Link>
        </div>
      </div>
    );
  }

  if (passwordRequired) return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-lg">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10">
            <KeyRound className="h-5 w-5 text-primary" />
          </div>
          <div><p className="font-bold">Şifreli Oda</p><p className="text-sm text-muted">{roomName}</p></div>
        </div>
        <form onSubmit={submitPassword} className="space-y-3">
          <input autoFocus type="password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)}
            placeholder="Oda şifresi..." className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
          <button type="submit" disabled={!passwordInput.trim()} className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-40">Gir</button>
          <Link href="/sohbet" className="block text-center text-sm text-muted hover:text-text">← Geri dön</Link>
        </form>
      </div>
    </div>
  );

  /* ─── Main layout ────────────────────────────────────────────────── */
  return (
    <div className={cn("flex min-h-0 w-full flex-1 flex-col overflow-hidden md:py-8", siteContentClass)}>

      {/* ── Mobile header (WhatsApp/Telegram style) ─── */}
      <div className="flex items-center gap-1 border-b border-border bg-surface px-1 py-1 md:hidden">
        <Link
          href="/sohbet"
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-muted active:bg-background"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <button
          onClick={() => setMobileChannelsOpen(true)}
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-muted active:bg-background"
          title="Kanallar"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex min-w-0 flex-1 flex-col px-1">
          <div className="flex items-center gap-1">
            {isGlobalRoom
              ? <Globe className="h-3.5 w-3.5 flex-shrink-0 text-primary" />
              : <Hash className="h-3.5 w-3.5 flex-shrink-0 text-muted" />
            }
            <p className="truncate text-sm font-semibold text-text">{roomName || "…"}</p>
          </div>
          <p className={`text-xs ${connected ? "text-success" : "text-muted"}`}>
            {connected
              ? onlineUsers.length > 0 ? `${onlineUsers.length} çevrimiçi` : "Bağlı"
              : "Bağlanıyor…"
            }
          </p>
        </div>
        <ChatRulesButton />
        {isAdmin && (
          <button
            onClick={clearRoom}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-muted active:bg-background"
            title="Sohbeti temizle"
          >
            <Trash2 className="h-4.5 w-4.5" />
          </button>
        )}
        <button
          onClick={() => setMobileMembersOpen(true)}
          className="flex h-10 flex-shrink-0 items-center gap-1 rounded-full px-2.5 text-muted active:bg-background"
          title="Üyeler"
        >
          <Users className="h-4.5 w-4.5 h-[18px] w-[18px]" />
          {onlineUsers.length > 0 && (
            <span className="text-xs font-semibold tabular-nums">{onlineUsers.length}</span>
          )}
        </button>
      </div>

      {/* ── Desktop header ─── */}
      <div className="mb-3 hidden items-center gap-3 md:flex">
        <Link href="/sohbet" className="flex items-center gap-1.5 text-sm text-muted hover:text-text">
          <ArrowLeft className="h-4 w-4" /> Sohbet
        </Link>
        <span className="text-muted">/</span>
        <p className="flex items-center gap-1.5 text-sm font-semibold text-text">
          {isGlobalRoom ? <Globe className="h-4 w-4 text-primary" /> : <Hash className="h-4 w-4 text-muted" />}
          {roomName || "…"}
        </p>
        <div className="ml-auto flex items-center gap-2">
          <ChatRulesButton />
          {isAdmin && (
            <button
              onClick={clearRoom}
              className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted hover:border-danger hover:text-danger"
              title="Sohbeti temizle"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Sohbeti temizle
            </button>
          )}
          <span className={`flex items-center gap-1.5 text-xs ${connected ? "text-success" : "text-muted"}`}>
            <span className={`h-2 w-2 rounded-full ${connected ? "bg-success" : "bg-border"}`} />
            {connected ? "Bağlı" : "Bağlanıyor…"}
          </span>
        </div>
      </div>

      {/* ── 3-column body ─── */}
      <div className="flex min-h-0 flex-1 overflow-hidden md:gap-3">

        {/* Sol: Kanallar — sadece desktop */}
        <aside className={`hidden md:flex flex-shrink-0 flex-col overflow-hidden rounded-xl border border-border bg-surface transition-all duration-200 ${channelsOpen ? "w-52" : "w-10"}`}>
          <button
            onClick={() => setChannelsOpen((v) => !v)}
            className="flex items-center justify-between border-b border-border px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted hover:text-text"
          >
            {channelsOpen
              ? <><MessageCircle className="h-3.5 w-3.5" /><span className="flex-1 pl-1.5">Kanallar</span><X className="h-3.5 w-3.5" /></>
              : <MessageCircle className="h-3.5 w-3.5 mx-auto" />
            }
          </button>
          {channelsOpen && (
            <ChannelsSidebarContent
              currentHref={currentHref}
              stateRooms={stateRooms}
              cityRooms={cityRooms}
              statesExpanded={statesExpanded}
              setStatesExpanded={setStatesExpanded}
              citiesExpanded={citiesExpanded}
              setCitiesExpanded={setCitiesExpanded}
              token={token}
            />
          )}
        </aside>

        {/* Orta: Sohbet alanı */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background md:rounded-xl md:border md:border-border">

          {/* Mesaj akışı */}
          <div ref={messagesRef} className="min-h-0 flex-1 overflow-y-auto px-3 py-3 md:px-4 md:py-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-3 pt-16 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                  {isGlobalRoom ? <Globe className="h-7 w-7 text-primary" /> : <Hash className="h-7 w-7 text-primary" />}
                </div>
                <p className="font-semibold">{roomName}</p>
                <p className="text-sm text-muted">Henüz mesaj yok — ilk siz yazın!</p>
              </div>
            )}
            <div className="space-y-0.5">
              {messages.map((msg, i) => {
                const isMe = msg.user.id === user?.id;
                const name = msg.user.profile?.displayName ?? "Anonim";
                const prevMsg = messages[i - 1];
                const grouped = prevMsg?.user.id === msg.user.id &&
                  (new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime()) < 5 * 60 * 1000;
                return (
                  <ChatMessageBubble
                    key={msg.id}
                    isMe={isMe}
                    grouped={grouped}
                    body={msg.body}
                    attachments={msg.attachments}
                    expiresAt={msg.expiresAt}
                    createdAt={msg.createdAt}
                    displayName={isMe ? "Sen" : name}
                    avatarUrl={msg.user.profile?.avatarUrl}
                    role={msg.user.role}
                    postalCountry={msg.user.profile?.postalCountry as PostalCountry | undefined}
                    reactions={msg.reactions}
                    onNameClick={!isMe ? () => openDm(msg.user.id) : undefined}
                    onDelete={isMe ? () => deleteMsg(msg.id) : undefined}
                    onReact={(emoji) => {
                      if (!token) return;
                      getSocket(token).emit("react_message", { messageId: msg.id, emoji });
                    }}
                  />
                );
              })}
            </div>
          </div>

          {/* Mesaj giriş alanı */}
          <div className="border-t border-border bg-surface px-2 py-2 md:px-4 md:py-3">
            {token ? (
              <div className="space-y-2">
                {showTimer && (
                  <div className="flex flex-wrap items-center gap-1.5 rounded-lg bg-background px-3 py-2 text-xs">
                    <Clock className="h-3.5 w-3.5 text-muted" />
                    <span className="mr-1 text-muted">Otomatik sil:</span>
                    {TIMER_OPTIONS.map((opt) => (
                      <button key={opt.value} type="button"
                        onClick={() => { setExpiresInSeconds(opt.value); setShowTimer(false); }}
                        className={`rounded-full px-2.5 py-0.5 font-medium transition-colors ${expiresInSeconds === opt.value ? "bg-primary text-white" : "border border-border bg-surface hover:border-primary"}`}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
                {pendingAttachments.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {pendingAttachments.map((att) => (
                      <div key={att.url} className="relative">
                        {att.type === "image"
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img src={att.url} alt={att.name} className="h-14 w-14 rounded-lg object-cover border border-border" />
                          : <div className="flex h-14 w-28 items-center gap-1.5 rounded-lg border border-border bg-background px-2 text-xs text-muted"><FileText className="h-4 w-4 flex-shrink-0" /><span className="truncate">{att.name}</span></div>
                        }
                        <button type="button" onClick={() => setPendingAttachments((p) => p.filter((a) => a.url !== att.url))}
                          className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-danger text-white">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <ModerationNotice
                  message={moderationNotice}
                  code={moderationCode}
                  onDismiss={() => { setModerationNotice(""); setModerationCode(""); }}
                />
                {Object.keys(typingUsers).length > 0 && (
                  <p className="text-xs text-primary">{formatTypingLabel(Object.values(typingUsers))}</p>
                )}
                <div className="relative flex items-center gap-1">
                  <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden" onChange={handleFileSelect} />

                  <button type="button" title="Resim" disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-muted hover:bg-background hover:text-primary disabled:opacity-40 active:bg-background">
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
                  </button>

                  <button
                    ref={emojiBtnRef}
                    type="button"
                    title="Emoji"
                    onClick={() => setShowEmoji((v) => !v)}
                    className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-muted hover:bg-background hover:text-primary active:bg-background ${showEmoji ? "bg-background text-primary" : ""}`}
                  >
                    <Smile className="h-4 w-4" />
                  </button>
                  <ChatInputEmojiPicker
                    open={showEmoji}
                    anchorRef={emojiBtnRef}
                    onClose={() => setShowEmoji(false)}
                    onSelect={(emoji) => {
                      setInput((p) => p + emoji);
                      inputRef.current?.focus();
                    }}
                  />

                  <button type="button" title="Otomatik sil"
                    onClick={() => setShowTimer((v) => !v)}
                    className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-muted hover:bg-background hover:text-primary active:bg-background ${expiresInSeconds > 0 ? "text-warning" : ""}`}>
                    <Clock className="h-4 w-4" />
                  </button>

                  <form onSubmit={sendMessage} className="flex flex-1 items-center gap-1.5">
                    <input ref={inputRef} type="text" value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder={expiresInSeconds > 0
                        ? `${TIMER_OPTIONS.find((t) => t.value === expiresInSeconds)?.label} sonra silinecek…`
                        : `#${roomName} kanalına mesaj yaz…`}
                      maxLength={1000}
                      enterKeyHint="send"
                      className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <button type="submit"
                      disabled={(!input.trim() && pendingAttachments.length === 0) || !connected}
                      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary text-white hover:bg-primary/90 disabled:opacity-40 active:bg-primary/90">
                      <Send className="h-4 w-4" />
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-3 py-1">
                <p className="text-sm text-muted">Mesaj göndermek için giriş yap</p>
                <Link href="/giris" className="text-sm font-medium text-primary hover:underline">Giriş yap →</Link>
              </div>
            )}
          </div>
        </div>

        {/* Sağ: Üyeler — sadece desktop */}
        <aside className={`hidden md:flex flex-shrink-0 flex-col overflow-hidden rounded-xl border border-border bg-surface transition-all duration-200 ${membersOpen ? "w-48" : "w-10"}`}>
          <button
            onClick={() => setMembersOpen((v) => !v)}
            className="flex items-center justify-between border-b border-border px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted hover:text-text"
          >
            {membersOpen
              ? <><Users className="h-3.5 w-3.5" /><span className="flex-1 pl-1.5">Üyeler</span><X className="h-3.5 w-3.5" /></>
              : <Users className="h-3.5 w-3.5 mx-auto" />
            }
          </button>
          {membersOpen && (
            <MembersSidebarContent
              meOnline={meOnline}
              otherOnline={otherOnline}
              offlineMembers={offlineMembers}
              memberProfiles={memberProfiles}
              user={user}
            />
          )}
        </aside>
      </div>

      {/* ── Mobil: Kanallar Drawer (sol) ─── */}
      {mobileChannelsOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileChannelsOpen(false)}
          />
          <div className="absolute bottom-0 left-0 top-0 flex w-72 max-w-[85vw] flex-col bg-surface shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-primary" />
                <p className="text-sm font-bold">Kanallar</p>
              </div>
              <button
                onClick={() => setMobileChannelsOpen(false)}
                className="rounded-full p-1.5 text-muted hover:bg-background"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <ChannelsSidebarContent
              currentHref={currentHref}
              stateRooms={stateRooms}
              cityRooms={cityRooms}
              statesExpanded={statesExpanded}
              setStatesExpanded={setStatesExpanded}
              citiesExpanded={citiesExpanded}
              setCitiesExpanded={setCitiesExpanded}
              token={token}
              onLinkClick={() => setMobileChannelsOpen(false)}
            />
          </div>
        </div>
      )}

      {/* ── Mobil: Üyeler Drawer (sağ) ─── */}
      {mobileMembersOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileMembersOpen(false)}
          />
          <div className="absolute bottom-0 right-0 top-0 flex w-72 max-w-[85vw] flex-col bg-surface shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <p className="text-sm font-bold">Üyeler</p>
              </div>
              <button
                onClick={() => setMobileMembersOpen(false)}
                className="rounded-full p-1.5 text-muted hover:bg-background"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <MembersSidebarContent
              meOnline={meOnline}
              otherOnline={otherOnline}
              offlineMembers={offlineMembers}
              memberProfiles={memberProfiles}
              user={user}
              onUserClick={() => setMobileMembersOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
