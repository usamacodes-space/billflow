"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";

export async function createIncomeRule(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  const name = String(formData.get("name") ?? "").trim();
  const matchText = String(formData.get("matchText") ?? "").trim();
  const expectedAmount = formData.get("expectedAmount")
    ? Number(formData.get("expectedAmount"))
    : null;
  const amountTolerance = formData.get("amountTolerance")
    ? Number(formData.get("amountTolerance"))
    : 0;
  if (!name || !matchText) throw new Error("Name and match text required");
  await prisma.incomeRule.create({
    data: {
      userId: user.id,
      name,
      matchText,
      expectedAmount: Number.isFinite(expectedAmount ?? NaN) ? expectedAmount : null,
      amountTolerance,
    },
  });
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/income");
}

export async function deleteIncomeRule(id: string, _formData?: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  await prisma.incomeRule.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/income");
}
