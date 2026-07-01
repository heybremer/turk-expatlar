"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";

type Props = { announcementId: string; onSuccess?: () => void };

const PAYMENT_OPTIONS = [
  { value: "FREE", label: "Ücretsiz" },
  { value: "PAID", label: "Ücretli" },
  { value: "NEGOTIABLE", label: "Pazarlıklı" },
];

export function TravelRequestForm({ announcementId, onSuccess }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    itemName: "",
    description: "",
    weightKg: "",
    paymentType: "NEGOTIABLE",
    paymentAmount: "",
    notes: "",
  });

  const set = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        itemName: form.itemName,
        description: form.description || undefined,
        paymentType: form.paymentType,
        notes: form.notes || undefined,
      };
      if (form.weightKg) body.weightKg = parseFloat(form.weightKg);
      if (form.paymentType === "PAID" && form.paymentAmount)
        body.paymentAmount = parseFloat(form.paymentAmount);

      await api.post(`/travel-announcements/${announcementId}/requests`, body);
      setSuccess(true);
      onSuccess ? onSuccess() : router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-lg bg-green-50 p-4 text-center text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400">
        ✓ Teklifiniz iletildi! Yolcu size yanıt verdiğinde bildirim alacaksınız.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1.5 block text-sm font-medium">
          Ne götürmesini istiyorsunuz? <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          placeholder="Örn: İlaç, kitap, kuru gıda..."
          value={form.itemName}
          onChange={(e) => set("itemName", e.target.value)}
          maxLength={150}
          required
          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium">Açıklama</label>
        <textarea
          rows={2}
          placeholder="Eşya hakkında detaylı bilgi..."
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          maxLength={500}
          className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium">Tahmini Ağırlık (kg)</label>
          <input
            type="number"
            placeholder="Örn: 1.5"
            min="0.01"
            max="20"
            step="0.1"
            value={form.weightKg}
            onChange={(e) => set("weightKg", e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">Ödeme</label>
          <select
            value={form.paymentType}
            onChange={(e) => set("paymentType", e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
          >
            {PAYMENT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {form.paymentType === "PAID" && (
        <div>
          <label className="mb-1.5 block text-sm font-medium">Ödeme Miktarı (€)</label>
          <input
            type="number"
            placeholder="Örn: 20"
            min="0"
            step="1"
            value={form.paymentAmount}
            onChange={(e) => set("paymentAmount", e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
          />
        </div>
      )}

      <div>
        <label className="mb-1.5 block text-sm font-medium">Ek Notlar</label>
        <textarea
          rows={2}
          placeholder="Yolcuya iletmek istediğiniz not..."
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          maxLength={500}
          className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
        />
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </p>
      )}

      <Button type="submit" loading={loading} className="w-full">
        Teklif Gönder
      </Button>
    </form>
  );
}
