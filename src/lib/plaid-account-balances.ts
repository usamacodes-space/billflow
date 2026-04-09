import { decryptPlaidToken } from "@/lib/crypto-tokens";
import { prisma } from "@/lib/prisma";
import { getPlaidClient } from "@/lib/plaid-client";

export type LiveBalanceAccount = {
  bankAccountId: string;
  plaidAcctId: string;
  name: string;
  mask: string | null;
  type: string;
  subtype: string | null;
  currency: string;
  /** Best guess for “money available now” */
  balance: number | null;
  balanceLabel: "available" | "current" | "unknown";
};

export type BankConnectionView = {
  bankItemId: string;
  institutionName: string;
  accounts: LiveBalanceAccount[];
  balanceFetchFailed: boolean;
};

/**
 * Loads linked items from DB and merges current balances from Plaid (accountsGet).
 */
export async function getBankConnectionsWithBalances(
  userId: string,
): Promise<BankConnectionView[]> {
  const items = await prisma.bankItem.findMany({
    where: { userId },
    include: { accounts: { orderBy: { name: "asc" } } },
    orderBy: { createdAt: "asc" },
  });

  const plaid = getPlaidClient();
  const out: BankConnectionView[] = [];

  for (const item of items) {
    let balanceFetchFailed = false;
    const byPlaidId = new Map<
      string,
      { balance: number; currency: string; label: "available" | "current" }
    >();

    try {
      const accessToken = decryptPlaidToken(item.accessTokenEnc);
      const res = await plaid.accountsGet({ access_token: accessToken });
      for (const a of res.data.accounts) {
        const b = a.balances;
        const cur = b.current ?? null;
        const avail = b.available ?? null;
        const iso = b.iso_currency_code ?? b.unofficial_currency_code ?? "GBP";
        if (avail != null) {
          byPlaidId.set(a.account_id, {
            balance: avail,
            currency: iso,
            label: "available",
          });
        } else if (cur != null) {
          byPlaidId.set(a.account_id, {
            balance: cur,
            currency: iso,
            label: "current",
          });
        }
      }
    } catch (e) {
      console.error("accountsGet failed for item", item.id, e);
      balanceFetchFailed = true;
    }

    const institutionName =
      item.institutionName?.trim() || "Connected bank";

    const accounts: LiveBalanceAccount[] = item.accounts.map((acc) => {
      const live = byPlaidId.get(acc.plaidAcctId);
      return {
        bankAccountId: acc.id,
        plaidAcctId: acc.plaidAcctId,
        name: acc.name,
        mask: acc.mask,
        type: acc.type,
        subtype: acc.subtype,
        currency: live?.currency ?? acc.currency,
        balance: live ? live.balance : null,
        balanceLabel: live ? live.label : "unknown",
      };
    });

    out.push({
      bankItemId: item.id,
      institutionName,
      accounts,
      balanceFetchFailed,
    });
  }

  return out;
}
