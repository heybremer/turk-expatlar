import { AlertTriangle } from "lucide-react";

const SENSITIVE_CATEGORIES = [
  "hukuk",
  "saglik",
  "vergi",
  "resmi-islemler",
];

export function SensitiveBanner({ categorySlug }: { categorySlug?: string }) {
  if (!categorySlug || !SENSITIVE_CATEGORIES.includes(categorySlug)) return null;

  return (
    <div className="flex items-start gap-3 rounded-lg border border-warning/40 bg-warning/5 p-4 text-sm">
      <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-warning" />
      <div>
        <p className="font-medium text-text">
          Bu bilgiler tavsiye niteliğindedir, profesyonel danışmanlık yerine geçmez.
        </p>
        <p className="mt-1 text-muted">
          Resmi konularda kararınızı vermeden önce ilgili kuruma (Bürgeramt, Krankenkasse,
          avukat, Steuerberater vb.) danışmanız önerilir.
        </p>
      </div>
    </div>
  );
}
