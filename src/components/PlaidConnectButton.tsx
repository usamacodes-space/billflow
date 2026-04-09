"use client";

import { useCallback, useState } from "react";
import { usePlaidLink, PlaidLinkOnSuccess } from "react-plaid-link";
import { useRouter } from "next/navigation";

export function PlaidConnectButton({ linked = false }: { linked?: boolean }) {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const openLink = useCallback(async () => {
    setErr(null);
    setLoading(true);
    try {
      const r = await fetch("/api/plaid/link-token", { method: "POST" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Link token failed");
      setToken(j.link_token);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not start Plaid");
    } finally {
      setLoading(false);
    }
  }, []);

  const onSuccess = useCallback<PlaidLinkOnSuccess>(
    async (public_token) => {
      setErr(null);
      try {
        const r = await fetch("/api/plaid/exchange", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ public_token }),
        });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error ?? "Exchange failed");
        setToken(null);
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Exchange failed");
      }
    },
    [router]
  );

  const { open, ready } = usePlaidLink({
    token: token,
    onSuccess,
    onExit: () => setToken(null),
  });

  return (
    <div className="flex flex-col gap-2">
      {token ? (
        <button
          type="button"
          disabled={!ready}
          onClick={() => open()}
          className="rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--accent-fg)] shadow-sm transition hover:opacity-95 disabled:opacity-50"
        >
          {ready ? "Continue in Plaid…" : "Loading Plaid…"}
        </button>
      ) : (
        <button
          type="button"
          disabled={loading}
          onClick={openLink}
          className="rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--accent-fg)] shadow-sm transition hover:opacity-95 disabled:opacity-50"
        >
          {loading ? "Preparing…" : linked ? "Add another bank" : "Connect bank (Plaid)"}
        </button>
      )}
      {err ? <p className="text-sm text-red-400">{err}</p> : null}
    </div>
  );
}
