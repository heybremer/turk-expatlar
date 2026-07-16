import {
  PrismaClient,
  UserRole,
  ForumTopicStatus,
  EventStatus,
  PriceType,
  BusinessStatus,
  MembershipPlan,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const STATES = [
  {
    name: 'Baden-Württemberg', nameDe: 'Baden-Württemberg', slug: 'baden-wuerttemberg',
    cities: ['Stuttgart', 'Mannheim', 'Karlsruhe', 'Freiburg im Breisgau', 'Heidelberg', 'Heilbronn', 'Ulm', 'Pforzheim', 'Reutlingen', 'Tübingen', 'Sindelfingen', 'Villingen-Schwenningen', 'Konstanz', 'Ludwigsburg', 'Esslingen am Neckar', 'Offenburg', 'Göppingen', 'Aalen', 'Ravensburg', 'Friedrichshafen'],
  },
  {
    name: 'Bayern', nameDe: 'Bayern', slug: 'bayern',
    cities: ['München', 'Nürnberg', 'Augsburg', 'Regensburg', 'Ingolstadt', 'Würzburg', 'Fürth', 'Erlangen', 'Bayreuth', 'Bamberg', 'Landshut', 'Rosenheim', 'Kempten', 'Neu-Ulm', 'Aschaffenburg', 'Schweinfurt', 'Kaufbeuren', 'Memmingen', 'Passau', 'Ansbach'],
  },
  {
    name: 'Berlin', nameDe: 'Berlin', slug: 'berlin',
    cities: ['Berlin', 'Mitte', 'Friedrichshain-Kreuzberg', 'Pankow', 'Charlottenburg-Wilmersdorf', 'Spandau', 'Steglitz-Zehlendorf', 'Tempelhof-Schöneberg', 'Neukölln', 'Treptow-Köpenick', 'Marzahn-Hellersdorf', 'Lichtenberg', 'Reinickendorf'],
  },
  {
    name: 'Brandenburg', nameDe: 'Brandenburg', slug: 'brandenburg',
    cities: ['Potsdam', 'Cottbus', 'Brandenburg an der Havel', 'Frankfurt (Oder)', 'Oranienburg', 'Eberswalde', 'Falkensee', 'Königs Wusterhausen', 'Wildau', 'Ludwigsfelde', 'Strausberg', 'Bernau bei Berlin', 'Neuruppin'],
  },
  {
    name: 'Bremen', nameDe: 'Bremen', slug: 'bremen',
    cities: ['Bremen', 'Bremerhaven'],
  },
  {
    name: 'Hamburg', nameDe: 'Hamburg', slug: 'hamburg',
    cities: ['Hamburg', 'Altona', 'Bergedorf', 'Eimsbüttel', 'Harburg', 'Hamburg-Mitte', 'Hamburg-Nord', 'Wandsbek'],
  },
  {
    name: 'Hessen', nameDe: 'Hessen', slug: 'hessen',
    cities: ['Frankfurt am Main', 'Frankfurt', 'Wiesbaden', 'Kassel', 'Darmstadt', 'Offenbach am Main', 'Hanau', 'Marburg', 'Gießen', 'Fulda', 'Wetzlar', 'Rüsselsheim', 'Dreieich', 'Langen', 'Bensheim', 'Viernheim', 'Friedberg', 'Bad Homburg', 'Oberursel', 'Limburg'],
  },
  {
    name: 'Mecklenburg-Vorpommern', nameDe: 'Mecklenburg-Vorpommern', slug: 'mecklenburg-vorpommern',
    cities: ['Rostock', 'Schwerin', 'Neubrandenburg', 'Stralsund', 'Greifswald', 'Wismar', 'Güstrow', 'Waren', 'Neustrelitz'],
  },
  {
    name: 'Niedersachsen', nameDe: 'Niedersachsen', slug: 'niedersachsen',
    cities: ['Hannover', 'Braunschweig', 'Osnabrück', 'Oldenburg', 'Wolfsburg', 'Göttingen', 'Salzgitter', 'Hildesheim', 'Delmenhorst', 'Wilhelmshaven', 'Lüneburg', 'Wolfenbüttel', 'Celle', 'Achim', 'Hameln', 'Lingen', 'Stade', 'Cuxhaven', 'Langenhagen', 'Garbsen', 'Peine', 'Goslar', 'Northeim', 'Holzminden', 'Nienburg', 'Verden', 'Buxtehude', 'Papenburg'],
  },
  {
    name: 'Nordrhein-Westfalen', nameDe: 'Nordrhein-Westfalen', slug: 'nordrhein-westfalen',
    cities: ['Köln', 'Düsseldorf', 'Dortmund', 'Essen', 'Duisburg', 'Bochum', 'Wuppertal', 'Bielefeld', 'Bonn', 'Münster', 'Gelsenkirchen', 'Mönchengladbach', 'Aachen', 'Krefeld', 'Oberhausen', 'Hagen', 'Hamm', 'Leverkusen', 'Solingen', 'Neuss', 'Paderborn', 'Mülheim an der Ruhr', 'Siegen', 'Herne', 'Bottrop', 'Remscheid', 'Bergisch Gladbach', 'Recklinghausen', 'Witten', 'Moers'],
  },
  {
    name: 'Rheinland-Pfalz', nameDe: 'Rheinland-Pfalz', slug: 'rheinland-pfalz',
    cities: ['Mainz', 'Ludwigshafen am Rhein', 'Ludwigshafen', 'Koblenz', 'Trier', 'Kaiserslautern', 'Worms', 'Neustadt an der Weinstraße', 'Bad Kreuznach', 'Pirmasens', 'Landau', 'Frankenthal', 'Speyer'],
  },
  {
    name: 'Saarland', nameDe: 'Saarland', slug: 'saarland',
    cities: ['Saarbrücken', 'Neunkirchen', 'Homburg', 'Völklingen', 'Saarlouis', 'St. Ingbert', 'Merzig', 'St. Wendel'],
  },
  {
    name: 'Sachsen', nameDe: 'Sachsen', slug: 'sachsen',
    cities: ['Dresden', 'Leipzig', 'Chemnitz', 'Zwickau', 'Plauen', 'Görlitz', 'Freiberg', 'Hoyerswerda', 'Bautzen', 'Pirna', 'Meißen', 'Riesa'],
  },
  {
    name: 'Sachsen-Anhalt', nameDe: 'Sachsen-Anhalt', slug: 'sachsen-anhalt',
    cities: ['Magdeburg', 'Halle (Saale)', 'Halle', 'Dessau-Roßlau', 'Wittenberg', 'Merseburg', 'Stendal', 'Halberstadt', 'Bernburg', 'Bitterfeld-Wolfen'],
  },
  {
    name: 'Schleswig-Holstein', nameDe: 'Schleswig-Holstein', slug: 'schleswig-holstein',
    cities: ['Kiel', 'Lübeck', 'Flensburg', 'Neumünster', 'Norderstedt', 'Elmshorn', 'Pinneberg', 'Itzehoe', 'Heide', 'Husum', 'Schleswig', 'Wedel', 'Ahrensburg', 'Reinbek'],
  },
  {
    name: 'Thüringen', nameDe: 'Thüringen', slug: 'thueringen',
    cities: ['Erfurt', 'Jena', 'Gera', 'Weimar', 'Gotha', 'Nordhausen', 'Suhl', 'Eisenach', 'Mühlhausen', 'Altenburg'],
  },
];

const CATEGORIES = [
  { name: 'Resmi İşlemler', slug: 'resmi-islemler', description: 'Anmeldung, oturum, vize' },
  { name: 'Ev Bulma', slug: 'ev-bulma', description: 'Kira, oda, semt önerileri' },
  { name: 'İş Bulma', slug: 'is-bulma', description: 'İş arama, CV, mülakat' },
  { name: 'Sağlık', slug: 'saglik', description: 'Krankenkasse, doktor, sigorta' },
  { name: 'Eğitim', slug: 'egitim', description: 'Üniversite, Ausbildung, kurs' },
  { name: 'Hukuk', slug: 'hukuk', description: 'Hukuki sorular ve süreçler' },
  { name: 'Vergi', slug: 'vergi', description: 'Steuer, vergi numarası' },
  { name: 'Almanca', slug: 'almanca', description: 'Dil öğrenme ve pratik' },
];

const BUSINESS_CATEGORIES = [
  { name: 'Doktor', slug: 'doktor' },
  { name: 'Diş Hekimi', slug: 'dis-hekimi' },
  { name: 'Avukat', slug: 'avukat' },
  { name: 'Steuerberater', slug: 'steuerberater' },
  { name: 'Tercüman', slug: 'tercuman' },
  { name: 'Nakliye', slug: 'nakliye' },
  { name: 'Elektrikçi', slug: 'elektrikci' },
  { name: 'Restoran', slug: 'restoran' },
  { name: 'Market', slug: 'market' },
  { name: 'Kuaför', slug: 'kuafor' },
];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function main() {
  console.log('Seeding database...');

  // Temizlik: önceki seed'de yanlış eyalete eklenen şehirleri kaldır
  // (Bremen eyaletine yanlışlıkla Achim, Stuhr vb. Niedersachsen şehirleri eklenmişti)
  const bremenState = await prisma.federalState.findUnique({ where: { slug: 'bremen' } });
  if (bremenState) {
    const wrongInBremen = ['achim', 'stuhr', 'weyhe', 'syke', 'bassum', 'delmenhorst'];
    for (const slug of wrongInBremen) {
      const wrongCity = await prisma.city.findFirst({
        where: { stateId: bremenState.id, slug },
      });
      if (wrongCity) {
        // İlgili referansları null'la (chat, business vs.)
        await prisma.chat.deleteMany({ where: { cityId: wrongCity.id } });
        await prisma.profile.updateMany({ where: { cityId: wrongCity.id }, data: { cityId: null } });
        await prisma.city.delete({ where: { id: wrongCity.id } }).catch(() => {
          console.warn(`Şehir silinemedi (referans var): ${slug}`);
        });
      }
    }
  }

  for (const state of STATES) {
    const createdState = await prisma.federalState.upsert({
      where: { slug: state.slug },
      update: {},
      create: {
        name: state.name,
        nameDe: state.nameDe,
        slug: state.slug,
      },
    });

    for (const cityName of state.cities) {
      await prisma.city.upsert({
        where: {
          stateId_slug: {
            stateId: createdState.id,
            slug: slugify(cityName),
          },
        },
        update: {},
        create: {
          stateId: createdState.id,
          name: cityName,
          slug: slugify(cityName),
        },
      });
    }
  }

  for (const [i, cat] of CATEGORIES.entries()) {
    await prisma.topicCategory.upsert({
      where: { slug: cat.slug },
      update: {},
      create: { ...cat, sortOrder: i },
    });
  }

  for (const [i, cat] of BUSINESS_CATEGORIES.entries()) {
    await prisma.businessCategory.upsert({
      where: { slug: cat.slug },
      update: {},
      create: { ...cat, sortOrder: i },
    });
  }

  const berlin = await prisma.federalState.findUnique({ where: { slug: 'berlin' } });
  const berlinCity = berlin
    ? await prisma.city.findFirst({ where: { stateId: berlin.id, slug: 'berlin' } })
    : null;
  const koeln = await prisma.city.findFirst({
    where: { slug: 'koeln', state: { slug: 'nordrhein-westfalen' } },
    include: { state: true },
  });

  const passwordHash = await bcrypt.hash('demo1234', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@turkexpatlar.de' },
    update: {},
    create: {
      email: 'admin@turkexpatlar.de',
      passwordHash,
      role: UserRole.ADMIN,
      emailVerified: true,
      gdprConsentAt: new Date(),
      profile: {
        create: {
          displayName: 'Admin',
          stateId: berlin?.id,
          cityId: berlinCity?.id,
          languages: ['tr', 'de'],
          interests: ['topluluk'],
          trustScore: 100,
        },
      },
    },
  });

  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@turkexpatlar.de' },
    update: {},
    create: {
      email: 'demo@turkexpatlar.de',
      passwordHash,
      role: UserRole.USER,
      emailVerified: true,
      gdprConsentAt: new Date(),
      profile: {
        create: {
          displayName: 'Demo Kullanıcı',
          stateId: berlin?.id,
          cityId: berlinCity?.id,
          languages: ['tr', 'de', 'en'],
          interests: ['etkinlik', 'forum'],
          userStatus: 'yeni_gelen',
          trustScore: 25,
        },
      },
    },
  });

  const resmiCat = await prisma.topicCategory.findUnique({ where: { slug: 'resmi-islemler' } });
  const doktorCat = await prisma.businessCategory.findUnique({ where: { slug: 'doktor' } });

  if (resmiCat && berlin && berlinCity) {
    await prisma.forumTopic.upsert({
      where: { id: 'seed-topic-anmeldung' },
      update: {},
      create: {
        id: 'seed-topic-anmeldung',
        userId: demoUser.id,
        categoryId: resmiCat.id,
        stateId: berlin.id,
        cityId: berlinCity.id,
        title: 'Anmeldung için randevu bulamıyorum, ne yapmalıyım?',
        body: 'Berlin\'e yeni geldim. Bürgeramt randevusu alamıyorum. Deneyimlerinizi paylaşır mısınız?',
        status: ForumTopicStatus.OPEN,
      },
    });
  }

  if (berlin && berlinCity) {
    await prisma.event.upsert({
      where: { id: 'seed-event-kahvalti' },
      update: {},
      create: {
        id: 'seed-event-kahvalti',
        organizerId: demoUser.id,
        stateId: berlin.id,
        cityId: berlinCity.id,
        title: 'Yeni Gelenler Kahvaltısı',
        description: 'Berlin\'e yeni taşınanlar için tanışma kahvaltısı. Herkes davetli!',
        location: 'Kreuzberg, Berlin',
        startsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        capacity: 30,
        priceType: PriceType.FREE,
        category: 'bulusma',
        status: EventStatus.PUBLISHED,
      },
    });
  }

  if (koeln && doktorCat) {
    await prisma.business.upsert({
      where: { id: 'seed-business-doktor' },
      update: {},
      create: {
        id: 'seed-business-doktor',
        categoryId: doktorCat.id,
        stateId: koeln.stateId,
        cityId: koeln.id,
        name: 'Dr. Mehmet Yılmaz',
        description: 'Genel pratisyen hekim. Türkçe ve Almanca hizmet.',
        address: 'Ehrenstraße 12, 50672 Köln',
        phone: '+49 221 123456',
        languages: ['tr', 'de'],
        speaksTurkish: true,
        isVerified: true,
        status: BusinessStatus.ACTIVE,
        averageRating: 4.8,
        reviewCount: 12,
      },
    });
  }

  // ── Forum bot personaları ────────────────────────────────────────────────
  const botPasswordHash = await bcrypt.hash('bot-user-x7k2p9', 10);

  const hamburg   = await prisma.federalState.findUnique({ where: { slug: 'hamburg' } });
  const hamburcity = hamburg ? await prisma.city.findFirst({ where: { stateId: hamburg.id, slug: 'hamburg' } }) : null;

  const muenchen  = await prisma.federalState.findUnique({ where: { slug: 'bayern' } });
  const muenchenCity = muenchen ? await prisma.city.findFirst({ where: { stateId: muenchen.id, slug: 'muenchen' } }) : null;

  const frankfurt  = await prisma.federalState.findUnique({ where: { slug: 'hessen' } });
  const frankfurtCity = frankfurt ? await prisma.city.findFirst({ where: { stateId: frankfurt.id, slug: 'frankfurt-am-main' } }) : null;

  const koeln2  = await prisma.federalState.findUnique({ where: { slug: 'nordrhein-westfalen' } });
  const koelnCity = koeln2 ? await prisma.city.findFirst({ where: { stateId: koeln2.id, slug: 'koeln' } }) : null;

  const bots = [
    {
      email: 'bot-ayse@turkexpatlar.de',
      displayName: 'Ayşe_HH',
      stateId: hamburg?.id,
      cityId: hamburcity?.id,
      userStatus: 'yeni_gelen',
    },
    {
      email: 'bot-mehmet@turkexpatlar.de',
      displayName: 'Mehmet34',
      stateId: muenchen?.id,
      cityId: muenchenCity?.id,
      userStatus: 'ogrenci',
    },
    {
      email: 'bot-selin@turkexpatlar.de',
      displayName: 'Selin_F',
      stateId: frankfurt?.id,
      cityId: frankfurtCity?.id,
      userStatus: 'calisani',
    },
    {
      email: 'bot-emre@turkexpatlar.de',
      displayName: 'emre_k',
      stateId: berlin?.id,
      cityId: berlinCity?.id,
      userStatus: 'yeni_gelen',
    },
    {
      email: 'bot-fatma@turkexpatlar.de',
      displayName: 'fatma_koeln',
      stateId: koeln2?.id,
      cityId: koelnCity?.id,
      userStatus: 'ev_hanimi',
    },
    {
      email: 'bot-kaan@turkexpatlar.de',
      displayName: 'Kaan_B',
      stateId: berlin?.id,
      cityId: berlinCity?.id,
      userStatus: 'isadami',
    },
    // Forum "cevap" botu — konu açmaz, açılan konulara yorum yazar
    {
      email: 'bot-derya@turkexpatlar.de',
      displayName: 'Derya_10yil',
      stateId: berlin?.id,
      cityId: berlinCity?.id,
      userStatus: 'calisani',
    },
  ];

  for (const bot of bots) {
    await prisma.user.upsert({
      where: { email: bot.email },
      update: {},
      create: {
        email: bot.email,
        passwordHash: botPasswordHash,
        role: UserRole.USER,
        emailVerified: true,
        gdprConsentAt: new Date(),
        profile: {
          create: {
            displayName: bot.displayName,
            stateId: bot.stateId ?? undefined,
            cityId: bot.cityId ?? undefined,
            languages: ['tr', 'de'],
            interests: ['forum'],
            userStatus: bot.userStatus,
            trustScore: 10,
          },
        },
      },
    });
  }

  // Lansman promo kodları
  await prisma.promoCode.upsert({
    where: { code: 'LAUNCH100' },
    update: {},
    create: {
      code: 'LAUNCH100',
      label: 'Lansman — İlk 100 Kullanıcı (Ücretsiz 1 Yıl)',
      maxUses: 100,
      plan: MembershipPlan.FREE_PROMO,
    },
  });

  await prisma.promoCode.upsert({
    where: { code: 'ISLETME50' },
    update: {},
    create: {
      code: 'ISLETME50',
      label: 'Lansman — İlk 50 İşletme (Ücretsiz 1 Yıl)',
      maxUses: 50,
      plan: MembershipPlan.BUSINESS_YEARLY,
    },
  });

  console.log('Seed completed.');
  console.log('Admin:  admin@turkexpatlar.de / demo1234');
  console.log('Demo:   demo@turkexpatlar.de / demo1234');
  console.log('Promo:  LAUNCH100 (kullanıcı, 100 kullanım) · ISLETME50 (işletme, 50 kullanım)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
