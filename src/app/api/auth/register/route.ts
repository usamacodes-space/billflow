import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSessionToken, hashPassword, setSessionCookie } from "@/lib/auth-session";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    if (!email || !password || password.length < 8) {
      return NextResponse.json(
        { error: "Valid email and password (8+ chars) required" },
        { status: 400 }
      );
    }
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({ data: { email, passwordHash } });
    const token = await createSessionToken(user.id);
    await setSessionCookie(token);
    return NextResponse.json({ ok: true, userId: user.id });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
