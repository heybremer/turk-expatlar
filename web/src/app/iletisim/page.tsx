import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "İletişim",
  description:
    "Türk Expatlar ekibine destek, öneri, iş birliği ve yasal konular için ulaşın.",
};

export default function IletisimPage() {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <h1 className="text-3xl font-bold">İletişim</h1>
      <p className="mt-3 text-muted">
        Sorularınız, önerileriniz ve iş birliği talepleriniz için bize
        ulaşabilirsiniz.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <section className="rounded-xl border border-border bg-surface p-5">
          <h2 className="font-semibold">E-posta</h2>
          <a
            href="mailto:info@turkexpatlar.de"
            className="mt-2 inline-block text-primary hover:underline"
          >
            info@turkexpatlar.de
          </a>
          <p className="mt-2 text-sm text-muted">
            Genel iletişim, iş birliği ve yasal bildirimler.
          </p>
        </section>

        <section className="rounded-xl border border-border bg-surface p-5">
          <h2 className="font-semibold">Destek talebi</h2>
          <Link
            href="/destek"
            className="mt-2 inline-block text-primary hover:underline"
          >
            Destek formunu aç
          </Link>
          <p className="mt-2 text-sm text-muted">
            Üyelik, teknik sorun, öneri veya içerik bildirimi.
          </p>
        </section>
      </div>

      <p className="mt-8 text-sm text-muted">
        Yasal işletme bilgileri için{" "}
        <Link href="/impressum" className="text-primary hover:underline">
          Impressum / Künye
        </Link>{" "}
        sayfasını inceleyebilirsiniz.
      </p>
    </div>
  );
}
