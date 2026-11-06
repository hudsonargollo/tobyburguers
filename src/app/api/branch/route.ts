import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { BRANCH_COOKIE } from "@/lib/branch";

// Behind the reverse proxy the request URL points at the internal bind address
// (0.0.0.0:3004), so redirects must be built from the public host headers.
function publicOrigin(request: NextRequest) {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!host) return request.nextUrl.origin;
  const proto = request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "");
  return `${proto}://${host}`;
}

// Sets the shopper's branch and sends them back where they were.
export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug") ?? "";
  const requested = request.nextUrl.searchParams.get("next") ?? "/";
  // Only same-site paths (no protocol-relative redirects).
  const next = requested.startsWith("/") && !requested.startsWith("//") ? requested : "/";

  const branch = slug
    ? await prisma.branch
        .findFirst({ where: { slug, active: true }, select: { slug: true } })
        .catch(() => null)
    : null;

  if (!branch) {
    return NextResponse.redirect(new URL("/sucursal?error=1", publicOrigin(request)));
  }

  const res = NextResponse.redirect(new URL(next, publicOrigin(request)));
  res.cookies.set(BRANCH_COOKIE, branch.slug, {
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
