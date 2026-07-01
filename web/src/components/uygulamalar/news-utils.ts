export type NewsItem = {
  title: string;
  summary: string;
  link: string;
  pubDate: string;
  source: string;
  imageUrl?: string;
  kind?: "municipal" | "regional" | "local";
};

export function formatNewsDate(raw: string): string {
  if (!raw) return "";
  try {
    return new Date(raw).toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return raw;
  }
}

export function sourceKindLabel(kind?: NewsItem["kind"]): string | null {
  if (kind === "municipal") return "Belediye";
  if (kind === "regional") return "Yerel medya";
  return null;
}

const SEP = " |||SEP||| ";

async function translateOne(text: string, from = "de"): Promise<string> {
  if (!text.trim()) return text;
  const url =
    `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|tr`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as { responseData?: { translatedText?: string } };
  return data.responseData?.translatedText ?? text;
}

export async function translateNewsItem(
  item: NewsItem,
): Promise<Pick<NewsItem, "title" | "summary">> {
  const combined = `${item.title}${SEP}${item.summary}`;
  try {
    const translated = await translateOne(combined.slice(0, 500));
    const parts = translated.split(SEP.trim());
    return {
      title: parts[0]?.trim() ?? item.title,
      summary: parts[1]?.trim() ?? item.summary,
    };
  } catch {
    return { title: item.title, summary: item.summary };
  }
}
