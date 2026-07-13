"use client";

import { usePathname } from "next/navigation";
import { ReactNode, useEffect } from "react";
import { isChatAppRoute, isFullBleedRoute, sitePageShellClass } from "@/lib/site-layout";

export function MainWrapper({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isChat = pathname.startsWith("/sohbet");
  const chatApp = isChatAppRoute(pathname);
  const fullBleed = isFullBleedRoute(pathname);

  // Sohbet uygulama ekranlarında sayfa scroll'u kapatılır; mesaj listesi kendi
  // içinde scroll eder. Body viewport'a sabitlenmezse flex-1 zinciri sınırsız
  // büyür ve tüm sayfa (header+footer dahil) scroll etmeye başlar.
  useEffect(() => {
    if (!chatApp) return;
    document.body.classList.add("h-full", "overflow-hidden");
    return () => {
      document.body.classList.remove("h-full", "overflow-hidden");
    };
  }, [chatApp]);

  return (
    <main
      className={`flex flex-1 flex-col min-w-0 min-h-0 overflow-x-hidden md:pb-0 ${
        isChat
          ? "overflow-hidden"
          : "pb-[calc(4.5rem+env(safe-area-inset-bottom))]"
      }`}
      suppressHydrationWarning
    >
      {fullBleed ? children : (
        <div className={sitePageShellClass}>{children}</div>
      )}
    </main>
  );
}
