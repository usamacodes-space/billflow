import { NextResponse } from "next/server";
import { encryptPlaidToken } from "@/lib/crypto-tokens";
import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { getPlaidClient } from "@/lib/plaid-client";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const public_token = String(body.public_token ?? "");
  if (!public_token) {
    return NextResponse.json({ error: "public_token required" }, { status: 400 });
  }
  try {
    const plaid = getPlaidClient();
    const ex = await plaid.itemPublicTokenExchange({ public_token });
    const accessToken = ex.data.access_token;
    const itemId = ex.data.item_id;
    const enc = encryptPlaidToken(accessToken);

    const itemGet = await plaid.itemGet({ access_token: accessToken });
    const institutionName =
      itemGet.data.item.institution_name ?? itemGet.data.item.institution_id ?? null;

    const acctRes = await plaid.accountsGet({ access_token: accessToken });
    const accounts = acctRes.data.accounts;

    const bankItem = await prisma.bankItem.upsert({
      where: { itemId },
      create: {
        userId: user.id,
        itemId,
        accessTokenEnc: enc,
        institutionName: institutionName ?? undefined,
        transactionsCursor: null,
      },
      update: {
        accessTokenEnc: enc,
        institutionName: institutionName ?? undefined,
        transactionsCursor: null,
      },
    });

    for (const a of accounts) {
      await prisma.bankAccount.upsert({
        where: {
          bankItemId_plaidAcctId: {
            bankItemId: bankItem.id,
            plaidAcctId: a.account_id,
          },
        },
        create: {
          userId: user.id,
          bankItemId: bankItem.id,
          plaidAcctId: a.account_id,
          name: a.name,
          mask: a.mask ?? null,
          type: a.type,
          subtype: a.subtype ?? null,
          currency: a.balances.iso_currency_code ?? "GBP",
        },
        update: {
          name: a.name,
          mask: a.mask ?? null,
          type: a.type,
          subtype: a.subtype ?? null,
          currency: a.balances.iso_currency_code ?? "GBP",
        },
      });
    }

    return NextResponse.json({ ok: true, accounts: accounts.length });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Plaid exchange failed" }, { status: 500 });
  }
}
