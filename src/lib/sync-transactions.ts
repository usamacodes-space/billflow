import { TxnClassification } from "./constants";
import { decryptPlaidToken } from "./crypto-tokens";
import { prisma } from "./prisma";
import { getPlaidClient } from "./plaid-client";
import { classifyAndPersistTransaction } from "./rule-engine";

export async function syncTransactionsForUser(userId: string) {
  const items = await prisma.bankItem.findMany({
    where: { userId },
    include: { accounts: true },
  });
  const plaid = getPlaidClient();
  let imported = 0;

  for (const item of items) {
    const accessToken = decryptPlaidToken(item.accessTokenEnc);
    let cursor: string | undefined = item.transactionsCursor ?? undefined;
    let hasMore = true;

    while (hasMore) {
      const res = await plaid.transactionsSync({
        access_token: accessToken,
        cursor,
        count: 100,
      });
      const data = res.data;
      hasMore = data.has_more;
      cursor = data.next_cursor;

      for (const t of data.added) {
        const plaidTxnId = t.transaction_id;
        const exists = await prisma.transaction.findUnique({
          where: { plaidTxnId },
        });
        if (exists) continue;

        const amount = t.amount;
        const date = new Date(t.date + "T12:00:00.000Z");
        const auth = t.authorized_date
          ? new Date(t.authorized_date + "T12:00:00.000Z")
          : null;

        const acct = item.accounts.find((a) => a.plaidAcctId === t.account_id);
        if (!acct) continue;

        const row = await prisma.transaction.create({
          data: {
            userId,
            bankAccountId: acct.id,
            plaidTxnId,
            amount,
            date,
            authorizedDate: auth,
            name: t.name,
            merchantName: t.merchant_name ?? null,
            pending: t.pending,
            classification: TxnClassification.MISC_EXPENSE,
            matchNote: "Pending classification",
          },
        });
        await classifyAndPersistTransaction({
          userId,
          transactionId: row.id,
          amount,
          date,
          name: t.name,
          merchantName: t.merchant_name ?? null,
        });
        imported += 1;
      }

      for (const t of data.modified ?? []) {
        const existing = await prisma.transaction.findUnique({
          where: { plaidTxnId: t.transaction_id },
        });
        if (!existing) continue;
        await prisma.transaction.update({
          where: { id: existing.id },
          data: {
            amount: t.amount,
            date: new Date(t.date + "T12:00:00.000Z"),
            name: t.name,
            merchantName: t.merchant_name ?? null,
            pending: t.pending,
          },
        });
      }

      for (const rm of data.removed ?? []) {
        await prisma.transaction.deleteMany({
          where: { plaidTxnId: rm.transaction_id },
        });
      }
    }

    if (cursor) {
      await prisma.bankItem.update({
        where: { id: item.id },
        data: { transactionsCursor: cursor },
      });
    }
  }

  return { imported };
}
