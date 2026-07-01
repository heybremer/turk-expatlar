"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FileText, Loader2, Upload, X } from "lucide-react";
import { api, FederalState } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  JOB_CATEGORIES,
  JOB_TYPES,
  LISTING_TYPES,
  type JobListingType,
} from "@/lib/job-categories";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const WORK_MODES = [
  { value: "ONSITE", label: "İşyerinde" },
  { value: "REMOTE", label: "Remote" },
  { value: "HYBRID", label: "Hibrit" },
];

export default function YeniIlanPage() {
  const router = useRouter();
  const { token } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [states, setStates] = useState<FederalState[]>([]);
  const [cities, setCities] = useState<{ id: string; name: string }[]>([]);
  const [listingType, setListingType] = useState<JobListingType>("EMPLOYER");
  const [cvFile, setCvFile] = useState<{ url: string; name: string } | null>(null);
  const [cvUploading, setCvUploading] = useState(false);
  const [form, setForm] = useState({
    company: "",
    title: "",
    description: "",
    briefInfo: "",
    category: "diger",
    jobType: "FULL_TIME",
    workMode: "ONSITE",
    stateId: "",
    cityId: "",
    salaryRange: "",
    turkishFriendly: false,
    germanLevel: "",
    contactMethod: "EMAIL",
    contactValue: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isSeeker = listingType === "SEEKER";

  useEffect(() => {
    if (!token) {
      router.push("/giris");
      return;
    }
    api.get<FederalState[]>("/locations/states").then(setStates).catch(() => {});
  }, [token, router]);

  useEffect(() => {
    const s = states.find((x) => x.id === form.stateId);
    setCities(s?.cities ?? []);
  }, [form.stateId, states]);

  async function handleCvSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !token) return;
    setCvUploading(true);
    setError("");
    try {
      const res = await api.upload<{ url: string; name: string }>(
        "/jobs/upload-cv",
        file,
        token,
      );
      setCvFile(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "CV yüklenemedi");
    } finally {
      setCvUploading(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (isSeeker && !cvFile) {
      setError("Lütfen CV dosyanızı yükleyin (PDF veya Word).");
      return;
    }

    setLoading(true);
    try {
      await api.post(
        "/jobs",
        {
          listingType,
          company: isSeeker ? undefined : form.company,
          title: form.title,
          description: isSeeker ? form.briefInfo : form.description,
          briefInfo: isSeeker ? form.briefInfo : undefined,
          cvUrl: isSeeker ? cvFile?.url : undefined,
          cvFileName: isSeeker ? cvFile?.name : undefined,
          category: form.category,
          jobType: form.jobType,
          workMode: form.workMode,
          stateId: form.stateId || undefined,
          cityId: form.cityId || undefined,
          salaryRange: form.salaryRange || undefined,
          turkishFriendly: isSeeker ? false : form.turkishFriendly,
          germanLevel: form.germanLevel || undefined,
          contactMethod: form.contactMethod,
          contactValue: form.contactValue || undefined,
        },
        token,
      );
      router.push("/isler");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gönderilemedi");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full min-w-0">
      <Link href="/isler" className="text-sm text-muted hover:text-primary">
        ← İş ilanlarına dön
      </Link>

      <h1 className="mt-4 text-2xl font-bold">Yeni iş ilanı</h1>
      <p className="mt-1 text-sm text-muted">
        İşveren olarak pozisyon açabilir veya iş arayan olarak kendinizi tanıtabilirsiniz.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {LISTING_TYPES.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setListingType(t.value)}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
              listingType === t.value
                ? "border-primary bg-primary text-white"
                : "border-border bg-surface text-muted hover:border-primary hover:text-primary"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="mt-8 space-y-4">
        {!isSeeker && (
          <Input
            label="Şirket / İşveren"
            value={form.company}
            onChange={(e) => setForm({ ...form, company: e.target.value })}
            required
          />
        )}

        <Input
          label={isSeeker ? "Aradığınız pozisyon / başlık" : "Pozisyon başlığı"}
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder={isSeeker ? "Örn: Yazılım geliştirici arıyorum" : undefined}
          required
        />

        {isSeeker ? (
          <div>
            <label className="block text-sm font-medium">Kısa bilgi</label>
            <textarea
              className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              rows={4}
              value={form.briefInfo}
              onChange={(e) => setForm({ ...form, briefInfo: e.target.value })}
              placeholder="Deneyiminiz, becerileriniz, aradığınız iş türü..."
              required
              minLength={10}
            />
            <p className="mt-1 text-xs text-muted">En az 10 karakter</p>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium">Açıklama</label>
            <textarea
              className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              rows={6}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Görev tanımı, aranan nitelikler, çalışma saatleri..."
              required
              minLength={30}
            />
          </div>
        )}

        {isSeeker && (
          <div>
            <label className="block text-sm font-medium">CV (PDF veya Word)</label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt,application/pdf"
              className="hidden"
              onChange={handleCvSelect}
            />
            {cvFile ? (
              <div className="mt-2 flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2">
                <FileText className="h-5 w-5 text-primary" />
                <span className="flex-1 truncate text-sm">{cvFile.name}</span>
                <button
                  type="button"
                  onClick={() => setCvFile(null)}
                  className="text-muted hover:text-danger"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={cvUploading}
                onClick={() => fileInputRef.current?.click()}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-background px-4 py-6 text-sm text-muted hover:border-primary hover:text-primary disabled:opacity-50"
              >
                {cvUploading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Upload className="h-5 w-5" />
                )}
                {cvUploading ? "Yükleniyor…" : "CV dosyası seç"}
              </button>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium">İlan kategorisi</label>
            <select
              className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              {JOB_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">Çalışma tipi</label>
            <select
              className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              value={form.jobType}
              onChange={(e) => setForm({ ...form, jobType: e.target.value })}
            >
              {JOB_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium">Çalışma şekli</label>
            <select
              className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              value={form.workMode}
              onChange={(e) => setForm({ ...form, workMode: e.target.value })}
            >
              {WORK_MODES.map((w) => (
                <option key={w.value} value={w.value}>
                  {w.label}
                </option>
              ))}
            </select>
          </div>
          <Input
            label={isSeeker ? "Maaş beklentisi (ops.)" : "Maaş aralığı (ops.)"}
            placeholder="2.500-3.000 € brüt/ay"
            value={form.salaryRange}
            onChange={(e) => setForm({ ...form, salaryRange: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium">Eyalet (ops.)</label>
            <select
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
            <label className="block text-sm font-medium">Şehir (ops.)</label>
            <select
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

        <div>
          <label className="block text-sm font-medium">Almanca seviyesi (ops.)</label>
          <select
            className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
            value={form.germanLevel}
            onChange={(e) => setForm({ ...form, germanLevel: e.target.value })}
          >
            <option value="">—</option>
            {["A1", "A2", "B1", "B2", "C1", "C2", "Anadil"].map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>

        {!isSeeker && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.turkishFriendly}
              onChange={(e) =>
                setForm({ ...form, turkishFriendly: e.target.checked })
              }
            />
            Türkçe konuşan adaylar tercih edilir / Türk işveren
          </label>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium">İletişim yöntemi</label>
            <select
              className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              value={form.contactMethod}
              onChange={(e) =>
                setForm({ ...form, contactMethod: e.target.value })
              }
            >
              <option value="EMAIL">E-posta</option>
              <option value="EXTERNAL_URL">Harici link</option>
              <option value="PLATFORM">Platform üzerinden</option>
            </select>
          </div>
          {form.contactMethod !== "PLATFORM" && (
            <Input
              label={form.contactMethod === "EMAIL" ? "E-posta" : "URL"}
              type={form.contactMethod === "EMAIL" ? "email" : "url"}
              value={form.contactValue}
              onChange={(e) =>
                setForm({ ...form, contactValue: e.target.value })
              }
              required
            />
          )}
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <Button type="submit" disabled={loading || cvUploading}>
          {loading ? "Gönderiliyor..." : "İlanı yayınla"}
        </Button>
      </form>
    </div>
  );
}
