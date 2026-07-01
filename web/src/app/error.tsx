"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError]", error);
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-20 text-center">
      <p className="text-5xl font-extrabold text-danger">500</p>
      <h1 className="mt-4 text-2xl font-bold">Bir şeyler ters gitti</h1>
      <p className="mt-2 max-w-sm text-muted">
        Beklenmedik bir hata oluştu. Lütfen sayfayı yenileyerek tekrar dene.
      </p>
      {error.digest && (
        <p className="mt-2 text-xs text-muted">Hata kodu: {error.digest}</p>
      )}
      <div className="mt-8 flex gap-3">
        <button
          onClick={reset}
          className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90"
        >
          Tekrar dene
        </button>
        <a
          href="/akis"
          className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-muted transition-colors hover:text-text"
        >
          Ana sayfaya dön
        </a>
      </div>
    </div>
  );
}
