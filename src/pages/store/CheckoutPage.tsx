import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, CreditCard, Smartphone, Store } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/LanguageContext";
import { formatMoney } from "@/lib/format";
import { unitPriceForCondition, type PhoneCondition } from "@/lib/phoneCondition";
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
import type { PaymentAccount, PaymentMethod } from "@/types";

type Step = "details" | "pay" | "proof" | "done";

function mapAccountMethodToOrder(method: string): PaymentMethod {
  if (method === "credit_card") return "card";
  if (method === "orange_money") return "orange_money";
  if (method === "mtn_momo") return "mtn_momo";
  if (method === "paypal") return "paypal";
  if (method === "apple_pay") return "apple_pay";
  if (method === "google_pay") return "google_pay";
  return "card";
}

function methodIcon(method: string) {
  if (method === "credit_card" || method === "card") return CreditCard;
  if (method === "pay_at_store") return Store;
  return Smartphone;
}

export function CheckoutPage() {
  const { items, refresh, clearLocal } = useCart();
  const { user, profile } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();

  const [fulfillment, setFulfillment] = useState<"pickup" | "delivery">("pickup");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<{
    code: string;
    discount_percent: number;
    discount_amount: number;
  } | null>(null);
  const [promoBusy, setPromoBusy] = useState(false);

  const [step, setStep] = useState<Step>("details");
  const [method, setMethod] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [lockedTotal, setLockedTotal] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [ussdLaunched, setUssdLaunched] = useState(false);
  const [reference, setReference] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);

  const senderCountry = profile?.country?.trim() || "Cameroon";

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
  });

  const payOptions = useMemo(() => {
    const all = accountsQ.data ?? [];
    const mobile = ["orange_money", "mtn_momo"] as const;
    const out: PaymentAccount[] = [];
    for (const m of mobile) {
      const acc =
        all.find(
          (a) =>
            a.method === m &&
            (a.sender_country ?? "Cameroon").toLowerCase() === senderCountry.toLowerCase(),
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

  const subtotal = items.reduce((sum, item) => {
    const cond = (item.phone_condition ?? "open_box") as PhoneCondition;
    return sum + unitPriceForCondition(item.product_variants, cond) * item.quantity;
  }, 0);
  const discountAmount = appliedPromo?.discount_amount ?? 0;
  const total = Math.max(subtotal - discountAmount, 0);

  const displayTotal = lockedTotal ?? total;

  async function applyPromo() {
    const code = promoInput.trim();
    if (!code) return;
    setPromoBusy(true);
    try {
      const { data, error } = await supabase.rpc("validate_seller_promo_code", { p_code: code });
      if (error) throw error;
      const result = data as {
        valid?: boolean;
        error?: string;
        code?: string;
        discount_percent?: number;
        discount_amount?: number;
      };
      if (!result?.valid) {
        toast.error(result?.error ?? t("promoInvalid"));
        setAppliedPromo(null);
        return;
      }
      setAppliedPromo({
        code: result.code ?? code.toUpperCase(),
        discount_percent: Number(result.discount_percent ?? 0),
        discount_amount: Number(result.discount_amount ?? 0),
      });
      toast.success(t("promoApplied"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("promoInvalid"));
      setAppliedPromo(null);
    } finally {
      setPromoBusy(false);
    }
  }

  function openAutoMobilePay(account: PaymentAccount) {
    const route = resolveMobileMoneyRoute(
      [account],
      account.method,
      account.sender_country ?? senderCountry,
    );
    if (!route) {
      toast.error(t("ussdUnavailable"));
      return;
    }
    const ussd = buildMobileMoneyUssd(route.ussdTemplate, displayTotal, account.account_number, route.phoneFormat);
    launchMobileMoneyUssd(ussd);
    setUssdLaunched(true);
    toast.success(t("ussdAutoOpened"));
  }

  async function placeProductOrder(payMethod: PaymentMethod, account: PaymentAccount | null) {
    if (!user) {
      toast.info(t("signInToPay"));
      return null;
    }
    if (items.length === 0) {
      toast.error(t("cartEmpty"));
      return null;
    }
    if (fulfillment === "delivery" && !address.trim()) {
      toast.error(t("deliveryAddressRequired"));
      return null;
    }

    const noteParts = [notes.trim()];
    if (account) {
      noteParts.push(`Pay to: ${account.label} ${account.account_number}`);
    }
    noteParts.push(`Payment method: ${payMethod}`);

    const { data: orderIdRaw, error } = await supabase.rpc("place_order", {
      p_fulfillment: fulfillment,
      p_payment_method: payMethod,
      p_address: fulfillment === "delivery" ? { line: address } : null,
      p_notes: noteParts.filter(Boolean).join("\n") || null,
      p_promo_code: appliedPromo?.code ?? null,
    });
    if (error) throw error;

    const id = orderIdRaw as string;

    if (account) {
      await supabase
        .from("orders")
        .update({
          payment_account_id: account.id,
          destination_account: account.account_number,
        })
        .eq("id", id);
    }

    const { data: orderRow } = await supabase
      .from("orders")
      .select("order_number")
      .eq("id", id)
      .maybeSingle();

    setOrderId(id);
    setOrderNumber(orderRow?.order_number ?? id.slice(0, 8).toUpperCase());
    setLockedTotal(total);
    clearLocal();
    await refresh();
    return id;
  }

  async function chooseOnlineMethod(payMethod: string) {
    if (!user) {
      toast.info(t("signInToPay"));
      return;
    }
    setBusy(true);
    try {
      setMethod(payMethod);
      const account = payOptions.find((a) => a.method === payMethod) ?? null;
      const id = await placeProductOrder(mapAccountMethodToOrder(payMethod), account);
      if (!id) {
        setMethod(null);
        return;
      }
      setStep("pay");
      if (account && isMobileMoneyMethod(payMethod)) {
        openAutoMobilePay(account);
      }
    } catch (err) {
      setMethod(null);
      toast.error(err instanceof Error ? err.message : t("checkoutFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function choosePayAtStore() {
    if (!user) {
      toast.info(t("signInToPay"));
      return;
    }
    setBusy(true);
    try {
      setMethod("pay_at_store");
      const id = await placeProductOrder("pay_at_store", null);
      if (!id) {
        setMethod(null);
        return;
      }
      toast.success(t("orderPlacedPayAtStore"));
      navigate("/account/orders");
    } catch (err) {
      setMethod(null);
      toast.error(err instanceof Error ? err.message : t("checkoutFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function submitProof() {
    if (!user || !orderId) return;
    if (!reference.trim() || reference.trim().length < 4) {
      toast.error(t("transactionReferenceRequired"));
      return;
    }
    if (!proofFile) {
      toast.error(t("paymentScreenshotRequired"));
      return;
    }
    setBusy(true);
    try {
      const path = await uploadPaymentProof(user.id, orderId, proofFile);
      const { error } = await supabase.rpc("submit_order_payment_proof", {
        p_order_id: orderId,
        p_proof_path: path,
        p_reference: reference.trim(),
      });
      if (error) throw error;
      toast.success(t("paymentValidatedAuto"));
      setStep("done");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("paymentProofFailed"));
    } finally {
      setBusy(false);
    }
  }

  if (items.length === 0 && step === "details") {
    return (
      <div className="container-page py-16 text-center">
        <p className="text-white/60">{t("cartEmpty")}</p>
        <Button className="mt-4" variant="gold" onClick={() => navigate("/shop")}>
          {t("shop")}
        </Button>
      </div>
    );
  }

  return (
    <div className="container-page grid gap-8 py-12 lg:grid-cols-2">
      <div className="surface p-6">
        <h1 className="font-display text-3xl">{t("checkout")}</h1>

        {step === "details" ? (
          <div className="mt-6 space-y-5">
            <div>
              <label>{t("fulfillment")}</label>
              <select
                value={fulfillment}
                onChange={(e) => setFulfillment(e.target.value as "pickup" | "delivery")}
              >
                <option value="pickup">{t("storePickup")}</option>
                <option value="delivery">{t("localDelivery")}</option>
              </select>
            </div>
            {fulfillment === "delivery" ? (
              <div>
                <label>{t("deliveryAddress")}</label>
                <textarea rows={3} value={address} onChange={(e) => setAddress(e.target.value)} required />
              </div>
            ) : null}

            <div>
              <label>{t("promoCodeLabel")}</label>
              <div className="flex gap-2">
                <input
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                  placeholder={t("enterPromoCode")}
                  disabled={Boolean(appliedPromo)}
                />
                {appliedPromo ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setAppliedPromo(null);
                      setPromoInput("");
                    }}
                  >
                    {t("cancel")}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="gold"
                    disabled={promoBusy || !promoInput.trim()}
                    onClick={() => void applyPromo()}
                  >
                    {t("applyPromo")}
                  </Button>
                )}
              </div>
              {appliedPromo ? (
                <p className="mt-1 text-xs text-emerald-400">
                  {t("promoApplied")} · −{appliedPromo.discount_percent}% ({formatMoney(appliedPromo.discount_amount)})
                </p>
              ) : null}
            </div>

            <div>
              <label>{t("notes")}</label>
              <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold text-white/80">{t("choosePaymentMethod")}</p>
              <p className="mb-3 text-xs text-white/45">{t("deviceCheckoutPayHint")}</p>
              <div className="space-y-2">
                {payOptions.map((a) => {
                  const Icon = methodIcon(a.method);
                  return (
                    <button
                      key={a.id}
                      type="button"
                      disabled={busy || !user}
                      onClick={() => void chooseOnlineMethod(a.method)}
                      className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:border-[#ff2d95]/50 hover:bg-white/10 disabled:opacity-50"
                    >
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-grad text-white">
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block font-bold text-white">{a.label}</span>
                        <span className="block truncate text-xs text-white/50">
                          {a.method === "credit_card"
                            ? a.account_number
                            : formatCmPhoneDisplay(a.account_number)}
                        </span>
                      </span>
                    </button>
                  );
                })}
                <button
                  type="button"
                  disabled={busy || !user}
                  onClick={() => void choosePayAtStore()}
                  className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:border-[#ff2d95]/50 hover:bg-white/10 disabled:opacity-50"
                >
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 text-white">
                    <Store className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block font-bold text-white">{t("payAtStore")}</span>
                    <span className="block text-xs text-white/50">{t("payAtStoreHint")}</span>
                  </span>
                </button>
              </div>
              {!user ? <p className="mt-2 text-xs font-semibold text-amber-300">{t("signInToPay")}</p> : null}
            </div>
          </div>
        ) : null}

        {step === "pay" && selected ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
              <p className="text-sm font-bold text-white">{selected.label}</p>
              <p className="mt-2 text-xs uppercase tracking-wider text-white/40">{t("payToAccount")}</p>
              <p className="mt-1 font-mono text-lg font-bold text-white">
                {selected.method === "credit_card"
                  ? selected.account_number
                  : formatCmPhoneDisplay(selected.account_number)}
              </p>
              {selected.account_name ? (
                <p className="mt-1 text-sm text-white/60">{selected.account_name}</p>
              ) : null}
              {selected.bank_name ? (
                <p className="text-xs text-white/45">{selected.bank_name}</p>
              ) : null}
              {orderNumber ? (
                <p className="mt-3 text-xs text-white/40">
                  {t("orderRef")}: <span className="font-mono text-white/70">{orderNumber}</span>
                </p>
              ) : null}
              <p className="mt-2 text-sm font-semibold text-white">
                {t("total")}: {formatMoney(displayTotal)}
              </p>
            </div>

            {isMobileMoneyMethod(selected.method) ? (
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
              <>
                <p className="text-xs text-white/50">{t("bankTransferHint")}</p>
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
                  <Copy className="mr-2 h-4 w-4" />
                  {t("copyAccountNumber")}
                </Button>
              </>
            )}

            <Button
              className="w-full border border-emerald-400/40 bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30"
              disabled={busy}
              onClick={() => setStep("proof")}
            >
              {t("continueToPaymentProof")}
            </Button>
            <p className="text-xs text-white/45">{t("continueToPaymentProofHint")}</p>
            <WhatsAppSupportButton variant="inline" className="w-full justify-center" />
          </div>
        ) : null}

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
            <Button
              className="w-full border-0 bg-emerald-500 text-white hover:bg-emerald-600"
              disabled={busy}
              onClick={() => void submitProof()}
            >
              {busy ? t("loading") : t("submitPaymentProof")}
            </Button>
            <p className="text-xs text-white/45">{t("paymentProofAutoHint")}</p>
            <WhatsAppSupportButton variant="inline" className="w-full justify-center" />
          </div>
        ) : null}

        {step === "done" ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
              {t("paymentReceived")} · {formatMoney(displayTotal)}
              {orderNumber ? (
                <p className="mt-1 font-mono text-xs text-emerald-100/80">
                  {t("orderRef")}: {orderNumber}
                </p>
              ) : null}
            </div>
            <p className="text-sm text-white/60">{t("deviceOrderProofDoneHint")}</p>
            <Button className="w-full border-0 bg-brand-grad text-white" onClick={() => navigate("/account/orders")}>
              {t("viewOrders")}
            </Button>
            <WhatsAppSupportButton variant="inline" className="w-full justify-center" />
          </div>
        ) : null}
      </div>

      <div>
        <h2 className="font-medium">{t("orderSummary")}</h2>
        <ul className="mt-4 space-y-3">
          {items.map((item) => {
            const cond = (item.phone_condition ?? "open_box") as PhoneCondition;
            const line = unitPriceForCondition(item.product_variants, cond) * item.quantity;
            return (
            <li key={item.id} className="flex justify-between text-sm">
              <span>
                {item.product_variants?.products?.name} × {item.quantity}
                <span className="block text-xs text-white/45">
                  {cond === "sealed" ? t("conditionSealed") : t("conditionOpenBox")}
                </span>
              </span>
              <span>{formatMoney(line)}</span>
            </li>
            );
          })}
          {items.length === 0 && orderId ? (
            <li className="text-sm text-white/50">{t("orderPlacedCartCleared")}</li>
          ) : null}
        </ul>
        <div className="mt-4 space-y-1 border-t border-white/10 pt-4 text-sm">
          <div className="flex justify-between">
            <span>{t("subtotal")}</span>
            <span>{formatMoney(subtotal)}</span>
          </div>
          {discountAmount > 0 ? (
            <div className="flex justify-between text-emerald-400">
              <span>{t("discount")}</span>
              <span>−{formatMoney(discountAmount)}</span>
            </div>
          ) : null}
          <div className="flex justify-between font-semibold">
            <span>{t("total")}</span>
            <span>{formatMoney(total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
