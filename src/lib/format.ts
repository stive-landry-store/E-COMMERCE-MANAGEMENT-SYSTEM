export const CURRENCY = "FCFA";

export function formatMoney(amount: number | string | null | undefined) {
  const n = Number(amount ?? 0);
  return `${new Intl.NumberFormat("fr-FR").format(Math.round(n))} ${CURRENCY}`;
}

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatDateOnly(value: string | Date | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(value));
}
