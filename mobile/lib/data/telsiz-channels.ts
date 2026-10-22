/** Yolculuk Telsiz kanalları — API'deki liste ile birebir aynı olmalı */
export type TelsizChannel = {
  id: string;
  name: string;
  description: string;
};

export const TELSIZ_CHANNELS: TelsizChannel[] = [
  { id: "genel", name: "Genel Kanal", description: "Tüm gezginler için açık kanal" },
  { id: "kuzey", name: "Kuzey Hattı", description: "Hamburg, Bremen, Hannover çevresi" },
  { id: "bati", name: "Batı Hattı", description: "Köln, Düsseldorf, Dortmund çevresi" },
  { id: "guney", name: "Güney Hattı", description: "München, Stuttgart çevresi" },
  { id: "dogu", name: "Doğu Hattı", description: "Berlin, Leipzig, Dresden çevresi" },
  { id: "yardim", name: "Yol Yardım", description: "Acil yol yardımı ve destek" },
];
