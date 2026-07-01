"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Globe, Hash, Lock, MapPin, MessageCircle, Search, Sparkles, X } from "lucide-react";
import { api } from "@/lib/api";
import { sitePageShellClass } from "@/lib/site-layout";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import { ChatRulesButton } from "@/components/sohbet/ChatRulesButton";

type Rooms = {
  global?: { chatId: string; name: string };
  states: { id: string; name: string }[];
  cities: { id: string; name: string; stateId: string }[];
};
type MyProfile = {
  profile?: { stateId?: string | null; cityId?: string | null; postalCode?: string | null } | null;
};

const STATE_SLUGS: Record<string, string> = {
  "Baden-Württemberg": "baden-wuerttemberg", Bayern: "bayern", Berlin: "berlin",
  Brandenburg: "brandenburg", Bremen: "bremen", Hamburg: "hamburg",
  Hessen: "hessen", "Mecklenburg-Vorpommern": "mecklenburg-vorpommern",
  Niedersachsen: "niedersachsen", "Nordrhein-Westfalen": "nordrhein-westfalen",
  "Rheinland-Pfalz": "rheinland-pfalz", Saarland: "saarland",
  Sachsen: "sachsen", "Sachsen-Anhalt": "sachsen-anhalt",
  "Schleswig-Holstein": "schleswig-holstein", Thüringen: "thueringen",
};
function toSlug(name: string) {
  return STATE_SLUGS[name] ?? name.toLowerCase()
    .replace(/ü/g, "ue").replace(/ö/g, "oe").replace(/ä/g, "ae").replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
function normalize(t: string) {
  return t.toLowerCase().replace(/ü/g, "u").replace(/ö/g, "o").replace(/ä/g, "a")
    .replace(/ß/g, "ss").replace(/[^a-z0-9\s]+/g, " ");
}

const POPULAR_CITIES = ["Berlin", "Köln", "Frankfurt am Main", "Frankfurt", "München", "Hamburg", "Düsseldorf", "Stuttgart", "Dortmund", "Essen"];

export default function SohbetPage() {
  const { token, isAuthenticated } = useAuth();
  const [rooms, setRooms] = useState<Rooms>({ states: [], cities: [] });
  const [profile, setProfile] = useState<MyProfile["profile"]>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const tasks: Promise<unknown>[] = [
      api.get<Rooms>("/chat/rooms").then(setRooms).catch(() => null),
    ];
    if (isAuthenticated() && token) {
      tasks.push(api.get<MyProfile>("/users/me", token).then((u) => setProfile(u.profile ?? null)).catch(() => null));
    }
    Promise.all(tasks).finally(() => setLoading(false));
  }, [token, isAuthenticated]);

  const myState = useMemo(() => rooms.states.find((s) => s.id === profile?.stateId) ?? null, [rooms.states, profile?.stateId]);
  const myCity = useMemo(() => rooms.cities.find((c) => c.id === profile?.cityId) ?? null, [rooms.cities, profile?.cityId]);

  const filtered = useMemo(() => {
    if (!query.trim()) return null;
    const q = normalize(query.trim());
    return {
      states: rooms.states.filter((s) => normalize(s.name).includes(q)),
      cities: rooms.cities.filter((c) => normalize(c.name).includes(q)),
    };
  }, [query, rooms]);

  const popularCities = rooms.cities.filter((c) => POPULAR_CITIES.includes(c.name));
  const otherCities = rooms.cities.filter((c) => !POPULAR_CITIES.includes(c.name) && c.id !== myCity?.id);

  return (
    <div className={sitePageShellClass}>

      {/* Başlık */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Sohbet</h1>
          <p className="text-muted">Topluluk kanalları ve özel mesajlar</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ChatRulesButton />
          <Link href="/sohbet/mesajlarim">
            <Button variant="outline">
              <Lock className="mr-1 h-4 w-4" />
              Özel mesajlar
            </Button>
          </Link>
        </div>
      </div>

      {/* Genel sohbet — büyük kart */}
      <section className="mt-5">
        <Link href="/sohbet/genel/genel"
          className="group flex items-center gap-4 rounded-xl border border-primary/30 bg-gradient-to-br from-primary/8 to-transparent p-4 transition-all hover:border-primary/60 hover:shadow-sm">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-primary/12 group-hover:bg-primary/20 transition-colors">
            <Globe className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-text">{rooms.global?.name ?? "Genel Sohbet"}</p>
            <p className="text-xs text-muted">Herkes katılabilir · konum şartı yok</p>
          </div>
          <MessageCircle className="h-4 w-4 flex-shrink-0 text-primary/60 group-hover:text-primary" />
        </Link>
      </section>

      {/* Konum sohbetlerim */}
      {(myState || myCity) && (
        <section className="mt-4">
          <div className="flex items-center gap-1.5 mb-2.5 text-xs font-semibold text-primary/80">
            <Sparkles className="h-3.5 w-3.5" />
            Bölgem
            {profile?.postalCode && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 font-mono text-primary">{profile.postalCode}</span>
            )}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {myState && (
              <Link href={`/sohbet/eyalet/${toSlug(myState.name)}`}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3 hover:border-accent/60 hover:shadow-sm transition-all">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-accent/10">
                  <MapPin className="h-4 w-4 text-accent" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{myState.name}</p>
                  <p className="text-xs text-muted">Eyalet sohbeti</p>
                </div>
              </Link>
            )}
            {myCity && (
              <Link href={`/sohbet/sehir/${toSlug(myCity.name)}`}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3 hover:border-primary/60 hover:shadow-sm transition-all">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Hash className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{myCity.name}</p>
                  <p className="text-xs text-muted">Şehir sohbeti</p>
                </div>
              </Link>
            )}
          </div>
        </section>
      )}

      {/* Konum yok uyarısı */}
      {!loading && token && !myState && !myCity && (
        <section className="mt-4 flex items-center gap-3 rounded-xl border border-warning/25 bg-warning/5 px-4 py-3">
          <MapPin className="h-4 w-4 flex-shrink-0 text-warning" />
          <p className="flex-1 text-sm text-muted">Bölge sohbetlerine erişmek için profilinize konum ekleyin.</p>
          <Link href="/profil/duzenle" className="flex-shrink-0 text-sm font-medium text-primary hover:underline">Ekle →</Link>
        </section>
      )}

      {/* Arama */}
      <div className="relative mt-6">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Eyalet veya şehir ara…"
          className="w-full rounded-full border border-border bg-surface py-2.5 pl-10 pr-10 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text"
            aria-label="Aramayı temizle"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Arama sonuçları */}
      {filtered && (
        <section className="mt-4">
          {filtered.states.length === 0 && filtered.cities.length === 0 ? (
            <p className="rounded-xl border border-border bg-surface p-5 text-center text-sm text-muted">
              &ldquo;{query}&rdquo; için sonuç bulunamadı
            </p>
          ) : (
            <div className="space-y-3">
              {filtered.states.length > 0 && (
                <div>
                  <p className="mb-1.5 text-[11px] font-bold uppercase tracking-widest text-muted">Eyaletler</p>
                  <div className="grid gap-1.5 sm:grid-cols-2">
                    {filtered.states.map((s) => (
                      <Link key={s.id} href={`/sohbet/eyalet/${toSlug(s.name)}`}
                        className="flex items-center gap-2.5 rounded-lg border border-border bg-surface px-3 py-2.5 hover:border-accent/60 transition-colors">
                        <MapPin className="h-3.5 w-3.5 text-accent" />
                        <span className="text-sm font-medium">{s.name}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              {filtered.cities.length > 0 && (
                <div>
                  <p className="mb-1.5 text-[11px] font-bold uppercase tracking-widest text-muted">Şehirler</p>
                  <div className="grid gap-1.5 sm:grid-cols-2">
                    {filtered.cities.map((c) => (
                      <Link key={c.id} href={`/sohbet/sehir/${toSlug(c.name)}`}
                        className="flex items-center gap-2.5 rounded-lg border border-border bg-surface px-3 py-2.5 hover:border-primary/60 transition-colors">
                        <Hash className="h-3.5 w-3.5 text-primary" />
                        <span className="text-sm font-medium">{c.name}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* Varsayılan liste */}
      {!filtered && (
        <div className="mt-6 space-y-6">
          {/* Popüler şehirler */}
          {popularCities.length > 0 && (
            <section>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-muted">Popüler Şehirler</p>
              <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                {popularCities.map((c) => (
                  <Link key={c.id} href={`/sohbet/sehir/${toSlug(c.name)}`}
                    className="flex items-center gap-2.5 rounded-xl border border-border bg-surface px-3 py-3 hover:border-primary/60 hover:shadow-sm transition-all">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/8">
                      <Hash className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{c.name}</p>
                      <p className="text-xs text-muted">Şehir kanalı</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Eyaletler */}
          <section>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-muted">Eyaletler</p>
            <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
              {rooms.states.map((s) => (
                <Link key={s.id} href={`/sohbet/eyalet/${toSlug(s.name)}`}
                  className="flex items-center gap-2.5 rounded-xl border border-border bg-surface px-3 py-3 hover:border-accent/60 hover:shadow-sm transition-all">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/8">
                    <MapPin className="h-4 w-4 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{s.name}</p>
                    <p className="text-xs text-muted">Eyalet kanalı</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* Diğer şehirler */}
          {otherCities.length > 0 && (
            <section>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-muted">Diğer Şehirler</p>
              <div className="flex flex-wrap gap-1.5">
                {otherCities.map((c) => (
                  <Link key={c.id} href={`/sohbet/sehir/${toSlug(c.name)}`}
                    className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm text-muted hover:border-primary hover:text-primary transition-colors">
                    <Hash className="h-3 w-3" />
                    {c.name}
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
