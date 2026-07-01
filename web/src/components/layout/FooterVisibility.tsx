"use client";

import { usePathname } from "next/navigation";
import { ReactNode } from "react";

export function FooterVisibility({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isChat = pathname.startsWith("/sohbet");
  return (
    <div className={isChat ? "hidden md:block" : ""} suppressHydrationWarning>
      {children}
    </div>
  );
}
