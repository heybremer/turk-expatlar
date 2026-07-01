/** Header, footer ve ana içerik için ortak genişlik */
export const siteContentClass = "mx-auto w-full max-w-6xl min-w-0 px-4";

/** Standart sayfa içeriği padding */
export const sitePagePaddingClass = "py-8";

export const sitePageShellClass = `${siteContentClass} ${sitePagePaddingClass}`;

/** Tam genişlik hero / admin / sohbet / üyelik landing — dış shell uygulanmaz */
export function isFullBleedRoute(pathname: string): boolean {
  if (pathname === "/") return true;
  if (pathname === "/uyelik") return true;
  if (pathname.startsWith("/admin")) return true;
  if (pathname.startsWith("/sohbet")) return true;
  return false;
}
