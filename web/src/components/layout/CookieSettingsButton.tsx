"use client";

import { clearConsent } from "@/lib/cookie-consent";

export function CookieSettingsButton() {
  function handleClick() {
    clearConsent();
    window.location.reload();
  }

  return (
    <button
      onClick={handleClick}
      className="text-muted hover:text-primary text-left"
    >
      Çerez Ayarları
    </button>
  );
}
