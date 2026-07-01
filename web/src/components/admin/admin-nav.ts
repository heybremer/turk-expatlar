import type { ElementType } from "react";
import {
  AlertTriangle,
  BarChart2,
  Briefcase,
  Building2,
  Calendar,
  ChevronDown,
  Hash,
  LayoutDashboard,
  LifeBuoy,
  MessageSquare,
  Plane,
  Plus,
  Settings,
  Users,
} from "lucide-react";

export type NavChild = { href: string; label: string };
export type NavItem = {
  label: string;
  icon: ElementType;
  href?: string;
  exact?: boolean;
  children?: NavChild[];
};

export const adminNav: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/analytics", label: "İçerik Analitik", icon: BarChart2 },
  {
    label: "Kullanıcılar",
    icon: Users,
    href: "/admin/kullanicilar",
    children: [
      { href: "/admin/kullanicilar", label: "Tüm Kullanıcılar" },
      { href: "/admin/kullanicilar/yetkiler", label: "Kullanıcı Yetkileri" },
      { href: "/admin/kullanicilar/yeni", label: "Yeni Kullanıcı Ekle" },
      { href: "/admin/kullanicilar/ban", label: "Ban" },
      { href: "/admin/kullanicilar/engellenen", label: "Engellenen" },
    ],
  },
  {
    label: "Forum",
    icon: MessageSquare,
    href: "/admin/forum",
    children: [
      { href: "/admin/forum", label: "Tüm Konular" },
      { href: "/admin/forum/bot", label: "Bot Paneli" },
    ],
  },
  {
    label: "Sohbet",
    icon: Hash,
    href: "/admin/sohbet/kanallar",
    children: [
      { href: "/admin/sohbet/kanallar", label: "Kanal Oluşturma" },
      { href: "/admin/sohbet/spam-kontrol", label: "Spam Kontrol" },
      { href: "/admin/sohbet/filtreler", label: "Filtreler" },
    ],
  },
  {
    label: "Etkinlikler",
    icon: Calendar,
    href: "/admin/etkinlikler",
    children: [
      { href: "/admin/etkinlikler", label: "Tüm Etkinlikler" },
      { href: "/admin/etkinlikler/tamamlanan", label: "Tamamlanan Etkinlikler" },
      { href: "/admin/etkinlikler/onay-bekleyen", label: "Onay Bekleyenler" },
    ],
  },
  {
    label: "İşletmeler",
    icon: Building2,
    href: "/admin/isletmeler",
    children: [
      { href: "/admin/isletmeler", label: "Tüm İşletmeler" },
      { href: "/admin/isletmeler/yeni", label: "İşletme Ekle" },
      { href: "/admin/isletmeler/yorumlar", label: "Yorumlar" },
      { href: "/admin/isletmeler/yorumlar/bekleyen", label: "Onay Bekleyen Yorumlar" },
    ],
  },
  {
    label: "İş İlanları",
    icon: Briefcase,
    href: "/admin/isler",
    children: [
      { href: "/admin/isler/ilanlar", label: "İlanlar" },
      { href: "/admin/isler/yeni", label: "İlan Ekle" },
      { href: "/admin/isler/onay-bekleyen", label: "Onay Bekleyenler" },
    ],
  },
  {
    label: "Şikayetler",
    icon: AlertTriangle,
    href: "/admin/sikayet",
    children: [
      { href: "/admin/sikayet/tumu", label: "Tüm Şikayetler" },
      { href: "/admin/sikayet/onay-bekleyen", label: "Onay Bekleyenler" },
      { href: "/admin/sikayet/istatistik", label: "Şikayet İstatistiği" },
    ],
  },
  {
    label: "Seyahat",
    icon: Plane,
    href: "/admin/seyahat/seyahatler",
    children: [
      { href: "/admin/seyahat/seyahatler", label: "Seyahatler" },
      { href: "/admin/seyahat/tasiyabilirim-onaylari", label: "Taşıyabilirim Onayları" },
    ],
  },
  {
    label: "Destek",
    icon: LifeBuoy,
    href: "/admin/destek",
    children: [{ href: "/admin/destek", label: "Destek Formları" }],
  },
  {
    label: "Site Ayarları",
    icon: Settings,
    href: "/admin/site-ayarlari",
    children: [
      { href: "/admin/site-ayarlari", label: "Genel & SEO" },
      { href: "/admin/site-ayarlari/analytics", label: "Analytics & Pazarlama" },
      { href: "/admin/site-ayarlari/bakim", label: "Bakım & Cache" },
      { href: "/admin/site-ayarlari/ozellikler", label: "Özellik Anahtarları" },
    ],
  },
];

export { ChevronDown, Plus };
