import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Impressum / Künye",
  description: "Türk Expatlar platformunun yasal künye bilgileri (§ 5 TMG).",
  robots: { index: true, follow: false },
};

export default function ImpressumPage() {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <h1 className="text-3xl font-bold">Impressum / Künye</h1>
      <p className="mt-2 text-sm text-muted">
        Almanya Telemedya Kanunu §&nbsp;5 TMG uyarınca zorunlu bilgiler
      </p>

      <div className="mt-8 space-y-8 text-sm leading-relaxed text-text">

        {/* Angaben gemäß § 5 TMG */}
        <section>
          <h2 className="text-xl font-semibold">Plattformbetreiber / Platform İşleticisi</h2>
          <div className="mt-3 space-y-1 text-muted">
            <p className="font-medium text-text">Nexcon Global GmbH</p>
            <p>Beelertstiege 5-6</p>
            <p>48143 Münster, Deutschland</p>
          </div>
          <p className="mt-3 text-muted">
            Amtsgericht Münster, HRB 23455
            <br />
            Geschäftsführer: Onur Celikgün
          </p>
        </section>

        {/* İletişim */}
        <section>
          <h2 className="text-xl font-semibold">İletişim / Kontakt</h2>
          <div className="mt-3 space-y-1 text-muted">
            <p>
              E-posta:{" "}
              <a
                href="mailto:info@turkexpatlar.de"
                className="text-primary hover:underline"
              >
                info@turkexpatlar.de
              </a>
            </p>
            <p>
              İletişim formu:{" "}
              <Link href="/destek" className="text-primary hover:underline">
                Destek
              </Link>
            </p>
          </div>
        </section>

        {/* USt-IdNr. / Vergi */}
        <section>
          <h2 className="text-xl font-semibold">Umsatzsteuer-ID / KDV Kimlik No</h2>
          <p className="mt-2 text-muted">
            Umsatzsteuer-Identifikationsnummer gemäß §&nbsp;27a UStG:{" "}
            <span className="font-medium text-text">DE308026621</span>
          </p>
        </section>

        {/* Verantwortlich für den Inhalt */}
        <section>
          <h2 className="text-xl font-semibold">
            İçerikten Sorumlu Kişi (§&nbsp;18 Abs. 2 MStV)
          </h2>
          <div className="mt-3 space-y-1 text-muted">
            <p className="font-medium text-text">Onur Celikgün</p>
            <p>Beelertstiege 5-6, 48143 Münster</p>
          </div>
        </section>

        {/* AB Online-Streitbeilegung */}
        <section>
          <h2 className="text-xl font-semibold">
            AB Çevrimiçi Uyuşmazlık Çözümü / EU-Streitschlichtung
          </h2>
          <p className="mt-2 text-muted">
            Avrupa Birliği, çevrimiçi uyuşmazlıkların çözümü için bir platform sunmaktadır:{" "}
            <a
              href="https://ec.europa.eu/consumers/odr/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              https://ec.europa.eu/consumers/odr/
            </a>
          </p>
          <p className="mt-1 text-muted">
            E-posta adresimiz bu platformda yer almamaktadır ve tüketici tahkim kurullarına
            katılmaya mecbur ya da istekli değiliz.
          </p>
        </section>

        {/* Haftungsausschluss */}
        <section>
          <h2 className="text-xl font-semibold">Sorumluluk Reddi / Haftungsausschluss</h2>
          <h3 className="mt-3 font-medium">İçerik Sorumluluğu</h3>
          <p className="mt-1 text-muted">
            Bu web sitesinin içerikleri en büyük özenle hazırlanmıştır. Ancak içeriklerin doğruluğu,
            eksiksizliği ve güncelliği konusunda herhangi bir garanti verilmemektedir. Kullanıcı
            tarafından oluşturulan içeriklerden içerik sahibi kullanıcı sorumludur.
          </p>
          <h3 className="mt-3 font-medium">Bağlantı Sorumluluğu</h3>
          <p className="mt-1 text-muted">
            Sitemizde üçüncü taraf web sitelerine bağlantılar bulunabilir. Bağlantı kurulduğu anda
            söz konusu sayfalar hukuka uygunluk açısından kontrol edilmiştir. Ancak içeriklerin
            sürekli denetlenmesi orantısız bir yük oluşturmaktadır. Hukuka aykırı içerik tespit
            edilmesi halinde söz konusu bağlantılar derhal kaldırılacaktır.
          </p>
        </section>

        {/* Telif hakkı */}
        <section>
          <h2 className="text-xl font-semibold">Telif Hakkı / Urheberrecht</h2>
          <p className="mt-2 text-muted">
            Bu web sitesinde oluşturulan içerikler ve eserler Alman telif hakkı kanununa tabidir.
            Üçüncü taraf içerikleri mümkün olan her durumda işaretlenmiştir; hak ihlali fark
            edilmesi durumunda ilgili içerik kaldırılacaktır.
          </p>
        </section>

        <p className="border-t border-border pt-6 text-xs text-muted">
          <Link href="/gizlilik" className="text-primary hover:underline">
            Gizlilik Politikası
          </Link>{" "}
          ·{" "}
          <Link href="/kullanim" className="text-primary hover:underline">
            Kullanım Şartları
          </Link>
        </p>
      </div>
    </div>
  );
}
