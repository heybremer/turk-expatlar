"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { CourierDisclaimer } from "@/components/ui/CourierDisclaimer";

const ITEM_CATEGORIES = [
  { value: "hediye", label: "Hediye" },
  { value: "kitap", label: "Kitap / Dergi" },
  { value: "kiyafet", label: "Kıyafet" },
  { value: "elektronik-kucuk", label: "Küçük elektronik (telefon kılıfı vb.)" },
  { value: "ev-esyasi", label: "Ev eşyası" },
  { value: "kozmetik", label: "Kozmetik (sıvı dışı)" },
  { value: "diger", label: "Diğer" },
];

export default function YeniSeyahatPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [form, setForm] = useState({
    direction: "DE_TO_TR",
    fromArea: "",
    toArea: "",
    itemName: "",
    itemCategory: "hediye",
    weightKg: "",
    estimatedValueEur: "",
    paymentType: "NEGOTIABLE",
    paymentAmount: "",
    notes: "",
    preferredDate: "",
    forbiddenItemsAcknowledged: false,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) router.push("/giris");
  }, [token, router]);

  const value = parseFloat(form.estimatedValueEur);
  const overLimit = !isNaN(value) && value > 430;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!form.forbiddenItemsAcknowledged) {
      setError("Yasaklı eşya beyanını onaylamanız gerekiyor.");
      return;
    }

    setLoading(true);
    try {
      const created = await api.post<{ id: string }>(
        "/courier/requests",
        {
          direction: form.direction,
          fromArea: form.fromArea,
          toArea: form.toArea,
          itemName: form.itemName,
          itemCategory: form.itemCategory,
          weightKg: form.weightKg ? parseFloat(form.weightKg) : undefined,
          estimatedValueEur: form.estimatedValueEur
            ? parseFloat(form.estimatedValueEur)
            : undefined,
          paymentType: form.paymentType,
          paymentAmount:
            form.paymentType === "PAID" && form.paymentAmount
              ? parseFloat(form.paymentAmount)
              : undefined,
          notes: form.notes || undefined,
          preferredDate: form.preferredDate
            ? new Date(form.preferredDate).toISOString()
            : undefined,
          forbiddenItemsAcknowledged: true,
        },
        token,
      );
      router.push(`/seyahat/${created.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gönderilemedi");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full min-w-0">
      <Link href="/seyahat" className="text-sm text-muted hover:text-primary">
        ← Seyahat sayfasına dön
      </Link>

      <h1 className="mt-4 text-2xl font-bold">Eşya taşıma talebi oluştur</h1>
      <p className="mt-1 text-sm text-muted">
        Türkiye–Almanya arası seyahat eden biri için talep aç. Talep onaylandıktan
        sonra iletişim DM üzerinden devam eder.
      </p>

      <div className="mt-6">
        <CourierDisclaimer />
      </div>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium">Taşıma yönü</label>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setForm({ ...form, direction: "DE_TO_TR" })}
              className={`rounded-lg border px-4 py-3 text-sm ${
                form.direction === "DE_TO_TR"
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border text-muted"
              }`}
            >
              🇩🇪 → 🇹🇷 Almanya&apos;dan Türkiye&apos;ye
            </button>
            <button
              type="button"
              onClick={() => setForm({ ...form, direction: "TR_TO_DE" })}
              className={`rounded-lg border px-4 py-3 text-sm ${
                form.direction === "TR_TO_DE"
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border text-muted"
              }`}
            >
              🇹🇷 → 🇩🇪 Türkiye&apos;den Almanya&apos;ya
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Çıkış (şehir/semt)"
            placeholder="Köln, Mülheim"
            value={form.fromArea}
            onChange={(e) => setForm({ ...form, fromArea: e.target.value })}
            required
          />
          <Input
            label="Varış (şehir/semt)"
            placeholder="İstanbul, Kadıköy"
            value={form.toArea}
            onChange={(e) => setForm({ ...form, toArea: e.target.value })}
            required
          />
        </div>

        <Input
          label="Eşya adı"
          placeholder="Örn: Çocuk kitap seti"
          value={form.itemName}
          onChange={(e) => setForm({ ...form, itemName: e.target.value })}
          required
        />

        <div>
          <label className="block text-sm font-medium">Kategori</label>
          <select
            className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
            value={form.itemCategory}
            onChange={(e) =>
              setForm({ ...form, itemCategory: e.target.value })
            }
            required
          >
            {ITEM_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Ortalama ağırlık (kg)"
            type="number"
            step="0.1"
            min="0"
            max="20"
            value={form.weightKg}
            onChange={(e) => setForm({ ...form, weightKg: e.target.value })}
          />
          <Input
            label="Ortalama değer (€)"
            type="number"
            step="1"
            min="0"
            value={form.estimatedValueEur}
            onChange={(e) =>
              setForm({ ...form, estimatedValueEur: e.target.value })
            }
          />
        </div>

        {overLimit && (
          <div className="rounded-lg border border-danger/40 bg-danger/5 p-3 text-sm text-danger">
            Değer 430 €&apos;yu aşıyor — AB hediye limiti üstünde gümrük vergisi
            doğabilir. Taşıyıcı kabul etmeden önce dikkat etmelidir.
          </div>
        )}

        <div>
          <label className="block text-sm font-medium">Ücret</label>
          <select
            className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
            value={form.paymentType}
            onChange={(e) => setForm({ ...form, paymentType: e.target.value })}
          >
            <option value="FREE">Ücretsiz (teşekkür yeterli)</option>
            <option value="PAID">Ücretli (sabit teklif)</option>
            <option value="NEGOTIABLE">Pazarlığa açık</option>
          </select>
        </div>

        {form.paymentType === "PAID" && (
          <Input
            label="Teklif (€)"
            type="number"
            step="1"
            min="0"
            value={form.paymentAmount}
            onChange={(e) =>
              setForm({ ...form, paymentAmount: e.target.value })
            }
          />
        )}

        <div>
          <label className="block text-sm font-medium">
            Tercih edilen taşıma tarihi (ops.)
          </label>
          <input
            type="date"
            className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
            value={form.preferredDate}
            onChange={(e) =>
              setForm({ ...form, preferredDate: e.target.value })
            }
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Notlar (ops.)</label>
          <textarea
            className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
            rows={3}
            placeholder="Paketleme, teslim noktası tercihi vb."
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </div>

        <label className="flex items-start gap-2 rounded-lg border border-border bg-background p-3 text-sm">
          <input
            type="checkbox"
            checked={form.forbiddenItemsAcknowledged}
            onChange={(e) =>
              setForm({
                ...form,
                forbiddenItemsAcknowledged: e.target.checked,
              })
            }
            className="mt-1"
          />
          <span>
            <strong>Onaylıyorum:</strong> Talep ettiğim eşya{" "}
            <strong>ilaç, nakit, mücevher, sıvı (parfüm/alkol üst limit), silah,
            uyuşturucu, kaçak ürün veya yasaklı materyal</strong> içermiyor.
            Sahte beyan halinde hesabımın kalıcı olarak askıya alınabileceğini ve
            yasal sorumluluğun bana ait olduğunu biliyorum.
          </span>
        </label>

        {error && <p className="text-sm text-danger">{error}</p>}

        <Button type="submit" disabled={loading}>
          {loading ? "Gönderiliyor..." : "Talebi yayınla"}
        </Button>
      </form>
    </div>
  );
}
