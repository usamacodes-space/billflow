import { NextResponse } from "next/server";

/**
 * Plaid webhooks: verify JWT and enqueue sync (future).
 * For sandbox MVP, sync is manual via “Sync transactions”.
 */
export async function POST(req: Request) {
  await req.text().catch(() => "");
  return NextResponse.json({ received: true });
}
