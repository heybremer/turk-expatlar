"use client";

import { useEffect, useState } from "react";
import { Check, UserCheck, UserMinus, UserPlus, UserX } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/Button";

type FriendshipStatus =
  | { status: "SELF" }
  | { status: "NONE" }
  | { status: "FRIENDS"; requestId: string }
  | { status: "PENDING_SENT"; requestId: string }
  | { status: "PENDING_RECEIVED"; requestId: string };

export function FriendButton({ targetUserId }: { targetUserId: string }) {
  const { token, isAuthenticated } = useAuth();
  const [data, setData] = useState<FriendshipStatus | null>(null);
  const [loading, setLoading] = useState(false);

  function load() {
    if (!token) return;
    api
      .get<FriendshipStatus>(`/users/${targetUserId}/friendship-status`, token)
      .then(setData)
      .catch(() => {});
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetUserId, token]);

  if (!isAuthenticated() || !data || data.status === "SELF") return null;

  async function sendRequest() {
    if (!token) return;
    setLoading(true);
    try {
      await api.post(`/users/${targetUserId}/friend-request`, {}, token);
      load();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "İstek gönderilemedi");
    } finally {
      setLoading(false);
    }
  }

  async function acceptRequest(requestId: string) {
    if (!token) return;
    setLoading(true);
    try {
      await api.post(`/users/friend-requests/${requestId}/accept`, {}, token);
      load();
    } catch {
      alert("İşlem gerçekleştirilemedi");
    } finally {
      setLoading(false);
    }
  }

  async function cancelOrReject(requestId: string) {
    if (!token) return;
    setLoading(true);
    try {
      await api.delete(`/users/friend-requests/${requestId}`, token);
      load();
    } catch {
      alert("İşlem gerçekleştirilemedi");
    } finally {
      setLoading(false);
    }
  }

  async function removeFriend() {
    if (!token) return;
    if (!confirm("Bu kişiyi arkadaşlıktan çıkarmak istediğinize emin misiniz?")) return;
    setLoading(true);
    try {
      await api.delete(`/users/${targetUserId}/friend`, token);
      load();
    } catch {
      alert("İşlem gerçekleştirilemedi");
    } finally {
      setLoading(false);
    }
  }

  if (data.status === "NONE") {
    return (
      <Button variant="outline" onClick={sendRequest} disabled={loading}>
        <UserPlus className="mr-2 h-4 w-4" />
        Arkadaş ekle
      </Button>
    );
  }

  if (data.status === "PENDING_SENT") {
    return (
      <Button variant="outline" onClick={() => cancelOrReject(data.requestId)} disabled={loading}>
        <UserX className="mr-2 h-4 w-4" />
        İsteği geri çek
      </Button>
    );
  }

  if (data.status === "PENDING_RECEIVED") {
    return (
      <div className="flex gap-2">
        <Button onClick={() => acceptRequest(data.requestId)} disabled={loading}>
          <Check className="mr-2 h-4 w-4" />
          Kabul et
        </Button>
        <Button variant="outline" onClick={() => cancelOrReject(data.requestId)} disabled={loading}>
          Reddet
        </Button>
      </div>
    );
  }

  // FRIENDS
  return (
    <Button variant="outline" onClick={removeFriend} disabled={loading}>
      <UserCheck className="mr-2 h-4 w-4" />
      Arkadaşsınız
      <UserMinus className="ml-2 h-3.5 w-3.5 text-muted" />
    </Button>
  );
}
