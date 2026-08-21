import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useCart } from "@/contexts/CartContext";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import type { PaymentMethod } from "@/types";
import {
  AmexLogo,
  ApplePayLogo,
  GooglePayLogo,
  MaestroLogo,
  MastercardLogo,
  MtnMomoLogo,
  OrangeMoneyLogo,
  PaypalLogo,
  VisaLogo,
} from "@/components/store/PaymentBrandLogos";

type PayRowId = "card" | "maestro" | "paypal" | "apple_pay" | "google_pay" | "orange_money" | "mtn_momo" | "pay_at_store";

type PayRow = {
  id: PayRowId;
  method: PaymentMethod;
  label: string;
  logos: ReactNode;
};

const PAY_ROWS: PayRow[] = [
  {
    id: "card",
    method: "card",
    label: "Credit or Debit Card",
    logos: (
      <span className="flex items-center gap-1.5">
        <VisaLogo />
        <MastercardLogo />
        <AmexLogo />
      </span>
    ),
  },
  {
    id: "maestro",
    method: "card",
    label: "Maestro",
    logos: <MaestroLogo />,
  },
  {
    id: "paypal",
    method: "paypal",
    label: "PayPal",
    logos: <PaypalLogo className="h-6 w-16" />,
  },
  {
    id: "apple_pay",
    method: "apple_pay",
    label: "Apple Pay",
    logos: <ApplePayLogo />,
  },
  {
    id: "google_pay",
    method: "google_pay",
    label: "Google Pay",
    logos: <GooglePayLogo className="h-5 w-20" />,
  },
  {
    id: "orange_money",
    method: "orange_money",
    label: "Orange Money CMR",
    logos: <OrangeMoneyLogo />,
  },
  {
    id: "mtn_momo",
    method: "mtn_momo",
    label: "MTN Mobile Money CMR",
    logos: <MtnMomoLogo />,
  },
  {
    id: "pay_at_store",
    method: "pay_at_store",
    label: "Pay at store",
    logos: null,
  },
];

export function CheckoutPage() {
  const { items, refresh, clearLocal } = useCart();
  const navigate = useNavigate();
  const [fulfillment, setFulfillment] = useState<"pickup" | "delivery">("pickup");
  const [rowId, setRowId] = useState<PayRowId>("card");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [busy, setBusy] = useState(false);

  const selected = PAY_ROWS.find((r) => r.id === rowId)!;
  const payment = selected.method;
  const total = items.reduce((sum, item) => sum + Number(item.product_variants?.price ?? 0) * item.quantity, 0);
  const needsMobile = payment === "orange_money" || payment === "mtn_momo";
  const needsCard = rowId === "card" || rowId === "maestro";

  async function submit() {
    if (items.length === 0) return;
    if (needsMobile && !phone.trim()) {
      toast.error("Enter the Mobile Money phone number");
      return;
    }
    if (needsCard && (!cardNumber.trim() || !cardExpiry.trim() || !cardCvc.trim())) {
      toast.error("Enter your card details");
      return;
    }
    setBusy(true);
    try {
      const noteParts = [notes.trim()];
      if (rowId === "maestro") noteParts.push("Card network: Maestro");
      if (needsMobile) noteParts.push(`MoMo phone: ${phone.trim()}`);
      if (needsCard && cardName.trim()) noteParts.push(`Cardholder: ${cardName.trim()}`);
      if (payment !== "pay_at_store") noteParts.push(`Payment requested: ${selected.label}`);

      const { data, error } = await supabase.rpc("place_order", {
        p_fulfillment: fulfillment,
        p_payment_method: payment,
        p_address: fulfillment === "delivery" ? { line: address } : null,
        p_notes: noteParts.filter(Boolean).join("\n") || null,
      });
      if (error) throw error;
      clearLocal();
      await refresh();
      toast.success(
        payment === "pay_at_store"
          ? "Order placed — pay at the store"
          : "Order placed — payment pending confirmation",
      );
      navigate("/account/orders");
      return data;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container-page grid gap-8 py-12 lg:grid-cols-2">
      <div className="surface p-6">
        <h1 className="font-display text-3xl">Checkout</h1>
        <div className="mt-6 space-y-5">
          <div>
            <label>Fulfillment</label>
            <select value={fulfillment} onChange={(e) => setFulfillment(e.target.value as "pickup" | "delivery")}>
              <option value="pickup">Store pickup</option>
              <option value="delivery">Local delivery</option>
            </select>
          </div>
          {fulfillment === "delivery" ? (
            <div>
              <label>Delivery address</label>
              <textarea rows={3} value={address} onChange={(e) => setAddress(e.target.value)} required />
            </div>
          ) : null}

          <div>
            <p className="mb-2 text-sm font-semibold text-white/80">Payment method</p>
            {/* Exact list style from reference: white rows, logos, chevrons */}
            <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-black/5">
              {PAY_ROWS.map((row, index) => {
                const active = rowId === row.id;
                return (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => setRowId(row.id)}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition",
                      index > 0 && "border-t border-neutral-200",
                      active ? "bg-neutral-50" : "bg-white hover:bg-neutral-50/80",
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span className="text-[15px] font-medium text-neutral-900">{row.label}</span>
                      {row.logos ? <span className="shrink-0">{row.logos}</span> : null}
                    </span>
                    <ChevronRight className="h-5 w-5 shrink-0 text-neutral-400" strokeWidth={1.75} />
                  </button>
                );
              })}
            </div>
          </div>

          {needsCard ? (
            <div className="space-y-3 rounded-xl bg-white p-4 text-neutral-900 ring-1 ring-black/5">
              <p className="text-sm font-semibold text-neutral-800">
                {rowId === "maestro" ? "Maestro card details" : "Card details"}
              </p>
              <div>
                <label className="!text-neutral-600">Name on card</label>
                <input
                  className="!border-neutral-200 !bg-white !text-neutral-900"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  placeholder="Full name"
                  autoComplete="cc-name"
                />
              </div>
              <div>
                <label className="!text-neutral-600">Card number</label>
                <input
                  className="!border-neutral-200 !bg-white !text-neutral-900"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  placeholder="•••• •••• •••• ••••"
                  inputMode="numeric"
                  autoComplete="cc-number"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="!text-neutral-600">Expiry</label>
                  <input
                    className="!border-neutral-200 !bg-white !text-neutral-900"
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(e.target.value)}
                    placeholder="MM/YY"
                    autoComplete="cc-exp"
                  />
                </div>
                <div>
                  <label className="!text-neutral-600">CVC</label>
                  <input
                    className="!border-neutral-200 !bg-white !text-neutral-900"
                    value={cardCvc}
                    onChange={(e) => setCardCvc(e.target.value)}
                    placeholder="123"
                    inputMode="numeric"
                    autoComplete="cc-csc"
                  />
                </div>
              </div>
            </div>
          ) : null}

          {needsMobile ? (
            <div>
              <label>Mobile Money number (Cameroon)</label>
              <input
                type="tel"
                placeholder="6XX XXX XXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>
          ) : null}

          <div>
            <label>Notes</label>
            <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <Button variant="gold" className="w-full" disabled={busy || items.length === 0} onClick={submit}>
            Place order · {formatMoney(total)}
          </Button>
        </div>
      </div>
      <div>
        <h2 className="font-medium">Order summary</h2>
        <ul className="mt-4 space-y-3">
          {items.map((item) => (
            <li key={item.id} className="flex justify-between text-sm">
              <span>
                {item.product_variants?.products?.name} × {item.quantity}
              </span>
              <span>{formatMoney(Number(item.product_variants?.price ?? 0) * item.quantity)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
