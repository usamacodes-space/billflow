import { NextResponse } from "next/server";
import { databaseErrorResponse } from "@/lib/db-errors";
import { prisma } from "@/lib/prisma";
import {
  createSessionToken,
  setSessionCookie,
  verifyPassword,
} from "@/lib/auth-session";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }
    const token = await createSessionToken(user.id);
    await setSessionCookie(token);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    const db = databaseErrorResponse(e);
    if (db) {
      return NextResponse.json({ error: db.message }, { status: db.status });
    }
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
