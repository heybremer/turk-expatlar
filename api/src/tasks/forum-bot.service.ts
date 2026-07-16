import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { ForumTopicStatus } from '@prisma/client';

/* ─────────────────────────────────────────────────────────────────────────────
   Soru havuzu — Almanya'daki Türk expatların gerçekçi, günlük dil tonunda
   yazdıkları forum soruları. 8 kategori × 16-18 soru ≈ 130 soru.
───────────────────────────────────────────────────────────────────────────── */

type BotQuestion = {
  categorySlug: string;
  title: string;
  body: string;
};

const QUESTION_POOL: BotQuestion[] = [
  // ── Resmi İşlemler ────────────────────────────────────────────────────────
  {
    categorySlug: 'resmi-islemler',
    title: 'Anmeldung için randevu alamıyorum, başka yolu var mı?',
    body: "Bürgeramt'a online randevu almaya çalışıyorum ama tüm slotlar hep dolu. 3 haftadır deniyorum olmadı. Doğrudan gidip sıraya girsem alırlar mı? Yoksa başka bir çözüm yolu var mı bilen var mı?",
  },
  {
    categorySlug: 'resmi-islemler',
    title: 'Aufenthaltserlaubnis başvurusu ne kadar sürüyor?',
    body: "İlk oturumumu almam için Ausländerbehörde'ye başvurdum, bir ay oldu haber yok. Normal mi bu kadar bekleme? Arayıp sormam mı lazım yoksa beklemeye devam mı?",
  },
  {
    categorySlug: 'resmi-islemler',
    title: 'Freizügigkeitsbescheinigung ne işe yarar?',
    body: "AB vatandaşı olarak Almanya'ya taşındım. Freizügigkeitsbescheinigung almam gerekiyor mu? Olmadan da oturabilir miyim, yoksa zorunlu mu?",
  },
  {
    categorySlug: 'resmi-islemler',
    title: "Türk pasaportumun süresi doldu, Almanya'da yenileyebilir miyim?",
    body: "Türkiye'ye gidemiyorum şu an, pasaportum 2 ay sonra bitiyor. Almanya'daki Türk konsolosluğunda yenilenebiliyor mu? Randevu ne kadar sürede çıkıyor?",
  },
  {
    categorySlug: 'resmi-islemler',
    title: 'Mavi Kart başvurusu için hangi belgeler lazım?',
    body: "Yazılım mühendisiyim, Almanya'da iş teklifim var. Mavi Kart için ne hazırlayayım? Üniversite diplomam Türkiye'den, tanınma işlemi ne kadar sürüyor acaba?",
  },
  {
    categorySlug: 'resmi-islemler',
    title: 'Niederlassungserlaubnis için 5 yıl mı 3 yıl mı beklemek gerekiyor?',
    body: 'Süresiz oturum için ne kadar beklemem lazım tam olarak? Birisi 5 yıl dedi, başkası 3 yıl da yetebilir dedi. Hangi şartlarda 3 yıla iniyor bilen var mı?',
  },
  {
    categorySlug: 'resmi-islemler',
    title: "Almanya'ya taşınırken araç kaydını nasıl yaptırmalıyım?",
    body: "Türkiye'den arabamı getirdim. Zulassungsstelle'ye gitmem mi gerekiyor? Hangi belgeler lazım, TÜV muayenesi şart mı? Kısa süreliğine Türk plakasıyla sürebilir miyim?",
  },
  {
    categorySlug: 'resmi-islemler',
    title: 'Anmeldung olmadan banka hesabı açtırabilir miyim?',
    body: 'Yeni geldim, henüz anmeldung olmadı. Ama acil banka hesabına ihtiyacım var. Bazı bankalar Anmeldung istiyor bazıları istemiyor gibi, hangisi açıyor bunu bilen var mı?',
  },
  {
    categorySlug: 'resmi-islemler',
    title: 'Schufa kaydım neden kötü çıktı, hiç borç yapmadım ki?',
    body: "İlk kez kredi çekmeye çalıştım, Schufa skorun düşük dediler. Almanya'ya 1,5 yıl önce geldim ve hiç borcum olmadı. Neden düşük olabilir? Nasıl yükseltirim?",
  },
  {
    categorySlug: 'resmi-islemler',
    title: "Kindergeld başvurusunda çocuk Türkiye'de kalıyorsa nasıl oluyor?",
    body: "Eşim ve çocuğum henüz Türkiye'de, 3-4 ay sonra gelecekler. Şimdiden Kindergeld başvurabilir miyim? Çocuğun Almanya'da olması şart mı?",
  },
  {
    categorySlug: 'resmi-islemler',
    title: 'Ummeldung nedir ve ne zaman yapılmalı?',
    body: 'Yeni bir şehre taşındım. Eski adresimden yenisine ummeldung yapmam gerekiyor mu? Yapmadan bırakırsam ne olur, ceza var mı?',
  },
  {
    categorySlug: 'resmi-islemler',
    title:
      'Vergi numarası (Steueridentifikationsnummer) otomatik gönderiliyor mu?',
    body: 'Anmeldung yaptırdım, vergi numarası ne zaman gelir? Posta mı geliyor yoksa online mi alınıyor? Maaş ödemesi için şirkete vermem lazım',
  },
  {
    categorySlug: 'resmi-islemler',
    title: 'Elterngeld başvurusu için son tarih ne zaman?',
    body: 'Bebeğimiz doğdu. Elterngeld başvurusu için 3 ay içinde başvurmak gerekiyor duydum ama emin değilim. Geriye dönük alınabiliyor mu?',
  },
  {
    categorySlug: 'resmi-islemler',
    title: 'Almanca B1 sınavı olmadan oturum uzatabilir miyim?',
    body: 'Oturumumu uzatmaya gittim, B1 Almanca sertifikası istediler. Bende henüz A2 var. Süre uzatılmaz mı bunun olmadan? İstisna durumlar var mı?',
  },
  {
    categorySlug: 'resmi-islemler',
    title: 'Arbeitserlaubnis ve Aufenthaltserlaubnis aynı şey mi?',
    body: 'Yeni geldim ve tam olarak kafam karıştı. Çalışma izni ile oturma izni aynı belgede mi, ayrı mı? Biri olmadan diğeri mümkün mü?',
  },
  {
    categorySlug: 'resmi-islemler',
    title: "Almanya'da evlenmek için hangi belgeler gerekiyor?",
    body: "Türkiye'deki eşimle burada nikah kıydırmak istiyoruz. Standesamt için Türkiye'den apostilli belgeler lazım mı? Tüm süreci baştan anlatan var mı?",
  },

  // ── Ev Bulma ──────────────────────────────────────────────────────────────
  {
    categorySlug: 'ev-bulma',
    title: "WG'de yaşayan var mı, ilk başta nasıl buldunuz?",
    body: "Almanya'ya yeni geldim, önce WG'de kalmayı düşünüyorum. WG-Gesucht haricinde başka platform var mı? Türklerin çok olduğu semtlerde daha mı kolay buluyor?",
  },
  {
    categorySlug: 'ev-bulma',
    title: 'Kira öderken Mietkaution ne kadar isteniyor genelde?',
    body: 'Ev tutmak istiyorum. Kira depozitosunun 3 aylık kira olduğunu duydum, bu yasal zorunluluk mu? Peşin para yerine sigorta ile karşılanabiliyor mu?',
  },
  {
    categorySlug: 'ev-bulma',
    title: "Almanya'da ev tutarken Schufa belgesi nasıl alınıyor?",
    body: 'Ev bakarken Schufa istiyor kiracılar. Ücretsiz Schufa nasıl alıyoruz? Yeni geldim, Schufa bilgim bile yok henüz, bu sorun olmaz mı?',
  },
  {
    categorySlug: 'ev-bulma',
    title: 'Warm kira ile soğuk kira arasındaki fark ne?',
    body: 'İlan bakarken bazıları Kaltmiete bazıları Warmmiete yazıyor. Aradaki fark tam olarak ne? Ek olarak Nebenkosten de ayrı mı ödeniyor?',
  },
  {
    categorySlug: 'ev-bulma',
    title: 'Evcil hayvanım var, ev bulmak çok mu zorlaşıyor?',
    body: "Bir kedim var. Almanya'da evcil hayvanlı kiracıyı çok istemiyorlar diye duydum. Bu kadar büyük bir engel mi gerçekten? Hayvan dostu ev bulmak için ne yapmalıyım?",
  },
  {
    categorySlug: 'ev-bulma',
    title: 'Kira sözleşmesinde nelere dikkat etmeliyim?',
    body: "İlk defa Almanya'da kira sözleşmesi imzalayacağım. Almancam iyi değil, nelere özellikle bakmalıyım? Sözleşmede olmaması gereken maddeler var mı?",
  },
  {
    categorySlug: 'ev-bulma',
    title: 'Untervermietung (kiracıya kiraya vermek) yasal mı?',
    body: "Birkaç ay Türkiye'ye gideceğim, evimi başkasına kiralayabilir miyim? Ev sahibinden izin almak mı gerekiyor? İzin vermezse ne yapabilirim?",
  },
  {
    categorySlug: 'ev-bulma',
    title: 'Nebenkosten neden bu kadar yüksek çıkabiliyor?',
    body: 'Nebenkostenabrechnung geldi, beklenenden çok daha fazla çıkmış. Isıtma, çöp, kapıcı vs. dahil ama bunlar bu kadar tutacağını bilmiyordum. Normal bir Nebenkosten oranı nedir?',
  },
  {
    categorySlug: 'ev-bulma',
    title: 'Öğrenci yurdu mu, WG mi, yoksa kendi dairesi mi daha mantıklı?',
    body: "Üniversiteye başlıyorum, nerede kalsam daha iyi olur? Öğrenci yurdu için Studentenwerk'e başvuru çok geç mi kaldım? WG ile kendi dairesi arasında mali olarak ne fark var?",
  },
  {
    categorySlug: 'ev-bulma',
    title: 'Wohnungsvermittler (emlakçı) komisyonu zorunlu mu ödemek?',
    body: 'Bir ev beğendim ama emlakçı 2 aylık kira komisyon istiyor. Bu yasal mı? Yeni Bestellerprinzip ile kiralayanın ödemesi gerekmiyor muydu?',
  },

  // ── İş Bulma ──────────────────────────────────────────────────────────────
  {
    categorySlug: 'is-bulma',
    title: "Almanya'da CV nasıl hazırlanıyor, fotoğraf eklemeli miyim?",
    body: "Türkiye'deki CV formatım Almanya'da işe yarar mı? Lebenslauf nasıl olmalı? Fotoğraf ekliyorlar diye duydum, bu hala geçerli mi?",
  },
  {
    categorySlug: 'is-bulma',
    title: 'Almancam yok ama iş bulabilir miyim?',
    body: 'B2 İngilizcemi var, Almancam neredeyse yok. IT sektöründe iş arıyorum. İngilizce ile iş bulunabiliyor mu yoksa mutlaka Almanca şart mı?',
  },
  {
    categorySlug: 'is-bulma',
    title: "Türkiye'de aldığım diploma Almanya'da tanınıyor mu?",
    body: "Makine mühendisliği mezunuyum, üniversitem Türkiye'de. Almanya'da çalışmak için denklik almam gerekiyor mu? Anabin sitesine baktım biraz karıştı.",
  },
  {
    categorySlug: 'is-bulma',
    title: 'Minijob ile bütün gün çalışmak mümkün mü?',
    body: 'Öğrenciyim, bir yandan para kazanmak istiyorum. Minijob ile kaç saat çalışabilirim? 450 euro değil artık 520 euro mu oldu sınır?',
  },
  {
    categorySlug: 'is-bulma',
    title: "Networking yapmak Almanya'da nasıl oluyor?",
    body: "LinkedIn profilimi güncelliyorum ama Almanya'daki iş networkuma nasıl girerim? Messe gibi etkinliklere gitmek işe yarıyor mu? İlk girişimde neler yapmalıyım?",
  },
  {
    categorySlug: 'is-bulma',
    title: 'Probezeit süresinde işten çıkarılırsam ne olur?',
    body: 'Yeni işime başladım, 6 ay Probezeit var. Bu sürede işveren istediği zaman çıkarabilir mi? Kıdem veya tazminat gibi bir şey olmaz mı?',
  },
  {
    categorySlug: 'is-bulma',
    title: 'Serbest çalışmak (Freiberufler) için nasıl kayıt olunuyor?',
    body: "Tasarımcıyım, freelance çalışmak istiyorum. Finanzamt'a mı gitmem lazım? Gewerbe mi açmam gerekiyor? İkisi arasındaki fark ne tam olarak?",
  },
  {
    categorySlug: 'is-bulma',
    title: 'İş mülakatında Almancada ne tür sorular soruyorlar?',
    body: 'İlk iş mülakatım Almanca. Kendinizi tanıtın ve güçlü/zayıf yönleriniz gibi soruları nasıl cevaplamam gerekiyor? Birisi bu konuda deneyimini paylaşır mı?',
  },
  {
    categorySlug: 'is-bulma',
    title: "Ausbildung'u mu yoksa üniversiteyi mi önerirsiniz?",
    body: "Almanya'ya yeni geldim ve 20 yaşındayım. Ausbildung mu yapsam üniversiteye mi devam etsem? Ekonomik açıdan hangisi daha mantıklı, bilen var mı?",
  },

  // ── Sağlık ────────────────────────────────────────────────────────────────
  {
    categorySlug: 'saglik',
    title: 'AOK ve TK farkı ne, hangisini önerir siniz?',
    body: 'Yeni işe başlayacağım, Krankenkasse seçmem lazım. AOK mu yoksa Techniker Krankenkasse mi daha avantajlı? Özellikle dişçi ve göz için farklılık var mı?',
  },
  {
    categorySlug: 'saglik',
    title: 'Aile hekimi mi yoksa hastaneye direkt gitmeli miyim?',
    body: "Almanya'da hastalığımda ne yapmalıyım? Türkiye'deki gibi direkt hastaneye gidilmiyor mu? Hausarzt'a gitmeden acile gidebilir miyim?",
  },
  {
    categorySlug: 'saglik',
    title: 'Türkçe konuşan doktor bulmanın yolu nedir?',
    body: 'Almancam yeterli olmadığı için doktorla anlaşamıyorum. Şehrimde Türkçe konuşan doktor nasıl bulabilirim? Google haricinde başka yol var mı?',
  },
  {
    categorySlug: 'saglik',
    title: 'Diş tedavisi çok pahalı, sigorta ne kadar karşılıyor?',
    body: 'Diş dolgusu için gittim, kasaya gidince 300 euro ödemem gerekiyor denildi. Sigorta neden bu kadar az karşıladı? Zusatzversicherung almak gerekiyor mu dişçi için?',
  },
  {
    categorySlug: 'saglik',
    title: 'Psychologen randevusu almak çok zor mu oluyor?',
    body: 'Bir psikolog görmek istiyorum ama randevu 6-8 ay gibi uzun bekleme süresi varmış. Bu kadar uzun mu bekleniyor gerçekten? Daha hızlı yolu var mı?',
  },
  {
    categorySlug: 'saglik',
    title: "Almanya'da göz muayenesi ve gözlük bedava mı?",
    body: "Krankenkasse göz muayenesini karşılıyor mu? Reçeteli gözlük için de ödeme yapıyor mu? Optiker'e git desinler mi yoksa Augenarzt'a mı gitmem lazım?",
  },
  {
    categorySlug: 'saglik',
    title: 'İlaçlar için recete olmadan eczaneden alınabiliyor mu?',
    body: "Türkiye'de reçetesiz alabildiğim bazı ilaçları burada reçete istiyorlar. Almanya'da hangi ilaçlar reçetesiz alınabiliyor? Hekime gitmeden seçenek var mı?",
  },
  {
    categorySlug: 'saglik',
    title: 'Hamilelikte hangi kontroller Krankenkasse kapsamında?',
    body: 'Hamile kaldım ve hangi muayenelerin sigorta tarafından karşılandığını öğrenmek istiyorum. Frauenarzta ne sıklıkta gitmem lazım? Bebek kıyafeti ve ihtiyaçlar için destek var mı?',
  },

  // ── Eğitim ────────────────────────────────────────────────────────────────
  {
    categorySlug: 'egitim',
    title: "Almanya'da üniversiteye başvuru nasıl yapılıyor?",
    body: 'Türk lisesinden mezun oldum ve burada üniversite okumak istiyorum. Uni-Assist nedir, nasıl başvuruluyor? Tüm üniversiteler için mi geçerli?',
  },
  {
    categorySlug: 'egitim',
    title: 'BAföG alabilir miyim, yabancı öğrenci şartları nedir?',
    body: 'Öğrenci bursunu araştırıyorum. BAföG yabancı öğrencilere veriliyor mu? Hangi oturum türüyle başvurulabiliyor? Geri ödemesi var mı bunun?',
  },
  {
    categorySlug: 'egitim',
    title: 'TestDaF mı yoksa DSH mi yapmam gerekiyor?',
    body: "Almanya'da üniversiteye başvuracağım, Almanca dil sınavı seçimim lazım. TestDaF ile DSH arasındaki fark ne? Hangi üniversiteler hangi sınavı kabul ediyor?",
  },
  {
    categorySlug: 'egitim',
    title: 'Studienkolleg nedir ve herkes gitmek zorunda mı?',
    body: 'Üniversite başvurusunda Studienkolleg gerekebilir diye duydum. Türk lisesi mezunları için zorunlu mu? Kaç ay sürüyor, çok zor mu geçmek?',
  },
  {
    categorySlug: 'egitim',
    title: "Almanya'da öğrenci olarak çalışmanın sınırı nedir?",
    body: 'Üniversite okuyorum, aynı zamanda part-time çalışmak istiyorum. Yılda kaç saat çalışabilirim? Aşarsam ne olur, oturum iptal mi oluyor?',
  },
  {
    categorySlug: 'egitim',
    title: 'Ausbildung sırasında maaş alınıyor mu, ne kadar?',
    body: 'Ausbildung yapmayı düşünüyorum. Eğitim sırasında da para ödüyorlar mı gerçekten? Hangi sektörlerde daha yüksek Ausbildungsgeld veriliyor?',
  },
  {
    categorySlug: 'egitim',
    title: "Çocuğumu Kita'ya kaydettirmek için bekleme listesi ne kadar uzun?",
    body: "Çocuğum 1,5 yaşında ve Kita'ya kaydetmem lazım. Bekleme listesi 2 yıla kadar çıkabiliyor duydum. Bu doğru mu? Daha hızlı yer bulmanın yolu var mı?",
  },
  {
    categorySlug: 'egitim',
    title: 'Almancayı hızlı öğrenmek için en etkili yöntem ne?',
    body: 'Çalışırken Almanca öğrenmem gerekiyor, fazla zamanım yok. Volkshochschule kursları işe yarıyor mu? Bir de ücretsiz online kaynak önerebilir misiniz?',
  },

  // ── Hukuk ─────────────────────────────────────────────────────────────────
  {
    categorySlug: 'hukuk',
    title:
      'İşveren sözleşmede yazandan farklı çalışma saati uyguluyor ne yapabilirim?',
    body: "Sözleşmemde 40 saat yazıyor ama hep 48-50 saat çalıştırılıyorum, fazla mesai ödenmiyor. Bu durumda hukuki yolum nedir? Arbeitsgericht'e gitmeyi düşünüyorum.",
  },
  {
    categorySlug: 'hukuk',
    title: 'Ev sahibi depozitomu iade etmiyor, ne yapabilirim?',
    body: 'Evden çıktım üzerinden 3 ay geçti, meine Kaution hala iade edilmedi. Ev sahibi "eksikler var" diyor ama neler olduğunu belirtmiyor. Nasıl hak alabilirim?',
  },
  {
    categorySlug: 'hukuk',
    title: 'Alman vatandaşlığı için en az kaç yıl oturmuş olmak lazım?',
    body: "Almanya'da 6 yıldır yaşıyorum. Vatandaşlık için başvurabilir miyim? Şartlar neler ve birden fazla vatandaşlık mümkün mü artık?",
  },
  {
    categorySlug: 'hukuk',
    title: 'İş sözleşmesi Almanca, imzalamadan önce ne yapmalıyım?',
    body: 'İş teklifim var ve sözleşme Almanca. Tamamen anlayamıyorum, imzalamadan önce birine danışmam gerekiyor mu? Mietrechtsberatung gibi iş hukuku danışmanlığı ücretsiz mi?',
  },
  {
    categorySlug: 'hukuk',
    title: "Türkiye'deki mülküm Almanya vergi idaresine etki eder mi?",
    body: "Türkiye'de annemden miras kalan bir ev var. Almanya'daki vergi beyannamemde bunu belirtmem gerekiyor mu? Yurt dışı varlıkları nasıl beyan edilir?",
  },
  {
    categorySlug: 'hukuk',
    title: "Trafik kazasında Almanya'da ilk ne yapılmalı?",
    body: "Arabam hasarlı, karşı taraf kusurlu gözüküyor. Almanya'da kaza sonrası atılacak adımlar neler? Hemen polisi mi çağırmalıyım, yoksa kendi aralarında halledebilir miyiz?",
  },
  {
    categorySlug: 'hukuk',
    title: 'Abonelik iptal ettim ama para çekiyorlar, ne yapabilirim?',
    body: "Bir fitness kulübü üyeliğini iptal ettim ama fatura gelmeye devam ediyor. Yazılı iptal ettim elimde de var. Incasso'ya vermekle tehdit ediyorlar. Hukuki durumum nedir?",
  },
  {
    categorySlug: 'hukuk',
    title: 'İşten çıkarılınca işsizlik parasını hemen alabilir miyim?',
    body: "İşim bitti, Agentur für Arbeit'e başvuracağım. Hemen Arbeitslosengeld başlar mı yoksa Sperrzeit mi uygulanır? Kendin istifa edersen farklı oluyor mu?",
  },

  // ── Vergi ─────────────────────────────────────────────────────────────────
  {
    categorySlug: 'vergi',
    title: 'Yıllık vergi beyannamesi zorunlu mu, her şey otomatik değil mi?',
    body: "Türkiye'de vergi beyannamesi vermek zorunda kalmıyordum. Almanya'da da vermem gerekiyor mu? Eğer vermezsem para cezası var mı?",
  },
  {
    categorySlug: 'vergi',
    title: 'Steuerklasse değiştirmek nasıl oluyor?',
    body: 'Evlendim ve Steuerklasse 3/5 yapsak daha avantajlı olacakmış. Bunu nasıl değiştiriyoruz? Eşim de çalışıyor, hangimiz 3 hangimiz 5 olmalı?',
  },
  {
    categorySlug: 'vergi',
    title: 'Ev ofisi için vergi indirimi alınabiliyor mu?',
    body: "Homeoffice'te çalışıyorum, oturduğum daireden bir oda ofis olarak kullanıyorum. Bunu vergi beyannamesinde gider olarak gösterebilir miyim? Belge almam lazım mı?",
  },
  {
    categorySlug: 'vergi',
    title: "Türkiye'ye para göndermek vergiye tabi mi?",
    body: "Her ay aileye Türkiye'ye para gönderiyorum. Bu Almanya'da vergiden düşülebilir mi? Ya da Steuer açısından bir riski var mı?",
  },
  {
    categorySlug: 'vergi',
    title: 'ELSTER ile vergi beyannamesi nasıl doldurulur?',
    body: 'İlk defa Steuererklärung yapacağım, ELSTER programını indirdim ama çok karmaşık. Basit bir rehber var mı? Yoksa vergi danışmanı mı tutmak daha mantıklı?',
  },
  {
    categorySlug: 'vergi',
    title: 'Freelancer olarak KDV (Umsatzsteuer) ne zaman ödemek zorundayım?',
    body: 'Serbest çalışmaya başladım. Küçük işletme muafiyeti (Kleinunternehmer) nedir ve ne zamana kadar KDV ödemem gerekmiyor? Sınırı aşarsam ne oluyor?',
  },
  {
    categorySlug: 'vergi',
    title: 'Alman-Türk vergi anlaşması çifte vergilendirmeyi engelliyor mu?',
    body: "Türkiye'de kira gelirim var. Bunu hem Türkiye'ye hem Almanya'ya ödemek zorunda kalır mıyım? İki ülke arasında çifte vergi anlaşması var mı?",
  },
  {
    categorySlug: 'vergi',
    title: 'Çocuklar için Kinderfreibetrag mi Kindergeld mi daha avantajlı?',
    body: 'Finanzamt bize vergi beyannamemizde Kinderfreibetrag uyguladı. Ama Kindergeld de alıyoruz. Hangisi daha avantajlı ve ikisini birden alabiliyor muyuz?',
  },

  // ── Almanca ───────────────────────────────────────────────────────────────
  {
    categorySlug: 'almanca',
    title: 'Almancayı günlük hayatta pratik yapmak için ne yapıyorsunuz?',
    body: 'Kurslardan sonra hayatta pratik yapmak çok zor geliyor. Sokakta konuşunca hemen İngilizceye geçiyorlar. Günlük pratik için neler yapıyorsunuz?',
  },
  {
    categorySlug: 'almanca',
    title: 'Almanca B2 sınavına hazırlanmak için ne kadar süre yeterli?',
    body: "A2 seviyesindeyim. B2'ye çıkmak kaç aylık çalışma gerektirir? Her gün ne kadar çalışmak lazım, sınavı zor mu?",
  },
  {
    categorySlug: 'almanca',
    title: 'Goethe, Telc veya ÖSD sınavlarından hangisini önerirsiniz?',
    body: 'Oturum için Almanca sertifikası lazım. Goethe enstitüsü mü yoksa Telc ya da ÖSD mi yaptırsam? Sınavların güçlük seviyesi arasında fark var mı?',
  },
  {
    categorySlug: 'almanca',
    title: 'Almanca kelime öğrenmek için en iyi uygulama hangisi?',
    body: 'Anki mi, Duolingo mu, başka bir şey mi? Hızlı kelime ezberlemek için ne kullanıyorsunuz? Duolingo çok kolay geliyor, işe yarar mı gerçekten?',
  },
  {
    categorySlug: 'almanca',
    title: 'Almanca podcast ve dizi önerir misiniz, başlangıç seviyesi için?',
    body: 'Almancamı geliştirmek için dizi veya podcast dinlemek istiyorum. A2/B1 seviyesi için çok hızlı konuşmayan, yavaş ve anlaşılır Almanca içerik var mı?',
  },
  {
    categorySlug: 'almanca',
    title: 'Volkshochschule Almanca kursu ne kadar sürüyor ve ücreti nedir?',
    body: 'VHS kursuna gitmek istiyorum. Genelde ne kadar sürüyor ve haftalık kaç gün? Fiyatlar şehre göre çok değişiyor mu, ortalama ne kadar ödeniyor?',
  },
  {
    categorySlug: 'almanca',
    title: 'Almanca öğrenirken yerli arkadaş edinmek neden bu kadar zor?',
    body: 'Almancamı geliştirmek için Sprachaustausch yapmak istiyorum. Tandemlerslerin uygulaması veya konuşma buluşmaları için başka yol var mı? Almanlara ulaşmak neden bu kadar zor geliyor?',
  },
  {
    categorySlug: 'almanca',
    title: 'İşyerinde mesleki Almanca nasıl öğrenilir, kurs var mı?',
    body: "Genel Almancam iyi ama işle ilgili teknik dil çok eksik. Mesleki Almanca kursu devlet destekli olarak yapılabiliyor mu? Bunun için Agentur für Arbeit'e mi başvurmam lazım?",
  },

  /* ── Ek sorular — havuzu genişletmek için (2026-07-16) ─────────────────── */

  // ── Resmi İşlemler (ek) ─────────────────────────────────────────────────
  {
    categorySlug: 'resmi-islemler',
    title: "Almanya'da adres değişikliğini kimlere bildirmem gerekiyor?",
    body: 'Ummeldung dışında kime haber vermem lazım taşınınca? Banka, sigorta, Finanzamt hepsine ayrı ayrı mı yazmalıyım yoksa otomatik güncelleniyor mu?',
  },
  {
    categorySlug: 'resmi-islemler',
    title: "Führerschein Türkiye'den Almanya'ya nasıl çevriliyor?",
    body: "Türk ehliyetim var, Almanya'da geçerli mi hala? Belirli bir süre sonra Alman ehliyetine çevirmek zorunlu mu, sınav gerekiyor mu?",
  },
  {
    categorySlug: 'resmi-islemler',
    title: 'Yeni doğan bebek için doğum kaydı nereye yapılıyor?',
    body: "Bebeğimiz burada doğdu. Standesamt'a mı gitmemiz lazım önce? Türk konsolosluğuna da bildirmemiz gerekiyor mu, süresi ne kadar?",
  },
  {
    categorySlug: 'resmi-islemler',
    title: "Alman IBAN'ı olmadan maaş alabilir miyim?",
    body: "İşe başlıyorum ama henüz banka hesabım yok. Türk banka hesabımın IBAN'ını verebilir miyim yoksa şart mı Alman hesabı?",
  },
  {
    categorySlug: 'resmi-islemler',
    title: 'Fiktionsbescheinigung ile yurt dışına çıkabilir miyim?',
    body: "Oturum kartım henüz gelmedi, Fiktionsbescheinigung ile geziyorum. Bu belgeyle Türkiye'ye gidip dönebilir miyim, sınırda sorun çıkar mı?",
  },
  {
    categorySlug: 'resmi-islemler',
    title: "Nüfus cüzdanımı kaybettim, Almanya'dan nasıl yeniletebilirim?",
    body: 'Türk nüfus cüzdanımı kaybettim. Konsolosluğa mı başvurmalıyım? Yenisi gelene kadar ne kullanmam lazım kimlik olarak?',
  },
  {
    categorySlug: 'resmi-islemler',
    title: 'Aile birleşimi vizesi için gelir şartı ne kadar?',
    body: "Eşimi Türkiye'den getirmek istiyorum, aile birleşimi başvurusu için ne kadar gelirim olmalı? Almanca bilmesi şart mı onun da?",
  },

  // ── Ev Bulma (ek) ─────────────────────────────────────────────────────────
  {
    categorySlug: 'ev-bulma',
    title: 'İlk ev başvurusunda Selbstauskunft nasıl doldurulur?',
    body: 'Ev başvurusu için Selbstauskunft formu isteniyor her yerde. İlk defa dolduracağım, hangi bilgileri detaylı vermem lazım, hangi kısımları boş bırakabilirim?',
  },
  {
    categorySlug: 'ev-bulma',
    title: 'Möbliert (eşyalı) daire kiralamak avantajlı mı?',
    body: 'Kısa süreliğine kalacağım, eşyalı daire mi bakmalıyım? Fiyat farkı çok mu oluyor boş daireye göre, sözleşme süresi de farklı mı?',
  },
  {
    categorySlug: 'ev-bulma',
    title: 'Ev sahibi kirayı her yıl artırabiliyor mu, sınırı var mı?',
    body: "Kira sözleşmemde artış maddesi var. Almanya'da kira artışının yasal bir sınırı var mı, ev sahibi istediği kadar artıramıyor değil mi?",
  },
  {
    categorySlug: 'ev-bulma',
    title: 'Taşınma şirketi (Umzugsfirma) tutmak mı, kendimiz mi taşınmalıyız?',
    body: 'Başka şehre taşınıyoruz, eşya çok. Umzugsfirma tutmak ne kadara geliyor ortalama? Kendimiz kiralık van ile taşımak daha mı mantıklı?',
  },
  {
    categorySlug: 'ev-bulma',
    title: 'Sosyal konut (Sozialwohnung) başvurusu nasıl yapılıyor?',
    body: 'Gelirim düşük, sosyal konuta uygun olabilirim diye düşünüyorum. WBS belgesi nereden alınıyor, başvuru süreci ne kadar sürüyor?',
  },
  {
    categorySlug: 'ev-bulma',
    title: 'Ev bakarken tuzağa düşmemek için nelere dikkat etmeliyim?',
    body: 'Online ilanlarda çok cazip fiyatlı daireler görüyorum ama şüpheli geliyor bazıları. Sahte ilanları nasıl ayırt edebilirim, para göndermeden önce nelere bakmalıyım?',
  },

  // ── İş Bulma (ek) ─────────────────────────────────────────────────────────
  {
    categorySlug: 'is-bulma',
    title: 'Zeugnis (referans mektubu) almadan işten çıkabilir miyim?',
    body: 'İşten ayrılıyorum, Arbeitszeugnis istemem gerekiyor mu yoksa otomatik veriyorlar mı? Bir sonraki işe başvururken bu şart mı?',
  },
  {
    categorySlug: 'is-bulma',
    title: 'Kısa çalışma ödeneği (Kurzarbeitergeld) nasıl işliyor?',
    body: "Şirket Kurzarbeit'e geçti, maaşımın bir kısmı kesiliyor. Bu ödenek otomatik mi geliyor, başvuru yapmam gerekiyor mu?",
  },
  {
    categorySlug: 'is-bulma',
    title: "LinkedIn üzerinden Almanya'da iş bulmak gerçekten işe yarıyor mu?",
    body: "Profilimi güncelledim, İK'lardan mesaj bekliyorum ama pek dönüş olmuyor. Almanya'da LinkedIn üzerinden iş bulanlar var mı, ne gibi taktikler kullandınız?",
  },
  {
    categorySlug: 'is-bulma',
    title: 'İşveren değiştirince oturum izni etkileniyor mu?',
    body: 'Mavi Kart ile çalışıyorum, başka bir şirketten teklif aldım. İşveren değişikliğinde oturuma bir şey olur mu, bildirmem gereken bir yer var mı?',
  },
  {
    categorySlug: 'is-bulma',
    title: 'Home office (uzaktan çalışma) için sözleşmede ne belirtilmeli?',
    body: 'İşveren tamamen home office öneriyor. Sözleşmede bunun net yazılması mı lazım, yoksa şirket politikası olarak mı bırakılıyor genelde?',
  },

  // ── Sağlık (ek) ────────────────────────────────────────────────────────────
  {
    categorySlug: 'saglik',
    title: 'Acil serviste Türkçe tercüman talep edebiliyor muyum?',
    body: 'Acile gittim, Almancam yetersizdi çok zorlandım. Hastanelerde tercüman hizmeti var mı, nasıl talep ediliyor?',
  },
  {
    categorySlug: 'saglik',
    title: 'Krankengeld ne zaman devreye giriyor, maaşımdan farkı ne?',
    body: '6 haftadan uzun raporluyum. İşveren maaş ödemeyi kesince Krankengeld başlıyor duydum, ne kadarını karşılıyor tam olarak?',
  },
  {
    categorySlug: 'saglik',
    title: "Almanya'da aşı takvimi Türkiye'den farklı mı?",
    body: "Çocuğumun aşılarını Türkiye'de yaptırmıştık, buraya geldik. Almanya'nın aşı takvimine göre eksik olan var mı kontrol ettirmem gerekiyor mu?",
  },
  {
    categorySlug: 'saglik',
    title: 'Özel sağlık sigortası (PKV) mı yasal sigorta mı daha mantıklı?',
    body: "Serbest çalışıyorum, PKV'ye geçmemi öneriyorlar. Yasal sigortadan (GKV) farkı ne, geri dönüşü var mı PKV'ye geçince?",
  },
  {
    categorySlug: 'saglik',
    title: 'Fizyoterapi için doktor sevki olmadan gidilebiliyor mu?',
    body: "Sırtım ağrıyor, direkt fizyoterapiste mi gitsem yoksa önce Hausarzt'tan sevk mi almam lazım? Sigorta sevksiz karşılamıyor mu?",
  },

  // ── Eğitim (ek) ──────────────────────────────────────────────────────────
  {
    categorySlug: 'egitim',
    title:
      "Almanya'da liseye geçiş yapan çocuk için hangi sınıfa yerleştiriliyor?",
    body: "Çocuğumuz 14 yaşında, Türkiye'de 8. sınıftaydı. Almanya'ya gelince hangi sınıfa/okul türüne yerleştiriliyor, Almanca bilmemesi sorun olur mu?",
  },
  {
    categorySlug: 'egitim',
    title: "Yüksek lisans için Almanya'da burs bulmak mümkün mü?",
    body: 'Master yapmak istiyorum, DAAD bursu duydum ama şartları karışık geldi. Türk öğrenciler için başka burs önerisi olan var mı?',
  },
  {
    categorySlug: 'egitim',
    title: "Denklik almadan Almanya'da öğretmenlik yapılabiliyor mu?",
    body: "Türkiye'de öğretmenim, Almanya'ya taşınıyoruz. Diplomamın denkliği olmadan hiç çalışamıyor muyum, yoksa özel okullarda şans var mı?",
  },
  {
    categorySlug: 'egitim',
    title: "Erasmus ile Almanya'ya gelen biri sonradan oturum alabiliyor mu?",
    body: "Erasmus değişim programıyla bir dönem Almanya'da okuyacağım. Bu süre bittiğinde tekrar normal öğrenci vizesine geçiş yapmak zor mu?",
  },

  // ── Hukuk (ek) ──────────────────────────────────────────────────────────
  {
    categorySlug: 'hukuk',
    title: 'Komşu şikayeti yüzünden ev sahibi tahliye edebilir mi?',
    body: 'Komşumla anlaşmazlığımız var, gürültü şikayeti etti. Bu yüzden ev sahibi beni tahliye edebilir mi, önce uyarı vermesi gerekmiyor mu?',
  },
  {
    categorySlug: 'hukuk',
    title: 'Online alışverişte iade hakkım ne kadar sürüyor?',
    body: 'Bir siteden ürün aldım, beğenmedim. Widerrufsrecht diye bir şey duydum, kaç gün içinde iade edebiliyorum ücretsiz olarak?',
  },
  {
    categorySlug: 'hukuk',
    title: 'Boşanma sürecinde çocuğun velayeti nasıl belirleniyor?',
    body: "Boşanma sürecindeyiz, bir çocuğumuz var. Almanya'da velayet genelde nasıl paylaştırılıyor, ortak velayet mi standart?",
  },
  {
    categorySlug: 'hukuk',
    title: 'Mietschuldenfreiheitsbescheinigung nedir, neden isteniyor?',
    body: 'Yeni ev başvurusunda eski ev sahibimden bu belgeyi istiyorlar. Eski ev sahibim vermek istemezse ne yapabilirim?',
  },

  // ── Vergi (ek) ──────────────────────────────────────────────────────────
  {
    categorySlug: 'vergi',
    title: 'Steuerberater tutmak ne kadara geliyor, gerekli mi?',
    body: 'Vergi işlerim biraz karışık, Steuerberater tutmayı düşünüyorum. Ortalama ücretleri nasıl, basit bir çalışan için gerekli mi gerçekten?',
  },
  {
    categorySlug: 'vergi',
    title: 'Kirche vergisi (Kirchensteuer) nasıl kaldırılıyor?',
    body: 'Maaşımdan Kirchensteuer kesiliyor, dini bir bağlılığım yok. Bunu nasıl iptal ettirebilirim, Kirchenaustritt için nereye gitmem lazım?',
  },
  {
    categorySlug: 'vergi',
    title:
      "Almanya'dan Türkiye'ye ev/araba göndermek gümrük vergisine tabi mi?",
    body: "Kesin dönüş yapıyorum, eşyalarımı Türkiye'ye göndereceğim. Gümrükte vergi ödemem gerekiyor mu, muafiyet var mı uzun süre yaşamış olanlara?",
  },
  {
    categorySlug: 'vergi',
    title: 'Werbungskosten olarak neler gösterilebiliyor?',
    body: 'Vergi beyannamesinde iş ile ilgili giderleri düşürebiliyormuşum. Ev-iş yol masrafı, laptop gibi şeyler dahil mi tam olarak neler sayılıyor?',
  },

  // ── Almanca (ek) ──────────────────────────────────────────────────────────
  {
    categorySlug: 'almanca',
    title: 'İş yerinde lehçe (Dialekt) anlamakta çok zorlanıyorum, normal mi?',
    body: "Standart Almanca öğrendim ama Bavyera'da işe başladım, kimseyi anlamıyorum ilk günlerde. Bu kadar zorlanmak normal mi, alışmak ne kadar sürer?",
  },
  {
    categorySlug: 'almanca',
    title: 'C1 seviyesine çıkmak gerçekten iş bulmada fark yaratıyor mu?',
    body: "B2'deyim, C1'e çıkmak için ekstra çalışmalı mıyım yoksa B2 çoğu iş için yeterli mi? Süre ve efor açısından değer mi gerçekten?",
  },
  {
    categorySlug: 'almanca',
    title: 'Çocuğuma evde hem Türkçe hem Almanca öğretmek karıştırır mı?',
    body: 'İki dilli büyütmek istiyoruz çocuğumuzu. Evde ikisini birden kullanmak kafasını karıştırır mı, yoksa erken yaşta iki dil öğrenmek avantaj mı?',
  },
];

/* ─────────────────────────────────────────────────────────────────────────────
   Bot persona e-posta adresleri — seed.ts ile senkronize
───────────────────────────────────────────────────────────────────────────── */
const BOT_EMAILS = [
  'bot-ayse@turkexpatlar.de',
  'bot-mehmet@turkexpatlar.de',
  'bot-selin@turkexpatlar.de',
  'bot-emre@turkexpatlar.de',
  'bot-fatma@turkexpatlar.de',
  'bot-kaan@turkexpatlar.de',
];

@Injectable()
export class ForumBotService {
  private readonly logger = new Logger(ForumBotService.name);

  constructor(private prisma: PrismaService) {}

  /** Bot kullanıcı ID'lerini önbelleğe al */
  private botUserIds: string[] | null = null;

  /** Dashboard için tüm havuzu ve kullanım durumunu döndür */
  async getDashboardData() {
    const botIds = await this.getBotUserIds();
    const lastUsedMap = await this.getTitleLastUsedMap(botIds);
    const categoryMap = await this.getCategoryMap();
    const recentWindowStart = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const usedRecently = (title: string) => {
      const d = lastUsedMap.get(title);
      return !!d && d.getTime() >= recentWindowStart;
    };

    const questions = QUESTION_POOL.map((q) => ({
      categorySlug: q.categorySlug,
      title: q.title,
      body: q.body,
      used: usedRecently(q.title),
    }));

    // Son 30 gün içinde botların açtığı konular
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentTopics = await this.prisma.forumTopic.findMany({
      where: {
        userId: { in: botIds },
        deletedAt: null,
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        title: true,
        createdAt: true,
        user: { select: { profile: { select: { displayName: true } } } },
        category: { select: { name: true } },
      },
    });

    const bots = await this.prisma.user.findMany({
      where: { email: { in: BOT_EMAILS }, deletedAt: null },
      select: {
        id: true,
        email: true,
        profile: { select: { displayName: true } },
        _count: { select: { forumTopics: true } },
      },
    });

    const schedule = [
      { utc: '06:30', de: '08:30' },
      { utc: '08:15', de: '10:15' },
      { utc: '10:45', de: '12:45' },
      { utc: '13:00', de: '15:00' },
      { utc: '15:30', de: '17:30' },
    ];

    return {
      totalQuestions: QUESTION_POOL.length,
      usedCount: questions.filter((q) => q.used).length,
      remainingCount: questions.filter((q) => !q.used).length,
      categories: [...new Set(QUESTION_POOL.map((q) => q.categorySlug))],
      questions,
      recentTopics,
      bots,
      schedule,
      categoryNames: Object.fromEntries(categoryMap.entries()),
    };
  }

  /** Manuel olarak hemen bir konu paylaş */
  async postNow(): Promise<{ title: string }> {
    const [botIds, categoryMap] = await Promise.all([
      this.getBotUserIds(),
      this.getCategoryMap(),
    ]);
    if (botIds.length === 0) throw new Error('Bot kullanıcıları bulunamadı');
    const lastUsedMap = await this.getTitleLastUsedMap(botIds);
    const picks = this.pickQuestions(1, lastUsedMap, categoryMap);
    if (picks.length === 0)
      throw new Error('Havuzda kategoriyle eşleşen soru bulunamadı');
    const q = picks[0];
    const totalPosted = await this.getTotalPostedCount(botIds);
    const botUserId = botIds[totalPosted % botIds.length];
    await this.postTopic(botUserId, q.categoryId, q.title, q.body);
    return { title: q.title };
  }

  private async getBotUserIds(): Promise<string[]> {
    if (this.botUserIds && this.botUserIds.length > 0) return this.botUserIds;
    const users = await this.prisma.user.findMany({
      where: { email: { in: BOT_EMAILS }, deletedAt: null },
      select: { id: true },
    });
    this.botUserIds = users.map((u) => u.id);
    return this.botUserIds;
  }

  /** Bot kullanıcıların paylaştığı tüm konuların toplam sayısı (rotasyon için) */
  private async getTotalPostedCount(botIds: string[]): Promise<number> {
    return this.prisma.forumTopic.count({
      where: { userId: { in: botIds }, deletedAt: null },
    });
  }

  /**
   * Havuzdaki her soru başlığı için en son ne zaman paylaşıldığını döndürür
   * (hiç paylaşılmamışsa map'te yok demektir). "Son 30 günde kullanılanları
   * tamamen ele" yaklaşımı, havuz küçükse botu tamamen susturuyordu; bunun
   * yerine en uzun süre önce kullanılmış (veya hiç kullanılmamış) sorular
   * öncelikli seçilir — havuz ne kadar küçük olursa olsun paylaşım hep sürer.
   */
  private async getTitleLastUsedMap(
    botIds: string[],
  ): Promise<Map<string, Date>> {
    const topics = await this.prisma.forumTopic.findMany({
      where: {
        userId: { in: botIds },
        deletedAt: null,
        title: { in: QUESTION_POOL.map((q) => q.title) },
      },
      select: { title: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    const map = new Map<string, Date>();
    for (const t of topics) map.set(t.title, t.createdAt); // son tekrar üzerine yazar (asc sıralama)
    return map;
  }

  /** Kategori slug'ı → ID map'ini döndür */
  private async getCategoryMap(): Promise<Map<string, string>> {
    const cats = await this.prisma.topicCategory.findMany({
      select: { id: true, slug: true },
    });
    return new Map(cats.map((c) => [c.slug, c.id]));
  }

  /**
   * En uzun süredir kullanılmamış (veya hiç kullanılmamış) sorulardan seç.
   * En eski/kullanılmamış olanlar arasından rastgelelik için biraz geniş bir
   * havuzdan (count * 4) karıştırarak seçiyoruz — böylece hep aynı sıra ile
   * tekrar etmiyor ama yakın zamanda kullanılanlar da atlanıyor.
   */
  private pickQuestions(
    count: number,
    lastUsedMap: Map<string, Date>,
    categoryMap: Map<string, string>,
  ): (BotQuestion & { categoryId: string })[] {
    const now = Date.now();
    const scored = QUESTION_POOL.filter((q) => categoryMap.has(q.categorySlug))
      .map((q) => {
        const lastUsed = lastUsedMap.get(q.title);
        const ageMs = lastUsed ? now - lastUsed.getTime() : Infinity;
        return { ...q, categoryId: categoryMap.get(q.categorySlug)!, ageMs };
      })
      .sort((a, b) => b.ageMs - a.ageMs);

    const candidatePool = scored.slice(0, Math.max(count * 4, 20));
    for (let i = candidatePool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidatePool[i], candidatePool[j]] = [
        candidatePool[j],
        candidatePool[i],
      ];
    }

    return candidatePool.slice(0, count);
  }

  /** Tek bir forum konusu oluştur */
  private async postTopic(
    userId: string,
    categoryId: string,
    title: string,
    body: string,
  ): Promise<void> {
    await this.prisma.forumTopic.create({
      data: {
        userId,
        categoryId,
        title,
        body,
        status: ForumTopicStatus.OPEN,
        isAnonymous: false,
      },
    });
    this.logger.log(`Forum konusu oluşturuldu: "${title.substring(0, 60)}"`);
  }

  /** Gün içinde rastgele 5 konu paylaş — saat 08:30 */
  @Cron('30 6 * * *') // UTC 06:30 = DE 08:30 (Yaz) / 07:30 (Kış)
  async postMorning() {
    await this.postOneTopic();
  }

  /** Gün içinde rastgele 5 konu paylaş — saat 10:15 */
  @Cron('15 8 * * *')
  async postMidMorning() {
    await this.postOneTopic();
  }

  /** Gün içinde rastgele 5 konu paylaş — saat 12:45 */
  @Cron('45 10 * * *')
  async postLunch() {
    await this.postOneTopic();
  }

  /** Gün içinde rastgele 5 konu paylaş — saat 15:00 */
  @Cron('0 13 * * *')
  async postAfternoon() {
    await this.postOneTopic();
  }

  /** Gün içinde rastgele 5 konu paylaş — saat 17:30 */
  @Cron('30 15 * * *')
  async postEvening() {
    await this.postOneTopic();
  }

  /** Tek konu paylaş — ortak metot */
  private async postOneTopic(): Promise<void> {
    try {
      const [botIds, categoryMap] = await Promise.all([
        this.getBotUserIds(),
        this.getCategoryMap(),
      ]);

      if (botIds.length === 0) {
        this.logger.warn('Bot kullanıcıları bulunamadı, seed çalıştırıldı mı?');
        return;
      }

      const [lastUsedMap, totalPosted] = await Promise.all([
        this.getTitleLastUsedMap(botIds),
        this.getTotalPostedCount(botIds),
      ]);
      const picks = this.pickQuestions(1, lastUsedMap, categoryMap);

      if (picks.length === 0) {
        this.logger.warn(
          'Havuzda kategoriyle eşleşen soru bulunamadı, kategoriler seed edildi mi?',
        );
        return;
      }

      const q = picks[0];
      // Rotasyon: kaçıncı bot paylaşım yapacak
      const botUserId = botIds[totalPosted % botIds.length];

      await this.postTopic(botUserId, q.categoryId, q.title, q.body);
    } catch (err) {
      this.logger.error('Forum bot hatası:', err);
    }
  }
}
