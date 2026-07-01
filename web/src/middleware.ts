import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify, type JWTPayload } from "jose";

/**
 * Oturum açık iken girilmesi anlamsız sayfalar.
 * JWT cookie varsa role göre yönlendir; yalnızca "s" indicator varsa
 * istemciye bırak (token localStorage'da olabilir).
 */
const AUTH_ONLY_PATHS = ["/giris", "/kayit"];

type TokenPayload = JWTPayload & { role?: string };

async function readTokenPayload(token: string): Promise<TokenPayload | null> {
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    return payload as TokenPayload;
  } catch {
    return null;
  }
}

function resolveDestination(request: NextRequest, payload: TokenPayload | null): string {
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

  const isAuthOnly = AUTH_ONLY_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
  if (!isAuthOnly) return NextResponse.next();

  const indicatorCookie = request.cookies.get("s")?.value;
  const tokenCookie = request.cookies.get("token")?.value;

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
  if (indicatorCookie === "1") {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/giris", "/kayit"],
};
