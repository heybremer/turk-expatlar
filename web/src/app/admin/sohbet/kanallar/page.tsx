"use client";

import { useCallback, useEffect, useState } from "react";
import { Hash, Loader2, Plus } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type Channel = {
  id: string;
  type: string;
  name?: string | null;
  password?: string | null;
  isPublic: boolean;
  createdAt: string;
  state?: { name: string; slug: string } | null;
  city?: { name: string; slug: string } | null;
  _count?: { messages: number; members: number };
};

type State = { id: string; name: string };
type City = { id: string; name: string; stateId: string };

const TYPE_LABELS: Record<string, string> = {
  GLOBAL: "Genel",
  STATE: "Eyalet",
  CITY: "Şehir",
  EVENT: "Etkinlik",
};

const selectCls = "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm";

export default function AdminSohbetKanallarPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<Channel[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({
    type: "GLOBAL",
    name: "",
    stateId: "",
    cityId: "",
    password: "",
    isPublic: true,
  });

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.get<{ items: Channel[] }>("/admin/chat/channels", token);
      setItems(res.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    api.get<State[]>("/locations/states").then(setStates).catch(() => {});
  }, []);

  useEffect(() => {
    if (!form.stateId) { setCities([]); return; }
    api.get<City[]>(`/locations/cities?stateId=${form.stateId}`).then(setCities).catch(() => {});
  }, [form.stateId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await api.post(
        "/admin/chat/channels",
        {
          type: form.type,
          name: form.name || undefined,
          stateId: form.type === "STATE" || form.type === "CITY" ? form.stateId || undefined : undefined,
          cityId: form.type === "CITY" ? form.cityId || undefined : undefined,
          password: form.password || undefined,
          isPublic: form.isPublic,
        },
        token,
      );
      setSuccess("Kanal oluşturuldu.");
      setForm({ type: "GLOBAL", name: "", stateId: "", cityId: "", password: "", isPublic: true });
      void load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Oluşturulamadı");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3">
        <Hash className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-bold">Sohbet Kanalları</h1>
      </div>
      <p className="mt-1 text-sm text-muted">
        Genel, eyalet veya şehir sohbet kanalları oluşturun. Moderasyon botu tüm kanalları izler.
      </p>

      <form onSubmit={(e) => void submit(e)} className="mt-6 max-w-lg space-y-4 rounded-xl border border-border bg-surface p-5">
        <h2 className="font-semibold">Yeni kanal</h2>
        <div>
          <label className="mb-1 block text-sm">Kanal türü</label>
          <select
            value={form.type}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
            className={selectCls}
          >
            <option value="GLOBAL">Genel kanal</option>
            <option value="STATE">Eyalet kanalı</option>
            <option value="CITY">Şehir kanalı</option>
          </select>
        </div>
        <Input
          label="Kanal adı"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="Örn: Genel Sohbet, Berlin Türkler"
        />
        {(form.type === "STATE" || form.type === "CITY") && (
          <div>
            <label className="mb-1 block text-sm">Eyalet</label>
            <select
              value={form.stateId}
              onChange={(e) => setForm((f) => ({ ...f, stateId: e.target.value, cityId: "" }))}
              className={selectCls}
              required
            >
              <option value="">Seçin</option>
              {states.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        )}
        {form.type === "CITY" && (
          <div>
            <label className="mb-1 block text-sm">Şehir</label>
            <select
              value={form.cityId}
              onChange={(e) => setForm((f) => ({ ...f, cityId: e.target.value }))}
              className={selectCls}
              required
            >
              <option value="">Seçin</option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}
        <Input
          label="Oda şifresi (opsiyonel)"
          type="password"
          value={form.password}
          onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.isPublic}
            onChange={(e) => setForm((f) => ({ ...f, isPublic: e.target.checked }))}
          />
          Herkese açık listede göster
        </label>
        {error && <p className="text-sm text-danger">{error}</p>}
        {success && <p className="text-sm text-emerald-600">{success}</p>}
        <Button type="submit" disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="mr-1 h-4 w-4" />}
          Kanal oluştur
        </Button>
      </form>

      <div className="mt-8 overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-background text-left text-xs text-muted">
            <tr>
              <th className="px-4 py-3">Kanal</th>
              <th className="px-4 py-3">Tür</th>
              <th className="px-4 py-3">Konum</th>
              <th className="px-4 py-3">Mesaj / Üye</th>
              <th className="px-4 py-3">Oluşturulma</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr><td colSpan={5} className="py-12 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={5} className="py-12 text-center text-muted">Kanal yok</td></tr>
            ) : (
              items.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3 font-medium">
                    {c.name ?? "—"}
                    {c.password && <span className="ml-2 text-xs text-muted">🔒</span>}
                  </td>
                  <td className="px-4 py-3">{TYPE_LABELS[c.type] ?? c.type}</td>
                  <td className="px-4 py-3 text-muted">
                    {c.city?.name ?? c.state?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {c._count?.messages ?? 0} / {c._count?.members ?? 0}
                  </td>
                  <td className="px-4 py-3 text-muted">{formatDate(c.createdAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
