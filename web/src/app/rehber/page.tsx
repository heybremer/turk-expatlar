import Link from "next/link";
import { Search, BadgeCheck, SlidersHorizontal } from "lucide-react";
import { api, Business } from "@/lib/api";
import { BusinessCard } from "@/components/cards/BusinessCard";

type Category = { id: string; name: string; slug: string };
type BusinessesResponse = { items: Business[]; total: number };

async function getCategories(): Promise<Category[]> {
  try {
    // Kategoriler nadiren değişir — 10 dakika cache
    return await api.get<Category[]>("/businesses/categories", null, 600);
  } catch {
    return [];
  }
}

async function getBusinesses(params: {
  categoryId?: string;
  search?: string;
  verified?: boolean;
  page?: number;
}): Promise<BusinessesResponse> {
  try {
    const qs = new URLSearchParams();
    if (params.categoryId) qs.set("categoryId", params.categoryId);
    if (params.search) qs.set("search", params.search);
    if (params.verified) qs.set("verified", "true");
    if (params.page && params.page > 1) qs.set("page", String(params.page));
    qs.set("limit", "24");
    // Arama varsa cache'siz, yoksa 2 dakika ISR
    const revalidate = params.search ? undefined : 120;
    return await api.get<BusinessesResponse>(`/businesses?${qs}`, null, revalidate);
  } catch {
    return { items: [], total: 0 };
  }
}

type SearchParams = {
  q?: string;
  category?: string;
  verified?: string;
  page?: string;
};

export default async function RehberPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const categorySlug = params.category ?? "";
  const verified = params.verified === "true";
  const page = Math.max(1, parseInt(params.page ?? "1", 10));

  const categories = await getCategories();
  const activeCat = categories.find((c) => c.slug === categorySlug);

  const { items, total } = await getBusinesses({
    categoryId: activeCat?.id,
    search: q || undefined,
    verified,
    page,
  });

  const totalPages = Math.ceil(total / 24);

  function buildHref(overrides: Partial<SearchParams>) {
    const merged = { q, category: categorySlug, verified: verified ? "true" : undefined, page: undefined, ...overrides };
    const qs = new URLSearchParams();
    if (merged.q) qs.set("q", merged.q);
    if (merged.category) qs.set("category", merged.category);
    if (merged.verified) qs.set("verified", merged.verified);
    if (merged.page && Number(merged.page) > 1) qs.set("page", merged.page);
    const str = qs.toString();
    return `/rehber${str ? `?${str}` : ""}`;
  }

  return (
    <div className="w-full min-w-0">
      {/* Başlık */}
      <div>
        <h1 className="text-2xl font-bold">İşletme Rehberi</h1>
        <p className="mt-1 text-sm text-muted">
          Türkçe hizmet veren güvenilir işletmeler
          {total > 0 && <span className="ml-1">— {total} işletme</span>}
        </p>
      </div>

      {/* Arama formu */}
      <form method="GET" action="/rehber" className="mt-6">
        {/* Mevcut filtreleri hidden field olarak koru */}
        {categorySlug && <input type="hidden" name="category" value={categorySlug} />}
        {verified && <input type="hidden" name="verified" value="true" />}

        <div className="flex gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
            <Search className="h-5 w-5 shrink-0 text-muted" />
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Köln Türkçe bilen avukat ara…"
              className="flex-1 bg-transparent text-sm outline-none"
              autoComplete="off"
            />
          </div>
          <button
            type="submit"
            className="rounded-xl bg-primary px-5 py-3 text-sm font-medium text-white hover:bg-primary/90 active:bg-primary/80"
          >
            Ara
          </button>
        </div>
      </form>

      {/* Filtreler */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {/* Tümü */}
        <Link
          href={buildHref({ category: undefined })}
          className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
            !categorySlug
              ? "border-primary bg-primary/10 font-medium text-primary"
              : "border-border hover:border-primary hover:text-primary"
          }`}
        >
          Tümü
        </Link>

        {/* Kategori filtreleri */}
        {categories.map((cat) => (
          <Link
            key={cat.id}
            href={buildHref({ category: cat.slug })}
            className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
              categorySlug === cat.slug
                ? "border-primary bg-primary/10 font-medium text-primary"
                : "border-border hover:border-primary hover:text-primary"
            }`}
          >
            {cat.name}
          </Link>
        ))}

        {/* Ayırıcı */}
        {categories.length > 0 && <span className="text-border">|</span>}

        {/* Doğrulanmış filtresi */}
        <Link
          href={buildHref({ verified: verified ? undefined : "true", page: undefined })}
          className={`flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm transition-colors ${
            verified
              ? "border-primary bg-primary/10 font-medium text-primary"
              : "border-border hover:border-primary hover:text-primary"
          }`}
        >
          <BadgeCheck className="h-3.5 w-3.5" />
          Doğrulanmış
        </Link>
      </div>

      {/* Aktif filtre özeti */}
      {(q || categorySlug || verified) && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span>Filtre:</span>
          {q && <span className="rounded bg-background px-2 py-0.5">"{q}"</span>}
          {activeCat && <span className="rounded bg-background px-2 py-0.5">{activeCat.name}</span>}
          {verified && <span className="rounded bg-background px-2 py-0.5">Doğrulanmış</span>}
          <Link href="/rehber" className="text-primary hover:underline">
            Temizle
          </Link>
        </div>
      )}

      {/* Sonuçlar */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.length === 0 ? (
          <div className="col-span-3 py-16 text-center">
            <p className="text-muted">
              {q || categorySlug
                ? "Bu filtreye uygun işletme bulunamadı."
                : "Henüz işletme kaydı yok."}
            </p>
            {(q || categorySlug) && (
              <Link href="/rehber" className="mt-3 inline-block text-sm text-primary hover:underline">
                Tüm işletmeleri göster
              </Link>
            )}
          </div>
        ) : (
          items.map((b) => <BusinessCard key={b.id} business={b} />)
        )}
      </div>

      {/* Sayfalama */}
      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2">
          {page > 1 && (
            <Link
              href={buildHref({ page: String(page - 1) })}
              className="rounded-lg border border-border px-4 py-2 text-sm hover:border-primary hover:text-primary"
            >
              ← Önceki
            </Link>
          )}
          <span className="text-sm text-muted">
            {page} / {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={buildHref({ page: String(page + 1) })}
              className="rounded-lg border border-border px-4 py-2 text-sm hover:border-primary hover:text-primary"
            >
              Sonraki →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
