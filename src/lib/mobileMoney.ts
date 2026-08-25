/**
 * Mobile Money USSD — auto-dial; client enters PIN only.
 * Orange CM: #150*1*1*658660487*2500#
 * MTN CM:    *126*1*1*658660487*2500#
 */
import { buildUssdCode, toLocalCmPhoneDigits } from "@/lib/phone";

export type MobilePhoneFormat = "local" | "international_237";

export type MobileMoneyRoute = {
  senderCountry: string;
  method: string;
  ussdTemplate: string;
  /** local = 658660487 · international_237 = 237658660487 in USSD */
  phoneFormat: MobilePhoneFormat;
  label?: string;
};

/** Fallback when DB has no row for sender country. */
export const DEFAULT_MOBILE_MONEY_ROUTES: MobileMoneyRoute[] = [
  {
    senderCountry: "Cameroon",
    method: "orange_money",
    ussdTemplate: "#150*1*1*{phone}*{amount}#",
    phoneFormat: "local",
    label: "Orange Money",
  },
  {
    senderCountry: "Cameroon",
    method: "mtn_momo",
    ussdTemplate: "*126*1*1*{phone}*{amount}#",
    phoneFormat: "local",
    label: "MTN MoMo",
  },
  // CEMAC — send to Orange/MTN Cameroon wallet (237 prefix in USSD)
  ...(["Gabon", "Congo", "Chad", "Central African Republic", "Equatorial Guinea"] as const).flatMap(
    (country) => [
      {
        senderCountry: country,
        method: "orange_money",
        ussdTemplate: "#144*1*237{phone}*{amount}#",
        phoneFormat: "local" as const,
        label: `Orange Money (${country} → CM)`,
      },
      {
        senderCountry: country,
        method: "mtn_momo",
        ussdTemplate: "*133*1*237{phone}*{amount}#",
        phoneFormat: "local" as const,
        label: `MTN MoMo (${country} → CM)`,
      },
    ],
  ),
];

export function formatPhoneForUssd(localDestination: string, format: MobilePhoneFormat): string {
  const local = toLocalCmPhoneDigits(localDestination);
  if (format === "international_237") return `237${local}`;
  return local;
}

export function buildMobileMoneyUssd(
  template: string,
  amount: number,
  destinationLocal: string,
  phoneFormat: MobilePhoneFormat = "local",
): string {
  const phone = formatPhoneForUssd(destinationLocal, phoneFormat);
  return buildUssdCode(template, amount, phone);
}

/** Opens phone dialer with pre-filled USSD — user only confirms PIN. */
export function launchMobileMoneyUssd(ussd: string): void {
  window.location.href = `tel:${encodeURIComponent(ussd)}`;
}

export function resolveMobileMoneyRoute(
  accounts: Array<{
    method: string;
    sender_country?: string | null;
    ussd_template?: string | null;
    phone_format?: string | null;
    label?: string;
  }>,
  method: string,
  senderCountry?: string | null,
): MobileMoneyRoute | null {
  const country = (senderCountry?.trim() || "Cameroon").toLowerCase();
  const normalized = accounts.filter((a) => a.method === method);

  const pick =
    normalized.find((a) => (a.sender_country ?? "Cameroon").toLowerCase() === country) ??
    normalized.find((a) => (a.sender_country ?? "Cameroon").toLowerCase() === "cameroon") ??
    normalized[0];

  if (pick?.ussd_template) {
    return {
      senderCountry: pick.sender_country ?? "Cameroon",
      method: pick.method,
      ussdTemplate: pick.ussd_template,
      phoneFormat: (pick.phone_format as MobilePhoneFormat) ?? "local",
      label: pick.label,
    };
  }

  return (
    DEFAULT_MOBILE_MONEY_ROUTES.find(
      (r) => r.method === method && r.senderCountry.toLowerCase() === country,
    ) ??
    DEFAULT_MOBILE_MONEY_ROUTES.find(
      (r) => r.method === method && r.senderCountry === "Cameroon",
    ) ??
    null
  );
}

export function isMobileMoneyMethod(method: string) {
  return method === "orange_money" || method === "mtn_momo";
}
