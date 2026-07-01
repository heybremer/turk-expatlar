"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, UserPlus } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";

const ROLES = ["USER", "MODERATOR", "ADMIN", "BUSINESS_OWNER"];

export default function AdminNewUserPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState("USER");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      await api.post("/admin/users", { email, password, displayName, role }, token);
      setSuccess("Kullanıcı oluşturuldu.");
      setTimeout(() => router.push("/admin/kullanicilar"), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Oluşturulamadı");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md">
      <Link href="/admin/kullanicilar" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Kullanıcı listesi
      </Link>
      <div className="flex items-center gap-2">
        <UserPlus className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-bold">Yeni Kullanıcı Ekle</h1>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="text-sm text-muted">E-posta</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
        </div>
        <div>
          <label className="text-sm text-muted">Şifre (min. 8 karakter)</label>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
        </div>
        <div>
          <label className="text-sm text-muted">Görünen ad</label>
          <input
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
        </div>
        <div>
          <label className="text-sm text-muted">Rol</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}
        {success && <p className="text-sm text-success">{success}</p>}

        <Button type="submit" disabled={loading}>
          {loading ? "Kaydediliyor…" : "Kullanıcı Oluştur"}
        </Button>
      </form>
    </div>
  );
}
