import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import Animated from "react-native-reanimated";
import { useComposerInset } from "@/hooks/useComposerInset";
import {
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  Ban,
  BellOff,
  Camera,
  Check,
  ChevronDown,
  ChevronUp,
  Globe,
  Hash,
  Image as ImageIcon,
  KeyRound,
  Plus,
  Lock,
  LockOpen,
  MapPin,
  MessagesSquare,
  Mic,
  MoreVertical,
  Pencil,
  Reply,
  Search,
  Send,
  Timer,
  Users,
  X,
  type LucideIcon,
} from "lucide-react-native";
import * as Clipboard from "expo-clipboard";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/lib/auth";
import {
  api,
  ApiError,
  ChatAccessDenied,
  ChatAttachment,
  ChatMessage,
  ChatOnlineUser,
  ChatResolve,
  ChatUserRef,
  DmResolveResult,
} from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { avatarUrl } from "@/lib/utils";
import { haptics } from "@/lib/haptics";
import { colors } from "@/lib/colors";
import { formatTypingLabel, useChatTyping } from "@/hooks/useChatTyping";
import { Avatar } from "@/components/ui/Avatar";
import { BackButton } from "@/components/ui/BackButton";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { IconTile } from "@/components/ui/kit";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { TextField } from "@/components/ui/TextField";
import { DetailHeader } from "@/components/navigation/DetailHeader";
import { ChatMessageBubble, attachmentSummary } from "@/components/chat/ChatMessageBubble";
import { MessageActionSheet } from "@/components/chat/MessageActionSheet";
import { ForwardModal } from "@/components/chat/ForwardModal";
import { OnlineUsersModal } from "@/components/chat/OnlineUsersModal";
import { DmPasswordModal } from "@/components/chat/DmPasswordModal";
import { ImageViewerModal } from "@/components/chat/ImageViewerModal";
import { TimerPicker } from "@/components/chat/TimerPicker";
import { VoiceRecorderBar } from "@/components/chat/VoiceRecorderBar";
import { SwipeToReply } from "@/components/chat/SwipeToReply";
import { TypingBubble } from "@/components/chat/TypingBubble";

const GROUP_WINDOW_MS = 5 * 60 * 1000;
const NEAR_BOTTOM_PX = 150;
/** Backend ChatService.getEditableMessage ile aynı düzenleme penceresi. */
const EDIT_WINDOW_MS = 15 * 60 * 1000;

/** Sunucu mesajları chatId ve editedAt ile gönderir; paylaşılan tipte bu alanlar yok. */
type ServerMessage = ChatMessage & { chatId?: string; editedAt?: string | null };

/** Sohbetten çıkıp geri gelince yazılmış ama gönderilmemiş metin kaybolmasın. */
const drafts = new Map<string, string>();

export default function ChatRoomScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { token, user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isAdmin = user?.role === "ADMIN";

  const isDm = (slug ?? "").startsWith("dm-");
  const targetUserId = isDm ? slug!.replace("dm-", "") : null;
  const [routeType, ...restParts] = (slug ?? "").split("-");
  const apiType = routeType as "global" | "state" | "city";
  const actualSlug = restParts.join("-");

  const [chatId, setChatId] = useState<string | null>(null);
  const [roomName, setRoomName] = useState("");
  const [blockedByMe, setBlockedByMe] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [forwardMessage, setForwardMessage] = useState<ChatMessage | null>(null);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [uploadingVoice, setUploadingVoice] = useState(false);
  const [resolveError, setResolveError] = useState("");
  const [accessDenied, setAccessDenied] = useState<ChatAccessDenied | null>(null);
  const [targetUser, setTargetUser] = useState<ChatUserRef | null>(null);
  const [hasPassword, setHasPassword] = useState(false);
  const [partnerLastReadAt, setPartnerLastReadAt] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hasMoreOlder, setHasMoreOlder] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const oldestCreatedAtRef = useRef<string | null>(null);

  const [onlineUsers, setOnlineUsers] = useState<ChatOnlineUser[]>([]);
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
  const [showOnlineUsers, setShowOnlineUsers] = useState(false);

  const [inputText, setInputText] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachment[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [expiresInSeconds, setExpiresInSeconds] = useState(0);
  const [showTimerPicker, setShowTimerPicker] = useState(false);

  const [connected, setConnected] = useState(false);
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [moderationNotice, setModerationNotice] = useState("");
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [activeMessage, setActiveMessage] = useState<ChatMessage | null>(null);
  const [viewerImageUrl, setViewerImageUrl] = useState<string | null>(null);
  const [replyTarget, setReplyTarget] = useState<ChatMessage | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMatchPos, setSearchMatchPos] = useState(0);

  const flatListRef = useRef<FlatList>(null);
  const pendingPasswordRef = useRef<string>("");
  const connectedRef = useRef(connected);
  connectedRef.current = connected;
  const pendingTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const nearBottomRef = useRef(true);
  const [showJumpButton, setShowJumpButton] = useState(false);
  const [unseenCount, setUnseenCount] = useState(0);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [flashMessageId, setFlashMessageId] = useState<string | null>(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const draftBeforeEditRef = useRef("");
  const inputRef = useRef<TextInput>(null);
  const queryClient = useQueryClient();

  // Aynı stack'te iki sohbet ekranı açık olabilir (oda → DM). Socket paylaşıldığı için
  // chatId taşımayan event'ler yalnızca odaklı ekranda veya bekleyen join yanıtında işlenir.
  const focusedRef = useRef(true);
  const awaitingJoinRef = useRef(false);

  // Liste ters (inverted) çizildiği için offset 0 = en yeni mesaj; içerik yüksekliği
  // sonradan ölçülse bile en alt her zaman doğru kalır.
  function scrollToBottom(animated = true) {
    flatListRef.current?.scrollToOffset({ offset: 0, animated });
    setUnseenCount(0);
  }

  const composerInsetStyle = useComposerInset();

  useEffect(() => {
    if (!chatId) return;
    setInputText(drafts.get(chatId) ?? "");
  }, [chatId]);

  useEffect(() => {
    if (!chatId || editingMessage) return;
    if (inputText) drafts.set(chatId, inputText);
    else drafts.delete(chatId);
  }, [chatId, inputText, editingMessage]);

  // Backend mark_read hem DM hem kanal için okundu kaydı tutar (kanal okunmamış özetleri için)
  function markChatRead(connectedNow: boolean) {
    if (!chatId || !token || !focusedRef.current) return;
    if (connectedNow) {
      getSocket(token).emit("mark_read", { chatId });
    } else {
      void api.patch(`/chat/${chatId}/read`, {}, token).catch(() => {});
    }
    if (isDm) {
      void queryClient.invalidateQueries({ queryKey: ["chat-dm-unread"] });
    }
  }

  useFocusEffect(
    useCallback(() => {
      focusedRef.current = true;
      if (chatId && historyLoaded) markChatRead(getSocket(token).connected);
      return () => {
        focusedRef.current = false;
        if (isDm) {
          void queryClient.invalidateQueries({ queryKey: ["chat-dms"] });
          void queryClient.invalidateQueries({ queryKey: ["chat-dm-unread"] });
        } else {
          void queryClient.invalidateQueries({ queryKey: ["chat-unread-summary"] });
        }
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chatId, historyLoaded, token, isDm]),
  );

  // 1) Oda/DM çözümle: gerçek chatId'yi backend'den al
  useEffect(() => {
    if (!slug) return;
    setChatId(null);
    setMessages([]);
    setHasMoreOlder(true);
    oldestCreatedAtRef.current = null;
    setConnected(false);
    setPasswordRequired(false);
    setResolveError("");
    setAccessDenied(null);
    setTargetUser(null);
    setHasPassword(false);
    setPartnerLastReadAt(null);
    setHistoryLoaded(false);
    setEditingMessage(null);
    setReplyTarget(null);

    if (!token) {
      // ChatGateway.join_room oturumsuz bağlantıları reddediyor (AUTH_REQUIRED)
      setResolveError(isDm ? "Mesajlaşmak için giriş yapmalısınız" : "Sohbete katılmak için giriş yapmalısınız");
      return;
    }

    if (isDm) {
      if (!targetUserId) return;
      api
        .post<DmResolveResult>(`/chat/dm/${targetUserId}`, {}, token)
        .then((res) => {
          setChatId(res.chatId);
          setRoomName(res.targetUser.profile?.displayName ?? res.name ?? "Kullanıcı");
          setTargetUser(res.targetUser);
          setHasPassword(!!res.hasPassword);
          setPartnerLastReadAt(res.partnerLastReadAt ?? null);
          setIsMuted(!!res.muted);
        })
        .catch((err) => {
          const message = err instanceof ApiError ? err.message : "Sohbet başlatılamadı";
          setResolveError(message);
          if (err instanceof ApiError && err.status === 403) {
            setAccessDenied({ reason: "blocked" });
          }
        });
      api
        .get<{ blockedByMe: boolean; blockedMe: boolean }>(`/users/${targetUserId}/block-status`, token)
        .then((res) => setBlockedByMe(res.blockedByMe))
        .catch(() => {});
    } else {
      api
        .get<ChatResolve>(`/chat/resolve/${apiType}/${actualSlug}`)
        .then((res) => {
          setChatId(res.chatId);
          setRoomName(res.name);
        })
        .catch((err) => {
          const message = err instanceof ApiError && err.status !== 404 ? err.message : "Oda bulunamadı";
          setResolveError(message);
        });
    }
  }, [slug, token]);

  const stopTypingNow = useChatTyping(chatId, token, inputText, connected);

  // 2) Socket bağlantısı: backend ChatGateway ("/chat" namespace) ile birebir uyumlu event isimleri
  useEffect(() => {
    if (!chatId) return;
    const socket = getSocket(token);

    const isOtherChat = (id?: string) => !!id && id !== chatId;

    function joinRoom(pwd?: string) {
      awaitingJoinRef.current = true;
      socket.emit("join_room", { chatId, password: pwd ?? (pendingPasswordRef.current || undefined) });
    }
    function onConnect() {
      setConnected(true);
      joinRoom();
    }
    function onDisconnect() {
      setConnected(false);
    }
    function onAccessDenied(data: ChatAccessDenied) {
      // send_message sırasında da gelebilir (ör. engellendiyse); odaklı ekran bunu işler
      if (!awaitingJoinRef.current && !focusedRef.current) return;
      awaitingJoinRef.current = false;
      setAccessDenied(data);
    }
    function onPasswordRequired(data?: { chatId?: string }) {
      if (isOtherChat(data?.chatId)) return;
      awaitingJoinRef.current = false;
      if (pendingPasswordRef.current) {
        pendingPasswordRef.current = "";
        haptics.error();
        Alert.alert("Hatalı şifre", "Girdiğiniz şifre yanlış, lütfen tekrar deneyin.");
      }
      setPasswordRequired(true);
      setConnected(true);
    }
    function onHistory(msgs: ServerMessage[]) {
      const first = msgs[0];
      if (first?.chatId ? first.chatId !== chatId : !awaitingJoinRef.current) return;
      awaitingJoinRef.current = false;
      setConnected(true);
      setPasswordRequired(false);
      setHistoryLoaded(true);
      setMessages((prev) => {
        // Yeniden bağlanınca gönderimi süren/başarısız mesajlar kaybolmasın
        const local = prev.filter((m) => m.pending || m.failed);
        return local.length ? [...msgs, ...local] : msgs;
      });
      oldestCreatedAtRef.current = msgs[0]?.createdAt ?? null;
      setHasMoreOlder(msgs.length >= 50);
      nearBottomRef.current = true;
      setUnseenCount(0);
      markChatRead(true);
    }
    function onNewMessage(msg: ServerMessage) {
      if (isOtherChat(msg.chatId)) return;
      if (msg.user?.id === user?.id) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          const pendingIdx = prev.findIndex((m) => m.pending && !m.failed && m.body === msg.body);
          const idx = pendingIdx !== -1 ? pendingIdx : prev.findIndex((m) => m.pending && !m.failed);
          if (idx === -1) return [...prev, msg];
          const next = [...prev];
          const clientId = next[idx].clientId;
          if (clientId) {
            const t = pendingTimeoutsRef.current.get(clientId);
            if (t) clearTimeout(t);
            pendingTimeoutsRef.current.delete(clientId);
          }
          next[idx] = msg;
          return next;
        });
        scrollToBottom();
      } else {
        setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
        // Mesaj gelince "yazıyor" balonu hemen kalksın
        setTypingUsers((prev) => {
          if (!msg.user?.id || !(msg.user.id in prev)) return prev;
          const next = { ...prev };
          delete next[msg.user.id];
          return next;
        });
        if (focusedRef.current) haptics.receive();
        if (nearBottomRef.current) scrollToBottom();
        else setUnseenCount((c) => c + 1);
        markChatRead(socket.connected);
      }
    }
    function onMessageDeleted({ messageId }: { messageId: string }) {
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
      setReplyTarget((cur) => (cur?.id === messageId ? null : cur));
      setEditingMessage((cur) => (cur?.id === messageId ? null : cur));
      setActiveMessage((cur) => (cur?.id === messageId ? null : cur));
    }
    function onMessageEdited(data: { messageId: string; body: string; editedAt?: string }) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === data.messageId ? ({ ...m, body: data.body, editedAt: data.editedAt ?? new Date().toISOString() } as ServerMessage) : m,
        ),
      );
    }
    function onRoomCleared(data?: { chatId?: string }) {
      if (isOtherChat(data?.chatId)) return;
      setMessages((prev) => prev.filter((m) => m.pending || m.failed));
    }
    function onMessageReaction(data: { messageId: string; reactions: { emoji: string; count: number }[] }) {
      setMessages((prev) => prev.map((m) => (m.id === data.messageId ? { ...m, reactions: data.reactions } : m)));
    }
    function onOnlineUsers(list: ChatOnlineUser[]) {
      if (!focusedRef.current && !awaitingJoinRef.current) return;
      setOnlineUsers(list);
    }
    function onUserTyping(data: { chatId?: string; userId: string; displayName?: string }) {
      if (isOtherChat(data.chatId) || data.userId === user?.id) return;
      setTypingUsers((prev) => ({ ...prev, [data.userId]: data.displayName ?? "Birisi" }));
    }
    function onUserTypingStop(data: { chatId?: string; userId: string }) {
      if (isOtherChat(data.chatId)) return;
      setTypingUsers((prev) => {
        if (!(data.userId in prev)) return prev;
        const next = { ...prev };
        delete next[data.userId];
        return next;
      });
    }
    function onReadReceipt(data: { chatId?: string; userId: string; readAt: string }) {
      if (isOtherChat(data.chatId)) return;
      if (isDm && data.userId === targetUserId) {
        setPartnerLastReadAt((prev) => {
          if (!prev || new Date(data.readAt) > new Date(prev)) return data.readAt;
          return prev;
        });
      }
    }
    function onModerationNotice(data: { message?: string; clearInput?: boolean }) {
      if (!focusedRef.current) return;
      if (data?.message) {
        haptics.warning();
        setModerationNotice(data.message);
        if (data.clearInput !== false) {
          setInputText("");
          setPendingAttachments([]);
        }
      }
    }
    function onSocketError(data: { message?: string; code?: string }) {
      if (!focusedRef.current) return;
      if (data?.code === "AUTH_REQUIRED") {
        setResolveError(data.message ?? "Sohbete katılmak için giriş yapmalısınız");
        return;
      }
      Alert.alert("Sohbet hatası", data?.message ?? "Bir hata oluştu");
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("access_denied", onAccessDenied);
    socket.on("password_required", onPasswordRequired);
    socket.on("history", onHistory);
    socket.on("new_message", onNewMessage);
    socket.on("message_deleted", onMessageDeleted);
    socket.on("message_edited", onMessageEdited);
    socket.on("room_cleared", onRoomCleared);
    socket.on("message_reaction", onMessageReaction);
    socket.on("online_users", onOnlineUsers);
    socket.on("user_typing", onUserTyping);
    socket.on("user_typing_stop", onUserTypingStop);
    socket.on("read_receipt", onReadReceipt);
    socket.on("moderation_notice", onModerationNotice);
    socket.on("error", onSocketError);

    if (socket.connected) {
      setConnected(true);
      joinRoom();
    } else {
      socket.connect();
    }

    return () => {
      socket.emit("leave_room", { chatId });
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("access_denied", onAccessDenied);
      socket.off("password_required", onPasswordRequired);
      socket.off("history", onHistory);
      socket.off("new_message", onNewMessage);
      socket.off("message_deleted", onMessageDeleted);
      socket.off("message_edited", onMessageEdited);
      socket.off("room_cleared", onRoomCleared);
      socket.off("message_reaction", onMessageReaction);
      socket.off("online_users", onOnlineUsers);
      socket.off("user_typing", onUserTyping);
      socket.off("user_typing_stop", onUserTypingStop);
      socket.off("read_receipt", onReadReceipt);
      socket.off("moderation_notice", onModerationNotice);
      socket.off("error", onSocketError);
      setTypingUsers({});
      setOnlineUsers([]);
      awaitingJoinRef.current = false;
      pendingPasswordRef.current = "";
      pendingTimeoutsRef.current.forEach((t) => clearTimeout(t));
      pendingTimeoutsRef.current.clear();
    };
  }, [chatId, token]);

  const loadOlderMessages = useCallback(async () => {
    if (!chatId || !token || loadingOlder || !hasMoreOlder || !oldestCreatedAtRef.current) return;
    setLoadingOlder(true);
    try {
      const older = await api.get<ChatMessage[]>(
        `/chat/${chatId}/messages?before=${encodeURIComponent(oldestCreatedAtRef.current)}`,
        token,
      );
      if (older.length === 0) {
        setHasMoreOlder(false);
        return;
      }
      const ascending = [...older].reverse();
      oldestCreatedAtRef.current = ascending[0].createdAt;
      setMessages((prev) => [...ascending, ...prev]);
      if (older.length < 50) setHasMoreOlder(false);
    } catch {
      // sessizce başarısız ol, kullanıcı tekrar kaydırırsa yeniden denenir
    } finally {
      setLoadingOlder(false);
    }
  }, [chatId, token, loadingOlder, hasMoreOlder]);

  function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const near = e.nativeEvent.contentOffset.y < NEAR_BOTTOM_PX;
    nearBottomRef.current = near;
    setShowJumpButton((prev) => (prev === !near ? prev : !near));
    if (near) setUnseenCount((c) => (c === 0 ? c : 0));
  }

  async function pickAndSendImage(source: "library" | "camera" = "library") {
    if (!chatId || !token) return;
    setShowAttachMenu(false);
    const perm =
      source === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        "İzin gerekli",
        source === "camera"
          ? "Fotoğraf çekmek için kamera izni vermelisiniz."
          : "Resim göndermek için galeri erişim izni vermelisiniz.",
      );
      return;
    }
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 0.7 };
    const result =
      source === "camera"
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setUploadingImage(true);
    try {
      const fileName = asset.fileName ?? `resim-${Date.now()}.jpg`;
      const mime = asset.mimeType ?? "image/jpeg";
      const uploaded = await api.upload<ChatAttachment>(`/chat/${chatId}/upload`, asset.uri, mime, fileName, token);
      setPendingAttachments((p) => [...p, uploaded]);
    } catch {
      Alert.alert("Yükleme başarısız", "Resim yüklenemedi, lütfen tekrar deneyin.");
    } finally {
      setUploadingImage(false);
    }
  }

  function emitSendMessage(
    payload: {
      chatId: string;
      body: string;
      attachments: ChatAttachment[];
      expiresInSeconds?: number;
      replyToId?: string;
    },
    clientId: string,
  ) {
    getSocket(token).emit("send_message", payload);
    const timeout = setTimeout(() => {
      setMessages((prev) => prev.map((m) => (m.clientId === clientId && m.pending ? { ...m, pending: false, failed: true } : m)));
      pendingTimeoutsRef.current.delete(clientId);
    }, 10000);
    pendingTimeoutsRef.current.set(clientId, timeout);
  }

  function sendWithAttachments(body: string, attachments: ChatAttachment[]) {
    if ((!body.trim() && attachments.length === 0) || !chatId || !connected || !user) return;
    haptics.send();
    const clientId = `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const trimmedBody = body.trim();
    const reply = replyTarget;

    const optimistic: ChatMessage = {
      id: clientId,
      clientId,
      body: trimmedBody,
      attachments,
      createdAt: new Date().toISOString(),
      reactions: [],
      replyTo: reply ? { id: reply.id, body: reply.body, user: { profile: reply.user.profile } } : null,
      user: { id: user.id, role: user.role, profile: user.profile },
      pending: true,
      ...(expiresInSeconds > 0 ? { expiresAt: new Date(Date.now() + expiresInSeconds * 1000).toISOString() } : {}),
    };
    setMessages((prev) => [...prev, optimistic]);
    scrollToBottom();

    emitSendMessage(
      {
        chatId,
        body: trimmedBody,
        attachments,
        ...(expiresInSeconds > 0 ? { expiresInSeconds } : {}),
        ...(reply ? { replyToId: reply.id } : {}),
      },
      clientId,
    );

    setExpiresInSeconds(0);
    setShowTimerPicker(false);
    setReplyTarget(null);
  }

  function sendMessage() {
    if (editingMessage) {
      submitEdit();
      return;
    }
    sendWithAttachments(inputText, pendingAttachments);
    setInputText("");
    setPendingAttachments([]);
    stopTypingNow();
  }

  function startReply(msg: ChatMessage) {
    if (editingMessage) cancelEdit();
    setReplyTarget(msg);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function startEdit(msg: ChatMessage) {
    draftBeforeEditRef.current = inputText;
    setReplyTarget(null);
    setShowAttachMenu(false);
    setShowTimerPicker(false);
    setEditingMessage(msg);
    setInputText(msg.body);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function cancelEdit() {
    setEditingMessage(null);
    setInputText(draftBeforeEditRef.current);
    draftBeforeEditRef.current = "";
  }

  function submitEdit() {
    const msg = editingMessage;
    if (!msg) return;
    const body = inputText.trim();
    const hasAttachments = (msg.attachments?.length ?? 0) > 0;
    if (body === msg.body.trim()) {
      cancelEdit();
      return;
    }
    if (!body && !hasAttachments) {
      Alert.alert("Mesaj boş olamaz", "Mesajı kaldırmak için silme seçeneğini kullanın.");
      return;
    }
    haptics.send();
    getSocket(token).emit("edit_message", { messageId: msg.id, body });
    stopTypingNow();
    cancelEdit();
  }

  async function sendVoiceMessage(uri: string, durationSec: number) {
    setIsRecordingVoice(false);
    if (!chatId || !token) return;
    setUploadingVoice(true);
    try {
      const uploaded = await api.upload<ChatAttachment>(`/chat/${chatId}/upload`, uri, "audio/m4a", `voice-${Date.now()}.m4a`, token);
      sendWithAttachments("", [{ ...uploaded, durationSec: Math.round(durationSec) }]);
    } catch {
      haptics.error();
      Alert.alert("Gönderilemedi", "Sesli mesaj yüklenemedi, lütfen tekrar deneyin.");
    } finally {
      setUploadingVoice(false);
    }
  }

  function retrySendMessage(msg: ChatMessage) {
    if (!msg.clientId || !chatId) return;
    setMessages((prev) => prev.map((m) => (m.clientId === msg.clientId ? { ...m, pending: true, failed: false } : m)));
    emitSendMessage(
      {
        chatId,
        body: msg.body,
        attachments: msg.attachments ?? [],
        ...(msg.replyTo ? { replyToId: msg.replyTo.id } : {}),
      },
      msg.clientId,
    );
  }

  function submitPassword() {
    if (!passwordInput.trim() || !chatId) return;
    pendingPasswordRef.current = passwordInput.trim();
    awaitingJoinRef.current = true;
    getSocket(token).emit("join_room", { chatId, password: passwordInput.trim() });
    setPasswordInput("");
  }

  function handleReact(messageId: string, emoji: string) {
    haptics.tap();
    getSocket(token).emit("react_message", { messageId, emoji });
  }

  function handleDeleteMessage(msg: ChatMessage) {
    const own = msg.user.id === user?.id;
    Alert.alert("Mesajı sil", "Bu mesaj herkes için silinecek. Emin misiniz?", [
      { text: "Vazgeç", style: "cancel" },
      {
        text: "Sil",
        style: "destructive",
        onPress: () => {
          if (own) {
            getSocket(token).emit("delete_message", { messageId: msg.id });
            return;
          }
          // Socket delete_message yalnızca kendi mesajını siler; yönetici REST ucunu kullanır
          api
            .delete(`/chat/messages/${msg.id}`, token)
            .then(() => {
              haptics.success();
              setMessages((prev) => prev.filter((m) => m.id !== msg.id));
            })
            .catch((err) => {
              haptics.error();
              Alert.alert("Hata", err instanceof ApiError ? err.message : "Mesaj silinemedi");
            });
        },
      },
    ]);
  }

  function handleCopyMessage(msg: ChatMessage) {
    if (!msg.body) return;
    void Clipboard.setStringAsync(msg.body).then(() => haptics.success());
  }

  function handleForwardTo(msg: ChatMessage, targetUserId: string, targetName: string) {
    setForwardMessage(null);
    api
      .post<DmResolveResult>(`/chat/dm/${targetUserId}`, {}, token)
      .then((res) => {
        getSocket(token).emit("send_message", {
          chatId: res.chatId,
          body: msg.body ?? "",
          attachments: msg.attachments ?? [],
        });
        haptics.success();
        Alert.alert("İletildi", `Mesaj ${targetName} kişisine iletildi.`);
      })
      .catch((err) => {
        haptics.error();
        const message = err instanceof ApiError ? err.message : "Mesaj iletilemedi";
        Alert.alert("Hata", message);
      });
  }

  function handleToggleBlock() {
    if (!targetUserId || !token) return;
    if (blockedByMe) {
      Alert.alert("Engeli kaldır", `${roomName} kullanıcısının engelini kaldırmak istiyor musunuz?`, [
        { text: "Vazgeç", style: "cancel" },
        {
          text: "Engeli kaldır",
          onPress: () => {
            api
              .delete(`/users/${targetUserId}/block`, token)
              .then(() => {
                haptics.success();
                setBlockedByMe(false);
              })
              .catch(() => {
                haptics.error();
                Alert.alert("Hata", "İşlem gerçekleştirilemedi");
              });
          },
        },
      ]);
    } else {
      Alert.alert(
        "Kullanıcıyı engelle",
        `${roomName} kullanıcısını engellerseniz birbirinize mesaj gönderemezsiniz.`,
        [
          { text: "Vazgeç", style: "cancel" },
          {
            text: "Engelle",
            style: "destructive",
            onPress: () => {
              api
                .post(`/users/${targetUserId}/block`, {}, token)
                .then(() => {
                  haptics.success();
                  setBlockedByMe(true);
                  router.back();
                })
                .catch(() => {
                  haptics.error();
                  Alert.alert("Hata", "İşlem gerçekleştirilemedi");
                });
            },
          },
        ],
      );
    }
  }

  function handleReportUser() {
    if (!targetUserId || !token) return;
    Alert.alert("Şikayet et", "Bu kullanıcıyı şikayet etme sebebiniz nedir?", [
      { text: "Vazgeç", style: "cancel" },
      { text: "Spam", onPress: () => submitReport("SPAM") },
      { text: "Taciz / hakaret", onPress: () => submitReport("HARASSMENT") },
      { text: "Uygunsuz içerik", onPress: () => submitReport("INAPPROPRIATE") },
      { text: "Diğer", onPress: () => submitReport("OTHER") },
    ]);
  }

  function submitReport(reason: string) {
    if (!targetUserId || !token) return;
    api
      .post("/reports", { targetType: "USER", targetId: targetUserId, reason }, token)
      .then(() => {
        haptics.success();
        Alert.alert("Teşekkürler", "Şikayetiniz alındı, ekibimiz inceleyecek.");
      })
      .catch(() => {
        haptics.error();
        Alert.alert("Hata", "Şikayet gönderilemedi");
      });
  }

  function handleToggleMute() {
    if (!chatId || !token) return;
    const next = !isMuted;
    api
      .patch(`/chat/${chatId}/mute`, { muted: next }, token)
      .then(() => setIsMuted(next))
      .catch(() => Alert.alert("Hata", "İşlem gerçekleştirilemedi"));
  }

  function openDmOptions() {
    Alert.alert(roomName || "Seçenekler", undefined, [
      { text: "Vazgeç", style: "cancel" },
      { text: isMuted ? "Bildirimleri aç" : "Bildirimleri sessize al", onPress: handleToggleMute },
      { text: blockedByMe ? "Engeli kaldır" : "Kullanıcıyı engelle", style: blockedByMe ? "default" : "destructive", onPress: handleToggleBlock },
      { text: "Şikayet et", onPress: handleReportUser },
    ]);
  }

  function handleClearRoom() {
    if (!chatId || !token) return;
    Alert.alert(
      "Sohbeti temizle",
      "Bu odadaki tüm mesajlar herkes için silinecek. Bu işlem geri alınamaz.",
      [
        { text: "Vazgeç", style: "cancel" },
        {
          text: "Temizle",
          style: "destructive",
          onPress: () => {
            api
              .delete(`/chat/${chatId}/messages`, token)
              .then(() => {
                haptics.success();
                setMessages([]);
              })
              .catch(() => {
                haptics.error();
                Alert.alert("Hata", "Sohbet temizlenemedi");
              });
          },
        },
      ],
    );
  }

  function openRoomOptions() {
    Alert.alert(roomName || "Seçenekler", undefined, [
      { text: "Vazgeç", style: "cancel" },
      { text: "Sohbeti temizle", style: "destructive", onPress: handleClearRoom },
    ]);
  }

  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const searchMatches = normalizedSearchQuery
    ? messages.reduce<number[]>((acc, m, i) => {
        if (m.body?.toLowerCase().includes(normalizedSearchQuery)) acc.push(i);
        return acc;
      }, [])
    : [];

  useEffect(() => {
    if (searchMatches.length === 0) return;
    setSearchMatchPos(searchMatches.length - 1);
  }, [normalizedSearchQuery]);

  const listData = useMemo(() => [...messages].reverse(), [messages]);

  function scrollToMessageIndex(originalIndex: number) {
    const index = messages.length - 1 - originalIndex;
    if (index < 0) return;
    flatListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
  }

  function jumpToMessage(messageId: string) {
    const originalIndex = messages.findIndex((m) => m.id === messageId);
    if (originalIndex === -1) {
      haptics.warning();
      return;
    }
    scrollToMessageIndex(originalIndex);
    setFlashMessageId(messageId);
    setTimeout(() => setFlashMessageId((cur) => (cur === messageId ? null : cur)), 1400);
  }

  useEffect(() => {
    if (!searchOpen || searchMatches.length === 0) return;
    const index = searchMatches[searchMatchPos];
    if (index === undefined) return;
    setTimeout(() => scrollToMessageIndex(index), 50);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchMatchPos, searchOpen]);

  function goToSearchMatch(delta: number) {
    if (searchMatches.length === 0) return;
    setSearchMatchPos((prev) => ((prev + delta) % searchMatches.length + searchMatches.length) % searchMatches.length);
  }

  const partnerOnline = isDm && targetUserId ? onlineUsers.some((u) => u.userId === targetUserId) : false;
  const partnerTyping = isDm && targetUserId ? !!typingUsers[targetUserId] : false;
  const roomTypingNames = !isDm ? Object.values(typingUsers) : [];

  const statusLabel = isDm
    ? partnerTyping
      ? "yazıyor…"
      : connected
        ? partnerOnline
          ? "çevrimiçi"
          : "çevrimdışı"
        : "Bağlanıyor…"
    : connected
      ? onlineUsers.length > 0
        ? `${onlineUsers.length} çevrimiçi`
        : "Bağlı"
      : "Bağlanıyor…";

  if (resolveError) {
    return (
      <View className="flex-1 bg-background">
        <DetailHeader title={isDm ? "Mesaj" : "Sohbet"} onBack={() => router.back()} />
        <EmptyState
          icon={token ? AlertCircle : Lock}
          title={token ? "Sohbet açılamadı" : "Giriş yapın"}
          subtitle={resolveError}
          actionLabel={token ? undefined : "Giriş yap"}
          onAction={token ? undefined : () => router.push("/(auth)/giris" as never)}
        />
      </View>
    );
  }

  if (accessDenied) {
    const reason = accessDenied.reason as string;
    const noLocation = reason === "no_location";
    const blocked = reason === "blocked";
    return (
      <View className="flex-1 bg-background">
        <DetailHeader title={roomName || "Sohbet"} onBack={() => router.back()} />
        <EmptyState
          icon={noLocation ? MapPin : blocked ? Ban : Lock}
          title={blocked ? "Bu sohbete erişilemiyor" : "Bu odaya erişilemiyor"}
          subtitle={
            noLocation
              ? "Erişmek için profilinizde konum bilgisi gerekli."
              : blocked
                ? "Bu kullanıcıyla mesajlaşamazsınız."
                : accessDenied.requiredLocation
                  ? `${accessDenied.requiredLocation} sakinlerine özel oda.`
                  : "Bu sohbete erişim yetkiniz yok."
          }
          actionLabel={noLocation ? "Konum ekle" : undefined}
          onAction={noLocation ? () => router.push("/(tabs)/profil/duzenle" as never) : undefined}
        />
      </View>
    );
  }

  if (chatId && passwordRequired) {
    return (
      <View className="flex-1 bg-background">
        <DetailHeader title={roomName || "Şifreli Oda"} onBack={() => router.back()} />
        <KeyboardAvoidingView behavior="padding" style={{ flex: 1, justifyContent: "center", paddingHorizontal: 24 }}>
          <View className="items-center">
            <IconTile icon={KeyRound} size={64} />
            <Text className="mt-4 text-lg font-bold text-text">Şifreli Oda</Text>
            <Text className="mb-6 mt-1 text-center text-sm leading-5 text-muted">
              Devam etmek için oda şifresini girin.
            </Text>
          </View>
          <TextField
            value={passwordInput}
            onChangeText={setPasswordInput}
            placeholder="Oda şifresi…"
            icon={Lock}
            password
            autoFocus
            onSubmitEditing={submitPassword}
            returnKeyType="go"
            accessibilityLabel="Oda şifresi"
          />
          <Button label="Gir" icon={LockOpen} onPress={submitPassword} disabled={!passwordInput.trim()} />
        </KeyboardAvoidingView>
      </View>
    );
  }

  const canSend = editingMessage
    ? connected && (!!inputText.trim() || (editingMessage.attachments?.length ?? 0) > 0)
    : (!!inputText.trim() || pendingAttachments.length > 0) && connected;
  const showMic = !editingMessage && !inputText.trim() && pendingAttachments.length === 0;
  const activeIsMine = !!activeMessage && activeMessage.user.id === user?.id;
  const canEditActive =
    activeIsMine &&
    !!activeMessage?.body &&
    Date.now() - new Date(activeMessage.createdAt).getTime() < EDIT_WINDOW_MS;
  const isTypingActive = partnerTyping || roomTypingNames.length > 0;

  return (
    <View className="flex-1 bg-background">
      <View className="border-b border-border bg-surface px-3 pb-2.5" style={{ paddingTop: insets.top + 8 }}>
        <View className="min-h-11 flex-row items-center gap-2">
          <BackButton onPress={() => router.back()} />
          <Pressable
            onPress={() => (isDm ? targetUserId && router.push(`/kullanici/${targetUserId}` as never) : setShowOnlineUsers(true))}
            accessibilityRole="button"
            accessibilityLabel={isDm ? `${roomName} profilini aç` : "Çevrimiçi kişileri göster"}
            className="min-w-0 flex-1 flex-row items-center gap-2.5 rounded-2xl py-0.5 active:opacity-70"
          >
            {isDm ? (
              <View>
                <Avatar name={roomName || "?"} url={targetUser?.profile?.avatarUrl} size="sm" />
                {partnerOnline ? (
                  <View className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-surface bg-success" />
                ) : null}
              </View>
            ) : (
              <IconTile icon={apiType === "global" ? Globe : Hash} size={36} />
            )}
            <View className="min-w-0 flex-1">
              <View className="min-w-0 flex-row items-center gap-1">
                <Text className="flex-shrink text-base font-bold text-text" numberOfLines={1}>
                  {roomName || "…"}
                </Text>
                {isMuted ? <BellOff size={13} color={colors.mutedLight} /> : null}
                {isDm && hasPassword ? <Lock size={12} color={colors.warning} /> : null}
              </View>
              <Text
                className={`text-xs ${
                  isTypingActive ? "font-semibold text-primary" : isDm && partnerOnline ? "text-success" : "text-muted"
                }`}
                numberOfLines={1}
              >
                {!isDm && roomTypingNames.length > 0 ? formatTypingLabel(roomTypingNames) : statusLabel}
              </Text>
            </View>
          </Pressable>
          {!isDm ? (
            <ChatHeaderIcon icon={Users} label="Çevrimiçi kişiler" onPress={() => setShowOnlineUsers(true)} />
          ) : null}
          <ChatHeaderIcon
            icon={searchOpen ? X : Search}
            label={searchOpen ? "Aramayı kapat" : "Mesajlarda ara"}
            active={searchOpen}
            onPress={() => {
              setSearchOpen((v) => !v);
              setSearchQuery("");
            }}
          />
          {isDm ? (
            <ChatHeaderIcon
              icon={hasPassword ? Lock : KeyRound}
              label="Sohbet şifresi"
              active={hasPassword}
              onPress={() => setShowPasswordModal(true)}
            />
          ) : null}
          {isDm || isAdmin ? (
            <ChatHeaderIcon
              icon={MoreVertical}
              label="Seçenekler"
              onPress={isDm ? openDmOptions : openRoomOptions}
            />
          ) : null}
        </View>

        {searchOpen ? (
          <View className="mt-2.5 min-h-11 flex-row items-center gap-2 rounded-2xl bg-background pl-3.5 pr-1.5">
            <Search size={16} color={colors.mutedLight} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Mesajlarda ara…"
              placeholderTextColor={colors.mutedLight}
              autoFocus
              returnKeyType="search"
              accessibilityLabel="Mesajlarda ara"
              className="flex-1 py-2.5 text-[15px] text-text"
            />
            {normalizedSearchQuery ? (
              <Text className="text-xs font-semibold text-muted">
                {searchMatches.length > 0 ? `${searchMatchPos + 1}/${searchMatches.length}` : "0/0"}
              </Text>
            ) : null}
            <Pressable
              onPress={() => goToSearchMatch(-1)}
              disabled={searchMatches.length === 0}
              accessibilityLabel="Önceki sonuç"
              className="h-8 w-8 items-center justify-center rounded-full active:bg-border"
            >
              <ChevronUp size={18} color={searchMatches.length === 0 ? colors.border : colors.primary} />
            </Pressable>
            <Pressable
              onPress={() => goToSearchMatch(1)}
              disabled={searchMatches.length === 0}
              accessibilityLabel="Sonraki sonuç"
              className="h-8 w-8 items-center justify-center rounded-full active:bg-border"
            >
              <ChevronDown size={18} color={searchMatches.length === 0 ? colors.border : colors.primary} />
            </Pressable>
          </View>
        ) : null}
      </View>

      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
      {!historyLoaded ? (
        <LoadingScreen label="Sohbet yükleniyor…" />
      ) : messages.length === 0 ? (
        <Pressable className="flex-1" onPress={() => inputRef.current?.blur()} accessible={false}>
          <EmptyState
            icon={MessagesSquare}
            title="Henüz mesaj yok"
            subtitle={isDm ? `${roomName} ile sohbete bir merhaba ile başlayın.` : "İlk mesajı siz yazın!"}
          />
        </Pressable>
      ) : (
        <View className="flex-1">
        <FlatList
          ref={flatListRef}
          data={listData}
          inverted
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 10, paddingBottom: 12 }}
          onScroll={handleScroll}
          scrollEventThrottle={64}
          onEndReached={() => void loadOlderMessages()}
          onEndReachedThreshold={0.4}
          maintainVisibleContentPosition={{ minIndexForVisible: 0, autoscrollToTopThreshold: NEAR_BOTTOM_PX }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          initialNumToRender={20}
          windowSize={11}
          onScrollToIndexFailed={({ index, averageItemLength }) => {
            flatListRef.current?.scrollToOffset({ offset: index * averageItemLength, animated: false });
            setTimeout(
              () => flatListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 }),
              120,
            );
          }}
          ListHeaderComponent={
            partnerTyping || roomTypingNames.length > 0 ? (
              <TypingBubble label={!isDm ? formatTypingLabel(roomTypingNames) : undefined} />
            ) : null
          }
          ListFooterComponent={
            loadingOlder ? (
              <View className="items-center py-3">
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : !hasMoreOlder ? (
              <View className="my-3 items-center">
                <View className="rounded-full bg-border/60 px-3 py-1">
                  <Text className="text-[11px] font-medium text-muted">Sohbetin başlangıcı</Text>
                </View>
              </View>
            ) : null
          }
          renderItem={({ item, index: listIndex }) => {
            const index = messages.length - 1 - listIndex;
            const isMe = item.user.id === user?.id;
            const prevMsg = messages[index - 1];
            const newDay = !prevMsg || !isSameDay(prevMsg.createdAt, item.createdAt);
            const grouped =
              !!prevMsg &&
              !newDay &&
              prevMsg.user.id === item.user.id &&
              new Date(item.createdAt).getTime() - new Date(prevMsg.createdAt).getTime() < GROUP_WINDOW_MS;
            const tickState =
              isDm && isMe
                ? partnerLastReadAt && new Date(item.createdAt).getTime() <= new Date(partnerLastReadAt).getTime()
                  ? "read"
                  : "sent"
                : null;
            const canInteract = !item.pending && !item.failed;
            return (
              <View>
                {newDay ? <DateSeparator iso={item.createdAt} /> : null}
                <SwipeToReply
                  enabled={canInteract && !!token}
                  onReply={() => {
                    haptics.tap();
                    startReply(item);
                  }}
                >
                  <ChatMessageBubble
                    message={item}
                    isMe={isMe}
                    grouped={grouped}
                    tickState={tickState}
                    onLongPress={
                      canInteract
                        ? () => {
                            haptics.longPress();
                            setActiveMessage(item);
                          }
                        : undefined
                    }
                    onReact={(emoji) => handleReact(item.id, emoji)}
                    onImagePress={(url) => setViewerImageUrl(url)}
                    onRetry={() => retrySendMessage(item)}
                    onUserPress={isMe ? undefined : () => router.push(`/kullanici/${item.user.id}` as never)}
                    onReplyPress={item.replyTo ? () => jumpToMessage(item.replyTo!.id) : undefined}
                    token={token}
                    highlighted={
                      flashMessageId === item.id || (searchOpen && searchMatches[searchMatchPos] === index)
                    }
                  />
                </SwipeToReply>
              </View>
            );
          }}
        />
        {showJumpButton ? (
          <Pressable
            onPress={() => scrollToBottom()}
            accessibilityRole="button"
            accessibilityLabel="En yeni mesajlara git"
            className="absolute bottom-3 right-3 h-11 w-11 items-center justify-center rounded-full border border-border bg-surface active:opacity-80"
            style={{
              shadowColor: colors.text,
              shadowOpacity: 0.12,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 3 },
              elevation: 4,
            }}
          >
            <ArrowDown size={20} color={colors.primary} />
            {unseenCount > 0 ? (
              <View className="absolute -top-2 h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5">
                <Text className="text-[10px] font-bold text-white">{unseenCount > 99 ? "99+" : unseenCount}</Text>
              </View>
            ) : null}
          </Pressable>
        ) : null}
        </View>
      )}

      {historyLoaded && !connected ? (
        <View className="flex-row items-center justify-center gap-2 border-t border-border bg-background px-4 py-1.5">
          <ActivityIndicator size="small" color={colors.muted} />
          <Text className="text-xs font-medium text-muted" accessibilityLiveRegion="polite">
            Bağlantı koptu, yeniden bağlanıyor…
          </Text>
        </View>
      ) : null}

      {moderationNotice ? (
        <View className="flex-row items-center gap-2.5 border-t border-warning/30 bg-warning/10 px-4 py-2.5">
          <AlertTriangle size={16} color={colors.warning} />
          <Text className="flex-1 text-xs leading-4 text-text">{moderationNotice}</Text>
          <Pressable onPress={() => setModerationNotice("")} hitSlop={8} accessibilityLabel="Uyarıyı kapat">
            <X size={16} color={colors.warning} />
          </Pressable>
        </View>
      ) : null}

      {token ? (
        <Animated.View
          style={[
            {
              backgroundColor: colors.surface,
              borderTopWidth: 1,
              borderTopColor: colors.border,
              paddingHorizontal: 12,
              paddingTop: 8,
            },
            composerInsetStyle,
          ]}
        >
          {showAttachMenu && !isRecordingVoice ? (
            <View className="mb-2 flex-row gap-3 px-1 pt-1">
              <AttachOption icon={ImageIcon} label="Galeri" tint={colors.primary} onPress={() => void pickAndSendImage("library")} />
              <AttachOption icon={Camera} label="Kamera" tint={colors.accent} onPress={() => void pickAndSendImage("camera")} />
              <AttachOption
                icon={Timer}
                label="Süreli"
                tint={colors.warning}
                active={showTimerPicker || expiresInSeconds > 0}
                onPress={() => {
                  setShowAttachMenu(false);
                  setShowTimerPicker((v) => !v);
                }}
              />
            </View>
          ) : null}
          {replyTarget && (
            <View className="mb-2 flex-row items-center gap-2.5 rounded-2xl bg-background py-2 pl-3 pr-2">
              <Reply size={16} color={colors.primary} />
              <View className="min-w-0 flex-1 border-l-[3px] border-primary pl-2.5">
                <Text className="text-xs font-bold text-primary-700" numberOfLines={1}>
                  {replyTarget.user.profile?.displayName ?? "Anonim"}
                </Text>
                <Text className="text-xs text-muted" numberOfLines={1}>
                  {replyTarget.body || attachmentSummary(replyTarget.attachments) || "📎 Ek"}
                </Text>
              </View>
              <Pressable
                onPress={() => setReplyTarget(null)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Yanıtı iptal et"
                className="h-7 w-7 items-center justify-center rounded-full bg-border"
              >
                <X size={14} color={colors.muted} />
              </Pressable>
            </View>
          )}
          {editingMessage && (
            <View className="mb-2 flex-row items-center gap-2.5 rounded-2xl bg-background py-2 pl-3 pr-2">
              <Pencil size={16} color={colors.primary} />
              <View className="min-w-0 flex-1 border-l-[3px] border-primary pl-2.5">
                <Text className="text-xs font-bold text-primary-700">Mesajı düzenle</Text>
                <Text className="text-xs text-muted" numberOfLines={1}>
                  {editingMessage.body}
                </Text>
              </View>
              <Pressable
                onPress={cancelEdit}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Düzenlemeyi iptal et"
                className="h-7 w-7 items-center justify-center rounded-full bg-border"
              >
                <X size={14} color={colors.muted} />
              </Pressable>
            </View>
          )}

          {showTimerPicker && <TimerPicker value={expiresInSeconds} onChange={setExpiresInSeconds} />}

          {pendingAttachments.length > 0 && (
            <View className="mb-2 flex-row flex-wrap gap-2 pt-1.5">
              {pendingAttachments.map((att) => (
                <View key={att.url}>
                  <Image
                    source={{ uri: avatarUrl(att.url) ?? att.url }}
                    style={{ width: 64, height: 64, borderRadius: 16 }}
                    resizeMode="cover"
                  />
                  <Pressable
                    onPress={() => setPendingAttachments((p) => p.filter((a) => a.url !== att.url))}
                    accessibilityLabel="Eki kaldır"
                    hitSlop={6}
                    className="absolute -right-1.5 -top-1.5 h-6 w-6 items-center justify-center rounded-full border-2 border-surface bg-text"
                  >
                    <X size={12} color={colors.white} strokeWidth={3} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}

          {isRecordingVoice ? (
            <VoiceRecorderBar onCancel={() => setIsRecordingVoice(false)} onSend={(uri, dur) => void sendVoiceMessage(uri, dur)} />
          ) : uploadingVoice ? (
            <View className="min-h-11 flex-row items-center justify-center gap-2">
              <ActivityIndicator size="small" color={colors.primary} />
              <Text className="text-sm text-muted">Sesli mesaj gönderiliyor…</Text>
            </View>
          ) : (
            <View className="flex-row items-end gap-2">
              <Pressable
                onPress={() => setShowAttachMenu((v) => !v)}
                disabled={uploadingImage || !!editingMessage}
                accessibilityRole="button"
                accessibilityLabel="Ek gönder"
                accessibilityState={{ expanded: showAttachMenu }}
                className="h-11 w-11 items-center justify-center rounded-full active:opacity-70"
              >
                {uploadingImage ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <View style={{ transform: [{ rotate: showAttachMenu ? "45deg" : "0deg" }] }}>
                    <Plus size={24} color={showAttachMenu ? colors.primary : colors.muted} />
                  </View>
                )}
              </Pressable>
              <View
                className={`min-h-11 flex-1 flex-row items-end rounded-3xl border bg-background pl-4 pr-1 ${
                  expiresInSeconds > 0 ? "border-warning/40" : "border-border"
                }`}
              >
                <TextInput
                  ref={inputRef}
                  value={inputText}
                  onChangeText={setInputText}
                  onFocus={() => setShowAttachMenu(false)}
                  placeholder={
                    editingMessage
                      ? "Mesajı düzenle…"
                      : expiresInSeconds > 0
                      ? "Otomatik silinecek mesaj…"
                      : isDm
                        ? `${roomName} kişisine mesaj yaz…`
                        : "Mesaj yaz…"
                  }
                  placeholderTextColor={colors.mutedLight}
                  multiline
                  maxLength={1000}
                  accessibilityLabel="Mesaj"
                  className="max-h-[120px] min-h-[42px] flex-1 py-2.5 text-[15px] leading-5 text-text"
                />
                {expiresInSeconds > 0 ? (
                  <Pressable
                    onPress={() => setShowTimerPicker((v) => !v)}
                    accessibilityRole="button"
                    accessibilityLabel="Otomatik silme süresi"
                    accessibilityState={{ selected: true }}
                    className="mb-[3px] h-9 w-9 items-center justify-center rounded-full bg-warning/10"
                  >
                    <Timer size={19} color={colors.warning} />
                  </Pressable>
                ) : null}
              </View>
              {showMic ? (
                <Pressable
                  onPress={() => {
                    haptics.tap();
                    setIsRecordingVoice(true);
                  }}
                  disabled={!connected}
                  accessibilityRole="button"
                  accessibilityLabel="Sesli mesaj kaydet"
                  className={`h-11 w-11 items-center justify-center rounded-full bg-primary active:opacity-80 ${
                    !connected ? "opacity-50" : ""
                  }`}
                >
                  <Mic size={20} color={colors.white} />
                </Pressable>
              ) : (
                <Pressable
                  onPress={sendMessage}
                  disabled={!canSend}
                  accessibilityRole="button"
                  accessibilityLabel={editingMessage ? "Düzenlemeyi kaydet" : "Gönder"}
                  accessibilityState={{ disabled: !canSend }}
                  className={`h-11 w-11 items-center justify-center rounded-full bg-primary active:opacity-80 ${
                    !canSend ? "opacity-50" : ""
                  }`}
                >
                  {editingMessage ? (
                    <Check size={20} color={colors.white} strokeWidth={2.6} />
                  ) : (
                    <Send size={18} color={colors.white} style={{ marginLeft: -2 }} />
                  )}
                </Pressable>
              )}
            </View>
          )}
        </Animated.View>
      ) : (
        <View
          className="flex-row items-center justify-center gap-2 border-t border-border bg-surface px-4 pt-3"
          style={{ paddingBottom: Math.max(insets.bottom, 12) }}
        >
          <Lock size={14} color={colors.muted} />
          <Text className="text-sm text-muted">Mesaj göndermek için giriş yapın</Text>
        </View>
      )}
      </KeyboardAvoidingView>

      <MessageActionSheet
        visible={!!activeMessage}
        message={activeMessage}
        canDelete={activeIsMine || (isAdmin && !isDm)}
        deleteLabel={activeIsMine ? "Mesajı sil" : "Mesajı sil (yönetici)"}
        canCopy={!!activeMessage?.body}
        canEdit={canEditActive}
        onClose={() => setActiveMessage(null)}
        onReact={(emoji) => activeMessage && handleReact(activeMessage.id, emoji)}
        onDelete={() => activeMessage && handleDeleteMessage(activeMessage)}
        onReply={() => activeMessage && startReply(activeMessage)}
        onEdit={() => activeMessage && startEdit(activeMessage)}
        onCopy={() => activeMessage && handleCopyMessage(activeMessage)}
        onForward={() => activeMessage && setForwardMessage(activeMessage)}
      />

      <ForwardModal
        visible={!!forwardMessage}
        token={token}
        onClose={() => setForwardMessage(null)}
        onSelect={(target) => forwardMessage && handleForwardTo(forwardMessage, target.userId, target.name)}
      />

      <OnlineUsersModal
        visible={showOnlineUsers}
        users={onlineUsers}
        currentUserId={user?.id}
        onClose={() => setShowOnlineUsers(false)}
        onSelectUser={(userId) => {
          setShowOnlineUsers(false);
          router.push(`/(tabs)/sohbet/dm-${userId}` as never);
        }}
      />

      <DmPasswordModal
        visible={showPasswordModal}
        chatId={chatId}
        token={token}
        hasPassword={hasPassword}
        onClose={() => setShowPasswordModal(false)}
        onUpdated={setHasPassword}
      />

      <ImageViewerModal url={viewerImageUrl} onClose={() => setViewerImageUrl(null)} />
    </View>
  );
}

function AttachOption({
  icon: Icon,
  label,
  tint,
  onPress,
  active = false,
}: {
  icon: LucideIcon;
  label: string;
  tint: string;
  onPress: () => void;
  active?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      className="items-center gap-1 active:opacity-70"
    >
      <View
        className="h-12 w-12 items-center justify-center rounded-2xl"
        style={{ backgroundColor: active ? tint : `${tint}1A` }}
      >
        <Icon size={22} color={active ? colors.white : tint} />
      </View>
      <Text className="text-[11px] font-semibold text-muted">{label}</Text>
    </Pressable>
  );
}

function ChatHeaderIcon({
  icon: Icon,
  label,
  onPress,
  active = false,
}: {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  active?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      hitSlop={4}
      className={`h-9 w-9 items-center justify-center rounded-full active:opacity-70 ${
        active ? "bg-primary/10" : "bg-background"
      }`}
    >
      <Icon size={18} color={active ? colors.primary : colors.text} strokeWidth={2.1} />
    </Pressable>
  );
}

function isSameDay(a: string, b: string) {
  const da = new Date(a);
  const db = new Date(b);
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
}

function formatDayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (isSameDay(d.toISOString(), today.toISOString())) return "Bugün";
  if (isSameDay(d.toISOString(), yesterday.toISOString())) return "Dün";
  return d.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    ...(d.getFullYear() !== today.getFullYear() ? { year: "numeric" } : {}),
  });
}

function DateSeparator({ iso }: { iso: string }) {
  return (
    <View className="my-3 items-center">
      <View className="rounded-full border border-border bg-surface px-3 py-1">
        <Text className="text-[11px] font-semibold text-muted">{formatDayLabel(iso)}</Text>
      </View>
    </View>
  );
}

