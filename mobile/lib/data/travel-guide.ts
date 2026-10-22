export type PlaceCategory =
  | "culture"
  | "history"
  | "nature"
  | "family"
  | "architecture";

export type TravelPlace = {
  name: string;
  city: string;
  category: PlaceCategory;
  description: string;
  tip?: string;
};

export type StateTravelGuide = {
  slug: string;
  name: string;
  intro: string;
  places: TravelPlace[];
};

export const PLACE_CATEGORY_LABELS: Record<PlaceCategory, string> = {
  culture: "Kültür",
  history: "Tarih",
  nature: "Doğa",
  family: "Aile",
  architecture: "Mimari",
};

export const TRAVEL_GUIDE_BY_STATE: StateTravelGuide[] = [
  {
    slug: "baden-wuerttemberg",
    name: "Baden-Württemberg",
    intro: "Schwarzwald, Bodensee ve üniversite şehirleriyle güneybatının en yeşil eyaleti.",
    places: [
      { name: "Heidelberg Schloss", city: "Heidelberg", category: "history", description: "Alman Romantizminin simgesi; şehir manzarası ve bahçeleriyle ünlü kalıntılar.", tip: "Funicular ile Molkenkur’a çıkın." },
      { name: "Schwarzwald", city: "Triberg / Freiburg", category: "nature", description: "Orman yürüyüşleri, şelaleler ve geleneksel köyler.", tip: "Triberg Şelaleleri aileler için ideal." },
      { name: "Bodensee", city: "Konstanz", category: "nature", description: "Almanya’nın en büyük gölü; Mainau Adası çiçek bahçeleriyle ünlü.", tip: "Yaz aylarında tekne turları çok popüler." },
      { name: "Mercedes-Benz Müzesi", city: "Stuttgart", category: "culture", description: "Otomobil tarihini anlatan etkileşimli müze.", tip: "Hafta sonu kalabalık olabilir; online bilet alın." },
      { name: "Maulbronn Manastırı", city: "Maulbronn", category: "architecture", description: "UNESCO listesindeki en iyi korunmuş Ortaçağ manastır kompleksi.", tip: "Sessiz bir gün gezisi için hafta içi tercih edin." },
    ],
  },
  {
    slug: "bayern",
    name: "Bayern",
    intro: "Alpler, masallar ve Bavyera kültürü — Almanya’nın en çok ziyaret edilen eyaleti.",
    places: [
      { name: "Neuschwanstein Şatosu", city: "Füssen", category: "architecture", description: "Ludwig II’nin peri masalı şatosu; Alpler manzarası eşsiz.", tip: "Biletleri önceden rezerve edin; Marienbrücke fotoğraf noktası." },
      { name: "Marienplatz & Frauenkirche", city: "München", category: "culture", description: "Şehrin kalbi; Glockenspiel gösterisi ve tarihi meydan.", tip: "Rathaus saatinde gösteriyi kaçırmayın." },
      { name: "Englischer Garten", city: "München", category: "nature", description: "Avrupa’nın en büyük şehir parklarından; Eisbach dalgası sörfüyle ünlü.", tip: "Biergarten’lerde Bavyera mutfağı deneyin." },
      { name: "Zugspitze", city: "Garmisch-Partenkirchen", category: "nature", description: "Almanya’nın en yüksek zirvesi; teleferik ile panoramik manzara.", tip: "Kışın kayak, yazın yürüyüş için ideal." },
      { name: "Rothenburg ob der Tauber", city: "Rothenburg", category: "history", description: "Ortaçağ surları ve taş sokaklarıyla masalsı küçük kasaba.", tip: "Gece turu (Nachtwächter) keyifli bir deneyim." },
      { name: "Königssee", city: "Berchtesgaden", category: "nature", description: "Turkuaz göl ve Watzmann dağları; elektrikli tekne turu.", tip: "St. Bartholomä kilisesinde mola verin." },
    ],
  },
  {
    slug: "berlin",
    name: "Berlin",
    intro: "Başkent; tarih, sanat ve gece hayatının buluştuğu canlı metropol.",
    places: [
      { name: "Brandenburg Kapısı", city: "Berlin", category: "history", description: "Almanya birliğinin simgesi; Pariser Platz çevresi yürüyüşlük.", tip: "Akşam ışıklandırması fotoğraf için güzel." },
      { name: "Museumsinsel", city: "Berlin", category: "culture", description: "UNESCO korumasındaki müze adası; Pergamon ve Neues Museum.", tip: "Museum Pass ile birkaç müzeyi indirimli gezin." },
      { name: "East Side Gallery", city: "Berlin", category: "history", description: "Duvar üzerindeki en uzun açık hava sanat galerisi.", tip: "Sabah erken saatler daha sakin." },
      { name: "Reichstag Kubbesi", city: "Berlin", category: "architecture", description: "Parlamento binası ve cam kubbe; şehir panoraması.", tip: "Ücretsiz; önceden online kayıt şart." },
      { name: "Tiergarten", city: "Berlin", category: "nature", description: "Şehir merkezindeki geniş park; bisiklet ve piknik.", tip: "Siegessäule manzara için tırmanılabilir." },
      { name: "Checkpoint Charlie", city: "Berlin", category: "history", description: "Soğuk Savaş döneminin simgesi; yakında Duvar Müzesi.", tip: "Mauer Museum detaylı tarih sunuyor." },
    ],
  },
  {
    slug: "brandenburg",
    name: "Brandenburg",
    intro: "Berlin’i çevreleyen göller, ormanlar ve Potsdam’ın sarayları.",
    places: [
      { name: "Sanssouci Sarayı", city: "Potsdam", category: "architecture", description: "Friedrich II’nin yazlık sarayı ve teraslı bahçeler.", tip: "Park girişi ücretsiz; saray bileti ayrı." },
      { name: "Spreewald", city: "Lübbenau", category: "nature", description: "Kanallar üzerinde kano ve tekne turları; gherkin turşusuyla ünlü bölge.", tip: "Kahnfahrt (tekne) turu mutlaka yapın." },
      { name: "Babelsberg Park", city: "Potsdam", category: "culture", description: "Film stüdyolarına komşu romantik park ve saray.", tip: "Babelsberg Film Park aileler için eğlenceli." },
      { name: "Cecilienhof Sarayı", city: "Potsdam", category: "history", description: "1945 Potsdam Konferansı’nın yapıldığı Tudor tarzı saray.", tip: "Rehberli tur tarih meraklıları için." },
    ],
  },
  {
    slug: "bremen",
    name: "Bremen",
    intro: "Masallar, liman kültürü ve kuzey Almanya’nın kompakt şehir devleti.",
    places: [
      { name: "Bremer Stadtmusikanten", city: "Bremen", category: "culture", description: "Grimm masalındaki hayvan heykeli; dokunmak şans getirir.", tip: "Marktplatz çevresinde yürüyüş rotası oluşturun." },
      { name: "Schnoor Viertel", city: "Bremen", category: "history", description: "Dar sokaklar, ahşap evler ve el sanatları dükkânları.", tip: "Küçük kafelerde kahve molası." },
      { name: "Klimahaus Bremerhaven", city: "Bremerhaven", category: "family", description: "Dünya iklim kuşaklarını deneyimleyen interaktif müze.", tip: "Çocuklu aileler için yarım gün ayırın." },
      { name: "Weserpromenade & Schlachte", city: "Bremen", category: "culture", description: "Nehir kenarı restoranlar ve yaz etkinlikleri.", tip: "Yaz aylarında açık hava etkinlikleri." },
    ],
  },
  {
    slug: "hamburg",
    name: "Hamburg",
    intro: "Liman şehri; Elbe, kanallar ve modern mimari.",
    places: [
      { name: "Elbphilharmonie", city: "Hamburg", category: "architecture", description: "Limanın simgesi cam bina; Plaza manzarası ücretsiz.", tip: "Plaza için online zaman dilimi ayırın." },
      { name: "Miniatur Wunderland", city: "Hamburg", category: "family", description: "Dünyanın en büyük model demiryolu düzeni.", tip: "Biletleri haftalar öncesinden alın." },
      { name: "Speicherstadt", city: "Hamburg", category: "history", description: "UNESCO kırmızı tuğla depolar; kanallar arası yürüyüş.", tip: "Gece ışıklandırması etkileyici." },
      { name: "Planten un Blomen", city: "Hamburg", category: "nature", description: "Japon bahçesi ve yaz su gösterileri.", tip: "Yaz akşamları ışık ve su show’u." },
      { name: "HafenCity & Landungsbrücken", city: "Hamburg", category: "culture", description: "Liman turu ve balık sandviç (Fischbrötchen) durağı.", tip: "Hafenrundfahrt tekne turu önerilir." },
    ],
  },
  {
    slug: "hessen",
    name: "Hessen",
    intro: "Frankfurt gökdelenleri, Romantik yol ve termal kaplıcalar.",
    places: [
      { name: "Römer & Altstadt", city: "Frankfurt", category: "history", description: "Tarihi meydan ve yeniden inşa edilmiş half-timber evler.", tip: "Main nehri kıyısında yürüyüş yapın." },
      { name: "Rhine Valley (Rheingau)", city: "Rüdesheim", category: "nature", description: "Üzüm bağları, Drosselgasse sokağı ve nehir manzarası.", tip: "Rheinsteig yürüyüş parkurunu deneyin." },
      { name: "Kurhaus Wiesbaden", city: "Wiesbaden", category: "architecture", description: "Kurort mimarisi ve casino binası.", tip: "Termal hamam (Kaiser-Friedrich-Therme) yakında." },
      { name: "Marburg Altstadt", city: "Marburg", category: "culture", description: "Ortaçağ üniversite şehri; dik sokaklar ve Landgrafenschloss.", tip: "Öğrenci şehri atmosferi canlı." },
      { name: "Fulda Dom", city: "Fulda", category: "architecture", description: "Barok katedral ve St. Bonifatius mezarı.", tip: "Stadtschloss bahçeleri huzurlu." },
    ],
  },
  {
    slug: "mecklenburg-vorpommern",
    name: "Mecklenburg-Vorpommern",
    intro: "Baltık kıyısı, göller ve az turist kalabalığı.",
    places: [
      { name: "Schwerin Schloss", city: "Schwerin", category: "architecture", description: "Göl üzerindeki peri masalı şatosu; eyalet parlamentosu.", tip: "Bahçe gezisi ücretsiz." },
      { name: "Müritz Nationalpark", city: "Waren", category: "nature", description: "Göller, kuş gözlemi ve sakin doğa.", tip: "Tekne kiralama imkânı var." },
      { name: "Königsstuhl (Rügen)", city: "Sassnitz", category: "nature", description: "Baltık’ın beyaz tebeşir kayalıkları.", tip: "Kreidefelsen manzarası için erken gidin." },
      { name: "Stralsund Altstadt", city: "Stralsund", category: "history", description: "UNESCO hanseatic şehir; Ozeaneum akvaryumu.", tip: "Ozeaneum aileler için harika." },
      { name: "Warnemünde", city: "Rostock", category: "culture", description: "Geniş plaj, deniz feneri ve balık restoranları.", tip: "Yaz festivali döneminde canlı." },
    ],
  },
  {
    slug: "niedersachsen",
    name: "Niedersachsen",
    intro: "Kuzey denizi kıyısı, orta çağ şehirleri ve geniş heathland.",
    places: [
      { name: "Herrenhausen Bahçeleri", city: "Hannover", category: "architecture", description: "Barok bahçe sanatının önemli örneği.", tip: "Yaz geceleri ışık festivali (Gartenfest)." },
      { name: "Goslar Altstadt", city: "Goslar", category: "history", description: "UNESCO Rammelsberg madeni ve half-timber evler.", tip: "Harz bölgesine geçiş kapısı." },
      { name: "Lüneburger Heide", city: "Lüneburg", category: "nature", description: "Ağustos-Eylül mor heather çiçekleri.", tip: "Heideblüte döneminde rezervasyon yapın." },
      { name: "Cuxhaven & Wattenmeer", city: "Cuxhaven", category: "nature", description: "Wadden Denizi UNESCO alanı; gelgit manzarası.", tip: "Rehberli Wattwanderung (çamur yürüyüşü)." },
      { name: "Hameln", city: "Hameln", category: "culture", description: "Fareli flütçü masalının şehri; haftalık gösteriler.", tip: "Pied Piper turu çocuklar için eğlenceli." },
    ],
  },
  {
    slug: "nordrhein-westfalen",
    name: "Nordrhein-Westfalen",
    intro: "NRW — Almanya’nın en kalabalık eyaleti; sanayi mirası ve Rhine-Ruhr.",
    places: [
      { name: "Kölner Dom", city: "Köln", category: "architecture", description: "UNESCO gotik katedral; kule tırmanışı manzaralı.", tip: "Rhine promenade’ta bir Kölsch için." },
      { name: "MedienHafen", city: "Düsseldorf", category: "architecture", description: "Gehry binaları ve modern liman bölgesi.", tip: "Rheinturm gece manzarası." },
      { name: "Schloss Drachenburg", city: "Königswinter", category: "history", description: "Siebengebirge’de peri masalı şatosu.", tip: "Dişli tren (Zahnradbahn) ile çıkış." },
      { name: "Aachener Dom", city: "Aachen", category: "history", description: "Karl der Große’nin imparatorluk katedrali.", tip: "Termal kaplıcalar (Carolus Thermen)." },
      { name: "Zollverein Essen", city: "Essen", category: "culture", description: "UNESCO endüstri mirası; kömür madeni kompleksi.", tip: "Ruhr bölgesi kültür rotası." },
      { name: "Phantasialand", city: "Brühl", category: "family", description: "Temalı eğlence parkı; Köln’e yakın.", tip: "Hafta içi daha az kuyruk." },
    ],
  },
  {
    slug: "rheinland-pfalz",
    name: "Rheinland-Pfalz",
    intro: "Şarap yolları, kaleler ve Rhine vadisi.",
    places: [
      { name: "Eltz Schloss", city: "Wierschem", category: "architecture", description: "800 yıllık orman içi şato; kartpostal manzarası.", tip: "Sabah erken veya sonbahar ideal." },
      { name: "Loreley Felsen", city: "Sankt Goarshausen", category: "nature", description: "Rhine kıvrımı ve efsane kayalık.", tip: "Nehir tekne turu ile görün." },
      { name: "Porta Nigra", city: "Trier", category: "history", description: "Roma döneminden siyah kapı; Almanya’nın en eski şehri.", tip: "Roma hamamı kalıntıları yakında." },
      { name: "Speyer Dom", city: "Speyer", category: "architecture", description: "UNESCO Romanesque katedral.", tip: "Technik Museum Speyer uçak severler için." },
      { name: "Deutsches Weinstraße", city: "Bad Dürkheim", category: "culture", description: "Almanya’nın en eski şarap rotası.", tip: "Wurstmarkt festivali Eylül’de." },
    ],
  },
  {
    slug: "saarland",
    name: "Saarland",
    intro: "Fransa sınırına yakın küçük eyalet; endüstri mirası ve doğa.",
    places: [
      { name: "Völklinger Hütte", city: "Völklingen", category: "culture", description: "UNESCO demir çelik fabrikası; açık hava sanat etkinlikleri.", tip: "Gece ışık gösterileri etkileyici." },
      { name: "Saarschleife", city: "Mettlach", category: "nature", description: "Saar nehrinin at nalı kıvrımı; Cloef manzara noktası.", tip: "Treetop walk (ağaç tepesi yolu) var." },
      { name: "Saarbrücken Altstadt", city: "Saarbrücken", category: "history", description: "Barok Ludwigskirche ve Saar nehri.", tip: "Fransız etkisi mutfakta hissedilir." },
      { name: "Losheim am See", city: "Losheim", category: "family", description: "Göl, yürüyüş parkurları ve sınır kapısı yakını.", tip: "Hafta sonu piknik için popüler." },
    ],
  },
  {
    slug: "sachsen",
    name: "Sachsen",
    intro: "Barok Dresden, canlı Leipzig ve Elbe Sandstone Dağları.",
    places: [
      { name: "Zwinger & Frauenkirche", city: "Dresden", category: "architecture", description: "Barok başyapıtlar; savaş sonrası yeniden inşa simgesi.", tip: "Semperoper çevresinde akşam yürüyüşü." },
      { name: "Leipzig Marktplatz", city: "Leipzig", category: "culture", description: "Ticaret fuarları şehri; Bach ve Goethe izleri.", tip: "Spinnerei sanat galerileri." },
      { name: "Bastei (Sächsische Schweiz)", city: "Lohmen", category: "nature", description: "Elbe üzerinde taş köprü ve kanyon manzarası.", tip: "Erken saat veya hafta içi daha sakin." },
      { name: "Bautzen Altstadt", city: "Bautzen", category: "history", description: "Sorb kültürü ve Ortaçağ kuleleri.", tip: "Sorbische Würst deneyin." },
      { name: "Moritzburg Schloss", city: "Moritzburg", category: "architecture", description: "Göl üzerinde av köşkü; peri masalı seti.", tip: "Sonbahar fotoğraf için ideal." },
    ],
  },
  {
    slug: "sachsen-anhalt",
    name: "Sachsen-Anhalt",
    intro: "UNESCO şehirleri, Bauhaus ve Harz dağları.",
    places: [
      { name: "Quedlinburg Altstadt", city: "Quedlinburg", category: "history", description: "1300’den fazla half-timber ev; UNESCO.", tip: "Schloss ve Stiftskirche bir arada gezin." },
      { name: "Wernigerode Schloss", city: "Wernigerode", category: "architecture", description: "Harz’ın renkli şatosu ve buharlı tren durağı.", tip: "Harzquerbahn tren turu." },
      { name: "Bauhaus Dessau", city: "Dessau", category: "culture", description: "Modern mimarinin doğduğu okul binası.", tip: "Rehberli tur mimari meraklıları için." },
      { name: "Brocken (Harz)", city: "Wernigerode", category: "nature", description: "Harz’ın en yüksek zirvesi; efsanelerle dolu.", tip: "Brockenbahn treni popüler." },
      { name: "Magdeburger Dom", city: "Magdeburg", category: "architecture", description: "Gotik katedral; Elbe kıyısı.", tip: "Grüne Zitadelle (Hundertwasser) yakında." },
    ],
  },
  {
    slug: "schleswig-holstein",
    name: "Schleswig-Holstein",
    intro: "Kuzey ve Baltık denizleri arasında; plajlar ve hanseatic şehirler.",
    places: [
      { name: "Lübeck Holstentor", city: "Lübeck", category: "history", description: "UNESCO hanseatic şehir kapısı; marzipan müzesi.", tip: "Niederegger marzipan hediyelik." },
      { name: "Sylt", city: "Westerland", category: "nature", description: "Kuzey Denizi plajları ve Wattenmeer.", tip: "Hindenburgdamm treni ile ulaşım." },
      { name: "Kieler Förde", city: "Kiel", category: "culture", description: "Kiel Week yelken festivali ve liman.", tip: "Haziran sonu Kieler Woche." },
      { name: "Schleswig Dom", city: "Schleswig", category: "architecture", description: "Viking baltaları ve Gotland panelleri.", tip: "Schloss Gottorf arkeoloji müzesi." },
      { name: "Flensburg Hafen", city: "Flensburg", category: "culture", description: "Danimarka sınırına yakın liman; Rum şehri.", tip: "Flens özel bir içki — tadın." },
    ],
  },
  {
    slug: "thueringen",
    name: "Thüringen",
    intro: "Goethe’nin Weimar’ı, Wartburg ve orta Almanya’nın yeşil kalbi.",
    places: [
      { name: "Weimar Klassik", city: "Weimar", category: "culture", description: "Goethe-Schiller anıtı, Bauhaus ve ducal saraylar.", tip: "UNESCO çoklu miras alanı." },
      { name: "Wartburg", city: "Eisenach", category: "history", description: "Luther’in sürgün ettiği kale; Almanya’nın simgesi.", tip: "Yokuş yukarı yürüyüş veya shuttle." },
      { name: "Krämerbrücke", city: "Erfurt", category: "architecture", description: "Evlerle kaplı Ortaçağ köprüsü; eşsiz.", tip: "Domplatz çevresinde yürüyün." },
      { name: "Hainich Nationalpark", city: "Bad Langensalza", category: "nature", description: "UNESCO primeval orman; Treetop walk.", tip: "Baumkronenpfad aile dostu." },
      { name: "Saalfeld Feengrotten", city: "Saalfeld", category: "family", description: "Renkli mineral mağaraları.", tip: "İçerisi serin; yanınıza ceket alın." },
    ],
  },
];

export function getTravelGuideBySlug(slug: string) {
  return TRAVEL_GUIDE_BY_STATE.find((s) => s.slug === slug);
}

export function placeMapsQuery(place: TravelPlace, stateName: string) {
  return encodeURIComponent(`${place.name}, ${place.city}, ${stateName}, Deutschland`);
}
