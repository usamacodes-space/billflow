const gbp = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
});

export function formatMoney(amount: number, currency = "GBP") {
  if (currency === "GBP") return gbp.format(amount);
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
  }).format(amount);
}

/** Plaid: negative = inflow (income), positive = outflow (expense) */
export function signedLabel(amount: number): string {
  if (amount < 0) return `+${formatMoney(Math.abs(amount))}`;
  return `−${formatMoney(amount)}`;
}
