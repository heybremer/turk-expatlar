"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  Calendar,
  HelpCircle,
  MapPin,
  MessageCircle,
  Sparkles,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { needsPostalCode } from "@/lib/profile-requirements";
import { Button } from "@/components/ui/Button";

const INTERESTS = [
  { id: "etkinlik", label: "Etkinlikler", icon: Calendar },
  { id: "forum", label: "Forum & sorular", icon: HelpCircle },
  { id: "is", label: "İş & kariyer", icon: Briefcase },
  { id: "rehber", label: "İşletme rehberi", icon: MapPin },
  { id: "sohbet", label: "Sohbet", icon: MessageCircle },
  { id: "seyahat", label: "Seyahat / eşya", icon: Sparkles },
];

const QUICK_LINKS = [
  { href: "/forum/yeni", label: "İlk sorunu sor", desc: "Anmeldung, kira, vize…" },
  { href: "/etkinlikler", label: "Etkinliklere göz at", desc: "Şehrindeki buluşmalar" },
  { href: "/rehber", label: "Rehberi keşfet", desc: "Türkçe hizmet veren işletmeler" },
  { href: "/sohbet", label: "Sohbete katıl", desc: "Eyalet ve şehir kanalları" },
];

export default function HosgeldinPage() {
  const router = useRouter();
  const { token, isAuthenticated, refreshUser, user } = useAuth();
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!isAuthenticated()) {
      router.replace("/giris?redirect=/hosgeldin");
      return;
    }
    if (needsPostalCode(user)) {
      router.replace("/profil/duzenle?required=postal");
    }
  }, [isAuthenticated, router, user]);

  function toggleInterest(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function finish(skip = false) {
    if (!token) return;
    setLoading(true);
    try {
      if (!skip && selected.length > 0) {
        await api.patch(
          "/users/me/profile",
          { interests: selected, completeOnboarding: true },
          token,
        );
      } else {
        await api.patch("/users/me/profile", { completeOnboarding: true }, token);
      }
      const me = await api.get<{ id: string; email: string; role: string; profile?: unknown }>(
        "/users/me",
        token,
      );
      refreshUser(me as Parameters<typeof refreshUser>[0]);
      router.push("/akis");
    } catch {
      router.push("/akis");
    } finally {
      setLoading(false);
    }
  }

  if (!mounted) return null;

  const cityName = user?.profile?.city?.name;
  const greeting = cityName
    ? `${cityName} topluluğuna hoş geldin!`
    : "Topluluğa hoş geldin!";

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="text-center">
        <span className="inline-flex rounded-full bg-primary/10 px-4 py-1 text-sm font-medium text-primary">
          Adım 1 / 1
        </span>
        <h1 className="mt-4 text-3xl font-bold">{greeting}</h1>
        <p className="mt-2 text-muted">
          İlgi alanlarını seç, sana uygun bölümleri keşfet.
        </p>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {INTERESTS.map((item) => {
          const Icon = item.icon;
          const active = selected.includes(item.id);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => toggleInterest(item.id)}
              className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-colors ${
                active
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border bg-surface hover:border-primary/40"
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-10">
        <h2 className="font-semibold">Hızlı başlangıç</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {QUICK_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-xl border border-border bg-surface p-4 transition-colors hover:border-primary/40"
            >
              <p className="font-medium text-text">{link.label}</p>
              <p className="mt-0.5 text-sm text-muted">{link.desc}</p>
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <Button size="lg" disabled={loading} onClick={() => void finish(false)}>
          {loading ? "Kaydediliyor…" : "Başla"}
        </Button>
        <Button variant="ghost" disabled={loading} onClick={() => void finish(true)}>
          Şimdilik atla
        </Button>
      </div>
    </div>
  );
}
