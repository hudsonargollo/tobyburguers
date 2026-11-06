import { NextResponse, type NextRequest } from "next/server";

// Signed-out visitors heading for a members-only page are sent to sign in
// *before* anything renders. (Doing it inside the page meant the browser first
// showed the store header + footer around an empty page, then jumped to the
// sign-in screen.) Only cookie presence is checked here — the pages still verify
// the session itself, so a stale or forged cookie gets the in-page redirect.

const CUSTOMER_COOKIE = "toby_customer";
const ADMIN_COOKIE = "toby_admin";

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const admin = pathname === "/admin" || pathname.startsWith("/admin/");

  if (admin) {
    if (pathname === "/admin/login" || request.cookies.has(ADMIN_COOKIE)) return NextResponse.next();
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  if (request.cookies.has(CUSTOMER_COOKIE)) return NextResponse.next();
  const login = new URL("/login", request.url);
  login.searchParams.set("next", pathname + search);
  return NextResponse.redirect(login);
}

// Literals only — the matcher is read statically at build time.
export const config = {
  matcher: [
    { source: "/account/:path*", missing: [{ type: "cookie", key: "toby_customer" }] },
    { source: "/checkout", missing: [{ type: "cookie", key: "toby_customer" }] },
    { source: "/admin/:path*", missing: [{ type: "cookie", key: "toby_admin" }] },
  ],
};
