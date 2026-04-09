import { formatMoney } from "@/lib/format";
import type { BankConnectionView } from "@/lib/plaid-account-balances";
import { DisconnectBankForm } from "@/components/DisconnectBankForm";

function accountTypeLabel(type: string, subtype: string | null) {
  const s = subtype?.replace(/_/g, " ") ?? "";
  if (s) return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
}

function balanceHint(
  label: "available" | "current" | "unknown",
  accountType: string,
) {
  if (label === "available") return "Available now";
  if (label === "current") {
    return accountType.toLowerCase() === "credit" ? "Current balance (owed)" : "Current balance";
  }
  return null;
}

export function ConnectedBanksSection({ connections }: { connections: BankConnectionView[] }) {
  if (connections.length === 0) return null;

  return (
    <div className="mt-5 space-y-5 border-t border-[var(--card-border)] pt-5">
      {connections.map((conn) => (
        <article
          key={conn.bankItemId}
          className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] p-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-emerald-300/95">
                  Connected
                </span>
                <h3 className="text-lg font-semibold text-[var(--foreground)]">
                  {conn.institutionName}
                </h3>
              </div>
              {conn.balanceFetchFailed ? (
                <p className="mt-2 text-xs text-amber-200/90">
                  Live balances could not be refreshed — account names are still shown from your last
                  link.
                </p>
              ) : (
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Balances are loaded from your bank right now (may differ from pending charges).
                </p>
              )}
            </div>
          </div>

          <ul className="mt-4 space-y-3">
            {conn.accounts.map((a) => (
              <li
                key={a.bankAccountId}
                className="flex flex-col gap-1 rounded-xl border border-[var(--card-border)] bg-[var(--background)]/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="font-medium text-[var(--foreground)]">
                    {a.name}
                    {a.mask ? (
                      <span className="font-normal text-[var(--muted)]"> · ••••{a.mask}</span>
                    ) : null}
                  </div>
                  <div className="text-xs text-[var(--muted)]">{accountTypeLabel(a.type, a.subtype)}</div>
                </div>
                <div className="text-left sm:text-right">
                  {a.balance != null ? (
                    <>
                      <div className="text-xl font-bold tabular-nums tracking-tight text-[var(--foreground)]">
                        {formatMoney(a.balance, a.currency)}
                      </div>
                      {balanceHint(a.balanceLabel, a.type) ? (
                        <div className="text-xs text-[var(--muted)]">
                          {balanceHint(a.balanceLabel, a.type)}
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <div className="text-sm text-[var(--muted)]">Balance unavailable</div>
                  )}
                </div>
              </li>
            ))}
          </ul>

          <DisconnectBankForm bankItemId={conn.bankItemId} institutionName={conn.institutionName} />
        </article>
      ))}
    </div>
  );
}
