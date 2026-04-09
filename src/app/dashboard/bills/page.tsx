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
        <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">Bills</p>
        <h1
          className="mt-1 text-2xl font-extrabold tracking-tight md:text-3xl"
          style={{ fontFamily: "var(--font-syne), system-ui" }}
        >
          Track what you owe
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
          Add each bill once (name, rough amount, how often it’s due). We watch your spending for
          lines that match the text you choose — same idea as income, but for money going out.
          Each period shows up as a cycle so you can see paid vs still due.
        </p>
      </div>

      <section className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-5 md:p-6">
        <h2 className="text-base font-semibold">Add a bill</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Give it a name you recognise, then paste text that appears on card or bank lines when you
          pay (often the merchant name in capitals).
        </p>
        <form action={createBill} className="mt-5 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium text-[var(--foreground)]">Bill name</span>
              <input
                name="name"
                required
                placeholder="Netflix, Council tax, Gym…"
                className="rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-3 py-2.5 outline-none ring-[var(--accent)] focus:ring-2"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium text-[var(--foreground)]">Text to match</span>
              <span className="text-xs text-[var(--muted)]">We look for this in the transaction description.</span>
              <input
                name="matchText"
                required
                placeholder="e.g. NETFLIX or COUNCIL TAX"
                className="rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-3 py-2.5 outline-none ring-[var(--accent)] focus:ring-2"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-[var(--foreground)]">Amount</span>
              <select
                name="amountType"
                className="rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-3 py-2.5 outline-none ring-[var(--accent)] focus:ring-2"
              >
                <option value={BillAmountType.FIXED}>Same each time (fixed)</option>
                <option value={BillAmountType.VARIABLE}>Varies (utilities, etc.)</option>
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-[var(--muted)]">Typical amount (£)</span>
              <input
                name="expectedAmount"
                type="number"
                step="0.01"
                placeholder="For fixed bills — e.g. 10.99"
                className="rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-3 py-2.5 outline-none ring-[var(--accent)] focus:ring-2"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-[var(--foreground)]">How often</span>
              <select
                name="frequency"
                className="rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-3 py-2.5 outline-none ring-[var(--accent)] focus:ring-2"
              >
                <option value={BillFrequency.MONTHLY}>Monthly</option>
                <option value={BillFrequency.WEEKLY}>Weekly</option>
                <option value={BillFrequency.CUSTOM_DAYS}>Every N days</option>
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-[var(--muted)]">Due day of month (1–28)</span>
              <input
                name="dueDayOfMonth"
                type="number"
                min={1}
                max={28}
                defaultValue={1}
                className="rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-3 py-2.5 outline-none ring-[var(--accent)] focus:ring-2"
              />
            </label>
          </div>

          <details className="rounded-xl border border-[var(--card-border)] bg-[var(--background)]/40 px-4 py-3">
            <summary className="cursor-pointer text-sm font-medium text-[var(--foreground)]">
              More options <span className="font-normal text-[var(--muted)]">(weekly schedule, custom gap, matching tolerance)</span>
            </summary>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="text-[var(--muted)]">Due weekday if weekly (0 = Sunday … 6 = Saturday)</span>
                <input
                  name="dueDayOfWeek"
                  type="number"
                  min={0}
                  max={6}
                  defaultValue={1}
                  className="rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 outline-none ring-[var(--accent)] focus:ring-2"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="text-[var(--muted)]">Repeat every N days (custom)</span>
                <input
                  name="customDays"
                  type="number"
                  min={1}
                  placeholder="14"
                  className="rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 outline-none ring-[var(--accent)] focus:ring-2"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
                <span className="text-[var(--muted)]">Amount tolerance (£) — how close a payment must be to your typical amount</span>
                <input
                  name="amountTolerance"
                  type="number"
                  step="0.01"
                  defaultValue={0.5}
                  className="max-w-xs rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 outline-none ring-[var(--accent)] focus:ring-2"
                />
              </label>
            </div>
          </details>

          <button
            type="submit"
            className="rounded-xl bg-[var(--accent)] px-6 py-2.5 text-sm font-semibold text-[var(--accent-fg)]"
          >
            Save bill
          </button>
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
                    className="rounded-lg border border-[var(--card-border)] px-4 py-2 text-sm text-[var(--muted)] transition hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-300"
                  >
                    Remove
                  </button>
                </form>
              </div>
              <h4 className="mt-4 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                Recent periods
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
