import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Store, Package, Wrench, ArrowRight, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/LanguageContext";
import { WORK_AREAS, STORE } from "@/lib/constants";
import { Button } from "@/components/ui/Button";
import { CountrySelect, PasswordField } from "@/pages/auth/AuthPages";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { MarketplaceVendorsSection } from "@/components/store/MarketplaceVendorsSection";
import { logoStroke } from "@/components/BrandGradient";

function SellerApplyForm() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();
  const [shopName, setShopName] = useState("");
  const [shopLocation, setShopLocation] = useState("");
  const [workArea, setWorkArea] = useState("");
  const [bio, setBio] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!shopName.trim() || !shopLocation.trim() || !workArea.trim()) {
      return toast.error(t("sellerPlaceRequired"));
    }
    setBusy(true);
    const { error } = await supabase.rpc("apply_as_seller", {
      p_shop_name: shopName.trim(),
      p_bio: bio.trim() || null,
      p_shop_location: shopLocation.trim(),
      p_work_area: workArea.trim(),
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(t("sellerApplicationSent"));
    await refreshProfile();
    navigate("/seller/pending");
  }

  return (
    <form onSubmit={submit} className="glass mt-8 rounded-3xl p-6 md:p-8">
      <h2 className="text-xl font-bold">{t("applySellerLink")}</h2>
      <p className="mt-1 text-sm text-white/55">{t("sellerApplyFormHint")}</p>
      <div className="mt-6 space-y-4">
        <div>
          <label>{t("shopName")}</label>
          <input required value={shopName} onChange={(e) => setShopName(e.target.value)} placeholder={t("shopNamePlaceholder")} />
        </div>
        <div>
          <label>{t("shopLocation")}</label>
          <input
            required
            value={shopLocation}
            onChange={(e) => setShopLocation(e.target.value)}
            placeholder={t("shopLocationPlaceholder")}
          />
        </div>
        <div>
          <label>{t("workArea")}</label>
          <select required value={workArea} onChange={(e) => setWorkArea(e.target.value)}>
            <option value="">{t("selectWorkArea")}</option>
            {WORK_AREAS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>{t("aboutYourShop")}</label>
          <textarea rows={3} value={bio} onChange={(e) => setBio(e.target.value)} placeholder={t("aboutShopPlaceholder")} />
        </div>
        <Button type="submit" variant="gold" className="w-full" disabled={busy}>
          {t("submitSellerApplication")}
        </Button>
      </div>
    </form>
  );
}

export function SellPage() {
  const { t } = useI18n();
  const { user, seller, isApprovedSeller, isSellerApplicant } = useAuth();

  const steps = [
    { icon: Store, title: t("marketplaceStep1"), text: t("marketplaceStep1Hint") },
    { icon: CheckCircle2, title: t("marketplaceStep2"), text: t("marketplaceStep2Hint") },
    { icon: Package, title: t("marketplaceStep3"), text: t("marketplaceStep3Hint") },
  ];

  return (
    <div className="pb-16">
      <section className="container-page py-12 md:py-16">
        <div className="mx-auto max-w-3xl text-center">
          <p className="gradient-text text-sm font-bold uppercase tracking-widest">{t("marketplaceTitle")}</p>
          <h1 className="mt-3 text-4xl font-extrabold md:text-5xl">{t("sellOnStore")}</h1>
          <p className="mt-4 text-lg text-white/60">{t("marketplaceSubtitle")}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {!user ? (
              <>
                <Link to="/register/seller">
                  <Button variant="gold">{t("registerAsSeller")}</Button>
                </Link>
                <Link to="/login">
                  <Button variant="secondary">{t("signIn")}</Button>
                </Link>
              </>
            ) : isApprovedSeller ? (
              <>
                <Link to="/seller/products/new">
                  <Button variant="gold">{t("addProduct")}</Button>
                </Link>
                <Link to="/seller">
                  <Button variant="secondary">{t("sellerDesk")}</Button>
                </Link>
              </>
            ) : isSellerApplicant ? (
              <Link to="/seller/pending">
                <Button variant="gold">{t("checkStatus")}</Button>
              </Link>
            ) : null}
            <Link to="/shop">
              <Button variant="ghost">{t("browseMarketplace")}</Button>
            </Link>
          </div>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {steps.map((step, i) => (
            <div key={step.title} style={{ animationDelay: `${i * 80}ms` }} className="glass animate-fade-up rounded-3xl p-6">
              <step.icon className="h-8 w-8" stroke={logoStroke} />
              <h3 className="mt-4 font-bold">{step.title}</h3>
              <p className="mt-2 text-sm text-white/55">{step.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <div className="glass rounded-3xl p-6">
            <Package className="h-6 w-6" stroke={logoStroke} />
            <h3 className="mt-3 font-bold">{t("listingProduct")}</h3>
            <p className="mt-2 text-sm text-white/55">{t("listingProductHint")}</p>
          </div>
          <div className="glass rounded-3xl p-6">
            <Wrench className="h-6 w-6" stroke={logoStroke} />
            <h3 className="mt-3 font-bold">{t("listingService")}</h3>
            <p className="mt-2 text-sm text-white/55">{t("listingServiceHint")}</p>
          </div>
        </div>

        {user && !seller ? <SellerApplyForm /> : null}
        {!user ? (
          <div className="glass mt-8 rounded-3xl p-8 text-center">
            <p className="text-white/70">{t("applySellerCta")}</p>
            <Link to="/register/seller" className="mt-4 inline-flex items-center gap-2 gradient-text font-semibold">
              {t("registerAsSeller")} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : null}
      </section>

      <MarketplaceVendorsSection />
    </div>
  );
}

export function SellerRegisterPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { refreshProfile } = useAuth();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("Cameroon");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [shopName, setShopName] = useState("");
  const [shopLocation, setShopLocation] = useState("");
  const [workArea, setWorkArea] = useState("");
  const [bio, setBio] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!country.trim()) return toast.error(t("countryRequired"));
    if (!shopName.trim() || !shopLocation.trim() || !workArea.trim()) {
      return toast.error(t("sellerPlaceRequired"));
    }

    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone,
          country: country.trim(),
          shop_name: shopName.trim(),
          shop_bio: bio.trim() || null,
          shop_location: shopLocation.trim(),
          work_area: workArea.trim(),
        },
      },
    });
    if (error) {
      setBusy(false);
      return toast.error(error.message);
    }

    if (data.session?.user) {
      await supabase.from("profiles").update({ country: country.trim() }).eq("id", data.session.user.id);
      await supabase.from("customers").update({ country: country.trim() }).eq("profile_id", data.session.user.id);
      const { error: applyError } = await supabase.rpc("apply_as_seller", {
        p_shop_name: shopName.trim(),
        p_bio: bio.trim() || null,
        p_shop_location: shopLocation.trim(),
        p_work_area: workArea.trim(),
      });
      if (applyError) {
        setBusy(false);
        return toast.error(applyError.message);
      }
      await refreshProfile();
      setBusy(false);
      toast.success(t("sellerApplicationSent"));
      navigate("/seller/pending");
      return;
    }

    setBusy(false);
    toast.success(t("confirmEmailThenSeller"));
    navigate("/login");
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-12">
      <div className="absolute right-4 top-4 sm:right-8 sm:top-8">
        <LanguageSwitcher />
      </div>
      <form onSubmit={submit} className="glass w-full max-w-lg rounded-3xl p-8">
        <p className="gradient-text text-sm font-bold tracking-widest">{STORE.name}</p>
        <h1 className="mt-2 text-3xl font-extrabold">{t("registerAsSeller")}</h1>
        <p className="mt-3 text-sm text-white/55">{t("sellerRegisterHint")}</p>
        <div className="mt-6 space-y-4">
          <div>
            <label>{t("fullName")}</label>
            <input required value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div>
            <label>{t("phone")}</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div>
            <label>{t("country")}</label>
            <CountrySelect required value={country} onChange={setCountry} />
          </div>
          <div>
            <label>{t("email")}</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label>{t("password")}</label>
            <PasswordField required minLength={6} value={password} onChange={setPassword} />
          </div>
          <hr className="border-white/10" />
          <div>
            <label>{t("shopName")}</label>
            <input required value={shopName} onChange={(e) => setShopName(e.target.value)} placeholder={t("shopNamePlaceholder")} />
          </div>
          <div>
            <label>{t("shopLocation")}</label>
            <input
              required
              value={shopLocation}
              onChange={(e) => setShopLocation(e.target.value)}
              placeholder={t("shopLocationPlaceholder")}
            />
          </div>
          <div>
            <label>{t("workArea")}</label>
            <select required value={workArea} onChange={(e) => setWorkArea(e.target.value)}>
              <option value="">{t("selectWorkArea")}</option>
              {WORK_AREAS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>{t("aboutYourShop")}</label>
            <textarea rows={3} value={bio} onChange={(e) => setBio(e.target.value)} placeholder={t("aboutShopPlaceholder")} />
          </div>
          <Button type="submit" className="w-full" variant="gold" disabled={busy}>
            {t("registerAsSeller")}
          </Button>
        </div>
        <p className="mt-4 text-sm text-white/55">
          {t("alreadyHaveAccount")}{" "}
          <Link to="/login" className="gradient-text font-semibold">
            {t("signIn")}
          </Link>
        </p>
        <p className="mt-2 text-sm">
          <Link to="/register" className="text-white/50 hover:text-white/70">
            {t("registerAsClient")}
          </Link>
        </p>
      </form>
    </div>
  );
}
