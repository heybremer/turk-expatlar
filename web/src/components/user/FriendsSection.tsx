"use client";

import { useEffect, useState } from "react";
import { Check, UserMinus, Users, X } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ForumAvatar } from "@/components/forum/ForumAvatar";
import { UserDisplayName } from "@/components/user/UserDisplayName";
import type { PostalCountry } from "@/lib/postal-country";

type FriendProfile = {
  id: string;
  role: string;
  displayName: string;
  avatarUrl: string | null;
  postalCountry: PostalCountry | null;
};

type IncomingRequest = { id: string; createdAt: string; user: FriendProfile };
type Friend = FriendProfile & { friendsSince: string };

export function FriendsSection() {
  const { token } = useAuth();
  const [friends, setFriends] = useState<Friend[] | null>(null);
  const [incoming, setIncoming] = useState<IncomingRequest[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function load() {
    if (!token) return;
    api.get<Friend[]>("/users/friends", token).then(setFriends).catch(() => {});
    api
      .get<IncomingRequest[]>("/users/friend-requests/incoming", token)
      .then(setIncoming)
      .catch(() => {});
  }

  useEffect(load, [token]);

  async function accept(requestId: string) {
    if (!token) return;
    setBusyId(requestId);
    try {
      await api.post(`/users/friend-requests/${requestId}/accept`, {}, token);
      load();
    } catch {
      alert("İşlem gerçekleştirilemedi");
    } finally {
      setBusyId(null);
    }
  }

  async function reject(requestId: string) {
    if (!token) return;
    setBusyId(requestId);
    try {
      await api.delete(`/users/friend-requests/${requestId}`, token);
      load();
    } catch {
      alert("İşlem gerçekleştirilemedi");
    } finally {
      setBusyId(null);
    }
  }

  async function removeFriend(userId: string) {
    if (!token) return;
    if (!confirm("Bu kişiyi arkadaşlıktan çıkarmak istediğinize emin misiniz?")) return;
    setBusyId(userId);
    try {
      await api.delete(`/users/${userId}/friend`, token);
      load();
    } catch {
      alert("İşlem gerçekleştirilemedi");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mt-6">
      <h2 className="flex items-center gap-2 font-semibold">
        <Users className="h-4.5 w-4.5 text-primary" />
        Arkadaşlarım
        {friends && friends.length > 0 && (
          <span className="text-sm font-normal text-muted">({friends.length})</span>
        )}
      </h2>

      {incoming && incoming.length > 0 && (
        <Card className="mt-3">
          <p className="text-sm font-medium">Bekleyen arkadaşlık istekleri</p>
          <ul className="mt-3 space-y-3">
            {incoming.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <ForumAvatar
                    name={r.user.displayName}
                    userId={r.user.id}
                    avatarUrl={r.user.avatarUrl}
                    role={r.user.role}
                    size="sm"
                  />
                  <UserDisplayName
                    name={r.user.displayName}
                    userId={r.user.id}
                    postalCountry={r.user.postalCountry}
                    nameClassName="text-sm font-medium"
                  />
                </div>
                <div className="flex gap-1.5">
                  <Button size="sm" onClick={() => accept(r.id)} disabled={busyId === r.id}>
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => reject(r.id)}
                    disabled={busyId === r.id}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="mt-3">
        {!friends || friends.length === 0 ? (
          <p className="text-sm text-muted">Henüz hiç arkadaşınız yok.</p>
        ) : (
          <ul className="divide-y divide-border">
            {friends.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="flex items-center gap-2.5">
                  <ForumAvatar
                    name={f.displayName}
                    userId={f.id}
                    avatarUrl={f.avatarUrl}
                    role={f.role}
                    size="sm"
                  />
                  <UserDisplayName
                    name={f.displayName}
                    userId={f.id}
                    postalCountry={f.postalCountry}
                    nameClassName="text-sm font-medium"
                  />
                </div>
                <button
                  onClick={() => removeFriend(f.id)}
                  disabled={busyId === f.id}
                  title="Arkadaşlıktan çıkar"
                  className="text-muted hover:text-danger disabled:opacity-50"
                >
                  <UserMinus className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
