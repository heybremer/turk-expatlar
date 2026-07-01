"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Building2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";

type Category = { id: string; name: string };
type State = { id: string; name: string };
type City = { id: string; name: string };

export default function AdminNewBusinessPage() {
  const { token } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [stateId, setStateId] = useState("");
  const [cityId, setCityId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!token) return;
    void api.get<Category[]>("/admin/businesses/categories", token).then(setCategories);
    void api.get<State[]>("/locations/states").then(setStates);
  }, [token]);

  useEffect(() => {
    if (!stateId) { setCities([]); return; }
    void api.get<City[]>(`/locations/cities?stateId=${stateId}`).then(setCities);
  }, [stateId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      await api.post("/admin/businesses", {
        categoryId, stateId, cityId, name, description,
        address: address || undefined,
        phone: phone || undefined,
      }, token);
      setSuccess("İşletme eklendi.");
      setName("");
      setDescription("");
      setAddress("");
      setPhone("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eklenemedi");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg">
      <Link href="/admin/isletmeler" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> İşletme listesi
      </Link>
      <div className="flex items-center gap-2">
        <Building2 className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-bold">İşletme Ekle</h1>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="text-sm text-muted">Kategori</label>
          <select required value={categoryId} onChange={(e) => setCategoryId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm">
            <option value="">Seçin</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm text-muted">Eyalet</label>
            <select required value={stateId} onChange={(e) => { setStateId(e.target.value); setCityId(""); }}
              className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm">
              <option value="">Seçin</option>
              {states.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm text-muted">Şehir</label>
            <select required value={cityId} onChange={(e) => setCityId(e.target.value)} disabled={!stateId}
              className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm">
              <option value="">Seçin</option>
              {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="text-sm text-muted">İşletme adı</label>
          <input required value={name} onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-sm text-muted">Açıklama (min. 20 karakter)</label>
          <textarea required minLength={20} value={description} onChange={(e) => setDescription(e.target.value)} rows={4}
            className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-sm text-muted">Adres</label>
          <input value={address} onChange={(e) => setAddress(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-sm text-muted">Telefon</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}
        {success && <p className="text-sm text-success">{success}</p>}

        <Button type="submit" disabled={loading}>{loading ? "Kaydediliyor…" : "İşletme Ekle"}</Button>
      </form>
    </div>
  );
}
