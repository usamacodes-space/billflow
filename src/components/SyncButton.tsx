"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { runTransactionSync } from "@/app/actions/sync";

export function SyncButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onClick() {
    setBusy(true);
    setMsg(null);
    try {
      const r = await runTransactionSync();
      setMsg(`Imported ${r.imported} new transaction(s).`);
      router.refresh();
    } catch {
      setMsg("Sync failed. Check Plaid credentials and connected accounts.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        disabled={busy}
        onClick={onClick}
        className="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-[var(--foreground)] transition hover:bg-white/10 disabled:opacity-50"
      >
        {busy ? "Syncing…" : "Sync transactions"}
      </button>
      {msg ? <p className="text-xs text-white/60">{msg}</p> : null}
    </div>
  );
}
