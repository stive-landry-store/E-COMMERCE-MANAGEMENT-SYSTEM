import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Megaphone, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatMoney } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Spinner, EmptyState } from "@/components/ui/Spinner";
import { useI18n } from "@/contexts/LanguageContext";
import type { DigitalService, PaymentAccount, PromoCode, PromoFlyer } from "@/types";

type FlyerForm = {
  id?: string;
  service_id: string;
  title: string;
  headline: string;
  body: string;
  logo_url: string;
  accent_from: string;
  accent_to: string;
  cta_label: string;
  cta_url: string;
  promo_code: string;
  discount_percent: string;
  show_on_services: boolean;
  show_on_home: boolean;
  sort_order: string;
  is_active: boolean;
};

const emptyFlyer = (): FlyerForm => ({
  service_id: "",
  title: "",
  headline: "",
  body: "",
  logo_url: "",
  accent_from: "#ff7a45",
  accent_to: "#ff2d95",
  cta_label: "",
  cta_url: "/contact",
  promo_code: "STIVELANDRY16STORE",
  discount_percent: "25",
  show_on_services: true,
  show_on_home: false,
  sort_order: "100",
  is_active: true,
});

export function PromotionsAdminPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"flyers" | "services" | "codes" | "accounts">("flyers");
  const [form, setForm] = useState<FlyerForm>(emptyFlyer());
  const [busy, setBusy] = useState(false);

  const servicesQ = useQuery({
    queryKey: ["admin-digital-services"],
    queryFn: async () => {
      const { data, error } = await supabase.from("digital_services").select("*").order("sort_order");
      if (error) throw error;
      return data as DigitalService[];
    },
  });

  const flyersQ = useQuery({
    queryKey: ["admin-promo-flyers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("promo_flyers")
        .select("*, digital_services(name, slug)")
        .order("sort_order");
      if (error) throw error;
      return data as (PromoFlyer & { digital_services?: { name: string; slug: string } | null })[];
    },
  });

  const codesQ = useQuery({
    queryKey: ["admin-promo-codes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("promo_codes").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as PromoCode[];
    },
  });

  const accountsQ = useQuery({
    queryKey: ["admin-payment-accounts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("payment_accounts").select("*").order("sort_order");
      if (error) throw error;
      return (data ?? []) as PaymentAccount[];
    },
  });

  const serviceName = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of servicesQ.data ?? []) m.set(s.id, s.name);
    return m;
  }, [servicesQ.data]);

  function editFlyer(row: PromoFlyer) {
    setForm({
      id: row.id,
      service_id: row.service_id ?? "",
      title: row.title,
      headline: row.headline ?? "",
      body: row.body ?? "",
      logo_url: row.logo_url ?? "",
      accent_from: row.accent_from,
      accent_to: row.accent_to,
      cta_label: row.cta_label ?? "",
      cta_url: row.cta_url ?? "/contact",
      promo_code: row.promo_code ?? "",
      discount_percent: String(row.discount_percent ?? 0),
      show_on_services: row.show_on_services,
      show_on_home: row.show_on_home,
      sort_order: String(row.sort_order ?? 0),
      is_active: row.is_active,
    });
    setTab("flyers");
  }

  async function saveFlyer() {
    if (!form.title.trim()) return toast.error(t("titleRequired"));
    setBusy(true);
    const payload = {
      service_id: form.service_id || null,
      title: form.title.trim(),
      headline: form.headline.trim() || null,
      body: form.body.trim() || null,
      logo_url: form.logo_url.trim() || null,
      accent_from: form.accent_from,
      accent_to: form.accent_to,
      cta_label: form.cta_label.trim() || t("subscribeNow"),
      cta_url: form.cta_url.trim() || "/contact",
      promo_code: form.promo_code.trim() || null,
      discount_percent: Number(form.discount_percent) || 0,
      show_on_services: form.show_on_services,
      show_on_home: form.show_on_home,
      sort_order: Number(form.sort_order) || 0,
      is_active: form.is_active,
      updated_at: new Date().toISOString(),
    };
    const { error } = form.id
      ? await supabase.from("promo_flyers").update(payload).eq("id", form.id)
      : await supabase.from("promo_flyers").insert(payload);
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success(form.id ? t("flyerUpdated") : t("flyerCreated"));
      setForm(emptyFlyer());
      qc.invalidateQueries({ queryKey: ["admin-promo-flyers"] });
      qc.invalidateQueries({ queryKey: ["promo-flyers-services"] });
      qc.invalidateQueries({ queryKey: ["promo-flyers-home"] });
    }
  }

  async function toggleFlyer(row: PromoFlyer) {
    const { error } = await supabase
      .from("promo_flyers")
      .update({ is_active: !row.is_active, updated_at: new Date().toISOString() })
      .eq("id", row.id);
    if (error) toast.error(error.message);
    else {
      toast.success(row.is_active ? t("flyerRemoved") : t("flyerPublished"));
      qc.invalidateQueries({ queryKey: ["admin-promo-flyers"] });
      qc.invalidateQueries({ queryKey: ["promo-flyers-services"] });
      qc.invalidateQueries({ queryKey: ["promo-flyers-home"] });
    }
  }

  async function deleteFlyer(id: string) {
    if (!confirm(t("confirmDeleteFlyer"))) return;
    const { error } = await supabase.from("promo_flyers").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success(t("flyerDeleted"));
      if (form.id === id) setForm(emptyFlyer());
      qc.invalidateQueries({ queryKey: ["admin-promo-flyers"] });
      qc.invalidateQueries({ queryKey: ["promo-flyers-services"] });
    }
  }

  async function toggleService(row: DigitalService) {
    const { error } = await supabase
      .from("digital_services")
      .update({ is_active: !row.is_active, updated_at: new Date().toISOString() })
      .eq("id", row.id);
    if (error) toast.error(error.message);
    else {
      toast.success(t("serviceUpdated"));
      qc.invalidateQueries({ queryKey: ["admin-digital-services"] });
      qc.invalidateQueries({ queryKey: ["digital-services"] });
    }
  }

  async function saveServicePrice(row: DigitalService, monthly: string, first: string) {
    const { error } = await supabase
      .from("digital_services")
      .update({
        price_monthly: Number(monthly) || 0,
        price_first_month: first.trim() === "" ? null : Number(first),
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);
    if (error) toast.error(error.message);
    else {
      toast.success(t("pricesSaved"));
      qc.invalidateQueries({ queryKey: ["admin-digital-services"] });
      qc.invalidateQueries({ queryKey: ["digital-services"] });
    }
  }

  async function saveCode(row: PromoCode, code: string, pct: string, active: boolean) {
    const { error } = await supabase
      .from("promo_codes")
      .update({
        code: code.trim().toUpperCase(),
        discount_percent: Number(pct) || 0,
        is_active: active,
      })
      .eq("id", row.id);
    if (error) toast.error(error.message);
    else {
      toast.success(t("codeUpdated"));
      qc.invalidateQueries({ queryKey: ["admin-promo-codes"] });
      qc.invalidateQueries({ queryKey: ["promo-codes-public"] });
    }
  }

  async function addCode() {
    const code = prompt(t("newPromoCodePrompt"));
    if (!code?.trim()) return;
    const { error } = await supabase.from("promo_codes").insert({
      code: code.trim().toUpperCase(),
      description: "First recharge",
      discount_percent: 25,
      applies_to: "first_recharge",
      is_active: true,
    });
    if (error) toast.error(error.message);
    else {
      toast.success(t("codeCreated"));
      qc.invalidateQueries({ queryKey: ["admin-promo-codes"] });
      qc.invalidateQueries({ queryKey: ["promo-codes-public"] });
    }
  }

  async function deleteCode(id: string) {
    if (!confirm(t("delete") + "?")) return;
    const { error } = await supabase.from("promo_codes").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success(t("deleted"));
      qc.invalidateQueries({ queryKey: ["admin-promo-codes"] });
      qc.invalidateQueries({ queryKey: ["promo-codes-public"] });
    }
  }

  async function saveAccount(row: PaymentAccount, patch: Partial<PaymentAccount>) {
    const { error } = await supabase
      .from("payment_accounts")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", row.id);
    if (error) toast.error(error.message);
    else {
      toast.success(t("saved"));
      qc.invalidateQueries({ queryKey: ["admin-payment-accounts"] });
      qc.invalidateQueries({ queryKey: ["payment-accounts-public"] });
    }
  }

  async function addAccount() {
    const method = prompt("Method key (orange_money, mtn_momo, credit_card, paypal…)");
    if (!method?.trim()) return;
    const number = prompt(t("accountNumber"));
    if (!number?.trim()) return;
    const { error } = await supabase.from("payment_accounts").insert({
      method: method.trim().toLowerCase(),
      label: method.trim(),
      account_number: number.trim(),
      account_name: "Stive Landry Store",
      ussd_template: method.includes("orange") ? "#150*1*1*{amount}*{phone}#" : method.includes("mtn") ? "*126*1*{amount}*{phone}#" : null,
      is_active: true,
      sort_order: 100,
    });
    if (error) toast.error(error.message);
    else {
      toast.success(t("saved"));
      qc.invalidateQueries({ queryKey: ["admin-payment-accounts"] });
    }
  }

  async function deleteAccount(id: string) {
    if (!confirm(t("delete") + "?")) return;
    const { error } = await supabase.from("payment_accounts").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success(t("deleted"));
      qc.invalidateQueries({ queryKey: ["admin-payment-accounts"] });
      qc.invalidateQueries({ queryKey: ["payment-accounts-public"] });
    }
  }

  if (servicesQ.isLoading || flyersQ.isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-ink-500">{t("principalAdmin")}</p>
          <h1 className="mt-1 flex items-center gap-2 text-3xl font-extrabold text-ink-950">
            <Megaphone className="h-7 w-7 text-[#ff2d95]" />
            {t("promotionsTitle")}
          </h1>
          <p className="mt-1 text-sm text-ink-600">{t("promotionsHint")}</p>
        </div>
        <div className="flex gap-2 rounded-xl bg-ink-950/5 p-1">
          {(
            [
              ["flyers", "tabFlyers"],
              ["services", "tabServices"],
              ["codes", "tabCodes"],
              ["accounts", "paymentAccounts"],
            ] as const
          ).map(([k, labelKey]) => (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                tab === k ? "bg-white text-ink-950 shadow" : "text-ink-600 hover:text-ink-900"
              }`}
            >
              {t(labelKey)}
            </button>
          ))}
        </div>
      </div>

      {tab === "flyers" ? (
        <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
          <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-ink-950">{form.id ? t("editFlyer") : t("newFlyer")}</h2>
              {form.id ? (
                <button type="button" className="text-xs font-semibold text-ink-500" onClick={() => setForm(emptyFlyer())}>
                  {t("newLabel")}
                </button>
              ) : null}
            </div>
            <div className="mt-4 space-y-3">
              <label className="block text-xs font-semibold text-ink-600">
                {t("linkedService")}
                <select
                  className="mt-1 h-10 w-full rounded-xl border border-black/10 px-3 text-sm"
                  value={form.service_id}
                  onChange={(e) => setForm({ ...form, service_id: e.target.value })}
                >
                  <option value="">{t("freeCard")}</option>
                  {(servicesQ.data ?? []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <Field label={t("titleLabel")} value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
              <Field label={t("headlineLabel")} value={form.headline} onChange={(v) => setForm({ ...form, headline: v })} />
              <label className="block text-xs font-semibold text-ink-600">
                {t("bodyLabel")}
                <textarea
                  className="mt-1 min-h-[88px] w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                />
              </label>
              <Field label={t("logoUrl")} value={form.logo_url} onChange={(v) => setForm({ ...form, logo_url: v })} />
              <div className="grid grid-cols-2 gap-2">
                <Field label={t("color1")} value={form.accent_from} onChange={(v) => setForm({ ...form, accent_from: v })} />
                <Field label={t("color2")} value={form.accent_to} onChange={(v) => setForm({ ...form, accent_to: v })} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Field label={t("promoCodeLabel")} value={form.promo_code} onChange={(v) => setForm({ ...form, promo_code: v })} />
                <Field
                  label={t("discountPercent")}
                  value={form.discount_percent}
                  onChange={(v) => setForm({ ...form, discount_percent: v })}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Field label={t("ctaLabel")} value={form.cta_label} onChange={(v) => setForm({ ...form, cta_label: v })} />
                <Field label={t("ctaLink")} value={form.cta_url} onChange={(v) => setForm({ ...form, cta_url: v })} />
              </div>
              <Field label={t("sortOrder")} value={form.sort_order} onChange={(v) => setForm({ ...form, sort_order: v })} />
              <label className="flex items-center gap-2 text-sm text-ink-700">
                <input
                  type="checkbox"
                  checked={form.show_on_services}
                  onChange={(e) => setForm({ ...form, show_on_services: e.target.checked })}
                />
                {t("showOnServices")}
              </label>
              <label className="flex items-center gap-2 text-sm text-ink-700">
                <input
                  type="checkbox"
                  checked={form.show_on_home}
                  onChange={(e) => setForm({ ...form, show_on_home: e.target.checked })}
                />
                {t("showOnHome")}
              </label>
              <label className="flex items-center gap-2 text-sm text-ink-700">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                />
                {t("active")}
              </label>
              <Button className="w-full bg-brand-grad border-0 text-white" disabled={busy} onClick={saveFlyer}>
                {busy ? "…" : form.id ? t("saveFlyer") : t("createFlyer")}
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {(flyersQ.data ?? []).length === 0 ? (
              <EmptyState title={t("noFlyers")} hint={t("noFlyersHint")} />
            ) : (
              (flyersQ.data ?? []).map((row) => (
                <div key={row.id} className="flex flex-wrap items-center gap-4 rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
                  <div
                    className="h-14 w-14 shrink-0 rounded-xl"
                    style={{ background: `linear-gradient(135deg, ${row.accent_from}, ${row.accent_to})` }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-ink-950">{row.title}</p>
                      <span className="rounded-full bg-black/10 px-2.5 py-1 text-[11px] font-semibold capitalize">
                        {row.is_active ? t("published") : t("hidden")}
                      </span>
                    </div>
                    <p className="text-sm text-ink-600">{row.headline}</p>
                    <p className="mt-1 text-xs text-ink-500">
                      {row.service_id ? serviceName.get(row.service_id) : t("freeCardShort")}
                      {row.promo_code ? ` · ${row.promo_code} (−${row.discount_percent}%)` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={() => editFlyer(row)}>
                      {t("edit")}
                    </Button>
                    <Button variant="secondary" onClick={() => toggleFlyer(row)}>
                      {row.is_active ? t("unpublish") : t("publish")}
                    </Button>
                    <button
                      type="button"
                      className="rounded-xl border border-red-200 p-2 text-red-600 hover:bg-red-50"
                      onClick={() => deleteFlyer(row.id)}
                      aria-label={t("delete")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}

      {tab === "services" ? (
        <div className="space-y-3">
          {(servicesQ.data ?? []).map((s) => (
            <ServiceRow key={s.id} service={s} onToggle={() => toggleService(s)} onSavePrices={saveServicePrice} />
          ))}
        </div>
      ) : null}

      {tab === "codes" ? (
        <div className="space-y-4">
          <Button className="bg-brand-grad border-0 text-white" onClick={addCode}>
            <Plus className="mr-2 h-4 w-4" /> {t("newCode")}
          </Button>
          {(codesQ.data ?? []).map((c) => (
            <CodeRow key={c.id} code={c} onSave={saveCode} onDelete={deleteCode} />
          ))}
        </div>
      ) : null}

      {tab === "accounts" ? (
        <div className="space-y-4">
          <p className="text-sm text-ink-600">{t("paymentAccountsHint")}</p>
          <Button className="bg-brand-grad border-0 text-white" onClick={addAccount}>
            <Plus className="mr-2 h-4 w-4" /> {t("paymentAccounts")}
          </Button>
          {(accountsQ.data ?? []).map((a) => (
            <AccountRow key={a.id} account={a} onSave={saveAccount} onDelete={deleteAccount} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block text-xs font-semibold text-ink-600">
      {label}
      <input
        className="mt-1 h-10 w-full rounded-xl border border-black/10 px-3 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function ServiceRow({
  service,
  onToggle,
  onSavePrices,
}: {
  service: DigitalService;
  onToggle: () => void;
  onSavePrices: (row: DigitalService, monthly: string, first: string) => Promise<void>;
}) {
  const { t } = useI18n();
  const [monthly, setMonthly] = useState(String(service.price_monthly));
  const [first, setFirst] = useState(service.price_first_month != null ? String(service.price_first_month) : "");

  return (
    <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-4">
        <img src={service.logo_url ?? ""} alt="" className="h-12 w-12 rounded-xl object-contain" />
        <div className="flex-1">
          <p className="font-bold text-ink-950">{service.name}</p>
          <p className="text-sm text-ink-600">{service.subtitle}</p>
        </div>
        <span className="rounded-full bg-black/10 px-2.5 py-1 text-[11px] font-semibold">
          {service.is_active ? t("active") : t("inactive")}
        </span>
        <Button variant="secondary" onClick={onToggle}>
          {service.is_active ? t("deactivate") : t("activate")}
        </Button>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <label className="text-xs font-semibold text-ink-600">
          {t("monthlyPriceFcfa")}
          <input className="mt-1 h-10 w-full rounded-xl border border-black/10 px-3" value={monthly} onChange={(e) => setMonthly(e.target.value)} />
        </label>
        <label className="text-xs font-semibold text-ink-600">
          {t("firstMonthOptional")}
          <input className="mt-1 h-10 w-full rounded-xl border border-black/10 px-3" value={first} onChange={(e) => setFirst(e.target.value)} />
        </label>
        <div className="flex items-end">
          <Button className="w-full" onClick={() => onSavePrices(service, monthly, first)}>
            {t("savePrices")} ({formatMoney(Number(monthly) || 0)})
          </Button>
        </div>
      </div>
    </div>
  );
}

function CodeRow({
  code,
  onSave,
  onDelete,
}: {
  code: PromoCode;
  onSave: (row: PromoCode, c: string, pct: string, active: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const { t } = useI18n();
  const [val, setVal] = useState(code.code);
  const [pct, setPct] = useState(String(code.discount_percent));
  const [active, setActive] = useState(code.is_active);

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
      <label className="text-xs font-semibold text-ink-600">
        {t("codeLabel")}
        <input className="mt-1 h-10 rounded-xl border border-black/10 px-3 font-mono" value={val} onChange={(e) => setVal(e.target.value.toUpperCase())} />
      </label>
      <label className="text-xs font-semibold text-ink-600">
        %
        <input className="mt-1 h-10 w-24 rounded-xl border border-black/10 px-3" value={pct} onChange={(e) => setPct(e.target.value)} />
      </label>
      <label className="flex items-center gap-2 pb-2 text-sm text-ink-700">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
        {t("active")}
      </label>
      <Button onClick={() => onSave(code, val, pct, active)}>{t("save")}</Button>
      <button
        type="button"
        className="rounded-xl border border-red-200 p-2 text-red-600 hover:bg-red-50"
        onClick={() => onDelete(code.id)}
        aria-label={t("delete")}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

function AccountRow({
  account,
  onSave,
  onDelete,
}: {
  account: PaymentAccount;
  onSave: (row: PaymentAccount, patch: Partial<PaymentAccount>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const { t } = useI18n();
  const [label, setLabel] = useState(account.label);
  const [number, setNumber] = useState(account.account_number);
  const [name, setName] = useState(account.account_name ?? "");
  const [bank, setBank] = useState(account.bank_name ?? "");
  const [ussd, setUssd] = useState(account.ussd_template ?? "");
  const [instructions, setInstructions] = useState(account.instructions ?? "");
  const [active, setActive] = useState(account.is_active);

  return (
    <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-bold text-ink-950">
          {t("methodLabel")}: <span className="font-mono text-sm">{account.method}</span>
        </p>
        <button
          type="button"
          className="rounded-xl border border-red-200 p-2 text-red-600 hover:bg-red-50"
          onClick={() => onDelete(account.id)}
          aria-label={t("delete")}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Field label={t("titleLabel")} value={label} onChange={setLabel} />
        <Field label={t("accountNumber")} value={number} onChange={setNumber} />
        <Field label={t("accountName")} value={name} onChange={setName} />
        <Field label={t("bankName")} value={bank} onChange={setBank} />
        <Field label={t("ussdTemplate")} value={ussd} onChange={setUssd} />
        <label className="block text-xs font-semibold text-ink-600 sm:col-span-2">
          {t("instructionsLabel")}
          <textarea
            className="mt-1 min-h-[72px] w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
          />
        </label>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-ink-700">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          {t("active")}
        </label>
        <Button
          onClick={() =>
            onSave(account, {
              label,
              account_number: number,
              account_name: name || null,
              bank_name: bank || null,
              ussd_template: ussd || null,
              instructions: instructions || null,
              is_active: active,
            })
          }
        >
          {t("save")}
        </Button>
      </div>
    </div>
  );
}
