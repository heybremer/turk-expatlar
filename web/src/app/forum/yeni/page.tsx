"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, FederalState } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SensitiveBanner } from "@/components/ui/SensitiveBanner";

type Category = { id: string; name: string; slug: string };

export default function YeniKonuPage() {
  const router = useRouter();
  const { token, user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [states, setStates] = useState<FederalState[]>([]);
  const [cities, setCities] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState({
    categoryId: "",
    title: "",
    body: "",
    stateId: "",
    cityId: "",
    isAnonymous: false,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      router.push("/giris");
      return;
    }
    api
      .get<Category[]>("/forum/categories")
      .then(setCategories)
      .catch(() => {});
    api
      .get<FederalState[]>("/locations/states")
      .then((s) => {
        setStates(s);
        if (user?.profile?.stateId) {
          setForm((f) => ({
            ...f,
            stateId: user.profile?.stateId ?? "",
            cityId: user.profile?.cityId ?? "",
          }));
        }
      })
      .catch(() => {});
  }, [token, user, router]);

  useEffect(() => {
    const s = states.find((x) => x.id === form.stateId);
    setCities(s?.cities ?? []);
  }, [form.stateId, states]);

  const activeCategory = categories.find((c) => c.id === form.categoryId);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (form.title.trim().length < 5) {
      setError("Başlık en az 5 karakter olmalı");
      return;
    }
    if (form.body.trim().length < 20) {
      setError("Açıklama en az 20 karakter olmalı");
      return;
    }
    setLoading(true);
    try {
      const created = await api.post<{ id: string }>(
        "/forum/topics",
        {
          ...form,
          stateId: form.stateId || undefined,
          cityId: form.cityId || undefined,
        },
        token,
      );
      router.push(`/forum/${created.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gönderilemedi");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full min-w-0">
      <Link href="/forum" className="text-sm text-muted hover:text-primary">
        ← Foruma dön
      </Link>

      <h1 className="mt-4 text-2xl font-bold">Soru sor</h1>
      <p className="mt-1 text-sm text-muted">
        Net başlık ve detaylı açıklama, daha hızlı ve doğru cevap almanı sağlar.
      </p>

      <form onSubmit={submit} className="mt-8 space-y-4">
        <div>
          <label htmlFor="categoryId" className="block text-sm font-medium">Kategori</label>
          <select
            id="categoryId"
            className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
            value={form.categoryId}
            onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
            required
          >
            <option value="">Seçin</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {activeCategory && <SensitiveBanner categorySlug={activeCategory.slug} />}

        <Input
          label="Başlık"
          placeholder="Örn: Anmeldung randevusu bulamıyorum"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
        />

        <div>
          <label htmlFor="forumBody" className="block text-sm font-medium">Açıklama</label>
          <textarea
            id="forumBody"
            className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
            rows={6}
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            placeholder="Durumunu, denediklerini ve ne tür cevap aradığını yaz."
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="forumStateId" className="block text-sm font-medium">Eyalet (opsiyonel)</label>
            <select
              id="forumStateId"
              className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              value={form.stateId}
              onChange={(e) => setForm({ ...form, stateId: e.target.value })}
            >
              <option value="">—</option>
              {states.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="forumCityId" className="block text-sm font-medium">Şehir (opsiyonel)</label>
            <select
              id="forumCityId"
              className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              value={form.cityId}
              onChange={(e) => setForm({ ...form, cityId: e.target.value })}
              disabled={!form.stateId}
            >
              <option value="">—</option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.isAnonymous}
            onChange={(e) =>
              setForm({ ...form, isAnonymous: e.target.checked })
            }
          />
          Anonim olarak gönder (moderasyon onayından geçer)
        </label>

        {error && <p className="text-sm text-danger">{error}</p>}

        <Button type="submit" disabled={loading}>
          {loading ? "Gönderiliyor..." : "Yayınla"}
        </Button>
      </form>
    </div>
  );
}
