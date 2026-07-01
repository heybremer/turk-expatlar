import Link from "next/link";

export default function KullanimPage() {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <h1 className="text-3xl font-bold">Kullanım Şartları</h1>
      <p className="mt-2 text-sm text-muted">
        Son güncelleme: {new Date().toLocaleDateString("tr-TR")}
      </p>

      <div className="prose prose-slate mt-8 max-w-none space-y-8 text-text">
        <section>
          <h2 className="text-xl font-semibold">1. Hizmetin kapsamı</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Türk Expatlar, Almanya&apos;da yaşayan Türkçe konuşan kullanıcılar için forum, etkinlik,
            işletme rehberi, sohbet ve ilgili topluluk hizmetleri sunar. Platform bilgilendirme ve
            topluluk amaçlıdır; profesyonel hukuki, tıbbi veya mali danışmanlık yerine geçmez.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">2. Hesap ve üyelik</h2>
          <ul className="mt-2 list-inside list-disc space-y-1.5 text-sm text-muted">
            <li>Kayıt sırasında doğru bilgi vermeniz beklenir.</li>
            <li>Hesap güvenliğinden siz sorumlusunuz; şifrenizi kimseyle paylaşmayın.</li>
            <li>Bir kişi yalnızca bir kişisel hesap açmalıdır (istisnalar admin onayı ile).</li>
            <li>Üyelik planları ve ödeme koşulları ilgili sayfada açıklanır.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold">3. Kullanıcı içeriği</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Yayımladığınız forum mesajları, yorumlar, etkinlikler ve profil bilgilerinden siz
            sorumlusunuz. Platform, topluluk kurallarına aykırı içeriği kaldırma veya hesabı
            kısıtlama hakkını saklı tutar.
          </p>
          <ul className="mt-3 list-inside list-disc space-y-1.5 text-sm text-muted">
            <li>
              <Link href="/forum/kurallar" className="text-primary hover:underline">
                Forum Kuralları
              </Link>
            </li>
            <li>
              <Link href="/sohbet/kurallar" className="text-primary hover:underline">
                Sohbet Kuralları
              </Link>
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold">4. Yasaklı kullanımlar</h2>
          <ul className="mt-2 list-inside list-disc space-y-1.5 text-sm text-muted">
            <li>Yasa dışı faaliyet teşviki veya dolandırıcılık</li>
            <li>Spam, otomatik bot kullanımı ve izinsiz veri toplama</li>
            <li>Başkalarının kişisel verilerini izinsiz paylaşma</li>
            <li>Platform altyapısına zarar verecek girişimler</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold">5. Sorumluluk sınırı</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Kullanıcıların paylaştığı bilgiler kişisel deneyime dayanabilir; doğruluğu garanti
            edilmez. Önemli kararlar için resmi kurumlar veya yetkili uzmanlara başvurun.
            Platform, kullanıcılar arası anlaşmazlıklardan doğrudan sorumlu tutulamaz.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">6. Gizlilik</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Kişisel verilerin işlenmesi{" "}
            <Link href="/gizlilik" className="text-primary hover:underline">
              Gizlilik Politikası
            </Link>{" "}
            kapsamındadır (GDPR/KVKK).
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">7. Değişiklikler</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Bu şartlar güncellenebilir. Önemli değişiklikler sitede duyurulur. Kullanmaya devam
            etmeniz güncel şartları kabul ettiğiniz anlamına gelir.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">8. İletişim</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Sorularınız için{" "}
            <Link href="/destek" className="text-primary hover:underline">
              destek formu
            </Link>{" "}
            veya{" "}
            <Link href="/impressum" className="text-primary hover:underline">
              Impressum
            </Link>{" "}
            üzerinden bize ulaşabilirsiniz.
          </p>
        </section>
      </div>
    </div>
  );
}
