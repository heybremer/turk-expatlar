"use client";

import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import { isChatAppRoute } from "@/lib/site-layout";

export function FooterVisibility({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isChat = pathname.startsWith("/sohbet");

  // Sohbet uygulama ekranları (kanal/DM) viewport'a sabitlenir; footer burada
  // hiç gösterilmez ki mesaj alanı tüm dikey alanı kullanabilsin.
  if (isChatAppRoute(pathname)) return null;

  return (
    <div className={isChat ? "hidden md:block" : ""} suppressHydrationWarning>
      {children}
    </div>
  );
}
