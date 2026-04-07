export const TxnClassification = {
  INCOME_MATCHED: "INCOME_MATCHED",
  MISC_INCOME: "MISC_INCOME",
  BILL_PAYMENT: "BILL_PAYMENT",
  MISC_EXPENSE: "MISC_EXPENSE",
} as const;
export type TxnClassification =
  (typeof TxnClassification)[keyof typeof TxnClassification];

export const BillFrequency = {
  WEEKLY: "WEEKLY",
  MONTHLY: "MONTHLY",
  CUSTOM_DAYS: "CUSTOM_DAYS",
} as const;
export type BillFrequency = (typeof BillFrequency)[keyof typeof BillFrequency];

export const BillAmountType = {
  FIXED: "FIXED",
  VARIABLE: "VARIABLE",
} as const;
export type BillAmountType =
  (typeof BillAmountType)[keyof typeof BillAmountType];

export const BillCycleStatus = {
  UPCOMING: "UPCOMING",
  DUE: "DUE",
  PAID: "PAID",
  PARTIAL: "PARTIAL",
  OVERPAID: "OVERPAID",
  MISSED: "MISSED",
  COMPLETED: "COMPLETED",
} as const;
export type BillCycleStatus =
  (typeof BillCycleStatus)[keyof typeof BillCycleStatus];
