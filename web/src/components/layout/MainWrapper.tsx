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
  //
  // Mobil klavye: iOS Safari klavye açıldığında layout viewport'u küçültmez,
  // yalnızca görünür (visual) viewport küçülür ve sayfayı kaydırarak input'u
  // göstermeye çalışır — bu da tüm düzeni kaydırır. Bunu önlemek için body
  // yüksekliğini visualViewport yüksekliğine sabitleyip scroll'u sıfırlıyoruz.
  useEffect(() => {
    if (!chatApp) return;
    const body = document.body;
    body.classList.add("h-full", "overflow-hidden", "overscroll-none");

    const vv = window.visualViewport;
    const syncHeight = () => {
      if (!vv) return;
      // Klavye açık: görünür alan layout viewport'tan belirgin şekilde küçük.
      const keyboardOpen = vv.height < window.innerHeight - 50;
      body.style.height = keyboardOpen ? `${vv.height}px` : "";
      window.scrollTo(0, 0);
    };
    vv?.addEventListener("resize", syncHeight);
    vv?.addEventListener("scroll", syncHeight);

    return () => {
      vv?.removeEventListener("resize", syncHeight);
      vv?.removeEventListener("scroll", syncHeight);
      body.style.height = "";
      body.classList.remove("h-full", "overflow-hidden", "overscroll-none");
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
