import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { syncTransactionsForUser } from "@/lib/sync-transactions";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { imported } = await syncTransactionsForUser(user.id);
    return NextResponse.json({ ok: true, imported });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
