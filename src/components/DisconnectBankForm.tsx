"use client";

import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { disconnectBankItem } from "@/app/actions/bank";

function SubmitInner() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-xl border border-red-500/35 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-200 transition hover:bg-red-500/20 disabled:opacity-50"
    >
      {pending ? "Disconnecting…" : "Disconnect this bank"}
    </button>
  );
}

export function DisconnectBankForm({
  bankItemId,
  institutionName,
}: {
  bankItemId: string;
  institutionName: string;
}) {
  const router = useRouter();
  return (
    <form
      action={async () => {
        await disconnectBankItem(bankItemId);
        router.refresh();
      }}
      onSubmit={(e) => {
        if (
          !confirm(
            `Disconnect ${institutionName}? This removes linked accounts and all imported transactions for this bank from BillFlow.`,
          )
        ) {
          e.preventDefault();
        }
      }}
      className="mt-4"
    >
      <SubmitInner />
    </form>
  );
}
