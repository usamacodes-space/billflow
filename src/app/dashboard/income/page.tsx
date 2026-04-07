import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { formatMoney } from "@/lib/format";
import { createIncomeRule, deleteIncomeRule } from "@/app/actions/income-rules";

export default async function IncomeRulesPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const rules = await prisma.incomeRule.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1
          className="text-2xl font-extrabold tracking-tight"
          style={{ fontFamily: "var(--font-syne), system-ui" }}
        >
          Income rules
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Positive inflows (Plaid negative amounts) are tested against these rules first.
          Use employer or transfer keywords; optional expected amount catches salary
          consistency.
        </p>
      </div>

      <section className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-6">
        <h2 className="text-lg font-semibold">Add rule</h2>
        <form action={createIncomeRule} className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-[var(--muted)]">Label</span>
            <input
              name="name"
              required
              placeholder="Salary"
              className="rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 outline-none ring-[var(--accent)] focus:ring-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-[var(--muted)]">Match text</span>
            <input
              name="matchText"
              required
              placeholder="ACME LTD"
              className="rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 outline-none ring-[var(--accent)] focus:ring-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-[var(--muted)]">Expected amount (optional)</span>
            <input
              name="expectedAmount"
              type="number"
              step="0.01"
              placeholder="2500"
              className="rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 outline-none ring-[var(--accent)] focus:ring-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-[var(--muted)]">Amount tolerance (£)</span>
            <input
              name="amountTolerance"
              type="number"
              step="0.01"
              defaultValue={25}
              className="rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 outline-none ring-[var(--accent)] focus:ring-2"
            />
          </label>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-[var(--accent-fg)]"
            >
              Save rule
            </button>
          </div>
        </form>
      </section>

      <section className="space-y-4">
        {rules.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No income rules yet.</p>
        ) : (
          rules.map((r) => (
            <div
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] px-5 py-4"
            >
              <div>
                <div className="font-medium">{r.name}</div>
                <div className="text-sm text-[var(--muted)]">
                  Match “{r.matchText}”
                  {r.expectedAmount != null
                    ? ` · expect ~${formatMoney(r.expectedAmount)} (±${formatMoney(r.amountTolerance)})`
                    : ""}
                </div>
              </div>
              <form action={deleteIncomeRule.bind(null, r.id)}>
                <button
                  type="submit"
                  className="text-sm text-[var(--expense)] hover:underline"
                >
                  Delete
                </button>
              </form>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
