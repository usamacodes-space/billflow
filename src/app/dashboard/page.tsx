import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { TxnClassification } from "@/lib/constants";
import { formatMoney, signedLabel } from "@/lib/format";
import { PlaidConnectButton } from "@/components/PlaidConnectButton";
import { SyncButton } from "@/components/SyncButton";

const RANGE_DAYS = 90;

function classLabel(c: string) {
  switch (c) {
    case TxnClassification.INCOME_MATCHED:
      return "Income (rule)";
    case TxnClassification.MISC_INCOME:
      return "Misc income";
    case TxnClassification.BILL_PAYMENT:
      return "Bill payment";
    default:
      return "Misc expense";
  }
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const from = new Date();
  from.setDate(from.getDate() - RANGE_DAYS);

  const [accounts, txns, metricsRows, openCycles] = await Promise.all([
    prisma.bankAccount.findMany({
      where: { userId: user.id },
      include: { bankItem: true },
    }),
    prisma.transaction.findMany({
      where: { userId: user.id, date: { gte: from } },
      orderBy: { date: "desc" },
      take: 40,
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
      take: 12,
    }),
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

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1
          className="text-2xl font-extrabold tracking-tight md:text-3xl"
          style={{ fontFamily: "var(--font-syne), system-ui" }}
        >
          Financial overview
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Pipeline: bank → transactions → rule engine → classification → state.
          Showing last {RANGE_DAYS} days.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Matched income"
          value={formatMoney(incomeMatched)}
          hint="Salary & rules"
          tone="income"
        />
        <MetricCard
          title="Misc income"
          value={formatMoney(miscIncome)}
          hint="Unmatched inflows"
          tone="income"
        />
        <MetricCard
          title="Bills paid"
          value={formatMoney(billSpend)}
          hint="Matched to bills"
          tone="neutral"
        />
        <MetricCard
          title="Misc spending"
          value={formatMoney(miscExpense)}
          hint="Everything else out"
          tone="expense"
        />
      </section>

      <section className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-6">
        <h2 className="text-lg font-semibold">Bank connection</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Link via Plaid (sandbox). Then sync to ingest and classify transactions.
        </p>
        <div className="mt-4 flex flex-wrap items-start gap-4">
          <PlaidConnectButton />
          <SyncButton />
        </div>
        {accounts.length ? (
          <ul className="mt-6 space-y-2 text-sm text-[var(--muted)]">
            {accounts.map((a) => (
              <li key={a.id}>
                <span className="text-[var(--foreground)]">{a.name}</span>
                {a.mask ? ` ···${a.mask}` : ""}
                <span className="text-[var(--muted)]">
                  {" "}
                  — {a.bankItem.institutionName ?? "Linked institution"}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-[var(--muted)]">No accounts linked yet.</p>
        )}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-6">
          <h2 className="text-lg font-semibold">Upcoming bill cycles</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Cycles awaiting or receiving payment.
          </p>
          <ul className="mt-4 space-y-3">
            {openCycles.length === 0 ? (
              <li className="text-sm text-[var(--muted)]">
                Add bills under Bills & cycles — cycles are generated automatically.
              </li>
            ) : (
              openCycles.map((c) => (
                <li
                  key={c.id}
                  className="flex justify-between gap-4 border-b border-[var(--card-border)] pb-3 text-sm last:border-0"
                >
                  <div>
                    <span className="font-medium text-[var(--foreground)]">
                      {c.bill.name}
                    </span>
                    <span className="text-[var(--muted)]"> · {c.periodLabel}</span>
                    <div className="text-xs text-[var(--muted)]">
                      Due {c.dueDate.toLocaleDateString("en-GB")} · {c.status}
                    </div>
                  </div>
                  <div className="text-right text-xs">
                    <div>Paid {formatMoney(c.paidAmount)}</div>
                    <div className="text-[var(--muted)]">
                      of {formatMoney(c.expectedAmount)}
                    </div>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-6">
          <h2 className="text-lg font-semibold">How matching works</h2>
          <ul className="mt-3 list-inside list-disc space-y-2 text-sm text-[var(--muted)]">
            <li>
              <strong className="text-[var(--foreground)]">Inflows</strong> (credit): checked
              against income rules (name contains match text, optional amount tolerance).
            </li>
            <li>
              <strong className="text-[var(--foreground)]">Outflows</strong> (debit): checked
              against bills; nearest open cycle within ~{14} days gets the payment.
            </li>
            <li>Anything unmatched stays in misc income / misc expense — nothing is dropped.</li>
          </ul>
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-6">
        <h2 className="text-lg font-semibold">Transaction feed</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Raw bank data with classification from the rule engine.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--card-border)] text-[var(--muted)]">
                <th className="pb-2 pr-4 font-medium">Date</th>
                <th className="pb-2 pr-4 font-medium">Description</th>
                <th className="pb-2 pr-4 font-medium">Amount</th>
                <th className="pb-2 font-medium">Classification</th>
              </tr>
            </thead>
            <tbody>
              {txns.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-[var(--muted)]">
                    Connect a bank and sync to see transactions.
                  </td>
                </tr>
              ) : (
                txns.map((t) => (
                  <tr
                    key={t.id}
                    className="border-b border-[var(--card-border)]/60 last:border-0"
                  >
                    <td className="py-2.5 pr-4 align-top text-[var(--muted)]">
                      {t.date.toLocaleDateString("en-GB")}
                    </td>
                    <td className="py-2.5 pr-4 align-top">
                      <div>{t.name}</div>
                      {t.merchantName ? (
                        <div className="text-xs text-[var(--muted)]">{t.merchantName}</div>
                      ) : null}
                    </td>
                    <td
                      className={`py-2.5 pr-4 align-top font-medium ${
                        t.amount < 0 ? "text-[var(--income)]" : "text-[var(--expense)]"
                      }`}
                    >
                      {signedLabel(t.amount)}
                    </td>
                    <td className="py-2.5 align-top text-xs text-[var(--muted)]">
                      <div className="text-[var(--foreground)]">{classLabel(t.classification)}</div>
                      {t.matchNote ? <div>{t.matchNote}</div> : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function MetricCard({
  title,
  value,
  hint,
  tone,
}: {
  title: string;
  value: string;
  hint: string;
  tone: "income" | "expense" | "neutral";
}) {
  const border =
    tone === "income"
      ? "border-emerald-500/20"
      : tone === "expense"
        ? "border-red-400/20"
        : "border-[var(--card-border)]";
  return (
    <div className={`rounded-2xl border ${border} bg-[var(--card)] p-5`}>
      <div className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
        {title}
      </div>
      <div className="mt-2 text-2xl font-bold tabular-nums">{value}</div>
      <div className="mt-1 text-xs text-[var(--muted)]">{hint}</div>
    </div>
  );
}
