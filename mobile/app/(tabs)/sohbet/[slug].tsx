import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
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
import { formatTypingLabel, useChatTyping } from "@/hooks/useChatTyping";
import { Avatar } from "@/components/ui/Avatar";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { DetailHeader } from "@/components/navigation/DetailHeader";
import { ChatMessageBubble } from "@/components/chat/ChatMessageBubble";
import { MessageActionSheet } from "@/components/chat/MessageActionSheet";
import { ForwardModal } from "@/components/chat/ForwardModal";
import { OnlineUsersModal } from "@/components/chat/OnlineUsersModal";
import { DmPasswordModal } from "@/components/chat/DmPasswordModal";
import { ImageViewerModal } from "@/components/chat/ImageViewerModal";
import { TimerPicker } from "@/components/chat/TimerPicker";
import { VoiceRecorderBar } from "@/components/chat/VoiceRecorderBar";

const GROUP_WINDOW_MS = 5 * 60 * 1000;
const SCROLL_TOP_THRESHOLD = 80;

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
  const stickToBottomRef = useRef(true);
  const [androidKeyboardHeight, setAndroidKeyboardHeight] = useState(0);

  useEffect(() => {
    if (Platform.OS !== "android") return;
    const showSub = Keyboard.addListener("keyboardDidShow", (e) => {
      setAndroidKeyboardHeight(e.endCoordinates?.height ?? 0);
      if (stickToBottomRef.current) scrollToEndNow(true);
    });
    const hideSub = Keyboard.addListener("keyboardDidHide", () => {
      setAndroidKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  function scrollToEndNow(animated: boolean) {
    requestAnimationFrame(() => {
      flatListRef.current?.scrollToEnd({ animated });
    });
  }

  // Oda/DM geçmişi yüklendiğinde FlatList'in içerik yüksekliği (resimler, uzun mesajlar
  // yüzünden) hemen ölçülemeyebiliyor; tek seferlik scrollToEnd bu durumda listeyi tam
  // en alta indiremiyor. Birkaç kez tekrar deneyerek son mesajın kesin görünmesini sağlar.
  function scrollToEndReliably() {
    scrollToEndNow(false);
    [50, 150, 300, 600].forEach((delay) => {
      setTimeout(() => {
        if (stickToBottomRef.current) flatListRef.current?.scrollToEnd({ animated: false });
      }, delay);
    });
  }

  // Mesaj gönderilirken/alınırken de aynı sorun (klavye animasyonu, resim eki, grup
  // değişimi yüzünden geç ölçülen içerik yüksekliği) yüzünden liste son mesajın biraz
  // üstünde takılabiliyor. WhatsApp'taki gibi her zaman en son mesajı göstermek için
  // ilk animasyonlu scrollToEnd'in ardından birkaç kez sessizce düzeltme yapılır.
  function scrollToEndAfterMessage() {
    scrollToEndNow(true);
    [80, 200, 400, 700].forEach((delay) => {
      setTimeout(() => {
        if (stickToBottomRef.current) flatListRef.current?.scrollToEnd({ animated: false });
      }, delay);
    });
  }

  function markChatRead(connectedNow: boolean) {
    if (!isDm || !chatId || !token) return;
    if (connectedNow) {
      getSocket(token).emit("mark_read", { chatId });
    } else {
      void api.patch(`/chat/dm/${chatId}/read`, {}, token).catch(() => {});
    }
  }

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

    if (isDm) {
      if (!targetUserId) return;
      if (!token) {
        setResolveError("Mesajlaşmak için giriş yapmalısınız");
        return;
      }
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

    function joinRoom(pwd?: string) {
      socket.emit("join_room", { chatId, password: pwd ?? pendingPasswordRef.current ?? undefined });
    }
    function onConnect() {
      setConnected(true);
      joinRoom();
    }
    function onDisconnect() {
      setConnected(false);
    }
    function onAccessDenied(data: ChatAccessDenied) {
      setAccessDenied(data);
    }
    function onPasswordRequired() {
      setPasswordRequired(true);
      setConnected(true);
    }
    function onHistory(msgs: ChatMessage[]) {
      setConnected(true);
      setPasswordRequired(false);
      setMessages(msgs);
      oldestCreatedAtRef.current = msgs[0]?.createdAt ?? null;
      setHasMoreOlder(msgs.length >= 50);
      stickToBottomRef.current = true;
      scrollToEndReliably();
      markChatRead(true);
    }
    function onNewMessage(msg: ChatMessage) {
      if (msg.user?.id === user?.id) {
        setMessages((prev) => {
          const idx = prev.findIndex((m) => m.pending && !m.failed);
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
      } else {
        setMessages((prev) => [...prev, msg]);
        haptics.receive();
      }
      stickToBottomRef.current = true;
      scrollToEndAfterMessage();
      markChatRead(socket.connected);
    }
    function onMessageDeleted({ messageId }: { messageId: string }) {
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    }
    function onRoomCleared() {
      setMessages([]);
    }
    function onMessageReaction(data: { messageId: string; reactions: { emoji: string; count: number }[] }) {
      setMessages((prev) => prev.map((m) => (m.id === data.messageId ? { ...m, reactions: data.reactions } : m)));
    }
    function onOnlineUsers(list: ChatOnlineUser[]) {
      setOnlineUsers(list);
    }
    function onUserTyping(data: { userId: string; displayName?: string }) {
      if (data.userId === user?.id) return;
      setTypingUsers((prev) => ({ ...prev, [data.userId]: data.displayName ?? "Birisi" }));
    }
    function onUserTypingStop(data: { userId: string }) {
      setTypingUsers((prev) => {
        const next = { ...prev };
        delete next[data.userId];
        return next;
      });
    }
    function onReadReceipt(data: { userId: string; readAt: string }) {
      if (isDm && data.userId === targetUserId) {
        setPartnerLastReadAt((prev) => {
          if (!prev || new Date(data.readAt) > new Date(prev)) return data.readAt;
          return prev;
        });
      }
    }
    function onModerationNotice(data: { message?: string; clearInput?: boolean }) {
      if (data?.message) {
        setModerationNotice(data.message);
        if (data.clearInput !== false) {
          setInputText("");
          setPendingAttachments([]);
        }
      }
    }
    function onSocketError(data: { message?: string }) {
      Alert.alert("Sohbet hatası", data?.message ?? "Bir hata oluştu");
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("access_denied", onAccessDenied);
    socket.on("password_required", onPasswordRequired);
    socket.on("history", onHistory);
    socket.on("new_message", onNewMessage);
    socket.on("message_deleted", onMessageDeleted);
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
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    if (contentOffset.y < SCROLL_TOP_THRESHOLD) {
      void loadOlderMessages();
    }
    const distanceFromBottom = contentSize.height - layoutMeasurement.height - contentOffset.y;
    stickToBottomRef.current = distanceFromBottom < 120;
  }

  async function pickAndSendImage() {
    if (!chatId || !token) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("İzin gerekli", "Resim göndermek için galeri erişim izni vermelisiniz.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
    });
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
    stickToBottomRef.current = true;
    scrollToEndAfterMessage();

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
    sendWithAttachments(inputText, pendingAttachments);
    setInputText("");
    setPendingAttachments([]);
    stopTypingNow();
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
    getSocket(token).emit("join_room", { chatId, password: passwordInput.trim() });
    setPasswordInput("");
  }

  function handleReact(messageId: string, emoji: string) {
    haptics.tap();
    getSocket(token).emit("react_message", { messageId, emoji });
  }

  function handleDeleteMessage(messageId: string) {
    Alert.alert("Mesajı sil", "Bu mesajı silmek istediğinize emin misiniz?", [
      { text: "Vazgeç", style: "cancel" },
      {
        text: "Sil",
        style: "destructive",
        onPress: () => getSocket(token).emit("delete_message", { messageId }),
      },
    ]);
  }

  function handleCopyMessage(msg: ChatMessage) {
    if (!msg.body) return;
    void Clipboard.setStringAsync(msg.body);
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

  useEffect(() => {
    if (!searchOpen || searchMatches.length === 0) return;
    const index = searchMatches[searchMatchPos];
    if (index === undefined) return;
    setTimeout(() => {
      flatListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.4 });
    }, 50);
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
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="alert-circle-outline" size={40} color="#9ca3af" />
          <Text className="mt-3 text-sm text-muted text-center">{resolveError}</Text>
        </View>
      </View>
    );
  }

  if (accessDenied) {
    const noLocation = accessDenied.reason === "no_location";
    const blocked = accessDenied.reason === "blocked";
    return (
      <View className="flex-1 bg-background">
        <DetailHeader title={roomName || "Sohbet"} onBack={() => router.back()} />
        <View className="flex-1 items-center justify-center px-6 gap-4">
          <View className="w-16 h-16 rounded-full bg-yellow-100 items-center justify-center">
            <Ionicons
              name={noLocation ? "location-outline" : blocked ? "ban-outline" : "lock-closed-outline"}
              size={28}
              color="#ca8a04"
            />
          </View>
          <Text className="text-base font-bold text-text text-center">
            {blocked ? "Bu sohbete erişilemiyor" : "Bu odaya erişilemiyor"}
          </Text>
          <Text className="text-sm text-muted text-center">
            {noLocation
              ? "Erişmek için profilinizde konum bilgisi gerekli."
              : blocked
                ? "Bu kullanıcıyla mesajlaşamazsınız."
                : `${accessDenied.requiredLocation} sakinine özel oda.`}
          </Text>
          {noLocation && (
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/profil/duzenle" as never)}
              className="bg-primary rounded-xl px-5 py-2.5"
            >
              <Text className="text-white font-semibold text-sm">Konum ekle</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  if (chatId && passwordRequired) {
    return (
      <KeyboardAvoidingView
        className="flex-1 bg-background"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <DetailHeader title={roomName || "Şifreli Oda"} onBack={() => router.back()} />
        <View className="flex-1 items-center justify-center px-6 gap-4">
          <View className="w-16 h-16 rounded-full bg-primary/10 items-center justify-center">
            <Ionicons name="key-outline" size={28} color="#1a56db" />
          </View>
          <Text className="text-base font-bold text-text">Şifreli Oda</Text>
          <Text className="text-sm text-muted text-center">Devam etmek için oda şifresini girin.</Text>
          <TextInput
            value={passwordInput}
            onChangeText={setPasswordInput}
            placeholder="Oda şifresi…"
            placeholderTextColor="#9ca3af"
            secureTextEntry
            autoFocus
            className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-text"
          />
          <TouchableOpacity
            onPress={submitPassword}
            disabled={!passwordInput.trim()}
            className={`bg-primary rounded-xl px-5 py-2.5 w-full items-center ${!passwordInput.trim() ? "opacity-50" : ""}`}
          >
            <Text className="text-white font-semibold text-sm">Gir</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={Platform.OS === "android" ? { paddingBottom: androidKeyboardHeight } : undefined}
    >
      <View
        className="flex-row items-center gap-2.5 border-b border-border bg-surface px-3 pb-3"
        style={{ paddingTop: insets.top + 10 }}
      >
        <TouchableOpacity onPress={() => router.back()} className="w-9 h-9 items-center justify-center -ml-1">
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Avatar name={roomName || "?"} url={isDm ? targetUser?.profile?.avatarUrl : undefined} size="sm" />
        <View className="flex-1 min-w-0">
          <View className="flex-row items-center gap-1 min-w-0">
            <Text className="text-base font-bold text-text flex-shrink" numberOfLines={1}>
              {roomName || "…"}
            </Text>
            {isMuted && <Ionicons name="notifications-off-outline" size={13} color="#9ca3af" />}
          </View>
          <TouchableOpacity
            disabled={isDm}
            onPress={() => setShowOnlineUsers(true)}
            hitSlop={{ top: 4, bottom: 4 }}
          >
            <Text
              className={`text-xs ${
                partnerTyping || roomTypingNames.length > 0
                  ? "text-primary"
                  : isDm && partnerOnline
                    ? "text-green-600"
                    : "text-muted"
              }`}
              numberOfLines={1}
            >
              {!isDm && roomTypingNames.length > 0 ? formatTypingLabel(roomTypingNames) : statusLabel}
            </Text>
          </TouchableOpacity>
        </View>
        {!isDm && (
          <TouchableOpacity onPress={() => setShowOnlineUsers(true)} className="w-9 h-9 items-center justify-center">
            <Ionicons name="people-outline" size={19} color="#6b7280" />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={() => {
            setSearchOpen((v) => !v);
            setSearchQuery("");
          }}
          className="w-9 h-9 items-center justify-center"
        >
          <Ionicons name={searchOpen ? "close" : "search-outline"} size={18} color="#6b7280" />
        </TouchableOpacity>
        {isDm && (
          <TouchableOpacity
            onPress={() => setShowPasswordModal(true)}
            className={`flex-row items-center gap-1 rounded-full px-2.5 py-1.5 ${hasPassword ? "bg-yellow-50" : ""}`}
          >
            <Ionicons name="key-outline" size={16} color={hasPassword ? "#ca8a04" : "#6b7280"} />
          </TouchableOpacity>
        )}
        {isDm && (
          <TouchableOpacity onPress={openDmOptions} className="w-9 h-9 items-center justify-center">
            <Ionicons name="ellipsis-vertical" size={18} color="#6b7280" />
          </TouchableOpacity>
        )}
        {!isDm && isAdmin && (
          <TouchableOpacity onPress={openRoomOptions} className="w-9 h-9 items-center justify-center">
            <Ionicons name="ellipsis-vertical" size={18} color="#6b7280" />
          </TouchableOpacity>
        )}
      </View>

      {searchOpen && (
        <View className="flex-row items-center gap-2 border-b border-border bg-surface px-3 py-2">
          <Ionicons name="search-outline" size={15} color="#9ca3af" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Mesajlarda ara…"
            placeholderTextColor="#9ca3af"
            autoFocus
            className="flex-1 text-sm text-text"
          />
          {normalizedSearchQuery ? (
            <Text className="text-xs text-muted">
              {searchMatches.length > 0 ? `${searchMatchPos + 1}/${searchMatches.length}` : "0/0"}
            </Text>
          ) : null}
          <TouchableOpacity onPress={() => goToSearchMatch(-1)} disabled={searchMatches.length === 0}>
            <Ionicons name="chevron-up" size={18} color={searchMatches.length === 0 ? "#d1d5db" : "#1a56db"} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => goToSearchMatch(1)} disabled={searchMatches.length === 0}>
            <Ionicons name="chevron-down" size={18} color={searchMatches.length === 0 ? "#d1d5db" : "#1a56db"} />
          </TouchableOpacity>
        </View>
      )}

      {!connected ? (
        <LoadingScreen label="Sohbet yükleniyor…" />
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
          onScroll={handleScroll}
          scrollEventThrottle={100}
          onContentSizeChange={() => {
            if (stickToBottomRef.current) scrollToEndNow(true);
          }}
          maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          removeClippedSubviews={Platform.OS === "android"}
          onScrollToIndexFailed={({ index }) => {
            setTimeout(() => flatListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.4 }), 150);
          }}
          ListHeaderComponent={
            loadingOlder ? (
              <View className="items-center py-3">
                <ActivityIndicator size="small" color="#1a56db" />
              </View>
            ) : null
          }
          renderItem={({ item, index }) => {
            const isMe = item.user.id === user?.id;
            const prevMsg = messages[index - 1];
            const grouped =
              !!prevMsg &&
              prevMsg.user.id === item.user.id &&
              new Date(item.createdAt).getTime() - new Date(prevMsg.createdAt).getTime() < GROUP_WINDOW_MS;
            const tickState =
              isDm && isMe
                ? partnerLastReadAt && new Date(item.createdAt).getTime() <= new Date(partnerLastReadAt).getTime()
                  ? "read"
                  : "sent"
                : null;
            return (
              <ChatMessageBubble
                message={item}
                isMe={isMe}
                grouped={grouped}
                tickState={tickState}
                onLongPress={
                  item.pending || item.failed
                    ? undefined
                    : () => {
                        haptics.longPress();
                        setActiveMessage(item);
                      }
                }
                onReact={(emoji) => handleReact(item.id, emoji)}
                onImagePress={(url) => setViewerImageUrl(url)}
                onRetry={() => retrySendMessage(item)}
                token={token}
                highlighted={searchOpen && searchMatches[searchMatchPos] === index}
              />
            );
          }}
          ListEmptyComponent={
            <View className="items-center pt-16 gap-2">
              <Ionicons name="chatbubbles-outline" size={32} color="#9ca3af" />
              <Text className="text-sm text-muted">Henüz mesaj yok — ilk siz yazın!</Text>
            </View>
          }
        />
      )}

      {moderationNotice ? (
        <View className="bg-yellow-50 border-t border-yellow-200 px-4 py-2 flex-row items-center gap-2">
          <Ionicons name="warning-outline" size={16} color="#ca8a04" />
          <Text className="text-xs text-yellow-800 flex-1">{moderationNotice}</Text>
          <TouchableOpacity onPress={() => setModerationNotice("")}>
            <Ionicons name="close" size={16} color="#ca8a04" />
          </TouchableOpacity>
        </View>
      ) : null}

      {token ? (
        <View className="bg-surface border-t border-border px-4 pt-2.5" style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
          {replyTarget && (
            <View className="flex-row items-center gap-2 bg-background rounded-xl px-3 py-2 mb-2 border-l-2 border-primary">
              <View className="flex-1 min-w-0">
                <Text className="text-xs font-semibold text-primary" numberOfLines={1}>
                  {replyTarget.user.profile?.displayName ?? "Anonim"}
                </Text>
                <Text className="text-xs text-muted" numberOfLines={1}>
                  {replyTarget.body || "📎 Ek"}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setReplyTarget(null)}>
                <Ionicons name="close-circle" size={18} color="#9ca3af" />
              </TouchableOpacity>
            </View>
          )}

          {showTimerPicker && <TimerPicker value={expiresInSeconds} onChange={setExpiresInSeconds} />}

          {pendingAttachments.length > 0 && (
            <View className="flex-row flex-wrap gap-2 mb-2">
              {pendingAttachments.map((att) => (
                <View key={att.url} className="relative">
                  <Image
                    source={{ uri: avatarUrl(att.url) ?? att.url }}
                    style={{ width: 56, height: 56, borderRadius: 10 }}
                    resizeMode="cover"
                  />
                  <TouchableOpacity
                    onPress={() => setPendingAttachments((p) => p.filter((a) => a.url !== att.url))}
                    className="absolute -right-1.5 -top-1.5 w-5 h-5 rounded-full bg-danger items-center justify-center"
                  >
                    <Ionicons name="close" size={12} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {isRecordingVoice ? (
            <VoiceRecorderBar onCancel={() => setIsRecordingVoice(false)} onSend={(uri, dur) => void sendVoiceMessage(uri, dur)} />
          ) : uploadingVoice ? (
            <View className="flex-row items-center justify-center gap-2 py-2.5">
              <ActivityIndicator size="small" color="#1a56db" />
              <Text className="text-sm text-muted">Sesli mesaj gönderiliyor…</Text>
            </View>
          ) : (
            <View className="flex-row items-end gap-2">
              <TouchableOpacity
                onPress={() => void pickAndSendImage()}
                disabled={uploadingImage}
                className="w-9 h-9 rounded-full items-center justify-center"
              >
                {uploadingImage ? (
                  <ActivityIndicator size="small" color="#1a56db" />
                ) : (
                  <Ionicons name="image-outline" size={20} color="#6b7280" />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowTimerPicker((v) => !v)}
                className="w-9 h-9 rounded-full items-center justify-center"
              >
                <Ionicons name="time-outline" size={20} color={expiresInSeconds > 0 ? "#ca8a04" : "#6b7280"} />
              </TouchableOpacity>
              <TextInput
                value={inputText}
                onChangeText={setInputText}
                placeholder={
                  expiresInSeconds > 0
                    ? "Otomatik silinecek mesaj…"
                    : isDm
                      ? `${roomName} kişisine mesaj yaz…`
                      : "Mesaj yaz…"
                }
                placeholderTextColor="#9ca3af"
                multiline
                maxLength={1000}
                className="flex-1 bg-background border border-border rounded-2xl px-3 py-2 text-sm text-text min-h-[40] max-h-[100]"
              />
              {!inputText.trim() && pendingAttachments.length === 0 ? (
                <TouchableOpacity
                  onPress={() => {
                    haptics.tap();
                    setIsRecordingVoice(true);
                  }}
                  disabled={!connected}
                  className={`bg-primary w-10 h-10 rounded-full items-center justify-center ${!connected ? "opacity-50" : ""}`}
                >
                  <Ionicons name="mic-outline" size={19} color="#fff" />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={sendMessage}
                  disabled={(!inputText.trim() && pendingAttachments.length === 0) || !connected}
                  className={`bg-primary w-10 h-10 rounded-full items-center justify-center ${
                    (!inputText.trim() && pendingAttachments.length === 0) || !connected ? "opacity-50" : ""
                  }`}
                >
                  <Ionicons name="arrow-up" size={18} color="#fff" />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      ) : (
        <View className="bg-surface border-t border-border px-4 py-3 items-center" style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
          <Text className="text-sm text-muted">Mesaj göndermek için giriş yapın</Text>
        </View>
      )}

      <MessageActionSheet
        visible={!!activeMessage}
        canDelete={!!activeMessage && activeMessage.user.id === user?.id && !isDm}
        canCopy={!!activeMessage?.body}
        onClose={() => setActiveMessage(null)}
        onReact={(emoji) => activeMessage && handleReact(activeMessage.id, emoji)}
        onDelete={() => activeMessage && handleDeleteMessage(activeMessage.id)}
        onReply={() => activeMessage && setReplyTarget(activeMessage)}
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
    </KeyboardAvoidingView>
  );
}
