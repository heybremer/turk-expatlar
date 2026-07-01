"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Briefcase } from "lucide-react";
import { api, FederalState } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const CATEGORIES = [
  "yazilim", "muhendislik", "gastronomi", "saglik", "egitim",
  "lojistik", "satis", "ofis", "ticaret", "diger",
];

const JOB_TYPES = [
  { value: "FULL_TIME", label: "Tam zamanlı" },
  { value: "PART_TIME", label: "Yarı zamanlı" },
  { value: "MINIJOB", label: "Minijob" },
  { value: "AUSBILDUNG", label: "Ausbildung" },
  { value: "INTERNSHIP", label: "Staj" },
  { value: "FREELANCE", label: "Freelance" },
];

const WORK_MODES = [
  { value: "ONSITE", label: "İşyerinde" },
  { value: "REMOTE", label: "Remote" },
  { value: "HYBRID", label: "Hibrit" },
];

const selectCls = "mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm";

export default function AdminNewJobPage() {
  const { token } = useAuth();
  const [states, setStates] = useState<FederalState[]>([]);
  const [cities, setCities] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState({
    company: "",
    title: "",
    description: "",
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
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get<FederalState[]>("/locations/states").then(setStates).catch(() => {});
  }, []);

  useEffect(() => {
    const s = states.find((x) => x.id === form.stateId);
    setCities(s?.cities ?? []);
    if (!s) setForm((f) => ({ ...f, cityId: "" }));
  }, [form.stateId, states]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      await api.post(
        "/jobs",
        {
          company: form.company,
          title: form.title,
          description: form.description,
          category: form.category,
          jobType: form.jobType,
          workMode: form.workMode,
          stateId: form.stateId || undefined,
          cityId: form.cityId || undefined,
          salaryRange: form.salaryRange || undefined,
          turkishFriendly: form.turkishFriendly,
          germanLevel: form.germanLevel || undefined,
          contactMethod: form.contactMethod,
          contactValue: form.contactValue || undefined,
        },
        token,
      );
      setSuccess("İlan eklendi ve yayınlandı.");
      setForm({
        company: "",
        title: "",
        description: "",
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eklenemedi");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg">
      <Link href="/admin/isler/onay-bekleyen" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> İş ilanları
      </Link>
      <div className="flex items-center gap-2">
        <Briefcase className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-bold">İlan Ekle</h1>
      </div>
      <p className="mt-1 text-sm text-muted">Admin olarak eklenen ilan doğrudan yayınlanır.</p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <Input label="Şirket / İşveren" value={form.company}
          onChange={(e) => setForm({ ...form, company: e.target.value })} required />
        <Input label="Pozisyon başlığı" value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })} required />

        <div>
          <label className="text-sm text-muted">Açıklama</label>
          <textarea required rows={5} value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className={`${selectCls} mt-1`} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-muted">Tip</label>
            <select className={selectCls} value={form.jobType}
              onChange={(e) => setForm({ ...form, jobType: e.target.value })}>
              {JOB_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm text-muted">Çalışma şekli</label>
            <select className={selectCls} value={form.workMode}
              onChange={(e) => setForm({ ...form, workMode: e.target.value })}>
              {WORK_MODES.map((w) => <option key={w.value} value={w.value}>{w.label}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-muted">Kategori</label>
            <select className={selectCls} value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <Input label="Maaş aralığı (ops.)" value={form.salaryRange}
            onChange={(e) => setForm({ ...form, salaryRange: e.target.value })} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-muted">Eyalet (ops.)</label>
            <select className={selectCls} value={form.stateId}
              onChange={(e) => setForm({ ...form, stateId: e.target.value, cityId: "" })}>
              <option value="">—</option>
              {states.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm text-muted">Şehir (ops.)</label>
            <select className={selectCls} value={form.cityId} disabled={!form.stateId}
              onChange={(e) => setForm({ ...form, cityId: e.target.value })}>
              <option value="">—</option>
              {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.turkishFriendly}
            onChange={(e) => setForm({ ...form, turkishFriendly: e.target.checked })} />
          Türkçe konuşan adaylar tercih edilir
        </label>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-muted">İletişim</label>
            <select className={selectCls} value={form.contactMethod}
              onChange={(e) => setForm({ ...form, contactMethod: e.target.value })}>
              <option value="EMAIL">E-posta</option>
              <option value="EXTERNAL_URL">Harici link</option>
              <option value="PLATFORM">Platform</option>
            </select>
          </div>
          {form.contactMethod !== "PLATFORM" && (
            <Input label={form.contactMethod === "EMAIL" ? "E-posta" : "URL"}
              value={form.contactValue}
              onChange={(e) => setForm({ ...form, contactValue: e.target.value })} required />
          )}
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}
        {success && <p className="text-sm text-success">{success}</p>}

        <Button type="submit" disabled={loading}>
          {loading ? "Kaydediliyor…" : "İlan Ekle"}
        </Button>
      </form>
    </div>
  );
}
