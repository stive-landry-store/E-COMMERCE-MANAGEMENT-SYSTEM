import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { KeyRound, Package } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/contexts/LanguageContext";
import { formatMoney, formatDate } from "@/lib/format";
import { getPaymentProofUrl } from "@/lib/paymentProof";
import { Button } from "@/components/ui/Button";
import { Spinner, EmptyState } from "@/components/ui/Spinner";
import type { ServiceCredential, ServiceOrder } from "@/types";

const SLUGS = [
  { value: "netflix-premium", label: "Netflix" },
  { value: "capcut-pro", label: "CapCut" },
] as const;

type Tab = "stock" | "orders";

export function ServiceAccountsAdminPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>(() => (searchParams.get("tab") === "orders" ? "orders" : "stock"));
  const [slug, setSlug] = useState<string>("netflix-premium");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const nextTab = searchParams.get("tab") === "orders" ? "orders" : "stock";
    setTab(nextTab);
  }, [searchParams]);

  const credsQ = useQuery({
    queryKey: ["service-credentials-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_credentials")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ServiceCredential[];
    },
  });

  const ordersQ = useQuery({
    queryKey: ["service-orders-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as ServiceOrder[];
    },
  });

  const stockCounts = useMemo(() => {
    const rows = credsQ.data ?? [];
    return SLUGS.map((s) => {
      const free = rows.filter((r) => r.service_slug === s.value && r.is_active && !r.is_assigned).length;
      const used = rows.filter((r) => r.service_slug === s.value && r.is_assigned).length;
      return { ...s, free, used };
    });
  }, [credsQ.data]);

  async function addCredential(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error(t("fillLoginPassword"));
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("service_credentials").insert({
      service_slug: slug,
      login_email: email.trim(),
      login_password: password,
      label: label.trim() || null,
      is_active: true,
      is_assigned: false,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("credentialAdded"));
    setEmail("");
    setPassword("");
    setLabel("");
    qc.invalidateQueries({ queryKey: ["service-credentials-admin"] });
  }

  async function removeCredential(id: string) {
    const { error } = await supabase.from("service_credentials").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success(t("credentialRemoved"));
      qc.invalidateQueries({ queryKey: ["service-credentials-admin"] });
    }
  }

  async function viewProof(path: string) {
    try {
      const url = await getPaymentProofUrl(path);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not open proof");
    }
  }

  async function markFulfilled(id: string) {
    const { error } = await supabase
      .from("service_orders")
      .update({ status: "fulfilled", updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success(t("orderMarkedFulfilled"));
      qc.invalidateQueries({ queryKey: ["service-orders-admin"] });
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">{t("digitalAccounts")}</h1>
          <p className="mt-1 text-sm text-ink-700/70">{t("digitalAccountsHint")}</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setTab("stock")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold ${tab === "stock" ? "bg-ink-950 text-white" : "bg-white"}`}
          >
            <KeyRound className="h-4 w-4" />
            {t("accountStock")}
          </button>
          <button
            type="button"
            onClick={() => setTab("orders")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold ${tab === "orders" ? "bg-ink-950 text-white" : "bg-white"}`}
          >
            <Package className="h-4 w-4" />
            {t("serviceOrders")}
          </button>
        </div>
      </div>

      {tab === "stock" ? (
        <div className="mt-8 grid gap-8 lg:grid-cols-[320px_1fr]">
          <form onSubmit={addCredential} className="surface space-y-3 p-5">
            <p className="font-semibold">{t("addServiceAccount")}</p>
            <div>
              <label className="text-xs font-medium text-ink-700/70">{t("service")}</label>
              <select className="mt-1 w-full rounded-xl border px-3 py-2" value={slug} onChange={(e) => setSlug(e.target.value)}>
                {SLUGS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-ink-700/70">{t("email")}</label>
              <input className="mt-1 w-full rounded-xl border px-3 py-2" value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
            </div>
            <div>
              <label className="text-xs font-medium text-ink-700/70">{t("password")}</label>
              <input className="mt-1 w-full rounded-xl border px-3 py-2" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <div>
              <label className="text-xs font-medium text-ink-700/70">{t("labelOptional")}</label>
              <input className="mt-1 w-full rounded-xl border px-3 py-2" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Slot 3 / Family 2" />
            </div>
            <Button type="submit" disabled={busy} className="w-full border-0 bg-brand-grad text-white">
              {t("addToStock")}
            </Button>
            <div className="rounded-xl bg-sand-100 p-3 text-xs text-ink-700/70">
              {stockCounts.map((s) => (
                <p key={s.value}>
                  {s.label}: <strong>{s.free}</strong> {t("free")} · {s.used} {t("assigned")}
                </p>
              ))}
            </div>
          </form>

          <div>
            {credsQ.isLoading ? <Spinner /> : null}
            {!credsQ.isLoading && !(credsQ.data?.length) ? <EmptyState title={t("noCredentialsYet")} /> : null}
            <div className="space-y-3">
              {(credsQ.data ?? []).map((c) => (
                <article key={c.id} className="surface flex flex-wrap items-start justify-between gap-3 p-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-ink-700/50">
                      {c.service_slug === "netflix-premium" ? "Netflix" : c.service_slug === "capcut-pro" ? "CapCut" : c.service_slug}
                    </p>
                    <p className="mt-1 font-mono text-sm font-semibold">{c.login_email}</p>
                    <p className="font-mono text-sm text-ink-700/70">{c.login_password}</p>
                    {c.label ? <p className="mt-1 text-xs text-ink-700/50">{c.label}</p> : null}
                    <p className={`mt-2 text-xs font-semibold ${c.is_assigned ? "text-amber-700" : "text-emerald-700"}`}>
                      {c.is_assigned ? t("assigned") : t("free")}
                      {c.assigned_order_id ? ` · ${c.assigned_order_id.slice(0, 8)}` : ""}
                    </p>
                  </div>
                  {!c.is_assigned ? (
                    <Button variant="secondary" onClick={() => removeCredential(c.id)}>
                      {t("remove")}
                    </Button>
                  ) : null}
                </article>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {tab === "orders" ? (
        <div className="mt-8">
          {ordersQ.isLoading ? <Spinner /> : null}
          {!ordersQ.isLoading && !(ordersQ.data?.length) ? <EmptyState title={t("noServiceOrders")} /> : null}
          <div className="space-y-3">
            {(ordersQ.data ?? []).map((o) => (
              <article key={o.id} className="surface p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{o.service_name}</p>
                    <p className="mt-1 text-lg font-bold text-ink-950">{formatMoney(Number(o.amount))}</p>
                    <p className="mt-1 text-sm text-ink-700/70">
                      {o.customer_name || o.customer_email || "—"} · {o.payment_method}
                    </p>
                    {o.payment_reference ? (
                      <p className="mt-1 text-sm font-mono text-emerald-800">
                        Ref: {o.payment_reference}
                      </p>
                    ) : null}
                    {o.payment_proof_path ? (
                      <button
                        type="button"
                        className="mt-2 text-xs font-semibold text-sky-700 underline"
                        onClick={() => viewProof(o.payment_proof_path!)}
                      >
                        {t("viewPaymentProof")}
                      </button>
                    ) : null}
                    {o.customer_icloud_email ? (
                      <p className="mt-1 text-sm font-medium text-sky-800">
                        iCloud: <span className="font-mono">{o.customer_icloud_email}</span>
                      </p>
                    ) : null}
                    {o.delivered_login ? (
                      <p className="mt-1 text-xs text-ink-700/60">
                        Delivered: {o.delivered_login}
                      </p>
                    ) : null}
                    <p className="mt-2 text-xs text-ink-700/50">
                      {o.status} · {formatDate(o.created_at)} · {o.id.slice(0, 8).toUpperCase()}
                    </p>
                  </div>
                  {o.status === "awaiting_manual_activation" || o.status === "awaiting_credentials" ? (
                    <Button className="border-0 bg-brand-grad text-white" onClick={() => markFulfilled(o.id)}>
                      {t("markFulfilled")}
                    </Button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
