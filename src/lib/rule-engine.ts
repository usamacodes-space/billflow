import type { BillCycle } from "@prisma/client";
import { BillCycleStatus, TxnClassification } from "./constants";
import { prisma } from "./prisma";
import {
  amountMatchesExpected,
  ensureBillCycles,
  refreshCycleStatuses,
  textMatchesRule,
} from "./bill-cycles";

const BILL_DATE_WINDOW_DAYS = 14;

function daysBetween(a: Date, b: Date) {
  const ms = Math.abs(a.getTime() - b.getTime());
  return ms / 86400000;
}

function txnHaystack(name: string, merchant: string | null) {
  return `${name} ${merchant ?? ""}`.trim();
}

export async function classifyAndPersistTransaction(params: {
  userId: string;
  transactionId: string;
  amount: number;
  date: Date;
  name: string;
  merchantName: string | null;
}) {
  const { userId, transactionId, amount, date, name, merchantName } = params;
  const hay = txnHaystack(name, merchantName);

  const incomeRules = await prisma.incomeRule.findMany({ where: { userId } });
  const bills = await prisma.bill.findMany({ where: { userId } });

  for (const b of bills) {
    await ensureBillCycles(b);
  }

  // Plaid: negative amount = money in (income)
  if (amount < 0) {
    const inflow = Math.abs(amount);
    for (const rule of incomeRules) {
      if (!textMatchesRule(hay, rule.matchText)) continue;
      if (
        !amountMatchesExpected(
          inflow,
          rule.expectedAmount,
          rule.amountTolerance
        )
      )
        continue;
      await prisma.transaction.update({
        where: { id: transactionId },
        data: {
          classification: TxnClassification.INCOME_MATCHED,
          incomeRuleId: rule.id,
          billId: null,
          billCycleId: null,
          matchNote: `Income rule: ${rule.name}`,
        },
      });
      return;
    }
    await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        classification: TxnClassification.MISC_INCOME,
        incomeRuleId: null,
        billId: null,
        billCycleId: null,
        matchNote: "No income rule matched",
      },
    });
    return;
  }

  // Positive amount = outflow (expense / bill)
  if (amount > 0) {
    const outflow = amount;
    for (const bill of bills) {
      if (!textMatchesRule(hay, bill.matchText)) continue;
      const tol = bill.amountTolerance ?? 0;
      if (
        bill.amountType === "FIXED" &&
        bill.expectedAmount != null &&
        !amountMatchesExpected(outflow, bill.expectedAmount, tol)
      ) {
        continue;
      }

      const cycles = await prisma.billCycle.findMany({
        where: {
          billId: bill.id,
          status: {
            in: [
              BillCycleStatus.UPCOMING,
              BillCycleStatus.DUE,
              BillCycleStatus.PARTIAL,
              BillCycleStatus.MISSED,
            ],
          },
        },
        orderBy: { dueDate: "asc" },
      });

      let best: BillCycle | null = null;
      let bestScore = Infinity;
      for (const c of cycles) {
        const d = daysBetween(date, c.dueDate);
        if (d <= BILL_DATE_WINDOW_DAYS && d < bestScore) {
          bestScore = d;
          best = c;
        }
      }
      if (!best && cycles.length) {
        best = cycles[0];
      }

      if (best) {
        const newPaid = best.paidAmount + outflow;
        const expected = best.expectedAmount;
        let status = best.status as BillCycleStatus;
        if (expected <= 0) {
          status = BillCycleStatus.PAID;
        } else if (newPaid >= expected * 1.001) {
          status = BillCycleStatus.OVERPAID;
        } else if (newPaid >= expected * 0.999) {
          status = BillCycleStatus.PAID;
        } else if (newPaid > 0) {
          status = BillCycleStatus.PARTIAL;
        }

        await prisma.$transaction([
          prisma.billCycle.update({
            where: { id: best.id },
            data: { paidAmount: newPaid, status },
          }),
          prisma.transaction.update({
            where: { id: transactionId },
            data: {
              classification: TxnClassification.BILL_PAYMENT,
              billId: bill.id,
              billCycleId: best.id,
              incomeRuleId: null,
              matchNote: `Bill: ${bill.name} → ${best.periodLabel}`,
            },
          }),
        ]);
        await refreshCycleStatuses(bill.id);
        return;
      }

      await prisma.transaction.update({
        where: { id: transactionId },
        data: {
          classification: TxnClassification.BILL_PAYMENT,
          billId: bill.id,
          billCycleId: null,
          incomeRuleId: null,
          matchNote: `Bill match without cycle: ${bill.name}`,
        },
      });
      return;
    }

    await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        classification: TxnClassification.MISC_EXPENSE,
        billId: null,
        billCycleId: null,
        incomeRuleId: null,
        matchNote: "No bill rule matched",
      },
    });
  }
}
