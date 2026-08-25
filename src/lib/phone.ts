/** Digits only (no spaces, +, etc.). */
export function phoneDigitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Cameroon mobile without country code — e.g. 658660487 (not +237 / 237).
 * Used in Orange/MTN USSD codes where the dialer expects the local number.
 */
export function toLocalCmPhoneDigits(value: string): string {
  let digits = phoneDigitsOnly(value);
  if (digits.startsWith("237") && digits.length >= 12) digits = digits.slice(3);
  if (digits.startsWith("0") && digits.length === 10) digits = digits.slice(1);
  return digits;
}

/** Display +237 6 58 66 04 87 from local or international input. */
export function formatCmPhoneDisplay(value: string): string {
  const local = toLocalCmPhoneDigits(value);
  if (local.length !== 9 || !local.startsWith("6")) return value.trim();
  return `+237 ${local[0]} ${local.slice(1, 3)} ${local.slice(3, 5)} ${local.slice(5, 7)} ${local.slice(7, 9)}`;
}

export function normalizePaymentAccountNumber(method: string, accountNumber: string): string {
  const m = method.toLowerCase();
  if (m === "orange_money" || m === "mtn_momo") {
    return toLocalCmPhoneDigits(accountNumber);
  }
  return accountNumber.trim();
}

/** Build USSD dial string; {phone} / {number} = local CM digits only. */
export function buildUssdCode(template: string, amount: number, destinationPhone: string): string {
  const localPhone = toLocalCmPhoneDigits(destinationPhone);
  return template
    .replaceAll("{amount}", String(Math.round(amount)))
    .replaceAll("{phone}", localPhone)
    .replaceAll("{number}", localPhone);
}
