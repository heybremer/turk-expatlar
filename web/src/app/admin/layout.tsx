"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useAuth, useAuthHydrated } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { adminNav, ChevronDown, type NavItem } from "@/components/admin/admin-nav";

function NavGroup({ item, pathname, onNavigate }: {
  item: NavItem;
  pathname: string;
  onNavigate: () => void;
}) {
  const hasChildren = !!item.children?.length;
  const isGroupActive = item.href
    ? item.exact ? pathname === item.href : pathname.startsWith(item.href)
    : item.children?.some((c) => pathname === c.href || pathname.startsWith(c.href + "/"));

  const [open, setOpen] = useState(isGroupActive);

  useEffect(() => {
    if (isGroupActive) setOpen(true);
  }, [isGroupActive]);

  const Icon = item.icon;

  if (!hasChildren && item.href) {
    const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
    return (
      <Link
        href={item.href}
        onClick={onNavigate}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
          active ? "bg-primary/10 text-primary" : "text-muted hover:bg-background hover:text-text",
        )}
      >
        <Icon className="h-4 w-4 flex-shrink-0" />
        {item.label}
      </Link>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
          isGroupActive ? "text-primary" : "text-muted hover:bg-background hover:text-text",
        )}
      >
        <Icon className="h-4 w-4 flex-shrink-0" />
        <span className="flex-1 text-left">{item.label}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
      </button>
      {open && item.children && (
        <div className="ml-4 mt-0.5 space-y-0.5 border-l border-border pl-3">
          {item.children.map((child) => {
            const childActive = pathname === child.href;
            return (
              <Link
                key={child.href}
                href={child.href}
                onClick={onNavigate}
                className={cn(
                  "block rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                  childActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted hover:bg-background hover:text-text",
                )}
              >
                {child.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { token, user } = useAuth();
  const hydrated = useAuthHydrated();
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const [apiWarning, setApiWarning] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!hydrated) return;

    if (!token) {
      router.replace("/giris?redirect=/admin");
      setChecking(false);
      return;
    }

    const cachedStaff =
      user?.role === "ADMIN" || user?.role === "MODERATOR";

    if (cachedStaff) {
      setAuthorized(true);
    }

    setChecking(true);
    setApiWarning(null);

    api.get<{ role: string }>("/users/me", token)
      .then((me) => {
        if (["ADMIN", "MODERATOR"].includes(me.role)) {
          setAuthorized(true);
        } else {
          setAuthorized(false);
          router.replace("/");
        }
      })
      .catch((err) => {
        if (cachedStaff) {
          setAuthorized(true);
          if (err instanceof ApiError && err.status === 503) {
            setApiWarning("API bakım modunda. Panel açıldı; bazı işlemler geçici olarak kısıtlı olabilir.");
          }
          return;
        }
        setAuthorized(false);
        router.replace("/giris?redirect=/admin");
      })
      .finally(() => setChecking(false));
  }, [hydrated, token, user?.role, router]);

  if (!hydrated || checking) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted">
        Yetki kontrol ediliyor…
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted">
        Yönlendiriliyor…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black/40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 w-60 flex-shrink-0 border-r border-border bg-surface transition-transform duration-200 md:sticky md:top-0 md:h-screen md:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center justify-between border-b border-border px-4">
            <span className="font-semibold text-primary">Admin Panel</span>
            <button type="button" className="md:hidden" onClick={() => setSidebarOpen(false)}>
              <X className="h-5 w-5 text-muted" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
            {adminNav.map((item) => (
              <NavGroup
                key={item.label}
                item={item}
                pathname={pathname}
                onNavigate={() => setSidebarOpen(false)}
              />
            ))}
          </nav>

          <div className="border-t border-border p-4">
            <Link href="/" className="text-xs text-muted hover:text-primary">← Siteye dön</Link>
          </div>
        </div>
      </aside>

      <div className="flex flex-1 flex-col min-w-0">
        <div className="flex h-14 items-center gap-3 border-b border-border bg-surface px-4 md:hidden">
          <button type="button" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5 text-muted" />
          </button>
          <span className="font-medium">Admin Panel</span>
        </div>
        <main className="flex-1 p-6">
          {apiWarning && (
            <div className="mb-4 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
              {apiWarning}
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
