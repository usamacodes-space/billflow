import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { getBankConnectionsWithBalances } from "@/lib/plaid-account-balances";

/**
 * Latest balances for all linked items (same logic as dashboard SSR).
 * Used by the client poller so UI updates when Plaid has newer numbers.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const connections = await getBankConnectionsWithBalances(user.id);
    return NextResponse.json(
      { connections, fetchedAt: new Date().toISOString() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Balance refresh failed" }, { status: 500 });
  }
}
