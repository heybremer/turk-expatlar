"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, FederalState } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type Category = { id: string; name: string; slug: string };

export default function YeniIsletmePage() {
  const router = useRouter();
  const { token } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [states, setStates] = useState<FederalState[]>([]);
  const [cities, setCities] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState({
    categoryId: "",
    stateId: "",
    cityId: "",
    name: "",
    description: "",
    address: "",
    phone: "",
    whatsapp: "",
    website: "",
    speaksTurkish: true,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      router.push("/giris");
      return;
    }
    Promise.all([
      api.get<Category[]>("/businesses/categories"),
      api.get<FederalState[]>("/locations/states"),
    ])
      .then(([cats, sts]) => {
        setCategories(cats);
        setStates(sts);
      })
      .catch(() => {});
  }, [token, router]);

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
        categoryId: form.categoryId,
        stateId: form.stateId,
        cityId: form.cityId,
        name: form.name,
        description: form.description,
        address: form.address || undefined,
        phone: form.phone || undefined,
        whatsapp: form.whatsapp || undefined,
        website: form.website || undefined,
        speaksTurkish: form.speaksTurkish,
        languages: form.speaksTurkish ? ["tr", "de"] : ["de"],
      };
      await api.post("/businesses", payload, token);
      router.push("/rehber?onay=bekliyor");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gönderilemedi");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full min-w-0">
      <Link href="/rehber" className="text-sm text-muted hover:text-primary">
        ← Rehbere dön
      </Link>

      <h1 className="mt-4 text-2xl font-bold">İşletme ekle</h1>
      <p className="mt-1 text-sm text-muted">
        Kaydın moderasyon onayından sonra rehberde görünür.
      </p>

      <form onSubmit={submit} className="mt-8 space-y-4">
        <Input
          label="İşletme adı"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />

        <div>
          <label className="block text-sm font-medium">Kategori</label>
          <select
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

        <Input
          label="Adres"
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Telefon"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <Input
            label="WhatsApp"
            value={form.whatsapp}
            onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
          />
        </div>
        <Input
          label="Web sitesi"
          value={form.website}
          onChange={(e) => setForm({ ...form, website: e.target.value })}
        />

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.speaksTurkish}
            onChange={(e) =>
              setForm({ ...form, speaksTurkish: e.target.checked })
            }
          />
          Türkçe hizmet veriyor
        </label>

        {error && <p className="text-sm text-danger">{error}</p>}

        <Button type="submit" disabled={loading}>
          {loading ? "Gönderiliyor..." : "İşletmeyi kaydet"}
        </Button>
      </form>
    </div>
  );
}
