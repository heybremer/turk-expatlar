"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Briefcase, ExternalLink, Loader2, Pencil, Search, Trash2,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { AdminModal, AdminPagination } from "@/components/admin/AdminUi";

type Job = {
  id: string;
  company: string;
  title: string;
  description: string;
  category: string;
  jobType: string;
  workMode: string;
  status: string;
  salaryRange?: string | null;
  turkishFriendly: boolean;
  contactMethod: string;
  contactValue?: string | null;
  viewCount: number;
  createdAt: string;
  city?: { name: string } | null;
  state?: { name: string } | null;
  owner?: {
    email: string;
    profile?: { displayName: string } | null;
  } | null;
};

type JobsResponse = {
  items: Job[];
  total: number;
  page: number;
  totalPages: number;
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Onay Bekliyor",
  PUBLISHED: "Yayında",
  CLOSED: "Kapalı",
  EXPIRED: "Süresi doldu",
  REJECTED: "Reddedildi",
};

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

const selectCls = "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm";

export default function AdminJobsListPage() {
  const { token } = useAuth();
  const [data, setData] = useState<JobsResponse | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editJob, setEditJob] = useState<Job | null>(null);
  const [form, setForm] = useState({
    company: "",
    title: "",
    description: "",
    category: "diger",
    jobType: "FULL_TIME",
    workMode: "ONSITE",
    status: "PUBLISHED",
    salaryRange: "",
    turkishFriendly: false,
    contactMethod: "EMAIL",
    contactValue: "",
  });

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter) params.set("status", statusFilter);
      setData(await api.get<JobsResponse>(`/admin/jobs?${params}`, token));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [token, page, search, statusFilter]);

  useEffect(() => { void load(); }, [load]);

  function openEdit(job: Job) {
    setEditJob(job);
    setForm({
      company: job.company,
      title: job.title,
      description: job.description,
      category: job.category,
      jobType: job.jobType,
      workMode: job.workMode,
      status: job.status,
      salaryRange: job.salaryRange ?? "",
      turkishFriendly: job.turkishFriendly,
      contactMethod: job.contactMethod,
      contactValue: job.contactValue ?? "",
    });
  }

  async function remove(id: string) {
    if (!confirm("İlan silinsin mi?")) return;
    await api.delete(`/admin/jobs/${id}`, token!);
    void load();
  }

  async function saveEdit() {
    if (!editJob) return;
    await api.patch(
      `/admin/jobs/${editJob.id}`,
      {
        company: form.company,
        title: form.title,
        description: form.description,
        category: form.category,
        jobType: form.jobType,
        workMode: form.workMode,
        status: form.status,
        salaryRange: form.salaryRange || undefined,
        turkishFriendly: form.turkishFriendly,
        contactMethod: form.contactMethod,
        contactValue: form.contactValue || undefined,
      },
      token!,
    );
    setEditJob(null);
    void load();
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold">İlanlar</h1>
          {data && (
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-sm text-primary">
              {data.total}
            </span>
          )}
        </div>
        <Link href="/admin/isler/yeni">
          <Button size="sm">+ İlan Ekle</Button>
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="İlan ara…"
            className="w-full rounded-lg border border-border bg-surface py-2 pl-10 pr-3 text-sm focus:border-primary focus:outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        >
          <option value="">Tüm durumlar</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-background text-left text-xs text-muted">
            <tr>
              <th className="px-4 py-3">İlan</th>
              <th className="px-4 py-3">İlan veren</th>
              <th className="px-4 py-3">Konum</th>
              <th className="px-4 py-3">Durum</th>
              <th className="px-4 py-3">Tarih</th>
              <th className="px-4 py-3 text-right">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-12 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                </td>
              </tr>
            ) : data?.items.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-muted">
                  İlan bulunamadı
                </td>
              </tr>
            ) : (
              data?.items.map((j) => (
                <tr key={j.id} className="hover:bg-background/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <p className="font-medium">{j.title}</p>
                      <Link href={`/isler/${j.id}`} target="_blank">
                        <ExternalLink className="h-3 w-3 text-muted hover:text-primary" />
                      </Link>
                    </div>
                    <p className="text-xs text-muted">
                      {(j as { listingType?: string }).listingType === "SEEKER" ? "İş arayan" : j.company} · {j.category}
                    </p>
                    <p className="text-xs text-muted">{j.viewCount} görüntülenme</p>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {j.owner?.profile?.displayName ?? j.owner?.email ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">
                    {j.city?.name ?? j.state?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-border px-2 py-0.5 text-xs">
                      {STATUS_LABELS[j.status] ?? j.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">{formatDate(j.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(j)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => void remove(j.id)}>
                        <Trash2 className="h-4 w-4 text-danger" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {data && (
        <AdminPagination
          page={data.page}
          totalPages={data.totalPages}
          total={data.total}
          onPage={setPage}
        />
      )}

      {editJob && (
        <AdminModal title="İlanı Düzenle">
          <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
            <input
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              placeholder="Şirket"
              className={selectCls}
            />
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Pozisyon"
              className={selectCls}
            />
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={4}
              placeholder="Açıklama"
              className={selectCls}
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={form.jobType}
                onChange={(e) => setForm({ ...form, jobType: e.target.value })}
                className={selectCls}
              >
                {JOB_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <select
                value={form.workMode}
                onChange={(e) => setForm({ ...form, workMode: e.target.value })}
                className={selectCls}
              >
                {WORK_MODES.map((w) => (
                  <option key={w.value} value={w.value}>{w.label}</option>
                ))}
              </select>
            </div>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className={selectCls}
            >
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <input
              value={form.salaryRange}
              onChange={(e) => setForm({ ...form, salaryRange: e.target.value })}
              placeholder="Maaş aralığı (ops.)"
              className={selectCls}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.turkishFriendly}
                onChange={(e) => setForm({ ...form, turkishFriendly: e.target.checked })}
              />
              Türkçe dostu
            </label>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={form.contactMethod}
                onChange={(e) => setForm({ ...form, contactMethod: e.target.value })}
                className={selectCls}
              >
                <option value="EMAIL">E-posta</option>
                <option value="EXTERNAL_URL">Harici link</option>
                <option value="PLATFORM">Platform</option>
              </select>
              {form.contactMethod !== "PLATFORM" && (
                <input
                  value={form.contactValue}
                  onChange={(e) => setForm({ ...form, contactValue: e.target.value })}
                  placeholder="İletişim"
                  className={selectCls}
                />
              )}
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setEditJob(null)}>İptal</Button>
            <Button onClick={() => void saveEdit()}>Kaydet</Button>
          </div>
        </AdminModal>
      )}
    </div>
  );
}
