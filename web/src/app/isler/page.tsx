import Link from "next/link";
import { Plus } from "lucide-react";
import { api, JobPosting } from "@/lib/api";
import { JobCard } from "@/components/cards/JobCard";
import { Button } from "@/components/ui/Button";
import {
  JOB_CATEGORIES,
  JOB_TYPES,
  LISTING_TYPES,
} from "@/lib/job-categories";

type JobsResponse = { items: JobPosting[]; total: number };

type FilterParams = {
  jobType?: string;
  listingType?: string;
  category?: string;
  turkishFriendly?: string;
};

async function getJobs(params: FilterParams): Promise<JobsResponse> {
  try {
    const qs = new URLSearchParams();
    if (params.jobType) qs.set("jobType", params.jobType);
    if (params.listingType) qs.set("listingType", params.listingType);
    if (params.category) qs.set("category", params.category);
    if (params.turkishFriendly === "true") qs.set("turkishFriendly", "true");
    const query = qs.toString();
    return await api.get<JobsResponse>(`/jobs${query ? `?${query}` : ""}`);
  } catch {
    return { items: [], total: 0 };
  }
}

function buildJobsUrl(overrides: Partial<FilterParams>, current: FilterParams) {
  const merged = { ...current, ...overrides };
  const qs = new URLSearchParams();
  if (merged.listingType) qs.set("listingType", merged.listingType);
  if (merged.jobType) qs.set("jobType", merged.jobType);
  if (merged.category) qs.set("category", merged.category);
  if (merged.turkishFriendly === "true") qs.set("turkishFriendly", "true");
  const q = qs.toString();
  return `/isler${q ? `?${q}` : ""}`;
}

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<FilterParams>;
}) {
  const sp = await searchParams;
  const { items } = await getJobs(sp);

  const hasFilters = !!(sp.listingType || sp.jobType || sp.category || sp.turkishFriendly);

  return (
    <div className="w-full min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">İş İlanları</h1>
          <p className="text-muted">
            İşverenler pozisyon açar, iş arayanlar kendini tanıtır
          </p>
        </div>
        <Link href="/isler/yeni">
          <Button>
            <Plus className="mr-1 h-4 w-4" />
            İlan Ver
          </Button>
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link
          href={buildJobsUrl({ listingType: undefined }, sp)}
          className={`rounded-full border px-4 py-1.5 text-sm ${
            !sp.listingType
              ? "border-primary bg-primary/10 font-medium text-primary"
              : "border-border text-muted hover:border-primary hover:text-primary"
          }`}
        >
          Tümü
        </Link>
        {LISTING_TYPES.map((t) => (
          <Link
            key={t.value}
            href={buildJobsUrl(
              { listingType: sp.listingType === t.value ? undefined : t.value },
              sp,
            )}
            className={`rounded-full border px-4 py-1.5 text-sm ${
              sp.listingType === t.value
                ? "border-primary bg-primary/10 font-medium text-primary"
                : "border-border text-muted hover:border-primary hover:text-primary"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {JOB_TYPES.map((t) => (
          <Link
            key={t.value}
            href={buildJobsUrl(
              { jobType: sp.jobType === t.value ? undefined : t.value },
              sp,
            )}
            className={`rounded-full border px-4 py-1.5 text-sm ${
              sp.jobType === t.value
                ? "border-primary bg-primary/10 font-medium text-primary"
                : "border-border text-muted hover:border-primary hover:text-primary"
            }`}
          >
            {t.label}
          </Link>
        ))}
        <Link
          href={buildJobsUrl(
            { turkishFriendly: sp.turkishFriendly === "true" ? undefined : "true" },
            sp,
          )}
          className={`rounded-full border px-4 py-1.5 text-sm ${
            sp.turkishFriendly === "true"
              ? "border-accent bg-accent/10 font-medium text-accent"
              : "border-accent text-accent hover:bg-accent/5"
          }`}
        >
          Türkçe işveren
        </Link>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {JOB_CATEGORIES.map((c) => (
          <Link
            key={c.value}
            href={buildJobsUrl(
              { category: sp.category === c.value ? undefined : c.value },
              sp,
            )}
            className={`rounded-full border px-3 py-1 text-xs ${
              sp.category === c.value
                ? "border-primary bg-primary/10 font-medium text-primary"
                : "border-border text-muted hover:border-primary hover:text-primary"
            }`}
          >
            {c.label}
          </Link>
        ))}
      </div>

      <div className="mt-4 rounded-lg border border-warning/30 bg-warning/5 p-4 text-sm text-muted">
        <strong className="text-text">Dolandırıcılığa karşı dikkat:</strong>{" "}
        Mülakat öncesi para ödeme talebi, kişisel banka bilgisi paylaşımı veya
        “evden çalış, ön ödeme yap” teklifleri kesinlikle ihbar edilmeli.
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.length === 0 ? (
          <p className="col-span-3 py-12 text-center text-muted">
            {hasFilters ? "Bu filtreye uygun ilan yok." : "Henüz ilan yok. İlk ilanı sen ekle."}
          </p>
        ) : (
          items.map((j) => <JobCard key={j.id} job={j} />)
        )}
      </div>
    </div>
  );
}
