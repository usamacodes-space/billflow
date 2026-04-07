"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth-session";
import { syncTransactionsForUser } from "@/lib/sync-transactions";

export async function runTransactionSync() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  const { imported } = await syncTransactionsForUser(user.id);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/bills");
  return { imported };
}
