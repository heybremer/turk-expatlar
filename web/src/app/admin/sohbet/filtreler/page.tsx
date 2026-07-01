"use client";

import { useCallback, useEffect, useState } from "react";
import { Bot, Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type BannedWord = {
  id: string;
  word: string;
  severity: string;
  isActive: boolean;
  createdAt: string;
};

export default function AdminSohbetFiltrelerPage() {
  const { token } = useAuth();
  const [words, setWords] = useState<BannedWord[]>([]);
  const [newWord, setNewWord] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      setWords(await api.get<BannedWord[]>("/admin/chat/banned-words", token));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  async function addWord(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !newWord.trim()) return;
    setSaving(true);
    try {
      await api.post("/admin/chat/banned-words", { word: newWord.trim(), severity: "CRITICAL" }, token);
      setNewWord("");
      void load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eklenemedi");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!token || !confirm("Bu kelime filtreden kaldırılsın mı?")) return;
    await api.delete(`/admin/chat/banned-words/${id}`, token);
    void load();
  }

  async function toggle(id: string, isActive: boolean) {
    if (!token) return;
    await api.patch(`/admin/chat/banned-words/${id}`, { isActive: !isActive }, token);
    void load();
  }

  async function seedDefaults() {
    if (!token) return;
    if (!confirm("Varsayılan listeden yalnızca yeni kelimeler eklenecek. Mevcut kelimeler aynen kalır, aynı kelime tekrar eklenmez. Devam edilsin mi?")) {
      return;
    }
    setSeeding(true);
    setError("");
    setSuccess("");
    try {
      const res = await api.post<{
        created: number;
        skipped: number;
        scanned: number;
        totalInList: number;
      }>(
        "/admin/chat/banned-words/seed-defaults",
        {},
        token,
      );
      setSuccess(
        res.created > 0
          ? `${res.created} yeni kelime eklendi. ${res.skipped} kelime zaten listede olduğu için atlandı. Toplam: ${res.totalInList} kelime.`
          : `Yeni kelime yok — ${res.skipped} kelime zaten listede. Toplam: ${res.totalInList} kelime.`,
      );
      void load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Liste oluşturulamadı");
    } finally {
      setSeeding(false);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3">
        <Bot className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-bold">Sohbet Filtreleri</h1>
      </div>
      <p className="mt-1 text-sm text-muted">
        Yasaklı kelimeler moderasyon botu tarafından anında engellenir. Kritik (küfür) kelimeler mesajı iletmez.
      </p>

      <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-muted">
        <p className="font-medium text-text">Otomatik kurallar (kod içi)</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>Instagram, Facebook, Telegram, WhatsApp link ve kullanıcı adları engellenir</li>
          <li>Telefon numarası paylaşımı engellenir</li>
          <li>8+ mesaj / 10 saniye veya tekrarlayan mesaj → spam ihlali</li>
          <li>1. ihlal: uyarı — mesaj gönderilmez ve silinir</li>
          <li>Aynı yasaklı kelime 2. kez: otomatik 1 saat sohbet yasağı</li>
        </ul>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          disabled={seeding}
          onClick={() => void seedDefaults()}
          className="border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10"
        >
          {seeding ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 h-4 w-4" />
          )}
          Varsayılan kelimeleri üret
        </Button>
        <p className="text-xs text-muted">
          Türkçe küfür ve argo listesinden yalnızca eksik kelimeleri ekler
        </p>
      </div>

      <form onSubmit={(e) => void addWord(e)} className="mt-6 flex max-w-md flex-wrap gap-3">
        <div className="min-w-[200px] flex-1">
          <Input
            label="Yasaklı kelime ekle"
            value={newWord}
            onChange={(e) => setNewWord(e.target.value)}
            placeholder="Küfür veya uygunsuz kelime"
            minLength={2}
            required
          />
        </div>
        <div className="flex items-end">
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="mr-1 h-4 w-4" />}
            Ekle
          </Button>
        </div>
      </form>

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      {success && <p className="mt-3 text-sm text-emerald-600">{success}</p>}

      <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-background text-left text-xs text-muted">
            <tr>
              <th className="px-4 py-3">Kelime</th>
              <th className="px-4 py-3">Seviye</th>
              <th className="px-4 py-3">Durum</th>
              <th className="px-4 py-3 text-right">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr><td colSpan={4} className="py-12 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
            ) : words.length === 0 ? (
              <tr><td colSpan={4} className="py-12 text-center text-muted">Henüz yasaklı kelime yok — küfür ve uygunsuz kelimeleri ekleyin</td></tr>
            ) : (
              words.map((w) => (
                <tr key={w.id}>
                  <td className="px-4 py-3 font-mono font-medium">{w.word}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-danger/10 px-2 py-0.5 text-xs text-danger">
                      {w.severity === "CRITICAL" ? "Kritik" : "Uyarı"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => void toggle(w.id, w.isActive)}
                      className={`rounded-full px-2 py-0.5 text-xs ${w.isActive ? "bg-emerald-500/10 text-emerald-600" : "bg-muted/20 text-muted"}`}
                    >
                      {w.isActive ? "Aktif" : "Pasif"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="sm" className="text-danger" onClick={() => void remove(w.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
