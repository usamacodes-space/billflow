"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth-session";
import { decryptPlaidToken } from "@/lib/crypto-tokens";
import { prisma } from "@/lib/prisma";
import { getPlaidClient } from "@/lib/plaid-client";

export async function disconnectBankItem(bankItemId: string, _formData?: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const item = await prisma.bankItem.findFirst({
    where: { id: bankItemId, userId: user.id },
  });
  if (!item) throw new Error("Bank link not found");

  try {
    const accessToken = decryptPlaidToken(item.accessTokenEnc);
    const plaid = getPlaidClient();
    await plaid.itemRemove({ access_token: accessToken });
  } catch (e) {
    console.error("Plaid itemRemove (continuing with local delete):", e);
  }

  await prisma.bankItem.delete({ where: { id: item.id } });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/income");
  revalidatePath("/dashboard/bills");
}
