import { NextResponse } from "next/server";
import { CountryCode, Products } from "plaid";
import { getCurrentUser } from "@/lib/auth-session";
import { getPlaidClient } from "@/lib/plaid-client";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const plaid = getPlaidClient();
    const res = await plaid.linkTokenCreate({
      user: { client_user_id: user.id },
      client_name: "BillFlow",
      // Balance enables /accounts/balance/get for fresher figures; falls back to /accounts/get if unsupported.
      products: [Products.Transactions, Products.Balance],
      country_codes: [CountryCode.Gb, CountryCode.Us],
      language: "en",
    });
    return NextResponse.json({ link_token: res.data.link_token });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Could not create Plaid link. Check PLAID_* env vars." },
      { status: 500 }
    );
  }
}
