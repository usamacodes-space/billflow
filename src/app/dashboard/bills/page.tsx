import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { BillAmountType, BillFrequency } from "@/lib/constants";
import { formatMoney } from "@/lib/format";
import { createBill, deleteBill } from "@/app/actions/bills";

export default async function BillsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const bills = await prisma.bill.findMany({
    where: { userId: user.id },
    include: {
      cycles: { orderBy: { dueDate: "desc" }, take: 6 },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1
          className="text-2xl font-extrabold tracking-tight"
          style={{ fontFamily: "var(--font-syne), system-ui" }}
        >
          Bills & cycles
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Recurring obligations generate cycles (e.g. April rent, May rent). Payments from
          your bank are matched by description keywords.
        </p>
      </div>

      <section className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-6">
        <h2 className="text-lg font-semibold">Add bill</h2>
        <form action={createBill} className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-[var(--muted)]">Name</span>
            <input
              name="name"
              required
              placeholder="Netflix"
              className="rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 outline-none ring-[var(--accent)] focus:ring-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-[var(--muted)]">Match text (in txn description)</span>
            <input
              name="matchText"
              required
              placeholder="NETFLIX"
              className="rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 outline-none ring-[var(--accent)] focus:ring-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-[var(--muted)]">Amount type</span>
            <select
              name="amountType"
              className="rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 outline-none ring-[var(--accent)] focus:ring-2"
            >
              <option value={BillAmountType.FIXED}>Fixed</option>
              <option value={BillAmountType.VARIABLE}>Variable</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-[var(--muted)]">Expected amount (fixed bills)</span>
            <input
              name="expectedAmount"
              type="number"
              step="0.01"
              placeholder="10.99"
              className="rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 outline-none ring-[var(--accent)] focus:ring-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-[var(--muted)]">Frequency</span>
            <select
              name="frequency"
              className="rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 outline-none ring-[var(--accent)] focus:ring-2"
            >
              <option value={BillFrequency.MONTHLY}>Monthly</option>
              <option value={BillFrequency.WEEKLY}>Weekly</option>
              <option value={BillFrequency.CUSTOM_DAYS}>Custom (days)</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-[var(--muted)]">Due day of month (monthly)</span>
            <input
              name="dueDayOfMonth"
              type="number"
              min={1}
              max={28}
              defaultValue={1}
              className="rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 outline-none ring-[var(--accent)] focus:ring-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-[var(--muted)]">Due weekday (weekly, 0=Sun)</span>
            <input
              name="dueDayOfWeek"
              type="number"
              min={0}
              max={6}
              defaultValue={1}
              className="rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 outline-none ring-[var(--accent)] focus:ring-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-[var(--muted)]">Custom period (days)</span>
            <input
              name="customDays"
              type="number"
              min={1}
              placeholder="14"
              className="rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 outline-none ring-[var(--accent)] focus:ring-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-[var(--muted)]">Amount tolerance (£)</span>
            <input
              name="amountTolerance"
              type="number"
              step="0.01"
              defaultValue={0.5}
              className="rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 outline-none ring-[var(--accent)] focus:ring-2"
            />
          </label>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-[var(--accent-fg)]"
            >
              Save bill
            </button>
          </div>
        </form>
      </section>

      <section className="space-y-6">
        {bills.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No bills yet.</p>
        ) : (
          bills.map((bill) => (
            <article
              key={bill.id}
              className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold">{bill.name}</h3>
                  <p className="text-sm text-[var(--muted)]">
                    Match “{bill.matchText}” · {bill.frequency.toLowerCase()} ·{" "}
                    {bill.amountType === BillAmountType.FIXED
                      ? `~${formatMoney(bill.expectedAmount ?? 0)}`
                      : "Variable"}
                  </p>
                </div>
                <form action={deleteBill.bind(null, bill.id)}>
                  <button
                    type="submit"
                    className="text-sm text-[var(--expense)] hover:underline"
                  >
                    Delete
                  </button>
                </form>
              </div>
              <h4 className="mt-4 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                Recent cycles
              </h4>
              <ul className="mt-2 space-y-2 text-sm">
                {bill.cycles.map((c) => (
                  <li
                    key={c.id}
                    className="flex justify-between gap-4 border-b border-[var(--card-border)]/50 py-2 last:border-0"
                  >
                    <span>
                      {c.periodLabel}{" "}
                      <span className="text-[var(--muted)]">({c.status})</span>
                    </span>
                    <span className="text-[var(--muted)]">
                      {formatMoney(c.paidAmount)} / {formatMoney(c.expectedAmount)}
                    </span>
                  </li>
                ))}
              </ul>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
