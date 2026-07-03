"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Clock, FileText, ImageIcon, KeyRound, Loader2, Lock, Send, Smile, WifiOff, X,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { getSocket } from "@/lib/socket";
import { ChatAvatar } from "@/components/sohbet/ChatAvatar";
import { ChatChannelsSidebar } from "@/components/sohbet/ChatChannelsSidebar";
import { ChatPageShell } from "@/components/sohbet/ChatPageShell";
import { DmConversationList } from "@/components/sohbet/DmConversationList";
import { DmJoinPasswordModal, DmPasswordModal } from "@/components/sohbet/DmPasswordModal";
import { NewMessageModal } from "@/components/sohbet/NewMessageModal";
import { DmEntry, isDeletedChatUser, markChatRead, scrollMessagesToBottom, setupChatViewportHeight } from "@/components/sohbet/chat-utils";
import { ChatMessageBubble, getLastReadOwnMessageId } from "@/components/sohbet/ChatMessageBubble";
import { formatTypingLabel, useChatTyping } from "@/components/sohbet/useChatTyping";
import { ModerationNotice } from "@/components/sohbet/ModerationNotice";
import { ChatRulesButton } from "@/components/sohbet/ChatRulesButton";
import { UserDisplayName } from "@/components/user/UserDisplayName";
import type { PostalCountry } from "@/lib/postal-country";

const EmojiPicker = dynamic(() => import("@emoji-mart/react"), { ssr: false });

type Attachment = { url: string; name: string; size: number; type: "image" | "file"; mime: string };
type Message = {
  id: string;
  body: string;
  attachments?: Attachment[] | null;
  expiresAt?: string | null;
  createdAt: string;
  reactions?: { emoji: string; count: number }[];
  user: { id: string; role?: string; profile?: { displayName: string; avatarUrl?: string | null; postalCountry?: "DE" | "TR" | null } | null };
};
type DmResolve = {
  chatId: string;
  name: string;
  hasPassword?: boolean;
  partnerLastReadAt?: string | null;
  targetUser: { id: string; role?: string; profile?: { displayName: string; avatarUrl?: string | null; postalCountry?: "DE" | "TR" | null } | null };
};

const TIMER_OPTIONS = [
  { label: "Yok", value: 0 }, { label: "30 sn", value: 30 },
  { label: "1 dk", value: 60 }, { label: "5 dk", value: 300 },
  { label: "1 sa", value: 3600 }, { label: "24 sa", value: 86400 },
];

export default function DmPage() {
  const params = useParams<{ userId: string }>();
  const router = useRouter();
  const { token, user, logout } = useAuth();

  const [dm, setDm] = useState<DmResolve | null>(null);
  const [hasPassword, setHasPassword] = useState(false);
  const [dms, setDms] = useState<DmEntry[]>([]);
  const [dmsLoading, setDmsLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [connected, setConnected] = useState(false);
  const [partnerOnline, setPartnerOnline] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [partnerLastReadAt, setPartnerLastReadAt] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [moderationNotice, setModerationNotice] = useState("");
  const [moderationCode, setModerationCode] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [expiresInSeconds, setExpiresInSeconds] = useState(0);
  const [showTimer, setShowTimer] = useState(false);
  const [channelsOpen, setChannelsOpen] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [showPasswordSettings, setShowPasswordSettings] = useState(false);
  const [showJoinPassword, setShowJoinPassword] = useState(false);
  const [passwordUnlocked, setPasswordUnlocked] = useState(false);
  const [deletingChatId, setDeletingChatId] = useState<string | null>(null);

  const messagesRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);
  const pendingPasswordRef = useRef<string>("");

  const scrollToBottom = useCallback((smooth = false) => {
    scrollMessagesToBottom(messagesRef.current, smooth);
  }, []);

  // Sohbet sayfasında sayfayı sabit yükseklikte tut; yalnızca mesaj listesi scroll etsin.
  // Klavye açıldığında mesaj yazma alanının arkada kalmaması için gerçek görünür
  // viewport yüksekliği (visualViewport) baz alınır.
  useEffect(() => setupChatViewportHeight(), []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) setShowEmoji(false);
    }
    if (showEmoji) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [showEmoji]);

  const loadDms = useCallback(() => {
    if (!token) return;
    api.get<DmEntry[]>("/chat/dm/list", token).then(setDms).catch(() => {});
  }, [token]);
  const loadDmsRef = useRef(loadDms);
  loadDmsRef.current = loadDms;
  const userIdRef = useRef(user?.id);
  userIdRef.current = user?.id;
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

  useEffect(() => {
    if (!token) { router.push("/giris"); return; }
    loadDms();
    setDmsLoading(false);
  }, [token, router, loadDms]);

  useEffect(() => {
    if (!token || !params?.userId) return;
    setMessages([]);
    setConnected(false);
    setPasswordUnlocked(false);
    pendingPasswordRef.current = "";
    api.post<DmResolve>(`/chat/dm/${params.userId}`, {}, token)
      .then((resolved) => {
        setDm(resolved);
        setHasPassword(!!resolved.hasPassword);
        setPartnerLastReadAt(resolved.partnerLastReadAt ?? null);
        if (!resolved.hasPassword) setPasswordUnlocked(true);
        else setShowJoinPassword(true);
        markChatRead(resolved.chatId, token, false);
        loadDms();
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Sohbet başlatılamadı"));
  }, [params?.userId, token, loadDms]);

  const stopTypingNow = useChatTyping(
    passwordUnlocked ? dm?.chatId : null,
    token,
    input,
    passwordUnlocked && connected,
  );
  const stopTypingRef = useRef(stopTypingNow);
  stopTypingRef.current = stopTypingNow;

  const lastReadOwnMessageId = useMemo(
    () => getLastReadOwnMessageId(messages, user?.id, partnerLastReadAt),
    [messages, user?.id, partnerLastReadAt],
  );

  useEffect(() => {
    if (!dm?.chatId || !passwordUnlocked) return;
    const chatId = dm.chatId;
    const targetUserId = dm.targetUser.id;
    const sock = getSocket(token);

    function joinRoom(pwd?: string) {
      sock.emit("join_room", {
        chatId,
        password: pwd ?? pendingPasswordRef.current ?? undefined,
      });
    }
    function onConnect() { setConnected(true); joinRoom(); }
    function onDisconnect() { setConnected(false); }
    function onPasswordRequired() { setShowJoinPassword(true); setPasswordUnlocked(false); setConnected(true); }
    function onOnlineUsers(users: { userId: string }[]) {
      setPartnerOnline(users.some((u) => u.userId === targetUserId));
    }
    function onHistory(msgs: Message[]) {
      setConnected(true);
      setMessages(msgs.filter((m) => !isDeletedChatUser(m.user.profile?.displayName)));
      setTimeout(() => scrollToBottomReliably(false), 0);
      markChatRead(chatId, token!, true);
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
      setMessages((prev) => [...prev, msg]);
      setTimeout(() => scrollToBottomReliably(true), 0);
      markChatRead(chatId, token!, sock.connected);
      loadDmsRef.current();
    }
    function onUserTyping(data: { userId: string }) {
      if (data.userId === targetUserId) setPartnerTyping(true);
    }
    function onUserTypingStop(data: { userId: string }) {
      if (data.userId === targetUserId) setPartnerTyping(false);
    }
    function onReadReceipt(data: { userId: string; readAt: string }) {
      if (data.userId === targetUserId) {
        setPartnerLastReadAt((prev) => {
          if (!prev || new Date(data.readAt) > new Date(prev)) return data.readAt;
          return prev;
        });
      }
    }
    function onModerationNotice(data: {
      message?: string;
      code?: string;
      clearInput?: boolean;
    }) {
      if (data?.message) {
        setModerationNotice(data.message);
        setModerationCode(data.code ?? "");
        if (data.clearInput !== false) {
          setInput("");
          setPendingAttachments([]);
        }
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

    function onMessageReaction(data: { messageId: string; reactions: { emoji: string; count: number }[] }) {
      setMessages((prev) =>
        prev.map((m) => m.id === data.messageId ? { ...m, reactions: data.reactions } : m),
      );
    }

    sock.on("connect", onConnect);
    sock.on("disconnect", onDisconnect);
    sock.on("password_required", onPasswordRequired);
    sock.on("online_users", onOnlineUsers);
    sock.on("history", onHistory);
    sock.on("new_message", onNewMessage);
    sock.on("user_typing", onUserTyping);
    sock.on("user_typing_stop", onUserTypingStop);
    sock.on("read_receipt", onReadReceipt);
    sock.on("moderation_notice", onModerationNotice);
    sock.on("message_reaction", onMessageReaction);
    sock.on("error", onSocketError);
    if (sock.connected) {
      setConnected(true);
      joinRoom();
    } else {
      sock.connect();
    }

    return () => {
      sock.emit("leave_room", { chatId });
      sock.off("connect", onConnect);
      sock.off("disconnect", onDisconnect);
      sock.off("password_required", onPasswordRequired);
      sock.off("online_users", onOnlineUsers);
      sock.off("history", onHistory);
      sock.off("new_message", onNewMessage);
      sock.off("user_typing", onUserTyping);
      sock.off("user_typing_stop", onUserTypingStop);
      sock.off("read_receipt", onReadReceipt);
      sock.off("moderation_notice", onModerationNotice);
      sock.off("message_reaction", onMessageReaction);
      sock.off("error", onSocketError);
      setPartnerTyping(false);
    };
  }, [dm?.chatId, token, passwordUnlocked, router, scrollToBottomReliably]);

  function submitJoinPassword(password: string) {
    pendingPasswordRef.current = password;
    setShowJoinPassword(false);
    setPasswordUnlocked(true);
    getSocket(token).emit("join_room", { chatId: dm?.chatId, password });
  }

  async function handleDeleteConversation(chatId: string) {
    if (!token || !confirm("Bu sohbeti gelen kutunuzdan silmek istediğinize emin misiniz?")) return;
    setDeletingChatId(chatId);
    try {
      await api.delete(`/chat/dm/${chatId}`, token);
      setDms((prev) => prev.filter((d) => d.chatId !== chatId));
      if (dm?.chatId === chatId) router.push("/sohbet/mesajlarim");
    } catch {
      // sessiz
    } finally {
      setDeletingChatId(null);
    }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length || !dm?.chatId || !token) return;
    e.target.value = "";
    setUploading(true);
    try {
      const uploaded: Attachment[] = [];
      for (const file of files) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3201"}/api/chat/${dm.chatId}/upload`,
          { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd },
        );
        if (res.ok) uploaded.push(await res.json());
      }
      setPendingAttachments((p) => [...p, ...uploaded]);
    } finally {
      setUploading(false);
    }
  }

  function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if ((!input.trim() && pendingAttachments.length === 0) || !dm?.chatId || !passwordUnlocked) return;
    getSocket(token).emit("send_message", {
      chatId: dm.chatId,
      body: input.trim(),
      attachments: pendingAttachments,
      ...(expiresInSeconds > 0 ? { expiresInSeconds } : {}),
    });
    setInput("");
    setPendingAttachments([]);
    stopTypingNow();
    inputRef.current?.focus();
  }

  if (error) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
        <p className="text-muted">{error}</p>
        <Link href="/sohbet/mesajlarim" className="text-sm text-primary hover:underline">← Mesajlara dön</Link>
      </div>
    );
  }

  const partnerName = dm?.targetUser.profile?.displayName ?? "…";
  const partnerAvatar = dm?.targetUser.profile?.avatarUrl;

  return (
    <>
      <ChatPageShell
        title={partnerName}
        subtitle={
          dm ? (
            <span className="flex items-center gap-1.5">
              <Lock className="h-3 w-3" />
              Özel sohbet
              {hasPassword && (
                <span className="flex items-center gap-0.5 text-warning">
                  <KeyRound className="h-3 w-3" /> şifreli
                </span>
              )}
              {connected && passwordUnlocked && partnerTyping && (
                <span className="text-primary">{formatTypingLabel([partnerName])}</span>
              )}
              {connected && passwordUnlocked && !partnerTyping && (
                partnerOnline ? (
                  <span className="flex items-center gap-1 text-success">
                    <span className="inline-block h-2 w-2 rounded-full bg-success" />
                    çevrimiçi
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <WifiOff className="h-3 w-3" />
                    çevrimdışı
                  </span>
                )
              )}
            </span>
          ) : undefined
        }
        status={
          passwordUnlocked ? (
            <span className={`flex items-center gap-1.5 text-xs ${connected ? "text-success" : "text-muted"}`}>
              <span className={`h-2 w-2 rounded-full ${connected ? "bg-success" : "bg-border"}`} />
              {connected ? "Bağlı" : "Bağlanıyor…"}
            </span>
          ) : null
        }
        headerActions={<ChatRulesButton />}
        backHref="/sohbet/mesajlarim"
      >
        {/* Sidebar'lar sadece desktop'ta görünür */}
        <div className="hidden md:contents">
          <ChatChannelsSidebar dmActive open={channelsOpen} onToggle={() => setChannelsOpen((v) => !v)} />
          <DmConversationList
            dms={dms}
            loading={dmsLoading}
            activeUserId={params?.userId}
            onNewMessage={() => setShowSearch(true)}
            onDelete={handleDeleteConversation}
            deletingChatId={deletingChatId}
          />
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background md:rounded-xl md:border md:border-border">
          {!dm ? (
            <div className="flex flex-1 items-center justify-center text-muted">Yükleniyor…</div>
          ) : !passwordUnlocked ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
              <KeyRound className="h-10 w-10 text-primary" />
              <p className="font-semibold">Şifre korumalı sohbet</p>
              <p className="text-sm text-muted">Devam etmek için sohbet şifresini girin.</p>
              <button
                type="button"
                onClick={() => setShowJoinPassword(true)}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
              >
                Şifreyi Gir
              </button>
            </div>
          ) : (
            <>
              {/* Sohbet araç çubuğu — mobilde WhatsApp tarzı header */}
              <div className="flex items-center gap-1 border-b border-border bg-surface px-1 py-1 md:gap-2 md:px-4 md:py-2">
                {/* Mobil: geri butonu */}
                <Link
                  href="/sohbet/mesajlarim"
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-muted active:bg-background md:hidden"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Link>

                <ChatAvatar name={partnerName} url={partnerAvatar} role={dm?.targetUser.role} size="sm" />

                {/* Mobil: ad + online durumu */}
                <div className="flex min-w-0 flex-1 flex-col md:hidden">
                  <p className="truncate text-sm font-semibold text-text">{partnerName}</p>
                  <p className={`text-xs ${partnerTyping ? "text-primary" : partnerOnline ? "text-success" : "text-muted"}`}>
                    {partnerTyping
                      ? "yazıyor…"
                      : partnerOnline ? "çevrimiçi" : "çevrimdışı"
                    }
                  </p>
                </div>

                {/* Desktop: ad */}
                <div className="hidden md:block">
                  <UserDisplayName
                    name={partnerName}
                    userId={dm?.targetUser.id}
                    postalCountry={dm?.targetUser.profile?.postalCountry as PostalCountry | undefined}
                    linkToProfile={false}
                  />
                </div>

                <div className="ml-auto flex items-center gap-1">
                  <ChatRulesButton />
                  <button
                    type="button"
                    onClick={() => setShowPasswordSettings(true)}
                    className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
                      hasPassword ? "bg-warning/10 text-warning hover:bg-warning/20" : "text-muted hover:bg-background hover:text-primary"
                    }`}
                    title="Sohbet şifresi"
                  >
                    <KeyRound className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{hasPassword ? "Şifreli" : "Şifre Ekle"}</span>
                  </button>
                </div>
              </div>

              <div ref={messagesRef} className="min-h-0 flex-1 overflow-y-auto px-3 py-3 md:px-4 md:py-4">
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center gap-3 pt-16 text-center">
                    <ChatAvatar name={partnerName} url={partnerAvatar} role={dm?.targetUser.role} size="lg" />
                    <p className="font-semibold">{partnerName}</p>
                    <p className="text-sm text-muted">Sohbet başlamadı. Merhaba deyin!</p>
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
                        showReadReceipt={isMe && msg.id === lastReadOwnMessageId}
                        reactions={msg.reactions}
                        onReact={(emoji) => {
                          const sock = getSocket(token!);
                          sock.emit("react_message", { messageId: msg.id, emoji });
                        }}
                      />
                    );
                  })}
                </div>
              </div>

              <form onSubmit={sendMessage} className="border-t border-border bg-surface px-2 py-2 md:px-4 md:py-3">
                <ModerationNotice
                  message={moderationNotice}
                  code={moderationCode}
                  onDismiss={() => { setModerationNotice(""); setModerationCode(""); }}
                />
                <div className="space-y-2">
                  {showTimer && (
                    <div className="flex flex-wrap items-center gap-1.5 rounded-lg bg-background px-3 py-2 text-xs">
                      <Clock className="h-3.5 w-3.5 text-muted" />
                      <span className="mr-1 text-muted">Otomatik sil:</span>
                      {TIMER_OPTIONS.map((opt) => (
                        <button key={opt.value} type="button"
                          onClick={() => { setExpiresInSeconds(opt.value); setShowTimer(false); }}
                          className={`rounded-full px-2.5 py-0.5 font-medium ${expiresInSeconds === opt.value ? "bg-primary text-white" : "border border-border bg-surface hover:border-primary"}`}>
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
                            ? <img src={att.url} alt={att.name} className="h-14 w-14 rounded-lg border border-border object-cover" />
                            : <div className="flex h-14 w-28 items-center gap-1.5 rounded-lg border border-border bg-background px-2 text-xs text-muted"><FileText className="h-4 w-4" /><span className="truncate">{att.name}</span></div>
                          }
                          <button type="button" onClick={() => setPendingAttachments((p) => p.filter((a) => a.url !== att.url))}
                            className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-danger text-white">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="relative flex items-center gap-1.5">
                    <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden" onChange={handleFileSelect} />
                    <button type="button" title="Resim" disabled={uploading}
                      onClick={() => fileInputRef.current?.click()}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-background hover:text-primary disabled:opacity-40">
                      {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
                    </button>
                    <div className="relative" ref={emojiRef}>
                      <button type="button" title="Emoji" onClick={() => setShowEmoji((v) => !v)}
                        className={`flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-background hover:text-primary ${showEmoji ? "bg-background text-primary" : ""}`}>
                        <Smile className="h-4 w-4" />
                      </button>
                      {showEmoji && (
                        <div className="absolute bottom-10 left-0 z-50">
                          <EmojiPicker
                            data={async () => (await import("@emoji-mart/data")).default}
                            locale="tr" theme="light" previewPosition="none" skinTonePosition="none"
                            onEmojiSelect={(emoji: { native: string }) => {
                              setInput((p) => p + emoji.native); setShowEmoji(false); inputRef.current?.focus();
                            }}
                          />
                        </div>
                      )}
                    </div>
                    <button type="button" title="Otomatik sil" onClick={() => setShowTimer((v) => !v)}
                      className={`flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-background hover:text-primary ${expiresInSeconds > 0 ? "text-warning" : ""}`}>
                      <Clock className="h-4 w-4" />
                    </button>
                    <input ref={inputRef} type="text" value={input} onChange={(e) => setInput(e.target.value)}
                      placeholder={expiresInSeconds > 0
                        ? `${TIMER_OPTIONS.find((t) => t.value === expiresInSeconds)?.label} sonra silinecek…`
                        : `@${partnerName} mesaj yaz…`}
                      maxLength={1000}
                      enterKeyHint="send"
                      className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <button type="submit"
                      disabled={(!input.trim() && pendingAttachments.length === 0) || !connected}
                      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-40">
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </form>
            </>
          )}
        </div>
      </ChatPageShell>

      <NewMessageModal open={showSearch} onClose={() => setShowSearch(false)} />
      <DmPasswordModal
        open={showPasswordSettings}
        chatId={dm?.chatId ?? null}
        token={token!}
        hasPassword={hasPassword}
        onClose={() => setShowPasswordSettings(false)}
        onUpdated={(hp) => setHasPassword(hp)}
      />
      <DmJoinPasswordModal
        open={showJoinPassword && !!dm}
        roomName={partnerName}
        onSubmit={submitJoinPassword}
        onClose={() => router.push("/sohbet/mesajlarim")}
      />
    </>
  );
}
