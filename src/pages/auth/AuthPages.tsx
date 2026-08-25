import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { COUNTRIES, STORE, WORK_AREAS } from "@/lib/constants";
import { resolvePostLoginPath } from "@/lib/access";
import { useI18n } from "@/contexts/LanguageContext";
import type { Profile, Seller } from "@/types";

export function PasswordField({
  value,
  onChange,
  required,
  minLength,
  id,
}: {
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  minLength?: number;
  id?: string;
}) {
  const { t } = useI18n();
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        type={show ? "text" : "password"}
        required={required}
        minLength={minLength}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full pr-11"
        autoComplete="current-password"
      />
      <button
        type="button"
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-white/55 hover:bg-white/10 hover:text-white"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? t("hidePassword") : t("showPassword")}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export function CountrySelect({ value, onChange, required }: { value: string; onChange: (v: string) => void; required?: boolean }) {
  const { t } = useI18n();
  return (
    <select required={required} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{t("selectCountry")}</option>
      {COUNTRIES.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
    </select>
  );
}

async function loadAccount(userId: string) {
  const [{ data: profile }, { data: seller }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.from("sellers").select("*").eq("profile_id", userId).maybeSingle(),
  ]);
  return { profile: (profile as Profile | null) ?? null, seller: (seller as Seller | null) ?? null };
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useI18n();
  const from = (location.state as { from?: string } | null)?.from;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<"credentials" | "details">("credentials");
  const [userId, setUserId] = useState<string | null>(null);
  const [country, setCountry] = useState("Cameroon");
  const [shopLocation, setShopLocation] = useState("");
  const [workArea, setWorkArea] = useState("");
  const [needSellerPlace, setNeedSellerPlace] = useState(false);
  const [destPath, setDestPath] = useState("/account");

  async function finishLogin(path: string) {
    setBusy(false);
    toast.success(t("signedInWelcome"));
    navigate(path, { replace: true });
  }

  async function submitCredentials(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      setBusy(false);
      toast.error(error?.message ?? t("signInFailed"));
      return;
    }

    const { profile, seller } = await loadAccount(data.user.id);
    const path = resolvePostLoginPath(profile, seller, from);

    const missingCountry = !profile?.country?.trim();
    const missingSellerPlace =
      Boolean(seller) && (!seller?.shop_location?.trim() || !seller?.work_area?.trim());

    if (missingCountry || missingSellerPlace) {
      setUserId(data.user.id);
      setCountry(profile?.country?.trim() || "Cameroon");
      setShopLocation(seller?.shop_location ?? "");
      setWorkArea(seller?.work_area ?? "");
      setNeedSellerPlace(missingSellerPlace);
      setDestPath(path);
      setStep("details");
      setBusy(false);
      toast.info(t("completeLocationHint"));
      return;
    }

    await finishLogin(path);
  }

  async function submitDetails(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    if (!country.trim()) return toast.error(t("countryRequired"));
    if (needSellerPlace && (!shopLocation.trim() || !workArea.trim())) {
      return toast.error(t("sellerPlaceRequired"));
    }

    setBusy(true);
    const { error: pErr } = await supabase.from("profiles").update({ country: country.trim() }).eq("id", userId);
    if (pErr) {
      setBusy(false);
      toast.error(pErr.message);
      return;
    }
    await supabase.from("customers").update({ country: country.trim() }).eq("profile_id", userId);

    if (needSellerPlace) {
      const { error: sErr } = await supabase.rpc("update_my_seller_place", {
        p_shop_location: shopLocation.trim(),
        p_work_area: workArea.trim(),
      });
      if (sErr) {
        setBusy(false);
        toast.error(sErr.message);
        return;
      }
    }

    await finishLogin(destPath);
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-12">
      <div className="absolute right-4 top-4 sm:right-8 sm:top-8">
        <LanguageSwitcher />
      </div>
      {step === "credentials" ? (
        <form onSubmit={submitCredentials} className="glass w-full max-w-lg rounded-3xl p-8">
          <img src="/logo.webp" alt="" className="mx-auto h-24 w-24 object-contain" />
          <p className="mt-4 text-center text-sm font-bold tracking-widest">{STORE.short}</p>
          <p className="gradient-text text-center text-xs font-semibold">{STORE.tagline}</p>
          <h1 className="mt-4 text-center text-3xl font-extrabold">{t("signInTitle")}</h1>
          <p className="mt-2 text-center text-sm text-white/55">{t("signInSubtitle")}</p>

          <div className="mt-6 space-y-4">
            <div>
              <label>{t("email")}</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label>{t("password")}</label>
              <PasswordField required value={password} onChange={setPassword} />
            </div>
            <Button type="submit" className="w-full" variant="gold" disabled={busy}>
              {t("signIn")}
            </Button>
          </div>
          <div className="mt-4 flex flex-col gap-2 text-center text-sm sm:flex-row sm:justify-between">
            <Link to="/forgot-password" className="gradient-text">
              {t("forgotPassword")}
            </Link>
            <Link to="/register" className="gradient-text font-semibold">
              {t("createAccount")}
            </Link>
          </div>
        </form>
      ) : (
        <form onSubmit={submitDetails} className="glass w-full max-w-lg rounded-3xl p-8">
          <h1 className="text-3xl font-extrabold">{t("completeYourProfile")}</h1>
          <p className="mt-2 text-sm text-white/55">{t("completeLocationHint")}</p>
          <div className="mt-6 space-y-4">
            <div>
              <label>{t("country")}</label>
              <CountrySelect required value={country} onChange={setCountry} />
            </div>
            {needSellerPlace ? (
              <>
                <div>
                  <label>{t("shopLocation")}</label>
                  <input
                    required
                    minLength={2}
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
              </>
            ) : null}
            <Button type="submit" className="w-full" variant="gold" disabled={busy}>
              {t("saveAndContinue")}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

export function RegisterPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("Cameroon");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!country.trim()) return toast.error(t("countryRequired"));

    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone,
          country: country.trim(),
        },
      },
    });
    if (error) {
      setBusy(false);
      toast.error(error.message);
      return;
    }

    if (data.session?.user) {
      await supabase.from("profiles").update({ country: country.trim() }).eq("id", data.session.user.id);
      await supabase.from("customers").update({ country: country.trim() }).eq("profile_id", data.session.user.id);
    }

    setBusy(false);
    toast.success(t("createYourAccount"));
    navigate(data.session ? "/account" : "/login");
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-12">
      <div className="absolute right-4 top-4 sm:right-8 sm:top-8">
        <LanguageSwitcher />
      </div>
      <form onSubmit={submit} className="glass w-full max-w-lg rounded-3xl p-8">
        <h1 className="text-3xl font-extrabold">{t("createYourAccount")}</h1>
        <p className="mt-3 text-sm text-white/55">{t("clientRegisterHint")}</p>
        <p className="mt-2 text-sm">
          {t("applySellerCta")}{" "}
          <Link to="/register/seller" className="gradient-text font-semibold">
            {t("registerAsSeller")}
          </Link>
        </p>
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
          <Button type="submit" className="w-full" variant="gold" disabled={busy}>
            {t("registerAsClient")}
          </Button>
        </div>
        <p className="mt-4 text-sm">
          {t("alreadyHaveAccount")} <Link to="/login">{t("signIn")}</Link>
        </p>
      </form>
    </div>
  );
}

export function ForgotPasswordPage() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success(t("sendResetLink"));
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <div className="absolute right-4 top-4 sm:right-8 sm:top-8">
        <LanguageSwitcher />
      </div>
      <form onSubmit={submit} className="glass w-full max-w-md p-8">
        <h1 className="text-3xl font-extrabold">{t("resetPassword")}</h1>
        <div className="mt-6">
          <label>{t("email")}</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <Button type="submit" className="mt-4 w-full" disabled={busy}>
          {t("sendResetLink")}
        </Button>
      </form>
    </div>
  );
}

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success(t("updatePassword"));
      navigate("/login");
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <div className="absolute right-4 top-4 sm:right-8 sm:top-8">
        <LanguageSwitcher />
      </div>
      <form onSubmit={submit} className="glass w-full max-w-md p-8">
        <h1 className="text-3xl font-extrabold">{t("chooseNewPassword")}</h1>
        <div className="mt-6">
          <label>{t("newPassword")}</label>
          <PasswordField required minLength={6} value={password} onChange={setPassword} />
        </div>
        <Button type="submit" className="mt-4 w-full" disabled={busy}>
          {t("updatePassword")}
        </Button>
      </form>
    </div>
  );
}
