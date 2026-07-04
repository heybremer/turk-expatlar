/** Yolculuk Telsiz kanalları — sabit liste (istemci ve sunucu paylaşır) */
export const TELSIZ_CHANNELS = [
  {
    id: 'genel',
    name: 'Genel Kanal',
    description: 'Tüm gezginler için açık kanal',
  },
  {
    id: 'kuzey',
    name: 'Kuzey Hattı',
    description: 'Hamburg, Bremen, Hannover çevresi',
  },
  {
    id: 'bati',
    name: 'Batı Hattı',
    description: 'Köln, Düsseldorf, Dortmund çevresi',
  },
  {
    id: 'guney',
    name: 'Güney Hattı',
    description: 'München, Stuttgart çevresi',
  },
  {
    id: 'dogu',
    name: 'Doğu Hattı',
    description: 'Berlin, Leipzig, Dresden çevresi',
  },
  {
    id: 'yardim',
    name: 'Yol Yardım',
    description: 'Acil yol yardımı ve destek',
  },
] as const;

export type TelsizChannelId = (typeof TELSIZ_CHANNELS)[number]['id'];

const CHANNEL_IDS = new Set<string>(TELSIZ_CHANNELS.map((c) => c.id));

export function isValidChannel(channelId: string): boolean {
  return CHANNEL_IDS.has(channelId);
}

export function telsizRoom(channelId: string): string {
  return `telsiz:${channelId}`;
}
