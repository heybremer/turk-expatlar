"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";

export function AraSearchBox() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initial = searchParams.get("q") ?? "";
  const [q, setQ] = useState(initial);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = q.trim();
    if (value.length < 2) return;
    router.push(`/ara?q=${encodeURIComponent(value)}`);
  }

  return (
    <form
      onSubmit={submit}
      className="mt-6 flex items-center gap-3 rounded-full border border-border bg-surface px-4 py-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20"
    >
      <Search className="h-5 w-5 flex-shrink-0 text-muted" />
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Köln Türkçe bilen avukat, vize, kira…"
        className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
      />
    </form>
  );
}
