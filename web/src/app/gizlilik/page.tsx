import Link from "next/link";

export const metadata = {
  title: "Datenschutzerklärung / Gizlilik Politikası",
};

export default function GizlilikPage() {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <h1 className="text-3xl font-bold">Datenschutzerklärung / Gizlilik Politikası</h1>
      <p className="mt-2 text-sm text-muted">Son güncelleme: Haziran 2025</p>

      <div className="mt-8 space-y-8 text-sm leading-relaxed text-text">

        {/* 1 */}
        <section>
          <h2 className="text-xl font-semibold">1. Sorumlu kişi / Verantwortlicher</h2>
          <p className="mt-2 text-muted">
            Bu platform kapsamında kişisel verilerin işlenmesinden sorumlu taraf, Impressum sayfasında
            yer alan kişi veya kuruluştur.
          </p>
          <p className="mt-2 text-muted">
            İletişim:{" "}
            <Link href="/impressum" className="text-primary hover:underline">
              Impressum
            </Link>{" "}
            veya{" "}
            <Link href="/destek" className="text-primary hover:underline">
              destek formu
            </Link>
            .
          </p>
        </section>

        {/* 2 */}
        <section>
          <h2 className="text-xl font-semibold">2. Toplanan veriler ve amaçları</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-surface text-left">
                  <th className="border border-border px-3 py-2">Veri türü</th>
                  <th className="border border-border px-3 py-2">Amaç</th>
                  <th className="border border-border px-3 py-2">Hukuki dayanak (GDPR)</th>
                  <th className="border border-border px-3 py-2">Saklama süresi</th>
                </tr>
              </thead>
              <tbody className="text-muted">
                <tr>
                  <td className="border border-border px-3 py-2">E-posta, şifre (hash)</td>
                  <td className="border border-border px-3 py-2">Hesap oluşturma ve giriş</td>
                  <td className="border border-border px-3 py-2">Sözleşme (Md. 6/1/b)</td>
                  <td className="border border-border px-3 py-2">Hesap silinene kadar</td>
                </tr>
                <tr>
                  <td className="border border-border px-3 py-2">Ad, avatar, bio, konum (eyalet/şehir)</td>
                  <td className="border border-border px-3 py-2">Profil ve topluluk özellikleri</td>
                  <td className="border border-border px-3 py-2">Sözleşme (Md. 6/1/b)</td>
                  <td className="border border-border px-3 py-2">Hesap silinene kadar</td>
                </tr>
                <tr>
                  <td className="border border-border px-3 py-2">Forum mesajları, yorumlar</td>
                  <td className="border border-border px-3 py-2">Topluluk içeriği</td>
                  <td className="border border-border px-3 py-2">Meşru menfaat (Md. 6/1/f)</td>
                  <td className="border border-border px-3 py-2">İçerik silinene kadar</td>
                </tr>
                <tr>
                  <td className="border border-border px-3 py-2">Sohbet mesajları (DM dahil)</td>
                  <td className="border border-border px-3 py-2">Canlı iletişim</td>
                  <td className="border border-border px-3 py-2">Sözleşme (Md. 6/1/b)</td>
                  <td className="border border-border px-3 py-2">Mesaj silinene / hesap kapanana kadar</td>
                </tr>
                <tr>
                  <td className="border border-border px-3 py-2">İşletme bilgileri, yorumlar</td>
                  <td className="border border-border px-3 py-2">İşletme rehberi</td>
                  <td className="border border-border px-3 py-2">Meşru menfaat (Md. 6/1/f)</td>
                  <td className="border border-border px-3 py-2">Kayıt silinene kadar</td>
                </tr>
                <tr>
                  <td className="border border-border px-3 py-2">IP adresi, tarayıcı bilgisi</td>
                  <td className="border border-border px-3 py-2">Güvenlik, hız sınırı</td>
                  <td className="border border-border px-3 py-2">Meşru menfaat (Md. 6/1/f)</td>
                  <td className="border border-border px-3 py-2">En fazla 30 gün (log)</td>
                </tr>
                <tr>
                  <td className="border border-border px-3 py-2">Ödeme bilgileri (Stripe)</td>
                  <td className="border border-border px-3 py-2">Üyelik aboneliği</td>
                  <td className="border border-border px-3 py-2">Sözleşme (Md. 6/1/b)</td>
                  <td className="border border-border px-3 py-2">Vergi mevzuatı gereği 10 yıl</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-muted">
            Şifreler düz metin olarak saklanmaz; güçlü hash algoritması ile korunur.
            Ödeme bilgileri platform üzerinde tutulmaz; işlem{" "}
            <a
              href="https://stripe.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Stripe
            </a>{" "}
            tarafından gerçekleştirilir.
          </p>
        </section>

        {/* 3 */}
        <section>
          <h2 className="text-xl font-semibold">3. Veri aktarımı</h2>
          <p className="mt-2 text-muted">
            Kişisel verileriniz yalnızca aşağıdaki durumda üçüncü taraflarla paylaşılır:
          </p>
          <ul className="mt-2 list-inside list-disc space-y-1.5 text-muted">
            <li>
              <strong>Stripe Inc.</strong> — ödeme işlemleri (ABD; AB-ABD Veri Gizlilik Çerçevesi
              kapsamında aktarım).
            </li>
            <li>
              <strong>Yasal zorunluluk</strong> — mahkeme kararı veya yetkili makam talebi.
            </li>
          </ul>
          <p className="mt-2 text-muted">
            Verileriniz reklam amaçlı üçüncü taraflarla paylaşılmaz veya satılmaz.
          </p>
        </section>

        {/* 4 */}
        <section>
          <h2 className="text-xl font-semibold">4. Çerezler (Cookies)</h2>
          <p className="mt-2 text-muted">
            Platform, oturum yönetimi için tarayıcı yerel depolama (localStorage) kullanır.
            İzleme veya reklam amaçlı üçüncü taraf çerez kullanılmamaktadır. Analytics etkinleştirilmişse
            (Google Analytics / Meta Pixel) ilgili sağlayıcıların gizlilik politikaları geçerlidir;
            bu takip araçlarını site ayarları üzerinden yönetici devre dışı bırakabilir.
          </p>
        </section>

        {/* 5 */}
        <section>
          <h2 className="text-xl font-semibold">5. Haklarınız (GDPR Md. 15–22 / KVKK Md. 11)</h2>
          <ul className="mt-2 list-inside list-disc space-y-2 text-muted">
            <li>
              <strong>Erişim (Md. 15):</strong> Hakkınızda işlenen verilerin bir kopyasını talep edebilirsiniz.
            </li>
            <li>
              <strong>Düzeltme (Md. 16):</strong> Yanlış veya eksik verilerin güncellenmesini isteyebilirsiniz.
            </li>
            <li>
              <strong>Silme (Md. 17):</strong> "Unutulma hakkı" kapsamında verilerinizin silinmesini talep
              edebilirsiniz. Hesabınızı kapatarak da işlem yapabilirsiniz.
            </li>
            <li>
              <strong>İşlemeyi kısıtlama (Md. 18):</strong> Belirli durumlarda işlemenin askıya alınmasını
              isteyebilirsiniz.
            </li>
            <li>
              <strong>Taşınabilirlik (Md. 20):</strong> Verilerinizi yapılandırılmış, makine tarafından
              okunabilir formatta talep edebilirsiniz.
            </li>
            <li>
              <strong>İtiraz (Md. 21):</strong> Meşru menfaat dayanağıyla işlenen verilere itiraz
              edebilirsiniz.
            </li>
            <li>
              <strong>Şikâyet:</strong> İlgili ülkedeki denetleyici kuruma (Almanya için yetkili eyalet
              Veri Koruma Otoritesi; Türkiye için KVKK) şikâyette bulunabilirsiniz.
            </li>
          </ul>
          <p className="mt-3 text-muted">
            Bu haklarınızı kullanmak için{" "}
            <Link href="/destek" className="text-primary hover:underline">
              destek formumuzu
            </Link>{" "}
            kullanabilir veya Impressum'daki iletişim adresine yazabilirsiniz. Kimlik doğrulama
            sonrası talepler en geç 30 gün içinde yanıtlanır.
          </p>
        </section>

        {/* 6 */}
        <section>
          <h2 className="text-xl font-semibold">6. Güvenlik</h2>
          <p className="mt-2 text-muted">
            Verileriniz, şifreli iletişim (HTTPS/TLS), güvenli şifre hash'i (bcrypt) ve erişim
            kontrolü gibi teknik önlemlerle korunmaktadır. Bununla birlikte hiçbir internet
            aktarımı %100 güvenli değildir.
          </p>
        </section>

        {/* 7 */}
        <section>
          <h2 className="text-xl font-semibold">7. Değişiklikler</h2>
          <p className="mt-2 text-muted">
            Bu politika güncellenebilir. Önemli değişiklikler site üzerinde duyurulur. Kullanmaya
            devam etmeniz güncel politikayı kabul ettiğiniz anlamına gelir.
          </p>
        </section>

        {/* 8 */}
        <section>
          <h2 className="text-xl font-semibold">8. İletişim</h2>
          <p className="mt-2 text-muted">
            Gizlilik ile ilgili sorularınız için:{" "}
            <Link href="/destek" className="text-primary hover:underline">
              Destek Formu
            </Link>{" "}
            ·{" "}
            <Link href="/impressum" className="text-primary hover:underline">
              Impressum
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}
