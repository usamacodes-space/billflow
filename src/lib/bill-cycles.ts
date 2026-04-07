import type { Bill } from "@prisma/client";
import { BillCycleStatus, BillFrequency } from "./constants";
import { prisma } from "./prisma";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addMonths(d: Date, n: number) {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
}

function addWeeks(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n * 7);
  return x;
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function monthLabel(d: Date) {
  return d.toLocaleString("en-GB", { month: "short", year: "numeric" });
}

function dueDateForMonth(bill: Bill, year: number, monthIndex: number): Date {
  const day = Math.min(bill.dueDayOfMonth ?? 1, 28);
  return startOfDay(new Date(year, monthIndex, day));
}

function dueDateForWeek(bill: Bill, anchor: Date): Date {
  const dow = bill.dueDayOfWeek ?? 1;
  const d = startOfDay(new Date(anchor));
  const diff = (dow - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + diff);
  return d;
}

export async function ensureBillCycles(
  bill: Bill,
  opts?: { monthsAhead?: number; weeksAhead?: number }
) {
  const monthsAhead = opts?.monthsAhead ?? 4;
  const weeksAhead = opts?.weeksAhead ?? 12;
  const now = startOfDay(new Date());

  const existing = await prisma.billCycle.findMany({
    where: { billId: bill.id },
    orderBy: { dueDate: "asc" },
  });

  const expected =
    bill.expectedAmount ??
    (bill.amountType === "FIXED" ? 0 : 0);

  if (bill.frequency === BillFrequency.MONTHLY) {
    for (let i = 0; i < monthsAhead; i++) {
      const ref = addMonths(now, i);
      const due = dueDateForMonth(bill, ref.getFullYear(), ref.getMonth());
      const label = monthLabel(due);
      const hit = existing.find(
        (c) => c.periodLabel === label || startOfDay(c.dueDate).getTime() === due.getTime()
      );
      if (!hit) {
        let status: BillCycleStatus = BillCycleStatus.UPCOMING;
        if (due.getTime() < now.getTime()) status = BillCycleStatus.DUE;
        await prisma.billCycle.create({
          data: {
            billId: bill.id,
            periodLabel: label,
            dueDate: due,
            expectedAmount: expected,
            paidAmount: 0,
            status,
          },
        });
      }
    }
  } else if (bill.frequency === BillFrequency.WEEKLY) {
    let cursor = dueDateForWeek(bill, now);
    for (let i = 0; i < weeksAhead; i++) {
      const label = `Week of ${cursor.toISOString().slice(0, 10)}`;
      const hit = existing.some(
        (c) => startOfDay(c.dueDate).getTime() === cursor.getTime()
      );
      if (!hit) {
        let status: BillCycleStatus = BillCycleStatus.UPCOMING;
        if (cursor.getTime() <= now.getTime()) status = BillCycleStatus.DUE;
        await prisma.billCycle.create({
          data: {
            billId: bill.id,
            periodLabel: label,
            dueDate: cursor,
            expectedAmount: expected,
            paidAmount: 0,
            status,
          },
        });
      }
      cursor = addWeeks(cursor, 1);
    }
  } else if (bill.frequency === BillFrequency.CUSTOM_DAYS && bill.customDays) {
    let cursor = startOfDay(now);
    for (let i = 0; i < 6; i++) {
      const due = addDays(cursor, bill.customDays * i);
      const label = `Period ${due.toISOString().slice(0, 10)}`;
      const hit = existing.some(
        (c) => startOfDay(c.dueDate).getTime() === due.getTime()
      );
      if (!hit) {
        let status: BillCycleStatus = BillCycleStatus.UPCOMING;
        if (due.getTime() <= now.getTime()) status = BillCycleStatus.DUE;
        await prisma.billCycle.create({
          data: {
            billId: bill.id,
            periodLabel: label,
            dueDate: due,
            expectedAmount: expected,
            paidAmount: 0,
            status,
          },
        });
      }
    }
  }

  await refreshCycleStatuses(bill.id);
}

export async function refreshCycleStatuses(billId: string) {
  const now = startOfDay(new Date());
  const cycles = await prisma.billCycle.findMany({
    where: { billId },
    orderBy: { dueDate: "asc" },
  });
  for (const c of cycles) {
    if (c.status === BillCycleStatus.COMPLETED) continue;
    const due = startOfDay(c.dueDate);
    let next = c.status;
    if (c.paidAmount <= 0 && due.getTime() < now.getTime() && c.status === BillCycleStatus.UPCOMING) {
      next = BillCycleStatus.DUE;
    }
    if (c.paidAmount <= 0 && due.getTime() < now.getTime() - 86400000 * 5) {
      if (c.status !== BillCycleStatus.PAID && c.status !== BillCycleStatus.PARTIAL && c.status !== BillCycleStatus.OVERPAID) {
        next = BillCycleStatus.MISSED;
      }
    }
    if (next !== c.status) {
      await prisma.billCycle.update({
        where: { id: c.id },
        data: { status: next },
      });
    }
  }
}

export function textMatchesRule(haystack: string, needle: string): boolean {
  const h = haystack.toLowerCase();
  const n = needle.toLowerCase().trim();
  if (!n) return false;
  return h.includes(n);
}

export function amountMatchesExpected(
  txnAmountAbs: number,
  expected: number | null | undefined,
  tolerance: number
): boolean {
  if (expected == null || expected <= 0) return true;
  return Math.abs(txnAmountAbs - expected) <= tolerance;
}
