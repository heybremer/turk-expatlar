import { ShieldAlert } from "lucide-react";

export function CourierDisclaimer() {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-warning/40 bg-warning/5 p-4 text-sm">
      <ShieldAlert className="mt-0.5 h-5 w-5 flex-shrink-0 text-warning" />
      <div className="space-y-2">
        <p className="font-semibold text-text">
          Türk Expatlar bir taşıma / kargo aracı değildir
        </p>
        <p className="text-muted">
          Platform yalnızca kullanıcılar arası iletişim için bir ilan tahtasıdır.
          Eşya, ödeme ve sorumluluk tamamen gönderen ile taşıyıcı arasındadır.
        </p>
        <ul className="list-disc space-y-1 pl-5 text-muted">
          <li>Gümrük kurallarına uyun, AB hediye limiti yaklaşık 430 €&apos;dur.</li>
          <li>İlaç, sıvı (parfüm/kolonya üst limit), nakit, mücevher, silah,
            yasaklı maddeler ve yetkisiz elektronik taşımak yasaktır.</li>
          <li>Tanımadığınız kişiyle eşya teslimini kamuya açık bir yerde yapın.</li>
          <li>Ödeme platform aracılığıyla yapılmaz; nakit/transfer riski size aittir.</li>
          <li>Şüpheli durumda “Şikayet et” butonunu kullanın.</li>
        </ul>
      </div>
    </div>
  );
}
