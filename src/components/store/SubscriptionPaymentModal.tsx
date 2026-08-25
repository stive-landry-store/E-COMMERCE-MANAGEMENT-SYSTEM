import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Copy, CreditCard, Eye, EyeOff, Smartphone, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/LanguageContext";
import { formatMoney } from "@/lib/format";
import { formatCmPhoneDisplay } from "@/lib/phone";
import {
  buildMobileMoneyUssd,
  isMobileMoneyMethod,
  launchMobileMoneyUssd,
  resolveMobileMoneyRoute,
} from "@/lib/mobileMoney";
import { uploadPaymentProof } from "@/lib/paymentProof";
import { Button } from "@/components/ui/Button";
import { PaymentProofForm } from "@/components/store/PaymentProofForm";
import { WhatsAppSupportButton } from "@/components/WhatsAppSupportButton";
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

type ConfirmResult = {
  order_id: string;
  status: string;
  service_slug: string | null;
  delivered_login: string | null;
  delivered_password: string | null;
  customer_icloud_email: string | null;
  amount: number;
};

type Step = "pay" | "proof" | "done";

function methodIcon(method: string) {
  if (method === "credit_card") return CreditCard;
  return Smartphone;
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
  const [step, setStep] = useState<Step>("pay");
  const [icloudEmail, setIcloudEmail] = useState("");
  const [reference, setReference] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [result, setResult] = useState<ConfirmResult | null>(null);
  const [showPass, setShowPass] = useState(false);
  const [ussdLaunched, setUssdLaunched] = useState(false);

  const senderCountry = profile?.country?.trim() || "Cameroon";

  useEffect(() => {
    if (!open) return;
    setMethod(null);
    setBusy(false);
    setOrderId(null);
    setStep("pay");
    setIcloudEmail("");
    setReference("");
    setProofFile(null);
    setResult(null);
    setShowPass(false);
    setUssdLaunched(false);
  }, [open, service.id]);

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

  /** One Orange + one MTN row for the client's country, plus other methods. */
  const payOptions = useMemo(() => {
    const all = accountsQ.data ?? [];
    const mobile = ["orange_money", "mtn_momo"] as const;
    const out: PaymentAccount[] = [];
    for (const m of mobile) {
      const acc =
        all.find(
          (a) => a.method === m && (a.sender_country ?? "Cameroon").toLowerCase() === senderCountry.toLowerCase(),
        ) ?? all.find((a) => a.method === m && (a.sender_country ?? "Cameroon") === "Cameroon");
      if (acc) out.push(acc);
    }
    for (const a of all) {
      if (!mobile.includes(a.method as (typeof mobile)[number])) out.push(a);
    }
    return out;
  }, [accountsQ.data, senderCountry]);

  const selected = useMemo(
    () => payOptions.find((a) => a.method === method) ?? null,
    [payOptions, method],
  );

  const isIcloud = service.slug === "icloud";
  const isAutoCred = service.slug === "netflix-premium" || service.slug === "capcut-pro";

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

  async function ensureOrder(): Promise<string | null> {
    if (orderId) return orderId;
    if (!user) {
      toast.info(t("signInToPay"));
      return null;
    }
    if (!method) return null;
    const account = payOptions.find((a) => a.method === method) ?? null;
    return createOrder(method, account);
  }

  async function goToProofStep() {
    setBusy(true);
    const id = await ensureOrder();
    setBusy(false);
    if (id) setStep("proof");
  }

  function openAutoMobilePay(account: PaymentAccount) {
    const route = resolveMobileMoneyRoute([account], account.method, account.sender_country ?? senderCountry);
    if (!route) {
      toast.error(t("ussdUnavailable"));
      return;
    }
    const ussd = buildMobileMoneyUssd(route.ussdTemplate, amount, account.account_number, route.phoneFormat);
    launchMobileMoneyUssd(ussd);
    setUssdLaunched(true);
    toast.success(t("ussdAutoOpened"));
  }

  async function chooseMethod(payMethod: string) {
    if (!user) {
      toast.info(t("signInToPay"));
      return;
    }
    setMethod(payMethod);
    const account = payOptions.find((a) => a.method === payMethod) ?? null;
    const id = await createOrder(payMethod, account);
    if (id && account && isMobileMoneyMethod(payMethod)) {
      openAutoMobilePay(account);
    }
  }

  async function submitProof() {
    setBusy(true);
    const id = await ensureOrder();
    if (!id) {
      setBusy(false);
      return;
    }
    if (!reference.trim() || reference.trim().length < 4) {
      setBusy(false);
      toast.error(t("transactionReferenceRequired"));
      return;
    }
    if (!proofFile) {
      setBusy(false);
      toast.error(t("paymentScreenshotRequired"));
      return;
    }
    if (isIcloud && !icloudEmail.trim()) {
      setBusy(false);
      toast.error(t("icloudEmailRequired"));
      return;
    }

    try {
      const path = await uploadPaymentProof(user!.id, id, proofFile);
      const { data, error } = await supabase.rpc("submit_service_payment_proof", {
        p_order_id: id,
        p_proof_path: path,
        p_reference: reference.trim(),
        p_icloud_email: isIcloud ? icloudEmail.trim() : null,
      });
      if (error) throw error;
      setResult(data as ConfirmResult);
      setStep("done");
      toast.success(t("paymentValidatedAuto"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("paymentProofFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function copyText(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(t("copied"));
    } catch {
      toast.error(t("copyFailed"));
    }
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
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-white/60 hover:bg-white/10" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        {step === "proof" ? (
          <div className="mt-6 space-y-4">
            <button type="button" className="text-sm text-white/50 hover:text-white" onClick={() => setStep("pay")}>
              ← {t("changeMethod")}
            </button>
            <PaymentProofForm
              reference={reference}
              onReferenceChange={setReference}
              file={proofFile}
              onFileChange={setProofFile}
              disabled={busy}
            />
            {isIcloud ? (
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-white/45">{t("icloudEmail")}</label>
                <input
                  type="email"
                  required
                  value={icloudEmail}
                  onChange={(e) => setIcloudEmail(e.target.value)}
                  placeholder="name@icloud.com"
                  className="mt-1.5 h-12 w-full rounded-xl border border-white/15 bg-black/40 px-3 text-white"
                />
                <p className="mt-1 text-xs text-white/45">{t("icloudManualHint")}</p>
              </div>
            ) : null}
            <Button
              className="w-full border-0 bg-emerald-500 text-white hover:bg-emerald-600"
              disabled={busy}
              onClick={submitProof}
            >
              {busy ? t("loading") : t("submitPaymentProof")}
            </Button>
            <p className="text-xs text-white/45">{t("paymentProofAutoHint")}</p>
            <WhatsAppSupportButton variant="inline" className="w-full justify-center" />
          </div>
        ) : null}

        {step === "done" && result ? (
          <div className="mt-6 space-y-4">
            <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
              <Check className="h-5 w-5 shrink-0" />
              {t("paymentReceived")} · {formatMoney(Number(result.amount))}
            </div>

            {isAutoCred && result.delivered_login && result.delivered_password ? (
              <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                <p className="text-sm font-bold text-white">{t("yourAccessCredentials")}</p>
                <p className="mt-1 text-xs text-white/50">{service.name}</p>
                <div className="mt-4 space-y-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-white/40">{t("email")}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <p className="flex-1 break-all font-mono text-sm text-white">{result.delivered_login}</p>
                      <button type="button" className="rounded-lg p-2 hover:bg-white/10" onClick={() => copyText(result.delivered_login!)}>
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-white/40">{t("password")}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <p className="flex-1 break-all font-mono text-sm text-white">
                        {showPass ? result.delivered_password : "••••••••••••"}
                      </p>
                      <button type="button" className="rounded-lg p-2 hover:bg-white/10" onClick={() => setShowPass((s) => !s)}>
                        {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                      <button type="button" className="rounded-lg p-2 hover:bg-white/10" onClick={() => copyText(result.delivered_password!)}>
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
                <p className="mt-3 text-xs text-white/45">{t("credentialsKeepSafe")}</p>
              </div>
            ) : null}

            {isAutoCred && !result.delivered_login ? (
              <p className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100">{t("credentialsPendingAdmin")}</p>
            ) : null}

            {isIcloud ? (
              <div className="rounded-2xl border border-white/10 bg-black/40 p-4 text-sm text-white/75">
                <p className="font-bold text-white">{t("icloudSubmittedTitle")}</p>
                <p className="mt-2">{t("icloudSubmittedBody")}</p>
                <p className="mt-2 font-mono text-white">{result.customer_icloud_email}</p>
              </div>
            ) : null}

            <WhatsAppSupportButton variant="inline" className="w-full justify-center" />
            <Button className="w-full border-0 bg-brand-grad text-white" onClick={onClose}>
              {t("done")}
            </Button>
          </div>
        ) : null}

        {step === "pay" && !method ? (
          <div className="mt-6 space-y-3">
            <p className="text-sm text-white/60">{t("choosePaymentMethod")}</p>
            {(payOptions ?? []).map((a) => {
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
                    <span className="block text-xs text-white/50">{formatCmPhoneDisplay(a.account_number)}</span>
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}

        {step === "pay" && method && selected ? (
          <div className="mt-6 space-y-4">
            <button type="button" className="text-sm text-white/50 hover:text-white" onClick={() => setMethod(null)}>
              ← {t("changeMethod")}
            </button>
            <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
              <p className="text-sm font-bold text-white">{selected.label}</p>
              <p className="mt-2 text-xs uppercase tracking-wider text-white/40">{t("payToAccount")}</p>
              <p className="mt-1 font-mono text-lg font-bold text-white">{formatCmPhoneDisplay(selected.account_number)}</p>
              {orderId ? (
                <p className="mt-3 text-xs text-white/40">
                  {t("orderRef")}: <span className="font-mono text-white/70">{orderId.slice(0, 8).toUpperCase()}</span>
                </p>
              ) : null}
            </div>

            {selected.method === "orange_money" || selected.method === "mtn_momo" ? (
              <>
                {ussdLaunched ? (
                  <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
                    {t("ussdPinOnlyHint")}
                  </p>
                ) : null}
                <Button
                  className="w-full border-0 bg-brand-grad text-white"
                  disabled={busy}
                  onClick={() => openAutoMobilePay(selected)}
                >
                  {t("retryUssdPayment")}
                </Button>
              </>
            ) : (
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
            )}

            <Button
              className="w-full border border-emerald-400/40 bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30"
              disabled={busy}
              onClick={goToProofStep}
            >
              {busy ? t("loading") : t("continueToPaymentProof")}
            </Button>
            {!user ? <p className="text-xs font-semibold text-amber-300">{t("signInToPay")}</p> : null}
            <p className="text-xs text-white/45">{t("continueToPaymentProofHint")}</p>
            <WhatsAppSupportButton variant="inline" className="w-full justify-center" />
          </div>
        ) : null}
      </div>
    </div>
  );
}
