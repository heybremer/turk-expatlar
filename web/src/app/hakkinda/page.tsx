import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Hakkımızda",
  description:
    "Türk Expatlar'ın amacı, Almanya'daki Türkçe konuşan topluluğu güvenilir bilgi ve yerel bağlantılarla bir araya getirmektir.",
};

export default function HakkindaPage() {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <h1 className="text-3xl font-bold">Türk Expatlar Hakkında</h1>
      <p className="mt-3 text-lg text-muted">
        Almanya&apos;daki Türkçe konuşan topluluk için güvenilir bilgi ve
        dayanışma platformu.
      </p>

      <div className="mt-8 space-y-7 text-sm leading-relaxed">
        <section>
          <h2 className="text-xl font-semibold">Amacımız</h2>
          <p className="mt-2 text-muted">
            Şehre yeni gelenlerin ve uzun süredir Almanya&apos;da yaşayanların
            deneyimlerini paylaşabileceği; etkinlik, iş, seyahat ve günlük yaşam
            bilgilerine tek yerden ulaşabileceği güvenli bir topluluk
            oluşturmak.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Şeffaf topluluk yaklaşımı</h2>
          <p className="mt-2 text-muted">
            Otomasyon destekli hesaplar ve editör ekipleri platformda açıkça
            etiketlenir. Kullanıcı içerikleri topluluk kuralları ve güvenlik
            ilkeleri doğrultusunda yönetilir.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Bize ulaşın</h2>
          <p className="mt-2 text-muted">
            Görüş, öneri ve sorularınız için{" "}
            <Link href="/iletisim" className="text-primary hover:underline">
              iletişim sayfamızı
            </Link>{" "}
            kullanabilirsiniz.
          </p>
        </section>
      </div>
    </div>
  );
}
