import { useCallback, useEffect, useRef, useState } from "react";

export interface InfiniteScrollOptions<T> {
  fetcher: (cursor?: string) => Promise<{ items: T[]; nextCursor?: string | null }>;
  enabled?: boolean;
}

export function useInfiniteScroll<T>({ fetcher, enabled = true }: InfiniteScrollOptions<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadingRef = useRef(false);

  const loadMore = useCallback(async (currentCursor?: string, reset = false) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const result = await fetcher(currentCursor);
      setItems((prev) => (reset ? result.items : [...prev, ...result.items]));
      setCursor(result.nextCursor ?? undefined);
      setHasMore(!!result.nextCursor && result.items.length > 0);
    } catch {
      // hata sessizce geç
    } finally {
      loadingRef.current = false;
      setLoading(false);
      setInitialLoading(false);
    }
  }, [fetcher]);

  // Initial load
  useEffect(() => {
    if (!enabled) return;
    setItems([]);
    setCursor(undefined);
    setHasMore(true);
    setInitialLoading(true);
    void loadMore(undefined, true);
  }, [enabled, loadMore]);

  // IntersectionObserver for sentinel
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();
    if (!sentinelRef.current || !hasMore || !enabled) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !loadingRef.current && hasMore) {
          void loadMore(cursor);
        }
      },
      { threshold: 0.1 },
    );

    observerRef.current.observe(sentinelRef.current);
    return () => observerRef.current?.disconnect();
  }, [cursor, hasMore, enabled, loadMore]);

  const refresh = useCallback(() => {
    setItems([]);
    setCursor(undefined);
    setHasMore(true);
    setInitialLoading(true);
    void loadMore(undefined, true);
  }, [loadMore]);

  return { items, loading, initialLoading, hasMore, sentinelRef, refresh };
}
