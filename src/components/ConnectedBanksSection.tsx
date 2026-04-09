"use client";

import { useCallback, useEffect, useState } from "react";
import { formatMoney } from "@/lib/format";
import type { BankConnectionView } from "@/lib/plaid-account-balances";
import { DisconnectBankForm } from "@/components/DisconnectBankForm";

const POLL_MS = 45_000;
const FIRST_POLL_MS = 6_000;

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

function formatUpdatedAt(d: Date) {
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function ConnectedBanksSection({
  initialConnections,
}: {
  initialConnections: BankConnectionView[];
}) {
  const [connections, setConnections] = useState(initialConnections);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    setConnections(initialConnections);
  }, [initialConnections]);

  const fetchBalances = useCallback(async () => {
    if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
    setRefreshing(true);
    try {
      const r = await fetch("/api/plaid/balances", { cache: "no-store", credentials: "same-origin" });
      if (!r.ok) return;
      const j = (await r.json()) as { connections?: BankConnectionView[] };
      if (Array.isArray(j.connections)) {
        setConnections(j.connections);
        setLastUpdated(new Date());
      }
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (initialConnections.length === 0) return;

    const onVisible = () => {
      if (document.visibilityState === "visible") void fetchBalances();
    };

    const firstTimer = window.setTimeout(() => void fetchBalances(), FIRST_POLL_MS);
    const interval = window.setInterval(() => void fetchBalances(), POLL_MS);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    return () => {
      window.clearTimeout(firstTimer);
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [fetchBalances, initialConnections.length]);

  if (connections.length === 0) return null;

  return (
    <div className="mt-5 space-y-5 border-t border-[var(--card-border)] pt-5">
      <p className="text-xs text-[var(--muted)]">
        Balances refresh automatically about every {Math.round(POLL_MS / 1000)}s while this tab is
        open, and whenever you come back to the page. Figures come from your bank via Plaid.
        {lastUpdated ? (
          <>
            {" "}
            <span className="text-[var(--foreground)]/80">
              Last updated {formatUpdatedAt(lastUpdated)}
            </span>
          </>
        ) : null}
        {refreshing ? (
          <span className="ml-2 text-[var(--accent)]">· Updating…</span>
        ) : null}
      </p>

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
              ) : null}
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
