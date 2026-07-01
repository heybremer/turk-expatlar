"use client";

import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import { isFullBleedRoute, sitePageShellClass } from "@/lib/site-layout";

export function MainWrapper({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isChat = pathname.startsWith("/sohbet");
  const fullBleed = isFullBleedRoute(pathname);

  return (
    <main
      className={`flex flex-1 flex-col min-w-0 overflow-x-hidden md:pb-0 ${
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
