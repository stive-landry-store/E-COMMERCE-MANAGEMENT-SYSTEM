import { CreditCard, PackageCheck, ShoppingBag } from "lucide-react";
import { useI18n } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

/** Animated 3-step progress (cart → payment → pickup). */
export function OrderStepper({ current }: { current: 0 | 1 | 2 }) {
  const { t } = useI18n();
  const steps = [
    { icon: ShoppingBag, label: t("orderStepCart") },
    { icon: CreditCard, label: t("orderStepPay") },
    { icon: PackageCheck, label: t("orderStepPickup") },
  ];
  return (
    <ol className="order-stepper" aria-label={t("checkout")}>
      {steps.map((s, i) => {
        const Icon = s.icon;
        const state = i < current ? "done" : i === current ? "active" : "todo";
        return (
          <li key={s.label} className={cn("order-step", `is-${state}`)} aria-current={state === "active" ? "step" : undefined}>
            <span className="order-step-dot">
              <Icon className="h-4 w-4" />
            </span>
            <span className="order-step-label">{s.label}</span>
            {i < steps.length - 1 ? (
              <span className="order-step-line" aria-hidden>
                <span />
              </span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

/** Self-drawing success check mark. */
export function SuccessCheck({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn("success-check", className)} aria-hidden>
      <circle cx="32" cy="32" r="29" />
      <path d="M19 33.5 L28 42 L45 23" />
    </svg>
  );
}
