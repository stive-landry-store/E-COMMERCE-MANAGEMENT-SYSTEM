import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useI18n } from "@/contexts/LanguageContext";
import { refreshPayunitStatus } from "@/lib/payunit";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";

export function PayunitReturnPage() {
  const { t } = useI18n();
  const [params] = useSearchParams();
  const txn = params.get("txn") ?? "";
  const [state, setState] = useState<"loading" | "paid" | "pending" | "failed">("loading");

  useEffect(() => {
    if (!txn) {
      setState("failed");
      return;
    }
    let cancelled = false;
    void refreshPayunitStatus(txn)
      .then((res) => {
        if (cancelled) return;
        if (res.paid || res.transactionStatus?.toUpperCase() === "SUCCESS") setState("paid");
        else if (res.transactionStatus?.toUpperCase() === "FAILED" || res.transactionStatus?.toUpperCase() === "CANCELLED") {
          setState("failed");
        } else setState("pending");
      })
      .catch(() => {
        if (!cancelled) setState("pending");
      });
    return () => {
      cancelled = true;
    };
  }, [txn]);

  return (
    <div className="container-page py-16 text-center">
      {state === "loading" ? <Spinner /> : null}
      {state === "paid" ? (
        <>
          <h1 className="font-display text-3xl">{t("payunitSuccess")}</h1>
          <p className="mt-2 text-sm text-white/60">{t("payunitSuccessHint")}</p>
        </>
      ) : null}
      {state === "pending" ? (
        <>
          <h1 className="font-display text-3xl">{t("payunitPending")}</h1>
          <p className="mt-2 text-sm text-white/60">{t("payunitPendingHint")}</p>
        </>
      ) : null}
      {state === "failed" ? (
        <>
          <h1 className="font-display text-3xl">{t("payunitFailed")}</h1>
          <p className="mt-2 text-sm text-white/60">{t("payunitFailedHint")}</p>
        </>
      ) : null}
      <Link to="/account/orders" className="mt-8 inline-block">
        <Button variant="gold">{t("viewOrders")}</Button>
      </Link>
    </div>
  );
}
