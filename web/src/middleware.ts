import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify, type JWTPayload } from "jose";

/**
 * Oturum açık iken girilmesi anlamsız sayfalar.
 * JWT cookie varsa role göre yönlendir; yalnızca "s" indicator varsa
 * istemciye bırak (token localStorage'da olabilir).
 */
const AUTH_ONLY_PATHS = ["/giris", "/kayit"];
const NOINDEX_PATHS = [
  "/admin",
  "/profil",
  "/ayarlar",
  "/giris",
  "/kayit",
  "/hosgeldin",
];

type TokenPayload = JWTPayload & { role?: string };

async function readTokenPayload(token: string): Promise<TokenPayload | null> {
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;
  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret),
    );
    return payload as TokenPayload;
  } catch {
    return null;
  }
}

function resolveDestination(
  request: NextRequest,
  payload: TokenPayload | null,
): string {
  const redirect = request.nextUrl.searchParams.get("redirect");
  if (redirect?.startsWith("/") && !redirect.startsWith("//")) {
    return redirect;
  }

  if (payload?.role === "ADMIN" || payload?.role === "MODERATOR") {
    return "/admin";
  }

  return "/akis";
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const forwardedHost =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    "";
  const hostname = forwardedHost.split(":")[0].toLowerCase();

  if (hostname === "turkexpatlar.de") {
    const canonicalUrl = request.nextUrl.clone();
    canonicalUrl.protocol = "https:";
    canonicalUrl.hostname = "www.turkexpatlar.de";
    canonicalUrl.port = "";
    return NextResponse.redirect(canonicalUrl, 308);
  }

  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
  const shouldNoIndex = NOINDEX_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
  const indicatorCookie = request.cookies.get("s")?.value;
  const tokenCookie = request.cookies.get("token")?.value;

  if (isAdmin && !tokenCookie && indicatorCookie !== "1") {
    const loginUrl = new URL("/giris", request.nextUrl.origin);
    loginUrl.searchParams.set(
      "redirect",
      `${pathname}${request.nextUrl.search}`,
    );
    const response = NextResponse.redirect(loginUrl);
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    return response;
  }

  const isAuthOnly = AUTH_ONLY_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
  if (!isAuthOnly) {
    const response = NextResponse.next();
    if (shouldNoIndex) {
      response.headers.set("X-Robots-Tag", "noindex, nofollow");
    }
    return response;
  }

  if (tokenCookie) {
    const payload = await readTokenPayload(tokenCookie);
    if (payload) {
      const destination = resolveDestination(request, payload);
      const destUrl = new URL(destination, request.nextUrl.origin);
      destUrl.search = "";
      return NextResponse.redirect(destUrl);
    }
  }

  // Yalnızca indicator — token localStorage'da; istemci yönlendirsin
  const response = NextResponse.next();
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
