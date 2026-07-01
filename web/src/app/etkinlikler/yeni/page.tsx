"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, FederalState } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const CATEGORIES = [
  "bulusma",
  "networking",
  "yeni-gelenler",
  "dil-degisimi",
  "aile",
  "cocuk",
  "spor",
  "kultur-sanat",
  "ogrenci",
  "girisimci",
  "seminer",
  "online",
];

export default function YeniEtkinlikPage() {
  const router = useRouter();
  const { token, user } = useAuth();
  const [states, setStates] = useState<FederalState[]>([]);
  const [cities, setCities] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState({
    title: "",
    description: "",
    location: "",
    startsAt: "",
    endsAt: "",
    capacity: "",
    priceType: "FREE",
    priceAmount: "",
    category: "bulusma",
    stateId: "",
    cityId: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      router.push("/giris");
      return;
    }
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

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const payload = {
        title: form.title,
        description: form.description,
        location: form.location,
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : undefined,
        capacity: form.capacity ? parseInt(form.capacity, 10) : undefined,
        priceType: form.priceType,
        priceAmount:
          form.priceType === "PAID" && form.priceAmount
            ? parseFloat(form.priceAmount)
            : undefined,
        category: form.category,
        stateId: form.stateId,
        cityId: form.cityId,
      };
      const created = await api.post<{ id: string }>("/events", payload, token);
      router.push(`/etkinlikler/${created.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gönderilemedi");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full min-w-0">
      <Link href="/etkinlikler" className="text-sm text-muted hover:text-primary">
        ← Etkinliklere dön
      </Link>

      <h1 className="mt-4 text-2xl font-bold">Etkinlik oluştur</h1>
      <p className="mt-1 text-sm text-muted">
        İlk etkinliğin moderasyon onayından sonra yayınlanır.
      </p>

      <form onSubmit={submit} className="mt-8 space-y-4">
        <Input
          label="Başlık"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
        />

        <div>
          <label className="block text-sm font-medium">Açıklama</label>
          <textarea
            className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
            rows={5}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            required
          />
        </div>

        <Input
          label="Konum (mekân, semt)"
          value={form.location}
          onChange={(e) => setForm({ ...form, location: e.target.value })}
          required
        />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium">Başlangıç</label>
            <input
              type="datetime-local"
              className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              value={form.startsAt}
              onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Bitiş (ops.)</label>
            <input
              type="datetime-local"
              className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              value={form.endsAt}
              onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium">Eyalet</label>
            <select
              className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              value={form.stateId}
              onChange={(e) => setForm({ ...form, stateId: e.target.value })}
              required
            >
              <option value="">Seçin</option>
              {states.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">Şehir</label>
            <select
              className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              value={form.cityId}
              onChange={(e) => setForm({ ...form, cityId: e.target.value })}
              required
              disabled={!form.stateId}
            >
              <option value="">Seçin</option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium">Kategori</label>
            <select
              className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">Kapasite (ops.)</label>
            <input
              type="number"
              min={1}
              className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              value={form.capacity}
              onChange={(e) => setForm({ ...form, capacity: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium">Ücret</label>
            <select
              className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              value={form.priceType}
              onChange={(e) => setForm({ ...form, priceType: e.target.value })}
            >
              <option value="FREE">Ücretsiz</option>
              <option value="PAID">Ücretli</option>
            </select>
          </div>
          {form.priceType === "PAID" && (
            <Input
              label="Fiyat (€)"
              type="number"
              step="0.5"
              min="0"
              value={form.priceAmount}
              onChange={(e) => setForm({ ...form, priceAmount: e.target.value })}
            />
          )}
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <Button type="submit" disabled={loading}>
          {loading ? "Gönderiliyor..." : "Etkinliği oluştur"}
        </Button>
      </form>
    </div>
  );
}
