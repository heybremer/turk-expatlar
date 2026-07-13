import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ForumTopicStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ForumService } from '../forum/forum.service';

/* ─────────────────────────────────────────────────────────────────────────────
   Cevap havuzu — kategoriye ve konu başlığındaki anahtar kelimelere göre
   seçilen, kısa ve doğal (gerçek bir kullanıcı gibi) Türkçe forum cevapları.
   Bir kural eşleşmezse kategori genel cevaplarından (fallback), o da yoksa
   tamamen genel cevaplardan (GENERIC_FALLBACK) rastgele biri seçilir.
───────────────────────────────────────────────────────────────────────────── */

type ReplyRule = { keywords: string[]; replies: string[] };
type CategoryReplies = { rules: ReplyRule[]; fallback: string[] };

const REPLY_BANK: Record<string, CategoryReplies> = {
  'resmi-islemler': {
    rules: [
      {
        keywords: ['anmeldung', 'bürgeramt', 'randevu'],
        replies: [
          "Bürgeramt'ta randevu bulmak gerçekten zor, ben de haftalarca denedim. Sabah erken saatte siteyi kontrol edince bazı günler boş slot çıkabiliyor, denemeye devam et.",
          'Bende de aynı sorun oldu, sonunda erkenden gidip kapıda sıraya girdim ve o gün halloldu. Bazı Bürgeramtlar walk-in de kabul ediyor, arayıp sormakta fayda var.',
        ],
      },
      {
        keywords: ['aufenthaltserlaubnis', 'oturum', 'ausländerbehörde'],
        replies: [
          'Bir ay bekleme şu an normal sayılır, Ausländerbehörde her yerde çok yoğun. Ben de 6 hafta bekledim, telefonla arayınca da net bilgi vermediler açıkçası.',
          "Şehre göre çok değişiyor bu süre. Dilekçen kayıtlı olduğu sürece Almanya'da kalman sorun olmuyor, gerekirse Fiktionsbescheinigung isteyebilirsin.",
        ],
      },
      {
        keywords: ['mavi kart', 'blue card'],
        replies: [
          '2-3 ay hesap et, diploma denkliği (Anabin) süreci biraz uzayabiliyor. İşveren yardımcı olursa süreç epey hızlanıyor.',
        ],
      },
      {
        keywords: ['schufa'],
        replies: [
          "Yeni gelenlerde Schufa'nın düşük veya kayıtsız çıkması normal, geçmiş hareket olmadığı için öyle puanlıyor. Bankada hesabı düzenli kullanınca zamanla düzeliyor.",
        ],
      },
      {
        keywords: ['kindergeld'],
        replies: [
          'Çocuğun burada olması şart değil, Familienkasse bazı belgeler istiyor ama şimdiden başvurabilirsin diye biliyorum.',
        ],
      },
      {
        keywords: ['pasaport', 'konsolosluk'],
        replies: [
          'Konsolosluk randevuları erken alınıyor, bazen 1-2 ay öncesinden dolabiliyor. E-Randevu sistemine düzenli aralıklarla bakmak en iyisi.',
        ],
      },
      {
        keywords: ['schufa', 'anmeldung olmadan', 'banka hesabı'],
        replies: [
          'Bazı bankalar Anmeldung istemeden de hesap açıyor, N26 ve benzeri online bankalarla başlayanlar oluyor. Sonra normal bankaya geçebilirsin.',
        ],
      },
    ],
    fallback: [
      'Bu konuda net bir tecrübem yok ama resmi işlerde evrakları eksiksiz teslim edince süreç genelde daha hızlı ilerliyor.',
      'Ben de benzer bir şey yaşadım, en sağlıklısı ilgili daireyi arayıp direkt sormak, telefonla bazen daha çabuk netleşiyor.',
      "Şehre göre uygulamalar değişebiliyor, bulunduğun şehrin grubuna da sormanı öneririm.",
    ],
  },

  'ev-bulma': {
    rules: [
      {
        keywords: ['wg-gesucht', 'wg'],
        replies: [
          "WG-Gesucht dışında şehir bazlı Facebook gruplarına da bakabilirsin, bazı yerlerde oradan daha hızlı dönüş oluyor.",
        ],
      },
      {
        keywords: ['kaution', 'depozito'],
        replies: [
          '3 aylık kira depozito standart sayılır ama yasal zorunluluk değil. Kaution hesabı ile de ödeyebiliyorsun, bazı bankalar bu hizmeti veriyor.',
        ],
      },
      {
        keywords: ['schufa'],
        replies: [
          'Ev bakarken de Schufa isteniyor evet, yeni gelenler için ücretsiz Bonitätsauskunft alması biraz zor ama bazı siteler üzerinden çıkarabiliyorsun.',
        ],
      },
      {
        keywords: ['warmmiete', 'kaltmiete', 'nebenkosten'],
        replies: [
          'Kaltmiete sadece kira demek, Warmmiete ısıtma ve bazı giderleri de içeriyor. Nebenkosten ayrıca ayrı bir kalem olarak da geçebilir, ilana göre değişiyor.',
        ],
      },
      {
        keywords: ['evcil', 'kedi', 'köpek'],
        replies: [
          'Evcil hayvan bazı ev sahiplerini caydırıyor ama imkânsız değil, ilanda dürüstçe belirtip anlaşan ev sahipleri de var.',
        ],
      },
      {
        keywords: ['untervermietung', 'kiraya vermek'],
        replies: [
          'Ev sahibinden yazılı izin alman önemli, izinsiz alt kiraya verirsen sözleşmen feshedilebilir. Genelde yazılı talep edince makul sebep olmadan reddedemiyorlar.',
        ],
      },
    ],
    fallback: [
      'Ev bulma süreci gerçekten sabır istiyor, ben de aylarca aradım sonunda buldum.',
      'Bölgeye göre çok değişiyor, ama bazı semtlerde ilan çıkınca hemen başvurmak işe yarıyor.',
      'Emlakçı üzerinden de denemek mantıklı olabilir, direkt ev sahibiyle konuşmak da bazen daha hızlı sonuç veriyor.',
    ],
  },

  'is-bulma': {
    rules: [
      {
        keywords: ['cv', 'lebenslauf', 'fotoğraf'],
        replies: [
          "Lebenslauf'ta fotoğraf artık zorunlu değil ama hâlâ ekleyenler var, sektöre göre değişiyor. Ben eklemeden de görüşmeye çağrıldım.",
        ],
      },
      {
        keywords: ['almancam yok', 'ingilizce ile iş'],
        replies: [
          'IT gibi sektörlerde İngilizce ile iş bulunabiliyor, özellikle uluslararası şirketlerde. Ama Almanca bilmek her zaman ekstra avantaj sağlıyor.',
        ],
      },
      {
        keywords: ['denklik', 'diploma', 'anabin'],
        replies: [
          "Denklik süreci sektöre göre değişiyor, mühendislik için Anabin'e bakman lazım ama bazı işverenler denklik istemeden direkt işe alabiliyor.",
        ],
      },
      {
        keywords: ['minijob'],
        replies: [
          'Minijob sınırı güncellendi, aylık belirli bir tutarı geçmemen gerekiyor. Kaç saat çalışacağın buna göre değişir, işverenle netleştirmek en iyisi.',
        ],
      },
      {
        keywords: ['probezeit'],
        replies: [
          "Probezeit'te işveren kısa ihbar süresiyle çıkarabiliyor, kıdem tazminatı gibi bir sistem Almanya'da genel olarak yok zaten.",
        ],
      },
      {
        keywords: ['freiberufler', 'gewerbe', 'serbest çalışmak'],
        replies: [
          "Tasarım gibi serbest meslekler genelde Freiberufler sayılıyor, Finanzamt'a bildirim yeterli oluyor. Gewerbe daha çok ticari işler için gerekiyor.",
        ],
      },
    ],
    fallback: [
      'İş arama biraz zaman alabiliyor ama networking gerçekten fark yaratıyor, profilini aktif tutmakta fayda var.',
      'Sektöre göre çok değişiyor, hangi alanda çalıştığını yazarsan daha net yorum yapılabilir.',
      'Ben de ilk başta zorlandım ama birkaç ay içinde yoluna girdi, moralini bozma.',
    ],
  },

  saglik: {
    rules: [
      {
        keywords: ['aok', 'techniker', 'krankenkasse'],
        replies: [
          'AOK ile TK arasında büyük fark yok aslında, ikisi de yasal sigorta. Ek hizmetlerde küçük farklar olabiliyor, sitelerinden karşılaştırabilirsin.',
        ],
      },
      {
        keywords: ['hausarzt', 'aile hekimi', 'acile'],
        replies: [
          "Evet burada önce Hausarzt'a gidiliyor genelde, acil durum değilse direkt hastaneye gitmek pek tercih edilmiyor. Hausarzt gerekirse uzmana sevk ediyor.",
        ],
      },
      {
        keywords: ['türkçe konuşan doktor', 'türkçe doktor'],
        replies: [
          "Jameda sitesinde dil filtresi var, Türkçe seçince listeleniyor. Şehir bazlı Türk gruplarında da çoğu zaman sorulur, oradan öneri alabilirsin.",
        ],
      },
      {
        keywords: ['diş', 'zahnarzt'],
        replies: [
          'Diş tedavilerinde sigorta genelde temel kısmı karşılıyor, estetik ya da kalıcı dolgu gibi şeyler cepten çıkabiliyor. Zusatzversicherung gerçekten mantıklı bir yatırım.',
        ],
      },
      {
        keywords: ['psikolog', 'psycholog'],
        replies: [
          'Bekleme süreleri gerçekten uzun olabiliyor, ben de aylarca bekledim. Privatpraxis deneyip sonra kısmi geri ödeme almayı da düşünebilirsin.',
        ],
      },
      {
        keywords: ['göz', 'gözlük', 'augenarzt'],
        replies: [
          'Göz muayenesi genelde karşılanıyor ama gözlük için sınırlı bir katkı var, tamamını nadiren ödüyorlar. Augenarzt yerine önce Optiker de yeterli olabiliyor bazı durumlarda.',
        ],
      },
    ],
    fallback: [
      "Sağlık sistemi ilk başta biraz karışık geliyor ama alışınca oturuyor. Bir Hausarzt bulman işleri kolaylaştırıyor.",
      "Bu konuda net değilim ama Krankenkasse'yi arayıp direkt sormak en sağlıklısı, çoğu artık Türkçe de destek veriyor.",
    ],
  },

  egitim: {
    rules: [
      {
        keywords: ['uni-assist', 'üniversite başvuru'],
        replies: [
          "Uni-Assist bazı üniversiteler için zorunlu, hepsi için değil. Başvuracağın üniversitenin sitesinde direkt mi yoksa Uni-Assist üzerinden mi aldığı yazıyor.",
        ],
      },
      {
        keywords: ['bafög'],
        replies: [
          'BAföG yabancı öğrencilere de belirli oturum türleriyle veriliyor ama şartlar biraz karışık. Studentenwerk ile görüşmen en netini verir.',
        ],
      },
      {
        keywords: ['testdaf', 'dsh'],
        replies: [
          'TestDaF daha standart ve her yerde geçerli, DSH ise üniversitenin kendi sınavı olabiliyor. Başvuracağın üniversite hangisini istiyor ona bakman lazım.',
        ],
      },
      {
        keywords: ['studienkolleg'],
        replies: [
          'Türk lisesi mezunları için genelde zorunlu olmuyor ama liseye göre değişebiliyor, üniversitenin uluslararası ofisine sormak en sağlamı.',
        ],
      },
      {
        keywords: ['kita'],
        replies: [
          'Kita bekleme listeleri gerçekten uzun olabiliyor, doğar doğmaz kaydolmak öneriliyor. Birden fazla Kita ye başvurmak şansını artırıyor.',
        ],
      },
      {
        keywords: ['volkshochschule', 'vhs', 'almanca kurs'],
        replies: [
          'VHS kursları hem uygun fiyatlı hem kaliteli, ben de öyle başladım. Çalışırken akşam kursları da var, saatleri şehre göre değişiyor.',
        ],
      },
    ],
    fallback: [
      'Eğitim sistemi ilk başta karmaşık geliyor ama üniversitenin uluslararası ofisi genelde yardımcı oluyor bu konularda.',
      'Bu konuda net değilim, benzer durumda olan biri yazarsa güzel olur.',
    ],
  },

  hukuk: {
    rules: [
      {
        keywords: ['fazla mesai', 'arbeitsgericht', 'çalışma saati'],
        replies: [
          "Fazla çalıştırılman durumunda saatlerini not tutman iyi olur. Arbeitsgericht'e gitmeden önce bir iş hukuku danışmanına sorman faydalı, ilk görüşme genelde uygun fiyatlı oluyor.",
        ],
      },
      {
        keywords: ['depozito', 'kaution iade', 'kaution'],
        replies: [
          "Ev sahibi eksik olduğunu söylüyorsa yazılı olarak neyin eksik olduğunu istemen hakkın. Gerekçesiz uzun süre tutması doğru değil, Mieterverein üyeliği bu gibi durumlarda gerçekten işe yarıyor.",
        ],
      },
      {
        keywords: ['vatandaşlık', 'staatsbürgerschaft'],
        replies: [
          'Yeni yasayla süre kısaldı, artık 5 yıl genelde yeterli, entegrasyon iyiyse 3 yıla da inebiliyor. Çifte vatandaşlık da artık mümkün ama şehre göre işlem süresi değişebiliyor.',
        ],
      },
      {
        keywords: ['sözleşme', 'imzalamadan'],
        replies: [
          'Almanca sözleşmeyi imzalamadan önce anlamadığın yerleri sorman normal, işveren de bunu bekliyor genelde. Bazı sendikalar üyelere ücretsiz sözleşme incelemesi de yapıyor.',
        ],
      },
      {
        keywords: ['trafik kazası', 'kaza'],
        replies: [
          'Kaza sonrası ilk iş polis çağırmak ve karşı tarafın sigorta bilgisini almak, kusur net değilse özellikle polis tutanağı önemli oluyor.',
        ],
      },
      {
        keywords: ['işsizlik parası', 'arbeitslosengeld', 'sperrzeit'],
        replies: [
          'Kendin istifa edersen genelde Sperrzeit uygulanıyor, yani bir süre ödeme başlamıyor. İşten çıkarıldıysan bu durum genelde geçerli değil.',
        ],
      },
    ],
    fallback: [
      'Hukuki konularda kesin bilgi vermek istemem ama benzer durumda bir avukata sormak en sağlıklısı, ilk danışma genelde uygun fiyatlı.',
      'Bu konuda deneyimim yok ama Mieterverein veya ilgili sendika bu tür durumlarda gerçekten yardımcı oluyor.',
    ],
  },

  vergi: {
    rules: [
      {
        keywords: ['beyanname', 'steuererklärung', 'zorunlu mu'],
        replies: [
          'Çalışan biri olarak genelde zorunlu değil ama verirsen çoğu zaman para geri alıyorsun, o yüzden hemen herkes veriyor açıkçası.',
        ],
      },
      {
        keywords: ['steuerklasse'],
        replies: [
          'Evlilikte 3/5 kombinasyonu, yüksek maaşlı olan 3 alırsa toplam net genelde daha avantajlı çıkıyor. Finanzamt’a dilekçeyle değiştirilebiliyor.',
        ],
      },
      {
        keywords: ['elster'],
        replies: [
          'ELSTER ilk defa gerçekten karışık geliyor, ben de öyle hissetmiştim. Basit uygulamalar da var, ya da bir Steuerberater a bir seferlik danışmak da mantıklı.',
        ],
      },
      {
        keywords: ['kleinunternehmer', 'umsatzsteuer', 'kdv'],
        replies: [
          'Kleinunternehmer sınırını aşmadıkça KDV bildirmene gerek yok, sınırı aşınca geçiş otomatik oluyor. Finanzamt a başvururken bu statüyü seçmen gerekiyor.',
        ],
      },
      {
        keywords: ['kinderfreibetrag'],
        replies: [
          'Finanzamt yıl sonunda ikisini kıyaslayıp hangisi avantajlıysa onu uyguluyor otomatik olarak, ayrıca bir şey yapmana gerek yok genelde.',
        ],
      },
    ],
    fallback: [
      'Vergi konuları gerçekten karışık, bir Steuerberater’a danışmak uzun vadede paranı da kurtarıyor bence.',
      'Bu konuda net değilim, ELSTER’daki destek hattını da deneyebilirsin bazı sorular için.',
    ],
  },

  almanca: {
    rules: [
      {
        keywords: ['pratik', 'konuşma'],
        replies: [
          'Tandem uygulamaları gerçekten işe yarıyor, yerel biriyle haftada bir buluşmak bile fark yaratıyor.',
        ],
      },
      {
        keywords: ['b2', 'sınav'],
        replies: [
          "A2'den B2'ye günde bir saat düzenli çalışarak 6-8 ay gibi bir süre makul, yoğunluğa göre değişir. Sınav zor değil ama pratik önemli.",
        ],
      },
      {
        keywords: ['goethe', 'telc', 'ösd'],
        replies: [
          'Üçü de resmi olarak kabul ediliyor genelde, hangi kurum istiyorsa onu seç. Telc biraz daha yaygın ve uygun fiyatlı genelde.',
        ],
      },
      {
        keywords: ['duolingo', 'anki', 'uygulama'],
        replies: [
          'Duolingo başlangıç için iyi ama tek başına yetmiyor, kelime kartı uygulamalarıyla desteklemek daha kalıcı oluyor bence.',
        ],
      },
      {
        keywords: ['dizi', 'podcast'],
        replies: [
          'Extra Deutsch dizisi başlangıç için harika, yavaş ve anlaşılır. Yavaş konuşulan Almanca podcastler de gerçekten yardımcı oluyor.',
        ],
      },
      {
        keywords: ['tandem', 'sprachaustausch', 'yerli arkadaş'],
        replies: [
          'Yerli arkadaş edinmek gerçekten zaman alıyor, dil değişim uygulamaları ya da konuşma buluşmaları iyi bir başlangıç oluyor.',
        ],
      },
    ],
    fallback: [
      'Almanca öğrenmek zaman istiyor, düzenli pratik en önemlisi bence. Sabırlı ol, zamanla oturuyor.',
      'Bu konuda tam bilgim yok ama düzenli kurs ve pratik kombinasyonu genelde işe yarıyor.',
    ],
  },
};

const GENERIC_FALLBACK: string[] = [
  'İlginç bir konu, ben de merak ettim açıkçası. Bilen biri yazarsa güzel olur.',
  'Bu konuda tecrübem yok ama gündeme gelmesi iyi oldu, takipteyim.',
  'Net bir cevabım yok ama benzer durumda olan biri varsa yorum bırakır umarım.',
];

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Konu kategorisine ve başlık/gövdedeki anahtar kelimelere göre en uygun cevabı seç */
function pickReply(
  categorySlug: string | undefined,
  title: string,
  body: string,
): string {
  const text = `${title} ${body}`.toLowerCase();
  const category = categorySlug ? REPLY_BANK[categorySlug] : undefined;
  if (!category) return randomFrom(GENERIC_FALLBACK);

  for (const rule of category.rules) {
    if (rule.keywords.some((k) => text.includes(k))) {
      return randomFrom(rule.replies);
    }
  }
  return randomFrom(category.fallback);
}

/* ─────────────────────────────────────────────────────────────────────────────
   OpenAI entegrasyonu — OPENAI_API_KEY tanımlıysa cevap gerçek AI ile üretilir.
   Anahtar yoksa veya istek başarısız olursa yukarıdaki sabit cevap bankasına
   (REPLY_BANK) sessizce düşülür; bot hiçbir zaman cevapsız kalmaz.
───────────────────────────────────────────────────────────────────────────── */

const AI_SYSTEM_PROMPT = `Sen Almanya'da 10 yıldan uzun süredir yaşayan, deneyimli bir Türk gurbetçisisin. Bir Türk gurbetçi forumunda gerçek bir üye gibi yorum yapıyorsun.

Kurallar:
- Türkçe yaz, kısa ve doğal ol (1-3 cümle, en fazla ~350 karakter).
- Samimi ve gündelik bir forum dili kullan; resmi, robotik, madde işaretli ya da başlıklı yazma.
- Konuyla doğrudan ilgili, gerçekten faydalı bir cevap ver; boş, genel geçer cümlelerle doldurma.
- Kesin hukuki, tıbbi veya vergi tavsiyesi verir gibi görünme; kendi tecrübeni paylaşır gibi konuş, gerekirse "bir uzmana/derneğe sorman iyi olur" gibi hafif bir not ekle.
- Emoji kullanma, aşırı noktalama işareti kullanma.
- Sadece cevap metnini yaz; tırnak işareti, "Cevap:" gibi ekler veya selamlama/imza koyma.`;

/** OpenAI Chat Completions API'sini çağırıp kısa bir forum cevabı üret */
async function generateAiReply(
  title: string,
  body: string,
  categoryName: string | undefined,
  logger: Logger,
): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
  const userPrompt = `Forum kategorisi: ${categoryName ?? 'Genel'}\nKonu başlığı: ${title}\nKonu içeriği: ${body}\n\nBu konuya kısa bir forum cevabı yaz.`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: AI_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 180,
        temperature: 0.9,
        presence_penalty: 0.3,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      logger.warn(
        `OpenAI isteği başarısız (${res.status}), sabit cevap bankasına düşülüyor: ${errText.slice(0, 200)}`,
      );
      return null;
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = data.choices?.[0]?.message?.content;
    if (typeof raw !== 'string') return null;

    const cleaned = raw.trim().replace(/^["'“”]+|["'“”]+$/g, '');
    if (cleaned.length < 5) return null;
    return cleaned.slice(0, 600);
  } catch (err) {
    logger.warn(`OpenAI çağrısı hata verdi, sabit cevap bankasına düşülüyor: ${String(err)}`);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   Cevap botu — konu açmaz, açık kalan konulara doğal, kısa cevap yazar.
   seed.ts'teki 'bot-derya@turkexpatlar.de' hesabı ile senkron olmalı.
───────────────────────────────────────────────────────────────────────────── */
const REPLY_BOT_EMAIL = 'bot-derya@turkexpatlar.de';

@Injectable()
export class ForumReplyBotService {
  private readonly logger = new Logger(ForumReplyBotService.name);
  private botUserId: string | null = null;

  constructor(
    private prisma: PrismaService,
    private forumService: ForumService,
  ) {}

  private async getBotUserId(): Promise<string | null> {
    if (this.botUserId) return this.botUserId;
    const user = await this.prisma.user.findUnique({
      where: { email: REPLY_BOT_EMAIL },
      select: { id: true },
    });
    this.botUserId = user?.id ?? null;
    return this.botUserId;
  }

  /** Henüz bu bot tarafından cevaplanmamış, en eski açık konuyu bul */
  private async findTopicToAnswer(botUserId: string) {
    const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    return this.prisma.forumTopic.findFirst({
      where: {
        deletedAt: null,
        userId: { not: botUserId },
        status: { not: ForumTopicStatus.SOLVED },
        createdAt: { gte: since },
        replies: { none: { userId: botUserId, deletedAt: null } },
      },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        title: true,
        body: true,
        category: { select: { slug: true, name: true } },
      },
    });
  }

  /** AI varsa AI cevabı, yoksa/başarısızsa sabit cevap bankasından seç */
  private async resolveReply(topic: {
    title: string;
    body: string;
    category: { slug: string; name: string } | null;
  }): Promise<{ reply: string; aiUsed: boolean }> {
    const aiReply = await generateAiReply(
      topic.title,
      topic.body,
      topic.category?.name,
      this.logger,
    );
    const reply = aiReply ?? pickReply(topic.category?.slug, topic.title, topic.body);
    return { reply, aiUsed: aiReply !== null };
  }

  /** Manuel tetikleme (admin) — hemen bir konuya cevap yaz */
  async replyNow(): Promise<{ topicTitle: string; reply: string; aiUsed: boolean }> {
    const botUserId = await this.getBotUserId();
    if (!botUserId) throw new Error('Cevap botu kullanıcısı bulunamadı');

    const topic = await this.findTopicToAnswer(botUserId);
    if (!topic) throw new Error('Cevaplanacak uygun konu bulunamadı');

    const { reply, aiUsed } = await this.resolveReply(topic);
    await this.forumService.createReply(topic.id, botUserId, { body: reply });
    return { topicTitle: topic.title, reply, aiUsed };
  }

  /** Kaç adet açık/cevaplanmamış konu bekliyor (admin dashboard için) */
  async getDashboardData() {
    const botUserId = await this.getBotUserId();
    if (!botUserId) {
      return { botFound: false };
    }
    const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const pendingCount = await this.prisma.forumTopic.count({
      where: {
        deletedAt: null,
        userId: { not: botUserId },
        status: { not: ForumTopicStatus.SOLVED },
        createdAt: { gte: since },
        replies: { none: { userId: botUserId, deletedAt: null } },
      },
    });
    const totalReplies = await this.prisma.forumReply.count({
      where: { userId: botUserId, deletedAt: null },
    });
    const recentReplies = await this.prisma.forumReply.findMany({
      where: { userId: botUserId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        body: true,
        createdAt: true,
        topic: { select: { id: true, title: true } },
      },
    });
    return { botFound: true, pendingCount, totalReplies, recentReplies };
  }

  /** Ortak metot — bir konuyu bulup cevap yaz, hataları yut (cron için) */
  private async replyToOneTopic(): Promise<void> {
    try {
      const botUserId = await this.getBotUserId();
      if (!botUserId) {
        this.logger.warn('Cevap botu kullanıcısı bulunamadı, seed çalıştırıldı mı?');
        return;
      }

      const topic = await this.findTopicToAnswer(botUserId);
      if (!topic) {
        this.logger.log('Cevaplanacak uygun konu yok, bekleniyor.');
        return;
      }

      const { reply, aiUsed } = await this.resolveReply(topic);
      await this.forumService.createReply(topic.id, botUserId, { body: reply });
      this.logger.log(
        `Forum cevabı yazıldı${aiUsed ? ' (AI)' : ' (sabit havuz)'}: "${topic.title.substring(0, 60)}"`,
      );
    } catch (err) {
      this.logger.error('Forum cevap botu hatası:', err);
    }
  }

  // Konu açma botunun paylaşım saatlerinden ~25-40 dk sonra + gün içine
  // yayılmış birkaç ek saat — toplamda günde 9 cevap, tek bot için doğal bir sıklık.
  @Cron('58 6 * * *') async replyAfterMorning() { await this.replyToOneTopic(); }
  @Cron('50 8 * * *') async replyAfterMidMorning() { await this.replyToOneTopic(); }
  @Cron('40 9 * * *') async replyMidMorningExtra() { await this.replyToOneTopic(); }
  @Cron('20 11 * * *') async replyAfterLunch() { await this.replyToOneTopic(); }
  @Cron('10 12 * * *') async replyNoonExtra() { await this.replyToOneTopic(); }
  @Cron('35 13 * * *') async replyAfterAfternoon() { await this.replyToOneTopic(); }
  @Cron('5 16 * * *') async replyAfterEvening() { await this.replyToOneTopic(); }
  @Cron('30 18 * * *') async replyEveningExtra() { await this.replyToOneTopic(); }
  @Cron('45 20 * * *') async replyNightExtra() { await this.replyToOneTopic(); }
}
