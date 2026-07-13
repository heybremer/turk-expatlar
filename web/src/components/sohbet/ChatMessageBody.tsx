"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";

const URL_RE = /(https?:\/\/[^\s<>"']+)/g;

type LinkPreview = {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
};

// Aynı URL için tekrar tekrar istek atılmasın diye modül düzeyinde cache.
// null = önizleme alınamadı (tekrar denenmez).
const previewCache = new Map<string, LinkPreview | null>();
const inflight = new Map<string, Promise<LinkPreview | null>>();

function fetchPreview(url: string, token: string): Promise<LinkPreview | null> {
  if (previewCache.has(url)) return Promise.resolve(previewCache.get(url) ?? null);
  const existing = inflight.get(url);
  if (existing) return existing;

  const promise = api
    .get<LinkPreview>(`/chat/link-preview?url=${encodeURIComponent(url)}`, token)
    .then((data) => {
      const result = data?.title || data?.description || data?.image ? data : null;
      previewCache.set(url, result);
      return result;
    })
    .catch(() => {
      previewCache.set(url, null);
      return null;
    })
    .finally(() => inflight.delete(url));
  inflight.set(url, promise);
  return promise;
}

export function extractFirstUrl(body?: string | null): string | null {
  if (!body) return null;
  const match = body.match(URL_RE);
  return match?.[0] ?? null;
}

/** Mesaj gövdesindeki URL'leri tıklanabilir linke çevirir. */
function LinkifiedText({ body, isMe }: { body: string; isMe: boolean }) {
  const parts = body.split(URL_RE);
  return (
    <p className={`whitespace-pre-wrap break-words text-sm leading-relaxed ${isMe ? "text-white" : ""}`}>
      {parts.map((part, i) =>
        /^https?:\/\//.test(part) ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className={`underline underline-offset-2 break-all ${
              isMe ? "text-white/90 hover:text-white" : "text-primary hover:text-primary/80"
            }`}
          >
            {part}
          </a>
        ) : (
          part
        ),
      )}
    </p>
  );
}

function LinkPreviewCard({ url, isMe }: { url: string; isMe: boolean }) {
  const { token } = useAuth();
  const [preview, setPreview] = useState<LinkPreview | null>(
    () => previewCache.get(url) ?? null,
  );

  useEffect(() => {
    if (!token || previewCache.has(url)) return;
    let cancelled = false;
    fetchPreview(url, token).then((data) => {
      if (!cancelled) setPreview(data);
    });
    return () => {
      cancelled = true;
    };
  }, [url, token]);

  if (!preview) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={`mt-1.5 block max-w-xs overflow-hidden rounded-lg border text-left ${
        isMe
          ? "border-white/25 bg-white/10 hover:bg-white/20"
          : "border-border bg-background hover:border-primary/50"
      }`}
    >
      {preview.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview.image}
          alt={preview.title ?? "Bağlantı önizlemesi"}
          className="max-h-32 w-full object-cover"
          loading="lazy"
        />
      )}
      <span className="block px-2.5 py-2">
        {preview.siteName && (
          <span className={`block text-[10px] uppercase tracking-wide ${isMe ? "text-white/60" : "text-muted"}`}>
            {preview.siteName}
          </span>
        )}
        {preview.title && (
          <span className={`block truncate text-xs font-semibold ${isMe ? "text-white" : "text-text"}`}>
            {preview.title}
          </span>
        )}
        {preview.description && (
          <span className={`line-clamp-2 block text-[11px] leading-snug ${isMe ? "text-white/75" : "text-muted"}`}>
            {preview.description}
          </span>
        )}
      </span>
    </a>
  );
}

/**
 * Mesaj gövdesi: URL'ler tıklanabilir; mesajdaki ilk link için
 * (giriş yapılmışsa) Open Graph önizleme kartı gösterilir.
 */
export function ChatMessageBody({ body, isMe }: { body: string; isMe: boolean }) {
  const firstUrl = extractFirstUrl(body);
  return (
    <>
      <LinkifiedText body={body} isMe={isMe} />
      {firstUrl && <LinkPreviewCard url={firstUrl} isMe={isMe} />}
    </>
  );
}
