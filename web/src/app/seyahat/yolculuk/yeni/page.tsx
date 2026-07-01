"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plane } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";

const GERMAN_CITIES = [
  "Berlin", "Hamburg", "Münih", "Köln", "Frankfurt", "Stuttgart",
  "Düsseldorf", "Leipzig", "Dortmund", "Essen", "Bremen", "Hannover",
  "Nürnberg", "Duisburg", "Bochum", "Wuppertal", "Bielefeld", "Bonn",
  "Münster", "Karlsruhe",
];
const TURKISH_CITIES = [
  "İstanbul", "Ankara", "İzmir", "Bursa", "Adana", "Gaziantep",
  "Konya", "Antalya", "Kayseri", "Mersin", "Eskişehir", "Diyarbakır",
  "Samsun", "Denizli", "Şanlıurfa", "Trabzon", "Malatya", "Erzurum",
  "Van", "Batman",
];

function getCities(direction: string, side: "from" | "to") {
  if (direction === "DE_TO_TR") return side === "from" ? GERMAN_CITIES : TURKISH_CITIES;
  return side === "from" ? TURKISH_CITIES : GERMAN_CITIES;
}

export default function YolculukYeniPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    direction: "DE_TO_TR",
    fromCity: "",
    toCity: "",
    departureDate: "",
    availableKg: "",
    notes: "",
  });

  const set = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.fromCity || !form.toCity || !form.departureDate) {
      setError("Şehir ve tarih alanları zorunludur.");
      return;
    }
    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        direction: form.direction,
        fromCity: form.fromCity,
        toCity: form.toCity,
        departureDate: form.departureDate,
        notes: form.notes || undefined,
      };
      if (form.availableKg) body.availableKg = parseFloat(form.availableKg);

      const ann = await api.post<{ id: string }>("/travel-announcements", body);
      router.push(`/seyahat/yolculuk/${ann.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu");
    } finally {
      setLoading(false);
    }
  }

  const fromCities = getCities(form.direction, "from");
  const toCities = getCities(form.direction, "to");

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/seyahat?tab=ilanlar">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold">Yolculuk İlanı Ver</h1>
          <p className="text-sm text-muted">
            Yaklaşan yolculuğunuzu paylaşın, başkalarına yardımcı olun
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Direction */}
        <div>
          <label className="mb-1.5 block text-sm font-medium">Yön</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: "DE_TO_TR", label: "🇩🇪 Almanya → Türkiye 🇹🇷" },
              { value: "TR_TO_DE", label: "🇹🇷 Türkiye → Almanya 🇩🇪" },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  set("direction", opt.value);
                  set("fromCity", "");
                  set("toCity", "");
                }}
                className={`rounded-lg border p-3 text-sm font-medium transition-colors ${
                  form.direction === opt.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted hover:border-primary"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Cities */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Kalkış Şehri <span className="text-red-500">*</span>
            </label>
            <select
              value={form.fromCity}
              onChange={(e) => set("fromCity", e.target.value)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
              required
            >
              <option value="">Seç...</option>
              {fromCities.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Varış Şehri <span className="text-red-500">*</span>
            </label>
            <select
              value={form.toCity}
              onChange={(e) => set("toCity", e.target.value)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
              required
            >
              <option value="">Seç...</option>
              {toCities.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Departure date */}
        <div>
          <label className="mb-1.5 block text-sm font-medium">
            Kalkış Tarihi ve Saati <span className="text-red-500">*</span>
          </label>
          <input
            type="datetime-local"
            value={form.departureDate}
            onChange={(e) => set("departureDate", e.target.value)}
            min={new Date().toISOString().slice(0, 16)}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
            required
          />
        </div>

        {/* Available kg */}
        <div>
          <label className="mb-1.5 block text-sm font-medium">
            Taşıyabileceğiniz Ağırlık (kg)
          </label>
          <input
            type="number"
            placeholder="Örn: 5"
            min="0.1"
            max="50"
            step="0.5"
            value={form.availableKg}
            onChange={(e) => set("availableKg", e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
          />
          <p className="mt-1 text-xs text-muted">Boş bırakırsanız belirtilmemiş olur</p>
        </div>

        {/* Notes */}
        <div>
          <label className="mb-1.5 block text-sm font-medium">Notlar</label>
          <textarea
            rows={3}
            placeholder="Örn: Küçük paketler taşıyabilirim, uçuş bileti var..."
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            maxLength={500}
            className="w-full resize-none rounded-lg border border-border bg-surface px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
          />
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <Link href="/seyahat?tab=ilanlar" className="flex-1">
            <Button type="button" variant="outline" className="w-full">
              İptal
            </Button>
          </Link>
          <Button type="submit" loading={loading} className="flex-1">
            <Plane className="mr-1.5 h-4 w-4" />
            İlanı Yayınla
          </Button>
        </div>
      </form>
    </div>
  );
}
