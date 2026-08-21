import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { CreditCard, Smartphone, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/LanguageContext";
import { formatMoney } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import type { DigitalService, PaymentAccount } from "@/types";

type Props = {
  open: boolean;
  onClose: () => void;
  service: DigitalService;
  amount: number;
  originalAmount: number;
  promoCode: string | null;
  discountPercent: number;
};

function methodIcon(method: string) {
  if (method === "credit_card") return CreditCard;
  return Smartphone;
}

function buildUssd(template: string, amount: number, phone: string) {
  const digits = phone.replace(/[^\d]/g, "");
  return template
    .replaceAll("{amount}", String(Math.round(amount)))
    .replaceAll("{phone}", digits)
    .replaceAll("{number}", digits);
}

export function SubscriptionPaymentModal({
  open,
  onClose,
  service,
  amount,
  originalAmount,
  promoCode,
  discountPercent,
}: Props) {
  const { t } = useI18n();
  const { user, profile } = useAuth();
  const [method, setMethod] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  const accountsQ = useQuery({
    queryKey: ["payment-accounts-public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_accounts")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as PaymentAccount[];
    },
    enabled: open,
  });

  const selected = useMemo(
    () => (accountsQ.data ?? []).find((a) => a.method === method) ?? null,
    [accountsQ.data, method],
  );

  if (!open) return null;

  async function createOrder(payMethod: string, account: PaymentAccount | null) {
    if (!user) {
      toast.info(t("signInToPay"));
      return null;
    }
    setBusy(true);
    const { data, error } = await supabase
      .from("service_orders")
      .insert({
        user_id: user.id,
        service_id: service.id,
        service_slug: service.slug,
        service_name: service.name,
        amount,
        original_amount: originalAmount,
        promo_code: promoCode,
        discount_percent: discountPercent,
        payment_method: payMethod,
        payment_account_id: account?.id ?? null,
        destination_account: account?.account_number ?? null,
        status: "pending_payment",
        customer_email: user.email ?? profile?.email ?? null,
        customer_name: profile?.full_name ?? null,
        customer_phone: profile?.phone ?? null,
      })
      .select("id")
      .single();
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return null;
    }
    setOrderId(data.id);
    return data.id as string;
  }

  async function chooseMethod(payMethod: string) {
    setMethod(payMethod);
    const account = (accountsQ.data ?? []).find((a) => a.method === payMethod) ?? null;
    if (user) await createOrder(payMethod, account);
  }

  function payOrangeOrMtn() {
    if (!selected) return;
    const phone = selected.account_number;
    const template = selected.ussd_template || "#150*1*1*{amount}*{phone}#";
    const ussd = buildUssd(template, amount, phone);
    // Opens the phone dialer with the USSD transfer steps pre-filled
    window.location.href = `tel:${encodeURIComponent(ussd)}`;
    toast.success(t("ussdOpened"));
  }

  function callNumber() {
    if (!selected) return;
    window.location.href = `tel:${selected.account_number.replace(/\s/g, "")}`;
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 p-4 sm:items-center" role="dialog">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-white/10 bg-[#0c0a1c] p-5 shadow-2xl sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-white/45">{t("paymentMethods")}</p>
            <h3 className="mt-1 text-xl font-extrabold text-white">{service.name}</h3>
            <p className="mt-1 text-lg font-bold text-white">
              {formatMoney(amount)}
              {discountPercent > 0 ? (
                <span className="ml-2 text-sm font-medium text-white/45 line-through">{formatMoney(originalAmount)}</span>
              ) : null}
            </p>
            {promoCode ? (
              <p className="mt-1 font-mono text-xs text-[#ff2d95]">
                {promoCode} (−{discountPercent}%)
              </p>
            ) : null}
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-white/60 hover:bg-white/10" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        {!method ? (
          <div className="mt-6 space-y-3">
            <p className="text-sm text-white/60">{t("choosePaymentMethod")}</p>
            {(accountsQ.data ?? []).length === 0 && !accountsQ.isLoading ? (
              <p className="text-sm text-amber-300/90">{t("paymentAccountsHint")}</p>
            ) : null}
            {(accountsQ.data ?? []).map((a) => {
              const Icon = methodIcon(a.method);
              return (
                <button
                  key={a.id}
                  type="button"
                  disabled={busy}
                  onClick={() => chooseMethod(a.method)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:border-[#ff2d95]/50 hover:bg-white/10"
                >
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-grad text-white">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block font-bold text-white">{a.label}</span>
                    <span className="block text-xs text-white/50">{a.account_number}</span>
                  </span>
                </button>
              );
            })}
          </div>
        ) : selected ? (
          <div className="mt-6 space-y-4">
            <button type="button" className="text-sm text-white/50 hover:text-white" onClick={() => setMethod(null)}>
              ← {t("changeMethod")}
            </button>
            <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
              <p className="text-sm font-bold text-white">{selected.label}</p>
              <p className="mt-2 text-xs uppercase tracking-wider text-white/40">{t("payToAccount")}</p>
              <p className="mt-1 font-mono text-lg font-bold text-white">{selected.account_number}</p>
              {selected.account_name ? <p className="text-sm text-white/60">{selected.account_name}</p> : null}
              {selected.bank_name ? <p className="text-sm text-white/60">{selected.bank_name}</p> : null}
              {selected.instructions ? <p className="mt-3 text-sm text-white/55">{selected.instructions}</p> : null}
              {orderId ? (
                <p className="mt-3 text-xs text-white/40">
                  {t("orderRef")}: <span className="font-mono text-white/70">{orderId.slice(0, 8).toUpperCase()}</span>
                </p>
              ) : null}
            </div>

            {selected.method === "orange_money" || selected.method === "mtn_momo" ? (
              <div className="space-y-2">
                <Button className="w-full border-0 bg-brand-grad text-white" disabled={busy} onClick={payOrangeOrMtn}>
                  {t("payWithUssd")}
                </Button>
                <Button variant="secondary" className="w-full" onClick={callNumber}>
                  {t("callMerchant")} {selected.account_number}
                </Button>
                <p className="text-xs text-white/45">{t("ussdHint")}</p>
              </div>
            ) : (
              <div className="space-y-2">
                <Button
                  className="w-full border-0 bg-brand-grad text-white"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(selected.account_number);
                      toast.success(t("accountCopied"));
                    } catch {
                      toast.error(t("copyFailed"));
                    }
                  }}
                >
                  {t("copyAccountNumber")}
                </Button>
                <p className="text-xs text-white/45">{t("bankTransferHint")}</p>
              </div>
            )}

            <Button variant="ghost" className="w-full" onClick={onClose}>
              {t("done")}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
