import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { TxnClassification } from "@/lib/constants";
import { formatMoney, signedLabel } from "@/lib/format";
import { PlaidConnectButton } from "@/components/PlaidConnectButton";
import { SyncButton } from "@/components/SyncButton";

const RANGE_DAYS = 90;

function typeLabel(c: string) {
  switch (c) {
    case TxnClassification.INCOME_MATCHED:
      return "Income";
    case TxnClassification.MISC_INCOME:
      return "Other income";
    case TxnClassification.BILL_PAYMENT:
      return "Bill";
    default:
      return "Other spend";
  }
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const from = new Date();
  from.setDate(from.getDate() - RANGE_DAYS);

  const [accounts, txns, metricsRows, openCycles, txnCount] = await Promise.all([
    prisma.bankAccount.findMany({
      where: { userId: user.id },
      include: { bankItem: true },
    }),
    prisma.transaction.findMany({
      where: { userId: user.id, date: { gte: from } },
      orderBy: { date: "desc" },
      take: 25,
      include: { bankAccount: true },
    }),
    prisma.transaction.findMany({
      where: { userId: user.id, date: { gte: from } },
      select: { amount: true, classification: true },
    }),
    prisma.billCycle.findMany({
      where: {
        bill: { userId: user.id },
        status: { in: ["UPCOMING", "DUE", "PARTIAL", "MISSED"] },
      },
      include: { bill: true },
      orderBy: { dueDate: "asc" },
      take: 8,
    }),
    prisma.transaction.count({ where: { userId: user.id } }),
  ]);

  let incomeMatched = 0;
  let miscIncome = 0;
  let billSpend = 0;
  let miscExpense = 0;
  for (const r of metricsRows) {
    if (r.amount < 0) {
      const v = Math.abs(r.amount);
      if (r.classification === TxnClassification.INCOME_MATCHED) incomeMatched += v;
      else miscIncome += v;
    } else if (r.amount > 0) {
      if (r.classification === TxnClassification.BILL_PAYMENT) billSpend += r.amount;
      else miscExpense += r.amount;
    }
  }

  const totalIncome = incomeMatched + miscIncome;
  const bankLinked = accounts.length > 0;

  return (
    <div className="flex flex-col gap-8">
      <header className="space-y-1">
        <h1
          className="text-2xl font-extrabold tracking-tight md:text-3xl"
          style={{ fontFamily: "var(--font-syne), system-ui" }}
        >
          At a glance
        </h1>
        <p className="text-sm text-[var(--muted)]">
          Last {RANGE_DAYS} days from your linked bank. Totals update when you sync.
        </p>
      </header>

      {/* Primary numbers — what most people open the app for */}
      <section className="grid gap-4 sm:grid-cols-3">
        <HeroStat
          label="Money in"
          value={formatMoney(totalIncome)}
          sub={
            incomeMatched > 0 || miscIncome > 0
              ? `${formatMoney(incomeMatched)} from rules · ${formatMoney(miscIncome)} other`
              : "No income in this period yet"
          }
          accent="in"
        />
        <HeroStat
          label="Bills paid"
          value={formatMoney(billSpend)}
          sub={
            billSpend > 0
              ? "Matched to bills you set up"
              : "Add bills and sync — we match payments automatically"
          }
          accent="bill"
        />
        <HeroStat
          label="Other spending"
          value={formatMoney(miscExpense)}
          sub="Everything that isn’t a matched bill"
          accent="out"
        />
      </section>

      {/* Quick health — is the app doing something? */}
      <section className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)]/80 px-5 py-4 text-sm">
        <div className="font-medium text-[var(--foreground)]">Quick check</div>
        <ul className="mt-2 space-y-1.5 text-[var(--muted)]">
          <li className="flex gap-2">
            <span className={bankLinked ? "text-[var(--income)]" : ""}>
              {bankLinked ? "✓" : "○"}
            </span>
            <span>
              {bankLinked
                ? `Bank linked (${accounts.length} account${accounts.length === 1 ? "" : "s"})`
                : "Connect your bank below, then tap Sync"}
            </span>
          </li>
          <li className="flex gap-2">
            <span className={txnCount > 0 ? "text-[var(--income)]" : ""}>
              {txnCount > 0 ? "✓" : "○"}
            </span>
            <span>
              {txnCount > 0
                ? `${txnCount} transaction${txnCount === 1 ? "" : "s"} imported`
                : "No transactions yet — sync after linking"}
            </span>
          </li>
        </ul>
      </section>

      <section className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-5">
        <h2 className="text-base font-semibold">Bank</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Connect once, then use Sync to pull the latest activity.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <PlaidConnectButton />
          <SyncButton />
        </div>
        {bankLinked ? (
          <ul className="mt-4 space-y-1.5 border-t border-[var(--card-border)] pt-4 text-sm text-[var(--muted)]">
            {accounts.map((a) => (
              <li key={a.id}>
                <span className="text-[var(--foreground)]">{a.name}</span>
                {a.mask ? ` · ${a.mask}` : ""}
                <span className="text-[var(--muted)]">
                  {" · "}
                  {a.bankItem.institutionName ?? "Linked"}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-5">
        <h2 className="text-base font-semibold">Bills still to watch</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Due soon or partly paid.           Set up bills under <strong className="text-[var(--foreground)]">Bills</strong> in the menu.
        </p>
        <ul className="mt-4 space-y-3">
          {openCycles.length === 0 ? (
            <li className="text-sm text-[var(--muted)]">No open bill periods right now.</li>
          ) : (
            openCycles.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[var(--card-border)]/60 pb-3 text-sm last:border-0"
              >
                <div>
                  <span className="font-medium text-[var(--foreground)]">{c.bill.name}</span>
                  <span className="text-[var(--muted)]"> · due {c.dueDate.toLocaleDateString("en-GB")}</span>
                </div>
                <div className="tabular-nums text-[var(--muted)]">
                  {formatMoney(c.paidAmount)} / {formatMoney(c.expectedAmount)}
                </div>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-5">
        <h2 className="text-base font-semibold">Recent transactions</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Newest first. Types come from your income and bill rules.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--card-border)] text-[var(--muted)]">
                <th className="pb-2 pr-3 font-medium">Date</th>
                <th className="pb-2 pr-3 font-medium">Description</th>
                <th className="pb-2 pr-3 font-medium">Amount</th>
                <th className="pb-2 font-medium">Type</th>
              </tr>
            </thead>
            <tbody>
              {txns.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-[var(--muted)]">
                    Nothing here yet — connect your bank and sync.
                  </td>
                </tr>
              ) : (
                txns.map((t) => (
                  <tr key={t.id} className="border-b border-[var(--card-border)]/50 last:border-0">
                    <td className="py-2.5 pr-3 text-[var(--muted)]">
                      {t.date.toLocaleDateString("en-GB")}
                    </td>
                    <td className="py-2.5 pr-3">
                      <div className="max-w-[220px] truncate">{t.name}</div>
                    </td>
                    <td
                      className={`py-2.5 pr-3 font-medium tabular-nums ${
                        t.amount < 0 ? "text-[var(--income)]" : "text-[var(--expense)]"
                      }`}
                    >
                      {signedLabel(t.amount)}
                    </td>
                    <td className="py-2.5 text-[var(--muted)]">{typeLabel(t.classification)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-center text-xs text-[var(--muted)]">
        <Link href="/dashboard/income" className="underline decoration-white/20 hover:decoration-white/40">
          Income
        </Link>
        {" · "}
        <Link href="/dashboard/bills" className="underline decoration-white/20 hover:decoration-white/40">
          Bills
        </Link>
      </p>
    </div>
  );
}

function HeroStat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent: "in" | "bill" | "out";
}) {
  const ring =
    accent === "in"
      ? "ring-emerald-500/25"
      : accent === "bill"
        ? "ring-amber-500/30"
        : "ring-white/10";
  return (
    <div className={`rounded-2xl bg-[var(--card)] p-5 ring-1 ${ring}`}>
      <div className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">{label}</div>
      <div className="mt-1 text-3xl font-extrabold tabular-nums tracking-tight md:text-4xl">{value}</div>
      <div className="mt-2 text-xs leading-relaxed text-[var(--muted)]">{sub}</div>
    </div>
  );
}
