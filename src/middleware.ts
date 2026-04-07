import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const COOKIE = "billflow_session";

export async function middleware(req: NextRequest) {
  if (!req.nextUrl.pathname.startsWith("/dashboard")) {
    return NextResponse.next();
  }
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  const token = req.cookies.get(COOKIE)?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  try {
    await jwtVerify(token, new TextEncoder().encode(secret));
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL("/login", req.url));
  }
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
