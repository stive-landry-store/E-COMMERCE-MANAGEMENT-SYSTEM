import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/LanguageContext";
import { startPayunitCheckout } from "@/lib/payunit";
import { uploadPaymentProof } from "@/lib/paymentProof";
import { Button } from "@/components/ui/Button";
import { PaymentProofForm } from "@/components/store/PaymentProofForm";
import type { Order } from "@/types";

const PROOF_METHODS = new Set(["orange_money", "mtn_momo", "card", "paypal", "apple_pay", "google_pay"]);

export function OrderPaymentProofPanel({ order }: { order: Order }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [reference, setReference] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const needsProof =
    PROOF_METHODS.has(order.payment_method) &&
    (order.payment_status === "pending" || order.payment_status === "unpaid") &&
    !order.payment_proof_submitted_at;

  if (!needsProof) return null;

  async function submit() {
    if (!user) return;
    if (!reference.trim() || reference.trim().length < 4) {
      toast.error(t("transactionReferenceRequired"));
      return;
    }
    if (!file) {
      toast.error(t("paymentScreenshotRequired"));
      return;
    }
    setBusy(true);
    try {
      const path = await uploadPaymentProof(user.id, order.id, file);
      const { error } = await supabase.rpc("submit_order_payment_proof", {
        p_order_id: order.id,
        p_proof_path: path,
        p_reference: reference.trim(),
      });
      if (error) throw error;
      toast.success(t("paymentValidatedAuto"));
      setReference("");
      setFile(null);
      qc.invalidateQueries({ queryKey: ["my-orders"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("paymentProofFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 space-y-3 rounded-2xl border border-amber-400/25 bg-amber-400/5 p-4">
      <Button
        className="w-full border-0 bg-brand-grad text-white"
        disabled={busy}
        onClick={() => {
          setBusy(true);
          toast.message(t("payunitRedirecting"));
          void startPayunitCheckout({ kind: "product", orderId: order.id })
            .catch((err) => toast.error(err instanceof Error ? err.message : t("payunitFailed")))
            .finally(() => setBusy(false));
        }}
      >
        {t("payunitPayOnline")}
      </Button>
      <p className="text-xs text-white/45">{t("orPayManually")}</p>
      <PaymentProofForm
        reference={reference}
        onReferenceChange={setReference}
        file={file}
        onFileChange={setFile}
        disabled={busy}
      />
      <Button className="mt-4 w-full border-0 bg-emerald-500 text-white" disabled={busy} onClick={submit}>
        {t("submitPaymentProof")}
      </Button>
    </div>
  );
}
