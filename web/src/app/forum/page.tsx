"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2, Plus, Search, X } from "lucide-react";
import { api, ForumTopic } from "@/lib/api";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { ForumTopicCard } from "@/components/cards/ForumTopicCard";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { MobileFilterToggle } from "@/components/ui/MobileFilterToggle";

type Category = { id: string; name: string; slug: string };

type ForumSort = "newest" | "views" | "replies" | "likes";

const SORT_OPTIONS: { value: ForumSort; label: string }[] = [
  { value: "newest", label: "En yeni" },
  { value: "views", label: "En çok okunan" },
  { value: "replies", label: "En çok yorum alan" },
  { value: "likes", label: "En çok beğenilen" },
];

function forumHref(category?: string | null, sort?: ForumSort | null) {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (sort && sort !== "newest") params.set("sort", sort);
  const qs = params.toString();
  return qs ? `/forum?${qs}` : "/forum";
}

export default function ForumPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full min-w-0 py-8 text-center text-muted">
          Yükleniyor…
        </div>
      }
    >
      <ForumPageContent />
    </Suspense>
  );
}

function ForumPageContent() {
  const searchParams = useSearchParams();
  const categorySlug = searchParams.get("category");
  const sortParam = searchParams.get("sort");
  const activeSort: ForumSort =
    sortParam === "views" || sortParam === "replies" || sortParam === "likes"
      ? sortParam
      : "newest";

  const [categories, setCategories] = useState<Category[]>([]);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeCategory = useMemo(
    () => categories.find((c) => c.slug === categorySlug) ?? null,
    [categories, categorySlug],
  );

  useEffect(() => {
    api
      .get<Category[]>("/forum/categories")
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQuery(query.trim()), 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const fetcher = useCallback(
    async (cursor?: string) => {
      const params = new URLSearchParams();
      if (debouncedQuery) params.set("search", debouncedQuery);
      if (activeCategory?.id) params.set("categoryId", activeCategory.id);
      if (activeSort !== "newest") params.set("sort", activeSort);
      params.set("limit", "20");
      if (cursor) params.set("cursor", cursor);
      return api.get<{ items: ForumTopic[]; nextCursor?: string }>(`/forum/topics-feed?${params}`);
    },
    [debouncedQuery, activeCategory?.id, activeSort],
  );

  const { items, loading, initialLoading, hasMore, sentinelRef } = useInfiniteScroll<ForumTopic>({ fetcher });

  const isSearching = query !== debouncedQuery;

  return (
    <div className="w-full min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Forum</h1>
          <p className="text-muted">Sorularına cevap bul, deneyimlerini paylaş</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/forum/kurallar" className="text-sm text-muted hover:text-primary">
            Kurallar
          </Link>
          <Link href="/forum/yeni">
            <Button>
              <Plus className="mr-1 h-4 w-4" />
              Soru Sor
            </Button>
          </Link>
        </div>
      </div>

      {/* Arama */}
      <div className="relative mt-6">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Konu ara… (örn. Bürgeramt, kira, vize)"
          className="w-full rounded-full border border-border bg-surface py-2.5 pl-10 pr-10 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1">
          {isSearching && <Loader2 className="h-4 w-4 animate-spin text-muted" />}
          {query && !isSearching && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="text-muted hover:text-text"
              aria-label="Aramayı temizle"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {(debouncedQuery || activeCategory) && !initialLoading && (
        <p className="mt-2 text-sm text-muted">
          {items.length}+ sonuç
          {debouncedQuery && (
            <>
              {" "}
              — &ldquo;<span className="text-text">{debouncedQuery}</span>&rdquo;
            </>
          )}
          {activeCategory && <> · {activeCategory.name}</>}
        </p>
      )}

      {/* Sıralama */}
      <div className="mt-4 flex flex-wrap gap-2">
        {SORT_OPTIONS.map((option) => (
          <Link
            key={option.value}
            href={forumHref(categorySlug, option.value)}
            className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
              activeSort === option.value
                ? "border-primary bg-primary/10 font-medium text-primary"
                : "border-border text-muted hover:border-primary hover:text-primary"
            }`}
          >
            {option.label}
          </Link>
        ))}
      </div>

      {/* Kategoriler */}
      <div className="mt-3">
      <MobileFilterToggle label="Kategoriler" activeCount={categorySlug ? 1 : 0}>
      <div className="flex flex-wrap gap-2">
        <Link
          href={forumHref(null, activeSort)}
          className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
            !categorySlug
              ? "border-primary bg-primary/10 text-primary"
              : "border-border text-muted hover:border-primary hover:text-primary"
          }`}
        >
          Tümü
        </Link>
        {categories.map((cat) => (
          <Link
            key={cat.id}
            href={forumHref(cat.slug, activeSort)}
            className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
              categorySlug === cat.slug
                ? "border-primary bg-primary/10 font-medium text-primary"
                : "border-border text-muted hover:border-primary hover:text-primary"
            }`}
          >
            {cat.name}
          </Link>
        ))}
      </div>
      </MobileFilterToggle>
      </div>

      {/* Sonuçlar */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {initialLoading ? (
          <div className="col-span-2 flex justify-center py-16 text-muted">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            title={
              debouncedQuery
                ? `"${debouncedQuery}" için sonuç bulunamadı`
                : activeCategory
                  ? "Bu kategoride henüz konu yok"
                  : "Henüz forum konusu yok"
            }
            description="Anmeldung, kira, vize veya günlük hayat hakkında ilk soruyu sen sor."
            actionLabel="Soru sor"
            actionHref="/forum/yeni"
          />
        ) : (
          items.map((topic) => <ForumTopicCard key={topic.id} topic={topic} />)
        )}
      </div>

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="mt-4 flex justify-center py-4">
        {loading && !initialLoading && (
          <Loader2 className="h-5 w-5 animate-spin text-muted" />
        )}
        {!hasMore && items.length > 0 && (
          <p className="text-sm text-muted">Tüm konular yüklendi</p>
        )}
      </div>
    </div>
  );
}
