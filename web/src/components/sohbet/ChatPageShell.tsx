"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ReactNode } from "react";
import { siteContentClass } from "@/lib/site-layout";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  subtitle?: ReactNode;
  status?: ReactNode;
  headerActions?: ReactNode;
  backHref?: string;
  children: ReactNode;
};

export function ChatPageShell({ title, subtitle, status, headerActions, backHref = "/sohbet", children }: Props) {
  return (
    <div className={cn("flex min-h-0 w-full flex-1 flex-col overflow-hidden md:py-4", siteContentClass)}>
      {/* Desktop header — mobilde gizli; mobil başlık her sayfa kendi içinde yönetir */}
      <div className="mb-3 hidden items-center gap-3 md:flex">
        <Link href={backHref} className="flex items-center gap-1.5 text-sm text-muted hover:text-text">
          <ArrowLeft className="h-4 w-4" /> Sohbet
        </Link>
        <span className="text-muted">/</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-text">{title}</p>
          {subtitle && <div className="text-xs text-muted">{subtitle}</div>}
        </div>
        {(headerActions || status) && (
          <div className="flex flex-shrink-0 items-center gap-2">
            {headerActions}
            {status}
          </div>
        )}
      </div>
      <div className="flex min-h-0 flex-1 overflow-hidden md:gap-3">{children}</div>
    </div>
  );
}
