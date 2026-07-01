"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { ChatChannelsSidebar } from "@/components/sohbet/ChatChannelsSidebar";
import { ChatPageShell } from "@/components/sohbet/ChatPageShell";
import { DmConversationList, DmEmptyState } from "@/components/sohbet/DmConversationList";
import { NewMessageModal } from "@/components/sohbet/NewMessageModal";
import { ChatRulesButton } from "@/components/sohbet/ChatRulesButton";
import { DmEntry } from "@/components/sohbet/chat-utils";

export default function MesajlarimPage() {
  const router = useRouter();
  const { token, isAuthenticated } = useAuth();
  const [dms, setDms] = useState<DmEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [channelsOpen, setChannelsOpen] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [deletingChatId, setDeletingChatId] = useState<string | null>(null);

  const loadDms = useCallback(() => {
    if (!token) return;
    api
      .get<DmEntry[]>("/chat/dm/list", token)
      .then(setDms)
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/giris");
      return;
    }
    loadDms();
    setLoading(false);
  }, [token, isAuthenticated, router, loadDms]);

  async function handleDeleteConversation(chatId: string) {
    if (!token || !confirm("Bu sohbeti gelen kutunuzdan silmek istediğinize emin misiniz?")) return;
    setDeletingChatId(chatId);
    try {
      await api.delete(`/chat/dm/${chatId}`, token);
      setDms((prev) => prev.filter((d) => d.chatId !== chatId));
    } catch {
      // sessiz
    } finally {
      setDeletingChatId(null);
    }
  }

  return (
    <>
      <ChatPageShell
        title="Özel Mesajlar"
        subtitle="Doğrudan mesajlaşmalarınız"
        headerActions={<ChatRulesButton />}
      >
        <ChatChannelsSidebar
          dmActive
          open={channelsOpen}
          onToggle={() => setChannelsOpen((v) => !v)}
        />
        <DmConversationList
          dms={dms}
          loading={loading}
          onNewMessage={() => setShowSearch(true)}
          onDelete={handleDeleteConversation}
          deletingChatId={deletingChatId}
        />
        <DmEmptyState onNewMessage={() => setShowSearch(true)} />
      </ChatPageShell>

      <NewMessageModal open={showSearch} onClose={() => setShowSearch(false)} />
    </>
  );
}
