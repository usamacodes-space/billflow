import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { TxnClassification } from "@/lib/constants";
import { formatMoney } from "@/lib/format";
import { createIncomeRule, deleteIncomeRule } from "@/app/actions/income-rules";

const SUGGESTION_LIMIT = 10;

type Suggestion = {
  id: string;
  title: string;
  matchText: string;
  subtitle: string;
  amountLabel: string;
};

function buildSuggestions(
  rows: { name: string; merchantName: string | null; amount: number; date: Date }[],
): Suggestion[] {
  const seen = new Set<string>();
  const out: Suggestion[] = [];
  for (const t of rows) {
    const title =
      t.merchantName && t.merchantName.trim().length > 0
        ? t.merchantName.trim()
        : t.name.trim();
    if (!title) continue;
    const key = title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const matchText =
      title.length <= 48 ? title : t.name.trim().slice(0, 48) || title.slice(0, 48);
    const subtitle =
      t.merchantName && t.merchantName.trim() && t.name.trim() !== t.merchantName.trim()
        ? `Bank line includes: ${t.name.trim().slice(0, 56)}${t.name.length > 56 ? "…" : ""}`
        : "From your recent deposits";
    out.push({
      id: key,
      title,
      matchText,
      subtitle,
      amountLabel: formatMoney(Math.abs(t.amount)),
    });
    if (out.length >= SUGGESTION_LIMIT) break;
  }
  return out;
}

export default async function IncomePage({
  searchParams,
}: {
  searchParams: Promise<{ name?: string; match?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;

  const sp = await searchParams;
  const prefillName = (sp.name ?? "").slice(0, 120);
  const prefillMatch = (sp.match ?? "").slice(0, 120);

  const [rules, recentInflows, matchedCount] = await Promise.all([
    prisma.incomeRule.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.transaction.findMany({
      where: { userId: user.id, amount: { lt: 0 } },
      orderBy: { date: "desc" },
      take: 48,
      select: { name: true, merchantName: true, amount: true, date: true },
    }),
    prisma.transaction.count({
      where: { userId: user.id, classification: TxnClassification.INCOME_MATCHED },
    }),
  ]);

  const suggestions = buildSuggestions(recentInflows);

  return (
    <div className="flex flex-col gap-10">
      <header className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
          Income
        </p>
        <h1
          className="text-2xl font-extrabold tracking-tight md:text-3xl"
          style={{ fontFamily: "var(--font-syne), system-ui" }}
        >
          Tell us where your money comes from
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
          When money lands in your account, your bank sends a short description (employer name,
          &quot;SALARY&quot;, client name, etc.). Add a simple rule so we can count those deposits
          under <strong className="font-medium text-[var(--foreground)]">Money in</strong> on your
          home screen. Matching ignores capital letters.
        </p>
        <ol className="max-w-xl list-decimal space-y-1.5 pl-5 text-sm text-[var(--muted)]">
          <li>Link your bank and sync on <Link href="/dashboard" className="text-[var(--accent)] underline decoration-white/20 underline-offset-2 hover:decoration-white/40">Home</Link>.</li>
          <li>Add a rule below (or tap a suggestion from your recent deposits).</li>
          <li>New deposits we import will use these rules automatically.</li>
        </ol>
      </header>

      {matchedCount > 0 ? (
        <p className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-[var(--foreground)]">
          <span className="font-medium text-emerald-400/90">Nice — </span>
          {matchedCount} deposit{matchedCount === 1 ? "" : "s"} already match your rules and feed{" "}
          <strong className="font-medium">Money in</strong>.
        </p>
      ) : rules.length > 0 ? (
        <p className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-[var(--foreground)]">
          You have {rules.length} rule{rules.length === 1 ? "" : "s"}, but no deposits are tagged yet.
          Check that <strong className="font-medium">Match text</strong> appears in the bank
          description, or try a shorter phrase. Future syncs will keep trying.
        </p>
      ) : null}

      {suggestions.length > 0 ? (
        <section className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-5 md:p-6">
          <h2 className="text-base font-semibold text-[var(--foreground)]">
            Start from your recent deposits
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Pick one to pre-fill the form. You can edit the text before saving.
          </p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {suggestions.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/dashboard/income?${new URLSearchParams({
                    name: s.title.slice(0, 80),
                    match: s.matchText,
                  }).toString()}`}
                  className="flex flex-col rounded-xl border border-[var(--card-border)] bg-[var(--background)]/50 px-4 py-3 transition hover:border-[var(--accent)]/40 hover:bg-[var(--background)]"
                >
                  <span className="font-medium text-[var(--foreground)]">{s.title}</span>
                  <span className="mt-0.5 text-xs text-[var(--muted)]">{s.subtitle}</span>
                  <span className="mt-2 text-xs tabular-nums text-[var(--income)]">
                    Last seen {s.amountLabel}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <section className="rounded-2xl border border-dashed border-[var(--card-border)] bg-[var(--card)]/50 px-5 py-8 text-center text-sm text-[var(--muted)]">
          No incoming deposits in your data yet. Connect your bank on{" "}
          <Link href="/dashboard" className="text-[var(--accent)] underline underline-offset-2">
            Home
          </Link>{" "}
          and sync — suggestions will show up here.
        </section>
      )}

      <section className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-5 md:p-6">
        <h2 className="text-base font-semibold">Add income</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Only two fields are required. The rest helps if you get several similar deposits and want
          to lock onto a specific amount (like a fixed salary).
        </p>

        <form action={createIncomeRule} className="mt-6 space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium text-[var(--foreground)]">Friendly name</span>
              <span className="text-xs text-[var(--muted)]">How you think of this income — only you see it.</span>
              <input
                name="name"
                required
                defaultValue={prefillName}
                placeholder="e.g. Main job, Side gig, Rent from flat"
                autoComplete="off"
                className="rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-3 py-2.5 outline-none ring-[var(--accent)] focus:ring-2"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium text-[var(--foreground)]">Text to match</span>
              <span className="text-xs text-[var(--muted)]">
                If this text appears anywhere in the bank description, we treat the deposit as this
                income. Shorter is often better (e.g. company name only).
              </span>
              <input
                name="matchText"
                required
                defaultValue={prefillMatch}
                placeholder="e.g. ACME PAYROLL or CLIENT INVOICE"
                autoComplete="off"
                className="rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-3 py-2.5 outline-none ring-[var(--accent)] focus:ring-2"
              />
            </label>
          </div>

          <details className="rounded-xl border border-[var(--card-border)] bg-[var(--background)]/40 px-4 py-3">
            <summary className="cursor-pointer text-sm font-medium text-[var(--foreground)] outline-none marker:text-[var(--muted)]">
              Optional: expected amount{" "}
              <span className="font-normal text-[var(--muted)]">(salary / fixed payments)</span>
            </summary>
            <p className="mt-2 text-xs leading-relaxed text-[var(--muted)]">
              Leave blank to match <strong className="text-[var(--foreground)]">any</strong> deposit
              that contains your text. Use expected amount only when you want to require a specific
              sum (within a small tolerance).
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="text-[var(--muted)]">Expected amount (£)</span>
                <input
                  name="expectedAmount"
                  type="number"
                  step="0.01"
                  placeholder="Leave empty = any amount"
                  className="rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 outline-none ring-[var(--accent)] focus:ring-2"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="text-[var(--muted)]">Tolerance (£)</span>
                <input
                  name="amountTolerance"
                  type="number"
                  step="0.01"
                  defaultValue={25}
                  className="rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 outline-none ring-[var(--accent)] focus:ring-2"
                />
              </label>
            </div>
          </details>

          <button
            type="submit"
            className="rounded-xl bg-[var(--accent)] px-6 py-2.5 text-sm font-semibold text-[var(--accent-fg)] transition hover:opacity-95"
          >
            Save income
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-base font-semibold">Your income rules</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {rules.length === 0
            ? "Nothing saved yet — add one above."
            : "Delete a rule anytime; future deposits won’t use it."}
        </p>
        <ul className="mt-4 space-y-3">
          {rules.length === 0 ? null : (
            rules.map((r) => (
              <li
                key={r.id}
                className="flex flex-col gap-4 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-lg font-semibold text-[var(--foreground)]">{r.name}</span>
                    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-300/90">
                      Money in
                    </span>
                  </div>
                  <p className="text-sm text-[var(--muted)]">
                    Matches when the description contains{" "}
                    <q className="text-[var(--foreground)]">{r.matchText}</q>
                    {r.expectedAmount != null && r.expectedAmount > 0
                      ? ` · expects about ${formatMoney(r.expectedAmount)} (±${formatMoney(r.amountTolerance)})`
                      : " · any amount"}
                  </p>
                </div>
                <form action={deleteIncomeRule.bind(null, r.id)} className="shrink-0">
                  <button
                    type="submit"
                    className="rounded-lg border border-[var(--card-border)] px-4 py-2 text-sm text-[var(--muted)] transition hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-300"
                  >
                    Remove
                  </button>
                </form>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
