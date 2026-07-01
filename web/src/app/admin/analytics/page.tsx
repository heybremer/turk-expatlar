"use client";

import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend,
} from "recharts";
import { Loader2, TrendingUp, Users, MessageSquare, CalendarDays, BarChart3 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/Card";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3201";

const COLORS = ["#0f766e", "#14b8a6", "#e11d48", "#fb7185", "#f59e0b", "#8b5cf6", "#0ea5e9"];

interface Analytics {
  summary: {
    totalUsers: number; newUsers: number;
    totalTopics: number; newTopics: number;
    totalReplies: number; newReplies: number;
    totalEvents: number; newEvents: number;
    totalMessages: number; newMessages: number;
    days: number;
  };
  usersByCountry: { country: string; count: number }[];
  topicsByCategory: { name: string; count: number }[];
  dailyUsers: { date: string; count: number }[];
}

interface StatCardProps {
  label: string;
  total: number;
  newCount: number;
  icon: React.ReactNode;
  days: number;
}

function StatCard({ label, total, newCount, icon, days }: StatCardProps) {
  return (
    <Card className="flex items-start gap-4">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </div>
      <div>
        <p className="text-sm text-muted">{label}</p>
        <p className="text-2xl font-bold">{total.toLocaleString("tr-TR")}</p>
        <p className="mt-0.5 text-xs text-success">+{newCount} son {days} gün</p>
      </div>
    </Card>
  );
}

export default function AnalyticsPage() {
  const { token } = useAuth();
  const [data, setData] = useState<Analytics | null>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`${API_URL}/api/admin/analytics/content?days=${days}`, {
      headers: { Authorization: `Bearer ${token}` },
      credentials: "include",
    })
      .then((r) => r.json())
      .then((d: Analytics) => setData(d))
      .catch(() => void 0)
      .finally(() => setLoading(false));
  }, [token, days]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) return <p className="p-8 text-muted">Veri yüklenemedi</p>;

  const { summary, usersByCountry, topicsByCategory, dailyUsers } = data;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">İçerik Analitik Paneli</h1>
          <p className="text-muted">Platformun büyüme ve aktivite metrikleri</p>
        </div>
        <div className="flex gap-2">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
                days === d
                  ? "border-primary bg-primary/10 font-medium text-primary"
                  : "border-border text-muted hover:border-primary"
              }`}
            >
              {d} gün
            </button>
          ))}
        </div>
      </div>

      {/* Özet kartlar */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Kullanıcılar" total={summary.totalUsers} newCount={summary.newUsers} icon={<Users className="h-6 w-6" />} days={days} />
        <StatCard label="Forum Konuları" total={summary.totalTopics} newCount={summary.newTopics} icon={<BarChart3 className="h-6 w-6" />} days={days} />
        <StatCard label="Etkinlikler" total={summary.totalEvents} newCount={summary.newEvents} icon={<CalendarDays className="h-6 w-6" />} days={days} />
        <StatCard label="Mesajlar" total={summary.totalMessages} newCount={summary.newMessages} icon={<MessageSquare className="h-6 w-6" />} days={days} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Günlük kullanıcı artışı */}
        <Card>
          <h2 className="mb-4 flex items-center gap-2 font-semibold">
            <TrendingUp className="h-4 w-4 text-primary" />
            Günlük Yeni Kullanıcı
          </h2>
          {dailyUsers.length === 0 ? (
            <p className="py-8 text-center text-muted">Bu dönemde kayıt yok</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={dailyUsers}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "var(--muted)" }}
                  tickFormatter={(v) => new Date(String(v)).toLocaleDateString("tr-TR", { day: "2-digit", month: "short" })}
                />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted)" }} />
                <Tooltip
                  contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8 }}
                  labelFormatter={(v) => new Date(String(v)).toLocaleDateString("tr-TR")}
                />
                <Line type="monotone" dataKey="count" stroke="#0f766e" strokeWidth={2} dot={false} name="Yeni üye" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Forum kategorileri */}
        <Card>
          <h2 className="mb-4 font-semibold">Forum Konuları — Kategoriye Göre</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={topicsByCategory} layout="vertical" margin={{ left: 0, right: 20 }}>
              <XAxis type="number" tick={{ fontSize: 11, fill: "var(--muted)" }} />
              <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11, fill: "var(--muted)" }} />
              <Tooltip
                contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8 }}
              />
              <Bar dataKey="count" fill="#0f766e" radius={4} name="Konu sayısı" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Kullanıcı ülkeleri */}
        <Card>
          <h2 className="mb-4 font-semibold">Kullanıcılar — Ülkeye Göre</h2>
          {usersByCountry.length === 0 ? (
            <p className="py-8 text-center text-muted">Veri yok</p>
          ) : (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="60%" height={200}>
                <PieChart>
                  <Pie
                    data={usersByCountry}
                    dataKey="count"
                    nameKey="country"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={40}
                    label={false}
                  >
                    {usersByCountry.map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <ul className="flex flex-col gap-1.5 text-sm">
                {usersByCountry.map((r, idx) => (
                  <li key={r.country} className="flex items-center gap-2">
                    <span
                      className="inline-block h-3 w-3 rounded-full"
                      style={{ background: COLORS[idx % COLORS.length] }}
                    />
                    <span className="text-muted">{r.country}</span>
                    <span className="ml-auto font-medium">{r.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        {/* Reply / konu oranı */}
        <Card>
          <h2 className="mb-4 font-semibold">Aktivite Özeti</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={[
                { name: "Konular", total: summary.totalTopics, yeni: summary.newTopics },
                { name: "Cevaplar", total: summary.totalReplies, yeni: summary.newReplies },
                { name: "Mesajlar", total: summary.totalMessages, yeni: summary.newMessages },
                { name: "Etkinlikler", total: summary.totalEvents, yeni: summary.newEvents },
              ]}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted)" }} />
              <YAxis tick={{ fontSize: 11, fill: "var(--muted)" }} />
              <Tooltip
                contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8 }}
              />
              <Legend />
              <Bar dataKey="total" name="Toplam" fill="#0f766e" radius={4} />
              <Bar dataKey="yeni" name={`+${days}g`} fill="#14b8a6" radius={4} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}
