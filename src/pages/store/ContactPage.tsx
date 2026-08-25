import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/contexts/LanguageContext";
import { WhatsAppSupportButton } from "@/components/WhatsAppSupportButton";
import { WHATSAPP_SUPPORT } from "@/lib/constants";
import type { SiteSettings } from "@/types";

export function ContactPage() {
  const { t } = useI18n();
  const settings = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("*").eq("id", 1).maybeSingle();
      return data as SiteSettings | null;
    },
  });

  const s = settings.data;

  return (
    <div className="container-page grid gap-10 py-14 md:grid-cols-2">
      <div>
        <p className="gradient-text font-bold tracking-widest">{t("visitLabel")}</p>
        <h1 className="mt-3 text-4xl font-extrabold">{t("contactTitle")}</h1>
        <p className="mt-4 text-white/70">{t("contactBody")}</p>
        <div className="mt-8 space-y-4 text-sm">
          <p>
            <span className="block text-xs uppercase tracking-wide text-white/40">{t("addressLabel")}</span>
            {s?.address ?? "Douala, Cameroon"}
          </p>
          <p>
            <span className="block text-xs uppercase tracking-wide text-white/40">{t("hoursLabel")}</span>
            {s?.hours ?? t("hoursDefault")}
          </p>
          <p>
            <span className="block text-xs uppercase tracking-wide text-white/40">{t("phone")}</span>
            {s?.phone ?? t("askInStore")}
          </p>
          <p>
            <span className="block text-xs uppercase tracking-wide text-white/40">{t("email")}</span>
            {s?.email ?? "hello@stivelandry.store"}
          </p>
          <p>
            <span className="block text-xs uppercase tracking-wide text-white/40">{t("whatsappSupport")}</span>
            <a
              href={WHATSAPP_SUPPORT.href}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-2 font-semibold text-[#25D366] hover:underline"
            >
              {WHATSAPP_SUPPORT.display}
            </a>
          </p>
        </div>
        <div className="mt-6">
          <WhatsAppSupportButton variant="inline" />
        </div>
      </div>
      <form
        className="surface space-y-4 p-6"
        onSubmit={(e) => {
          e.preventDefault();
          window.location.href = `mailto:${s?.email ?? "hello@stivelandry.store"}`;
        }}
      >
        <h2 className="font-medium">{t("sendMessage")}</h2>
        <div>
          <label>{t("nameLabel")}</label>
          <input required name="name" />
        </div>
        <div>
          <label>{t("email")}</label>
          <input required type="email" name="email" />
        </div>
        <div>
          <label>{t("messageLabel")}</label>
          <textarea required name="message" rows={5} />
        </div>
        <button className="rounded-xl bg-brand-grad px-5 py-2.5 text-sm font-bold text-white" type="submit">
          {t("openEmail")}
        </button>
      </form>
    </div>
  );
}
