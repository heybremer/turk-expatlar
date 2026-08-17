/* Batch 2 — 2026-08-17: 92 yeni soru (deploy sonrası otomatik "kullanılmadı" sayılır) */

type BotQuestion = {
  categorySlug: string;
  title: string;
  body: string;
};

export const QUESTION_POOL_BATCH2: BotQuestion[] = [
  // ── Resmi İşlemler (batch 2) ─────────────────────────────────────────────
  {
    categorySlug: 'resmi-islemler',
    title: 'eAT kartım geldi ama çip okunmuyor, ne yapmalıyım?',
    body: "Elektronik ikamet kartım (eAT) bugün elime geçti, Behörde'de çip okunmayınca işlem yarım kaldı. Kartın basımı mı hatalı yoksa okuyucu mı sorunlu anlamadım. Sizde de oldu mu, kartı iade edip yenisini mi beklemek gerekiyor? O zamana kadar eski Fiktionsbescheinigung geçerli kalır mı?",
  },
  {
    categorySlug: 'resmi-islemler',
    title: "Blue Card'tan Niederlassung'a geçişte Almanca şartı hâlâ B1 mi?",
    body: "27 aydır Blue Card ile çalışıyorum, Niederlassungserlaubnis'a geçmeyi düşünüyorum. B1 mi B2 mi istedikleri konusunda çelişkili bilgiler var. Siz geçişte hangi dil belgesini kabul ettirdiniz? Süre 21 aya düşüyor mu, yoksa 27 ay mı beklemeliyim?",
  },
  {
    categorySlug: 'resmi-islemler',
    title: 'Duldung ile oturum iznine geçmek mümkün mü, kimler başvurabiliyor?',
    body: 'Bir tanıdığım Duldung ile duruyor, "eğitime başlarsan oturum gelir" diyorlar. Ausbildungsduldung ile Aufenthaltserlaubnis arasındaki farkı net bilen var mı? Hangi belgelerle Ausländerbehörde\'ye gidiliyor?',
  },
  {
    categorySlug: 'resmi-islemler',
    title: 'Wohnsitzauflage nedir, şehri değiştirmek için izin lazım mı?',
    body: 'Oturumumda belirli bir şehre bağlı Wohnsitzauflage var. İş teklifi başka eyaletten geldi, taşınmak için önce izin mi almam lazım? İzni kim veriyor, Jobcenter mı Ausländerbehörde mi? Reddedilirse itiraz yolu var mı?',
  },
  {
    categorySlug: 'resmi-islemler',
    title: "Türkiye'ye 6 aydan fazla gidince oturumum yanar mı?",
    body: "Annem hasta, birkaç ay Türkiye'de kalmam gerekecek. 6 ay kuralını duydum ama Blue Card / aile birleşimi için süre farklı mı? Ausländerbehörde'ye önceden bildirmek yetiyor mu, yoksa özel izin mi lazım?",
  },
  {
    categorySlug: 'resmi-islemler',
    title: 'Aufenthaltstitel kayboldu, kayıp bildirimi nereye yapılıyor?',
    body: 'Cüzdanım çalındı, içindeki eAT de gitti. Polis tutanağı aldım ama Ausländerbehörde randevusu 8 hafta sonra. O zamana kadar çalışmaya ve seyahate devam edebilir miyim? Geçici belge (Ersatz) veriyorlar mı?',
  },
  {
    categorySlug: 'resmi-islemler',
    title: 'Bürgergeld alırken oturum uzatma riski var mı?',
    body: 'İşsiz kaldım, Jobcenter\'dan Bürgergeld bağlandı. Oturum uzatma randevum 3 ay sonra. "Kamu yardımına bağlanırsan uzatmazlar" diyenler var. Sizde uzatma reddedildi mi, yoksa geçici işsizlik sorun olmuyor mu?',
  },
  {
    categorySlug: 'resmi-islemler',
    title: "Einbürgerungstest'e nasıl kayıt olunuyor, sorular zor mu?",
    body: "Vatandaşlık için Einbürgerungstest'e gireceğim. Volkshochschule mi BAMF mi kayıt alıyor, randevu ne kadar sürüyor? Soru bankasını ezberlemek yetiyor mu, yoksa kurs şart mı?",
  },
  {
    categorySlug: 'resmi-islemler',
    title: "Çocuğum Almanya'da doğdu, otomatik Alman vatandaşı oluyor mu?",
    body: 'Bebeğimiz geçen ay burada doğdu. Eşimle ikimiz Türk vatandaşıyız, 5 yılı doldurmadık. Optionsregelung hâlâ var mı, yoksa belirli oturum süresinden sonra otomatik mi oluyor? Doğum kaydını Standesamt\'tan sonra konsolosluğa da mı bildirmeliyiz?',
  },
  {
    categorySlug: 'resmi-islemler',
    title: "Meldebescheinigung'u hangi işlemler için istiyorlar?",
    body: "Banka, Kindergeld ve Ausländerbehörde peş peşe Meldebescheinigung istedi. Bürgeramt'tan bir tane alsam hepsine fotokopi yeter mi, yoksa her biri orijinal mi istiyor? Belge kaç ay geçerli sayılıyor?",
  },
  {
    categorySlug: 'resmi-islemler',
    title: "Passersatz belgesiyle Türkiye'ye gidebilir miyim?",
    body: "Pasaportum yenilenene kadar Passersatz / seyahat belgesi verdiler. Bununla Türkiye'ye girip dönebilir miyim, havayolu kabul ediyor mu? Dönüşte Schengen sınırında sorun yaşayan oldu mu?",
  },
  {
    categorySlug: 'resmi-islemler',
    title: 'Verpflichtungserklärung imzaladım, misafirim kalırsa masraf bana mı kalır?',
    body: 'Kardeşimi 3 aylığına davet etmek için Verpflichtungserklärung imzaladım. Hastane masrafı veya ceza çıkarsa gerçekten kefil olarak ben mi ödüyorum? Sigorta yaptırmak bu yükümlülüğü kaldırır mı?',
  },
  {
    categorySlug: 'resmi-islemler',
    title: 'BAMF dil belgesi için ek evrak istedi, ne göndermeliyim?',
    body: 'Oturum uzatmada BAMF "dil belgesi yetersiz" diye ek evrak sordu. VHS katılım belgesi mi, yoksa telc/Goethe sertifikası mı istiyorlar? Online yükleme mi, yoksa Ausländerbehörde üzerinden mi iletmek lazım?',
  },

  // ── Ev Bulma (batch 2) ───────────────────────────────────────────────────
  {
    categorySlug: 'ev-bulma',
    title: "Wohnungsbesichtigung'da 20 kişi birden geliyor, nasıl öne geçerim?",
    body: 'Dün 3 oda daireye baktım, kuyruk evin önüne taşmıştı. Selbstauskunft ve Schufa\'yı yanımda götürdüm ama ev sahibi "mail atın" deyip çıktı. Siz kaç ev bakıp tutabildiniz? Başvuruda öne geçiren somut bir şey var mı?',
  },
  {
    categorySlug: 'ev-bulma',
    title: "Kaution'u taksitle ödemek mümkün mü?",
    body: 'Ev tamam, ama 3 kira kaution\'u peşin istemişler. Gesetzlich taksit hakkı olduğunu duydum (3 ay). Sözleşmede "peşin" yazıyorsa yine de taksit isteyebilir miyim? Ev sahibi reddederse evden olur muyum?',
  },
  {
    categorySlug: 'ev-bulma',
    title: 'Nachmieter bulmak zorunda mıyım, sözleşmeyi erken bitirmek için?',
    body: '1,5 yıl kaldı sözleşmede, iş yüzünden başka şehre gidiyorum. Ev sahibi "Nachmieter bulursan çıkarsın" diyor. Yasal olarak uygun 3 aday göstermek yetiyor mu? Kirayı ben mi toplamaya devam ederim o zamana kadar?',
  },
  {
    categorySlug: 'ev-bulma',
    title: "Hausordnung'u ihlal edince ev sahibi ne yapabiliyor?",
    body: 'Üst komşu "ayakkabıyla merdiven" diye şikayet etmiş, ev sahibinden Abmahnung geldi. Bir uyarıdan sonra tahliye mümkün mü? Hausordnung sözleşmenin parçası mı sayılıyor?',
  },
  {
    categorySlug: 'ev-bulma',
    title: 'Keller ve Stellplatz kira sözleşmesine dahil mi olmalı?',
    body: 'İlan "Keller + Stellplatz dahil" diyordu, sözleşmede yok. Anahtar tesliminde "ayrı kiralanır" dediler. Sözleşme imzalandıktan sonra bunu ekletebilir miyim? Stellplatz için ayrı Nebenkosten çıkar mı?',
  },
  {
    categorySlug: 'ev-bulma',
    title: "Energieausweis'e bakmadan ev tutmak riskli mi?",
    body: 'Beğendiğim evin Energieausweis\'ini göstermediler, "sonra atarız" dediler. Isınma faturası sürpriz olmasın diye sınıfına (A–H) bakmak şart mı? Belgeyi saklarlarsa şikayet edebiliyor muyum?',
  },
  {
    categorySlug: 'ev-bulma',
    title: 'Zwischenmiete ile 3 aylık evde Anmeldung yaptırabilir miyim?',
    body: '3 aylık Zwischenmiete buldum, ev sahibi "Anmeldung yaptırmayın" diyor. Banka ve oturum için Meldebescheinigung lazım. Wohnungsgeberbestätigung vermek zorunda değil mi? Vermezse ne yapıyorsunuz?',
  },
  {
    categorySlug: 'ev-bulma',
    title: 'Genossenschaft evleri nasıl bulunuyor, üyelik şart mı?',
    body: 'Kooperatif (Wohnungsbaugenossenschaft) daireleri daha mı kolay, yoksa üyelik hissesi mi ödemek lazım? Hangi şehirlerde sıra bekleniyor? Pflichtanteil geri ödeniyor mu çıkınca?',
  },
  {
    categorySlug: 'ev-bulma',
    title: 'Kündigungsfrist genelde 3 ay mı, daha kısa yazılabilir mi?',
    body: 'Sözleşmede 6 ay ihbar süresi yazmışlar. Kiracı için yasal süre 3 ay değil mi, fazla olan kısım geçersiz mi oluyor? Ev sahibi tarafı için süre farklı mı?',
  },
  {
    categorySlug: 'ev-bulma',
    title: 'Schimmel çıktı, ev sahibi tamir etmezse kirayı düşürebilir miyim?',
    body: 'Yatak odasında küf başladı, ev sahibine mail attım, 3 haftadır cevap yok. Minderung yüzdesini nasıl belirliyorsunuz? Kendi paramla boyatırsam faturayı kesebilir miyim?',
  },
  {
    categorySlug: 'ev-bulma',
    title: 'EBK mutfak bozuk geldi, tamir kimin sorumluluğu?',
    body: 'Einbauküche dahil ev tuttum, bulaşık makinesi teslimde çalışmıyordu. "Önceki kiracıdan kaldı, sen bak" diyorlar. EBK kira sözleşmesinde yazıyorsa tamir ev sahibinin mi? Küçük onarım (Kleinreparatur) tavanı ne kadar?',
  },
  {
    categorySlug: 'ev-bulma',
    title: 'Wohnberechtigungsschein (WBS) kimler alabiliyor?',
    body: 'Gelirim düşük, Sozialwohnung bakıyorum. WBS\'yi belediyeden mi alıyorum, gelir sınırı eyalete göre mi değişiyor? Belge kaç ay geçerli, ev bulamazsam yenileniyor mu?',
  },

  // ── İş Bulma (batch 2) ───────────────────────────────────────────────────
  {
    categorySlug: 'is-bulma',
    title: 'Anerkennung süreci meslekten mesleğe ne kadar sürüyor?',
    body: 'Hemşirelik diplomamın denkliğini (Anerkennung) başlattım, 8 aydır "işlemde" diyorlar. Sizde kaç ayda bitti? Defizitbescheid gelirse Anpassungslehrgang mı, Kenntnisprüfung mi daha kısa sürüyor?',
  },
  {
    categorySlug: 'is-bulma',
    title: 'Zeitarbeit ile başlamak kariyeri zedeler mi?',
    body: 'Direkt iş bulunmayınca Leiharbeit / Zeitarbeit teklif ettiler. 6 ay sonra kadroya alma sözü var ama yazılı değil. Siz bu yolla kalıcı işe geçebildiniz mi? Maaş Tarifvertrag\'a göre mi, yoksa daha mı düşük?',
  },
  {
    categorySlug: 'is-bulma',
    title: "Türkiye'deki patron referansı Alman işveren kabul ediyor mu?",
    body: 'Almanya\'da iş başvuruyorum, Zeugnis yerine Türkiye\'den İngilizce referans mektubu var. HR "Alman formatında Zeugnis istiyoruz" diyor. Eski patrona nasıl bir şablon göndereyim? LinkedIn tavsiyesi işe yarıyor mu?',
  },
  {
    categorySlug: 'is-bulma',
    title: 'Tarifvertrag maaşı gerçekten etkiliyor mu, nasıl bakılıyor?',
    body: 'Teklifteki maaş "TV-L E10" diye geçiyor, netini hesaplayamadım. Tarifvertrag numarasını sözleşmede görmek hakkım mı? Öffentlicher Dienst dışında da tarif bağlayıcı oluyor mu?',
  },
  {
    categorySlug: 'is-bulma',
    title: "Quereinstieg ile IT'ye geçmek için hangi sertifikalar işe yarıyor?",
    body: "Türkiye'de farklı meslekten geldim, Almanya'da junior developer olarak Quereinstieg düşünüyorum. Bootcamp diploması mı, yoksa IHK sertifikası mı daha ciddiye alınıyor? Portfolio olmadan CV'ye bakarlar mı?",
  },
  {
    categorySlug: 'is-bulma',
    title: 'Arbeitsamt kursları gerçekten iş bulduruyor mu?',
    body: 'Jobcenter Bildungsgutschein ile 3 aylık kurs önerdi. "İş garantisi yok ama istatistik iyi" diyorlar. Siz bu kurslardan sonra işe girdiniz mi? Kursu reddedersem Bürgergeld kesilir mi?',
  },
  {
    categorySlug: 'is-bulma',
    title: 'Weihnachtsgeld her işyerinde var mı, sözleşmede yoksa istenebilir mi?',
    body: "İlk yılım, Aralık'ta 13. maaş / Weihnachtsgeld bekliyorum ama sözleşmede yok. Betriebliche Übung ile 3 yıl sonra hak doğuyor deniyor. Sizde ilk yılda ödendi mi? Urlaubsgeld ayrı mı geliyor?",
  },
  {
    categorySlug: 'is-bulma',
    title: 'Befristeter Vertrag bitince otomatik uzar mı?',
    body: '1 yıllık befristet sözleşmem 2 ay sonra bitiyor. HR henüz bir şey demedi. Sachgrund olmadan kaç kez uzatılabiliyor? Bitimine 1 ay kala hatırlatmak mı lazım, yoksa sessiz kalmak mı daha iyi?',
  },
  {
    categorySlug: 'is-bulma',
    title: 'İş görüşmesine giderken Anfahrtskosten karşılanıyor mu?',
    body: 'Başka eyaletten yüz yüze mülakata çağırdılar, tren bileti pahalı. Davet mailinde masraf yazmıyor. Önceden sormak ayıp mı kaçıyor? Fatura karşılığı sonradan ödeyen oldu mu?',
  },
  {
    categorySlug: 'is-bulma',
    title: 'Selbstständig olduktan sonra tekrar sosyal sigortalı işe dönebilir miyim?',
    body: "2 yıldır Freiberufler'ım, şimdi klasik işe dönmek istiyorum. Krankenkasse ve emeklilikte boşluk sorun oluyor mu? İşveren \"neden bıraktın\" diye sorunca nasıl anlatıyorsunuz?",
  },
  {
    categorySlug: 'is-bulma',
    title: "Almanya'da staj ücretli olmak zorunda mı?",
    body: 'Pflichtpraktikum ile freiwilliges Praktikum karıştı. 3 aydan uzun stajda Mindestlohn şart mı? Öğrenciysem istisna var mı? Sözleşmede 400 € yazmışlar, yasal mı?',
  },

  // ── Sağlık (batch 2) ─────────────────────────────────────────────────────
  {
    categorySlug: 'saglik',
    title: 'Hausarzt bulamıyorum, 116117 gerçekten randevu ayarlıyor mu?',
    body: "Taşındığım şehirde Hausarzt almıyor, 20 muayenehane aradım. 116117'yi denedim, \"bölgede yer yok\" dedi. Terminservice ve Doctolib dışında nasıl doktor buldunuz? Erstaufnahme için Notaufnahme'ye gitmek doğru mu?",
  },
  {
    categorySlug: 'saglik',
    title: 'IGeL Leistung nedir, ödemek zorunda mıyım?',
    body: 'Check-up\'ta doktor ek ultrason önerdi, "IGeL, sigorta ödemez" dedi. Reddetsem tedavim etkilenir mi? Hangi IGeL\'ler gerçekten işe yarıyor, hangisi gereksiz?',
  },
  {
    categorySlug: 'saglik',
    title: 'Krankenkasse değiştirmek yılda bir kez mi, nasıl geçilir?',
    body: "AOK'tan TK'ya geçmek istiyorum. 12 ay bağlayıcılık ve 2 ay ihbar kuralı hâlâ duruyor mu? Online Wechsel yeterli mi, yoksa eski sandığa yazı mı lazım? Ek sigortalar (Zahnzusatz) taşınıyor mu?",
  },
  {
    categorySlug: 'saglik',
    title: 'Rezeptgebühr her ilaçta aynı mı, çocuklarda da alınıyor mu?',
    body: 'Eczanede her kutu için 5–10 € kesiyorlar. Chronisch krank sayılırsam muafiyet (Zuzahlungsbefreiung) nasıl alınıyor? 18 yaş altı çocukta da ücret var mı?',
  },
  {
    categorySlug: 'saglik',
    title: 'Psychotherapie için Antrag yazmak gerekiyor mu, ne kadar sürüyor?',
    body: "Psikolog randevusu 6 ay sonra. Erstgespräch'ten sonra Krankenkasse'ye Antrag mı gidiyor? Sizde onay kaç haftada geldi? Probatorische Sitzung ile asıl terapi aynı şey mi?",
  },
  {
    categorySlug: 'saglik',
    title: 'Zahnzusatz olmadan implant yaptırsam ne kadar çıkar?',
    body: 'Bir diş çekilecek, implant önerildi. Yasal sigorta köprü/protez payı veriyor, implantı karşılamıyor. Zahnzusatz yaptırmadan fiyat alan var mı? Heil- und Kostenplan\'ı sandığa onaylatmak şart mı?',
  },
  {
    categorySlug: 'saglik',
    title: "Notaufnahme'den sonra fatura geldi, sigorta ödemezse ne olur?",
    body: 'Hafta sonu acile gittim, "acil değil" deyip muayene ettiler, şimdi evime fatura geldi. Krankenkasse reddederse ben mi ödüyorum? Widerspruch işe yarıyor mu?',
  },
  {
    categorySlug: 'saglik',
    title: 'U-Untersuchung kaçırılırsa Jugendamt karışır mı?',
    body: "Bebeğin U6 randevusunu kaçırdık, yeni tarih 5 hafta sonra. Das gelbe Heft'te boş kalınca ev ziyareti geliyor diyorlar. Sizde gecikme sorun oldu mu? Kinderarzt bulamazsak ne yapıyorsunuz?",
  },
  {
    categorySlug: 'saglik',
    title: 'İşyerinde kaza olursa Berufsgenossenschaft mi devreye girer?',
    body: 'Depoda ayağımı burktum, meslek kazası (Arbeitsunfall) sayılıyor mu? Durchgangsarzt\'a mı gitmem lazım, yoksa Hausarzt yeter mi? Maaşım kimden yatacak o süreçte?',
  },
  {
    categorySlug: 'saglik',
    title: 'E-Rezept eczanede görünmüyor, ne yapmalıyım?',
    body: 'Doktor e-reçete yazdı, eczane "sistemde yok" diyor. Kartımı taktılar yine yok. 48 saat beklemek mi lazım, yoksa muayenehaneden Ausdruck mu istemeliyim?',
  },
  {
    categorySlug: 'saglik',
    title: 'Heilpraktiker masrafını yasal sigorta karşılıyor mu?',
    body: 'Sırt ağrısı için Heilpraktiker önerdiler. GKV bunları ödemiyor diye biliyorum, PKV\'de durum farklı mı? Faturayı Steuererklärung\'da Krankheitkosten olarak gösterebilir miyim?',
  },

  // ── Eğitim (batch 2) ─────────────────────────────────────────────────────
  {
    categorySlug: 'egitim',
    title: 'Kita-Platz için doğumdan önce mi yazılmak lazım?',
    body: '5 aylık hamileyim, yaşadığım ilçede Kita bekleme listesi 12 ay deniyor. Anmeldung henüz bebek yokken yapılabiliyor mu? Kitagutschein / Bildungs- und Teilhabepaket ayrı mı başvuruyor?',
  },
  {
    categorySlug: 'egitim',
    title: 'Hort ücreti eyaletten eyalete çok mu değişiyor?',
    body: 'İlkokul çocuğum var, öğleden sonra Hort şart. Bir eyalette ücretsiz, diğerinde 250 € diyorlar. Gelirine göre indirim (Staffelung) nasıl işliyor? Ferienbetreuung ayrı mı ücretlendiriliyor?',
  },
  {
    categorySlug: 'egitim',
    title: 'Gesamtschule, Gymnasium, Realschule farkı ne?',
    body: 'Çocuğum 4. sınıfta, öğretmen Gymnasium önermedi. Gesamtschule ile Realschule arasındaki farkı net anlatan var mı? Sonradan Gymnasium\'a geçiş (Aufstieg) gerçekten mümkün oluyor mu?',
  },
  {
    categorySlug: 'egitim',
    title: "Ausbildung'da Berufsschule ile Betrieb aynı anda nasıl yürüyor?",
    body: "Ausbildung'a başladım, bir hafta iş bir hafta okul. Sınav dönemlerinde işveren izin vermek zorunda mı? Berichtsheft'i aksatırsam diploma tehlikeye girer mi?",
  },
  {
    categorySlug: 'egitim',
    title: "Master'da Numerus Clausus her bölümde var mı?",
    body: "Almanya'da master bakıyorum, bazı bölümler NC'siz görünüyor. uni-assist not dönüşümü NC'yi çok düşürüyor mu? Bewerbungsfrist kış dönemi için ne zaman kapanıyor?",
  },
  {
    categorySlug: 'egitim',
    title: 'uni-assist başvurusu reddedilirse itiraz var mı?',
    body: 'uni-assist "şartları karşılamıyor" dedi, üniversiteye doğrudan mail attım, cevap yok. Vorprüfungsdokumentation ücreti yanar mı? Eksik evrakla yeniden açmak mı daha mantıklı?',
  },
  {
    categorySlug: 'egitim',
    title: 'Sprachkurs + Arbeit aynı anda oturumda sorun çıkarır mı?',
    body: 'Dil kursundayım, yanında 20 saat Minijob düşünüyorum. Öğrenci değilim, oturumum aile birleşimi. Ausländerbehörde\'ye bildirmek zorunda mıyım? Kurs devam şartı bozulur mu?',
  },
  {
    categorySlug: 'egitim',
    title: "Förderklasse'ye aldılar, bu kalıcı mı?",
    body: "Çocuğun Almancası yetmiyor diye Willkommensklasse / Förderklasse'ye koydular. Ne kadar sürüyor, normal sınıfa geçiş kriteri ne? Bu sınıf notunu etkilemeden lise yolunu kapatır mı?",
  },
  {
    categorySlug: 'egitim',
    title: 'Fernstudium ile oturum uzatılabilir mi?',
    body: 'Tam zamanlı iş + FernUni Hagen düşünüyorum. Uzaktan eğitim Aufenthalt amacı olarak kabul ediliyor mu? Präsenzpflicht sınavları için izin almak yeterli mi?',
  },
  {
    categorySlug: 'egitim',
    title: 'Duales Studium ile normal üniversite arasındaki fark nedir?',
    body: 'Duales Studium teklifi geldi, 3 ay şirket 3 ay okul. Maaş var ama bağlayıcı sözleşme imzalatıyorlar. Mezun olunca o şirkette kalmak zorunda mıyım? Normal Bachelor\'dan daha mı az tanınıyor?',
  },
  {
    categorySlug: 'egitim',
    title: 'Mezuniyet sonrası öğrenci vizesinden iş vizesine geçiş nasıl?',
    body: "Master bitiyor, 18 aylık job-seeker oturumu (Abschnitt 20) otomatik mi veriliyor? Blue Card'a geçmek için maaş eşiği 2026'da ne kadar? Teilzeit iş bu süreyi uzatır mı?",
  },

  // ── Hukuk (batch 2) ──────────────────────────────────────────────────────
  {
    categorySlug: 'hukuk',
    title: 'Abmahnung gelince işten hemen çıkarabilirler mi?',
    body: 'Küçük bir gecikme için yazılı Abmahnung geldi. İkinci uyarıda fristlose Kündigung mü geliyor? Abmahnung\'a yazılı cevap vermek gerekir mi, yoksa dosyaya mı giriyor sadece?',
  },
  {
    categorySlug: 'hukuk',
    title: 'DSGVO tazminat maili geldi, dolandırıcılık mı?',
    body: 'Tanımadığım bir siteden "çerez izni ihlali, 200 €" diye mail geldi. Gerçek avukat mı, Massenabmahnung mı? Cevap vermeden silmek güvenli mi, yoksa Verbraucherzentrale\'ye mi sormalı?',
  },
  {
    categorySlug: 'hukuk',
    title: 'Inkasso şirketi arıyor, borcum yok sanıyorum, ne yapmalıyım?',
    body: 'Yıllar önce iptal ettiğim bir Handyvertrag için Inkasso yazısı geldi. Ödeme yapmadan önce borç teyidi (Schuldnachweis) istemek hakkım mı? Ödersem Schufa\'ya işler mi?',
  },
  {
    categorySlug: 'hukuk',
    title: 'Park yasağına yanlışlıkla park ettim, itiraz süresi ne kadar?',
    body: 'Bewohnerparken tabelasını görmedim, 30 € ceza geldi. 14 gün içinde itiraz mı, yoksa 7 gün mü? Dashcam / fotoğraf işe yarıyor mu, yoksa ödemek mi daha ucuz?',
  },
  {
    categorySlug: 'hukuk',
    title: "Komşu kavgası için Schiedsstelle'ye gitmek zorunlu mu?",
    body: 'Gürültü yüzünden komşu avukatla tehdit ediyor. Bazı eyaletlerde önce Schiedsstelle / Gütestelle şartmış. Sizde bu adım işe yaradı mı? Tutanak ev sahibine giderse tahliye riski var mı?',
  },
  {
    categorySlug: 'hukuk',
    title: 'Arbeitszeugnis kötü yazılmış, düzelttirmek hakkım var mı?',
    body: 'İşten çıktım, Zeugnis "bemüht" gibi gizli olumsuz kodlarla dolu. Düzeltme (Berichtigung) talep etmek yasal hak mı? Vermezlerse Arbeitsgericht\'e gitmeye değer mi?',
  },
  {
    categorySlug: 'hukuk',
    title: 'Gewährleistung ve Garantie farkı ne, hangisi geçerli?',
    body: 'Online aldığım telefon 8. ayda bozuldu. Satıcı "garanti 6 aydı" diyor. 2 yıllık Gewährleistung hâlâ satıcıda değil mi? İspat yükü 1 yıldan sonra bana mı geçiyor?',
  },
  {
    categorySlug: 'hukuk',
    title: 'Kündigungsschutzklage için 3 hafta kuralı gerçekten kesin mi?',
    body: 'İşten çıkarıldım, 3 hafta içinde dava açılmazsa hak yanıyor deniyor. Beratungshilfe ile avukat bulmak bu sürede yetişir mi? Süre tebliğ tarihinden mi, imza gününden mi başlıyor?',
  },
  {
    categorySlug: 'hukuk',
    title: "Türkiye'de evliyim, Almanya'da mal paylaşımı hangi hukuka göre?",
    body: "Evlilik Türkiye'de kıyıldı, ikimiz de burada yaşıyoruz. Boşanırsak mal rejimi Türk hukukuna mı, Alman Güterrecht'e mi bakıyor? Evlilik sözleşmesi sonradan burada yapılabiliyor mu?",
  },
  {
    categorySlug: 'hukuk',
    title: "Rundfunkbeitrag'ı ev arkadaşı ödüyorsa ben de mi ödeyeceğim?",
    body: "WG'de bir kişi 18,36 € ödüyor, bana da ayrı tebligat geldi. Aynı Wohnung'da ikinci kez alınır mı? Ummeldung yapınca otomatik mi başlıyor, nasıl birleştiriliyor?",
  },
  {
    categorySlug: 'hukuk',
    title: 'Beratungshilfe nasıl alınır, ilk avukat görüşmesi ücretsiz mi?',
    body: "Hukuki danışma lazım, param yetmiyor. Amtsgericht'ten Beratungshilfeschein nasıl alınıyor? İlk 30 dakika ücretsiz diyen avukatlar güvenilir mi, yoksa Anwaltsberatung sabit ücretli mi?",
  },

  // ── Vergi (batch 2) ──────────────────────────────────────────────────────
  {
    categorySlug: 'vergi',
    title: "Steuererklärung'u 30 Eylül'den sonra verirsem ceza gelir mi?",
    body: '2025 beyannamesini henüz vermedim, Steuerberater yoğun. Verspätungszuschlag ne zaman başlıyor, kimler 30 Eylül istisnasında? ELSTER\'den süre uzatımı (Fristverlängerung) kabul ediliyor mu?',
  },
  {
    categorySlug: 'vergi',
    title: 'Pendlerpauschale için ev-iş mesafesini nasıl kanıtlıyorum?',
    body: 'Günde 42 km gidip geliyorum, Entfernungspauschale yazacağım. Google Maps çıktısı yeter mi, yoksa Jahresfahrkarte / tank fişi mi istiyorlar? Homeoffice günlerini düşmek zorunda mıyım?',
  },
  {
    categorySlug: 'vergi',
    title: "Homeoffice-Pauschale 2026'da hâlâ geçerli mi?",
    body: 'Haftada 3 gün evden çalışıyorum. 6 € × gün pauschale duruyor mu, tavan kaç euro? İşveren homeoffice zorunlu kıldıysa Arbeitszimmer olarak tam masraf yazmak daha mı kârlı?',
  },
  {
    categorySlug: 'vergi',
    title: 'Ehegattensplitting evlenince otomatik mi devreye giriyor?',
    body: 'Bu yıl evlendik, Steuerklasse 4/4 mü 3/5 mi seçmeliyiz? Splitting tarifesi ilk beyannamede otomatik hesaplanıyor mu? Eşim Türkiye\'de çalışıyorsa yine uygulanır mı?',
  },
  {
    categorySlug: 'vergi',
    title: 'Freistellungsauftrag vermezsem faiz gelirine ne olur?',
    body: 'Bankada Sparkonto var, Freistellungsauftrag vermedim. Kapitalertragsteuer peşin kesilir mi, yıl sonunda iade alır mıyım? Çiftlerde 2000 € Sparer-Pauschbetrag nasıl paylaşılıyor?',
  },
  {
    categorySlug: 'vergi',
    title: "Handwerkerrechnung'u nakit ödersem vergiden düşemez miyim?",
    body: 'Tesisatçı nakit istedi, "fatura keserim" dedi. Handwerkerleistungen için transfer şart mı? Sadece işçilik mi düşülüyor, malzeme de giriyor mu?',
  },
  {
    categorySlug: 'vergi',
    title: "Umzugskosten'i Werbungskosten olarak gösterebilir miyim?",
    body: 'İş yüzünden eyalet değiştirdim, taşıma + çift kira oldu. Doppelte Haushaltsführung ile Umzugskosten aynı anda yazılır mı? Hangi fişleri saklamalıyım?',
  },
  {
    categorySlug: 'vergi',
    title: 'Progressionsvorbehalt nedir, Elterngeld alınca vergi niye artıyor?',
    body: 'Elterngeld aldım, bu yıl vergi iadesi beklerken ek ödeme çıktı. Progressionsvorbehalt geliri nasıl şişiriyor? Krankengeld ve Elternzeit aynı anda olursa daha mı kötü?',
  },
  {
    categorySlug: 'vergi',
    title: "Türkiye'deki emekli maaşım Almanya'da beyan edilmeli mi?",
    body: "Babamın TC emekli maaşı var, o da burada yaşıyor. Çifte vergilendirme anlaşmasına göre Türkiye'de mi kalıyor, Almanya'da mı gösterilecek? Finanzamt kanıt olarak ne istiyor?",
  },
  {
    categorySlug: 'vergi',
    title: 'Kleinunternehmerregelung limiti nedir, aşınca ne değişiyor?',
    body: "Yan işten fatura kesiyorum, Kleinunternehmer'ım. 2026 ciro tavanı ne kadar? Aşınca geriye dönük KDV mi çıkar, yoksa sadece sonraki yıldan mı değişir?",
  },
  {
    categorySlug: 'vergi',
    title: "Lohnsteuerbescheinigung kayboldu, işveren vermezse ne yaparım?",
    body: "Eski işveren Lohnsteuerbescheinigung'u mail atmadı, ELSTER'da da görünmüyor. eLStAM / Bescheinigung'u Finanzamt'tan isteyebilir miyim? Beyannameyi belgesiz göndermek mümkün mü?",
  },

  // ── Almanca (batch 2) ────────────────────────────────────────────────────
  {
    categorySlug: 'almanca',
    title: 'Integrationskurs zorunlu mu, kimler muaf tutuluyor?',
    body: "Ausländerbehörde Integrationskurs'a yazılmamı istedi. Üniversite mezunu + B1 belgem var, muafiyet (Befreiung) mümkün mü? Kursu reddedince oturum uzatma etkilenir mi?",
  },
  {
    categorySlug: 'almanca',
    title: 'telc B1 Beruf ile Goethe B1 arasında işveren hangisini tercih ediyor?',
    body: 'Mesleki dil için telc Deutsch B1·B2 Beruf önerdiler, Goethe daha tanınır diyen de var. Pflege / Büro işlerinde hangisini kabul ettiler? Sınav tarihi ve ücret farkı büyük mü?',
  },
  {
    categorySlug: 'almanca',
    title: 'Tandem partner nereden bulunur, gerçekten işe yarıyor mu?',
    body: 'Kurs yetmiyor, konuşasım yok. Tandem / Sprachpartner\'ı Uni, Meetup yoksa uygulamadan mı buldunuz? Sadece kahve içip Türkçe konuşuluyor diye şikayet edenler var, siz nasıl yürüttünüz?',
  },
  {
    categorySlug: 'almanca',
    title: 'Berufssprachkurs (DeuFöV) ücretsiz mi, kim yönlendiriyor?',
    body: 'B2 meslek dili kursu (DeuFöV / Berufssprachkurs) duydum. Jobcenter mi BAMF mi onaylıyor, Bildungsgutschein mi lazım? Çalışırken akşam sınıfı bulunuyor mu?',
  },
  {
    categorySlug: 'almanca',
    title: 'Evde Türkçe konuşunca öğretmen kızıyor, doğru bir yaklaşım mı?',
    body: 'Öğretmen "evde sadece Almanca konuşun" dedi, çocuğun Türkçesi kaybolmasın istiyorum. Siz nasıl dengelediniz? Schulsozialarbeit veya extra Deutsch-AG işe yaradı mı?',
  },
  {
    categorySlug: 'almanca',
    title: 'Dialekt yerine Hochdeutsch için hangi şehir daha uygun?',
    body: 'İş için taşınacağım, lehçe yüzünden toplantıları kaçırıyorum. Hannover / Berlin tarafı gerçekten daha standart mı? Kurslarda Dialekt dinleme çalışması yapan var mı?',
  },
  {
    categorySlug: 'almanca',
    title: "C2'ye çıkmadan üniversitede ders takip etmek mümkün mü?",
    body: 'Master dersleri Almanca, belgem C1. Hocalar hızlı ve slaytsız konuşuyor. C2 şart mı, yoksa Vorlesung kaydı / Nachhilfe ile idare ettiniz mi? Erasmus öğrencileri nasıl dayanıyor?',
  },
  {
    categorySlug: 'almanca',
    title: "İşyerinde Sie'den du'ya geçiş nasıl oluyor?",
    body: '4 aydır aynı ekibim, hâlâ Sie konuşuyoruz. Du teklifini kim yapıyor, yoksa Betriebsfeier mi bekleniyor? Mailde yanlışlıkla du yazarsam ayıp mı kaçıyor?',
  },
  {
    categorySlug: 'almanca',
    title: 'VHS doldu, özel dil okulu fiyatları gerçekçi mi?',
    body: 'VHS B2 kontenjanı 4 ay sonra. Özel Schule 400–800 €/ay istiyor. Fiyat/kalite olarak memnun kalan var mı? Online yoğun kurs (4 hafta) resmi sınava yetişir mi?',
  },
  {
    categorySlug: 'almanca',
    title: 'Anadili Türkçe olanlar için en zor Almanca konular hangileri?',
    body: 'Artikel ve Position des Verbs\'te takılıyorum, konuşurken duraksıyorum. Siz hangi konuyu en geç oturttunuz? Yazılı mı sözlü mü daha çok puan kaybettiriyor sınavda?',
  },
  {
    categorySlug: 'almanca',
    title: 'Prüfungstraining kitabı mı özel hoca mı daha verimli?',
    body: '8 hafta sonra telc B2 var. Modelltest kitaplarıyla mı gidilmeli, yoksa 10 ders özel hoca mı yetiyor? Sınavda Schriftlicher Ausdruck\'ta konu dışı yazmamak için taktiğiniz neydi?',
  },
  {
    categorySlug: 'almanca',
    title: 'Çocuk için extra Almanca dersi (Nachhilfe) nereden bulunuyor?',
    body: '3. sınıf, okuma hızı geride. VHS çocuk kursu, özel Nachhilfe, yoksa Förderunterricht okulda ücretsiz mi? Wochenstunde kaç olmalı ki ev ödevi çatışmasın?',
  },
];
