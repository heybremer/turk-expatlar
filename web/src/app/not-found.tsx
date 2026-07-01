import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sayfa Bulunamadı",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-20 text-center">
      <p className="text-6xl font-extrabold text-primary">404</p>
      <h1 className="mt-4 text-2xl font-bold">Sayfa bulunamadı</h1>
      <p className="mt-2 max-w-sm text-muted">
        Aradığın sayfa silinmiş, taşınmış ya da hiç var olmamış olabilir.
      </p>
      <div className="mt-8 flex gap-3">
        <Link
          href="/akis"
          className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90"
        >
          Ana sayfaya dön
        </Link>
        <Link
          href="/destek"
          className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-muted transition-colors hover:text-text"
        >
          Destek al
        </Link>
      </div>
    </div>
  );
}
