"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth-session";
import { BillAmountType, BillFrequency } from "@/lib/constants";
import { ensureBillCycles } from "@/lib/bill-cycles";
import { prisma } from "@/lib/prisma";

export async function createBill(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  const name = String(formData.get("name") ?? "").trim();
  const matchText = String(formData.get("matchText") ?? "").trim();
  const amountType = String(formData.get("amountType") ?? "FIXED") as BillAmountType;
  const expectedAmount = formData.get("expectedAmount")
    ? Number(formData.get("expectedAmount"))
    : null;
  const frequency = String(formData.get("frequency") ?? "MONTHLY") as BillFrequency;
  const dueDayOfMonth = formData.get("dueDayOfMonth")
    ? Number(formData.get("dueDayOfMonth"))
    : 1;
  const dueDayOfWeek = formData.get("dueDayOfWeek")
    ? Number(formData.get("dueDayOfWeek"))
    : 1;
  const customDays = formData.get("customDays")
    ? Number(formData.get("customDays"))
    : null;
  const amountTolerance = formData.get("amountTolerance")
    ? Number(formData.get("amountTolerance"))
    : 0;
  if (!name || !matchText) throw new Error("Name and match text required");

  const bill = await prisma.bill.create({
    data: {
      userId: user.id,
      name,
      matchText,
      amountType:
        amountType === BillAmountType.VARIABLE
          ? BillAmountType.VARIABLE
          : BillAmountType.FIXED,
      expectedAmount: Number.isFinite(expectedAmount ?? NaN) ? expectedAmount : null,
      frequency,
      dueDayOfMonth: frequency === BillFrequency.MONTHLY ? dueDayOfMonth : null,
      dueDayOfWeek: frequency === BillFrequency.WEEKLY ? dueDayOfWeek : null,
      customDays: frequency === BillFrequency.CUSTOM_DAYS ? customDays : null,
      amountTolerance,
    },
  });
  await ensureBillCycles(bill);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/bills");
}

export async function deleteBill(id: string, _formData?: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  await prisma.bill.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/bills");
}
