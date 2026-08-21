import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Eye, EyeOff, Store, UserRound } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { STORE } from "@/lib/constants";
import { homeForSession } from "@/lib/access";
import { useI18n } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import type { LoginPortal, Profile, Seller } from "@/types";

const portalIcon = {
  client: UserRound,
  seller: Store,
};

function PasswordField({
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
  const [portal, setPortal] = useState<LoginPortal>("client");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const portals = [
    { id: "client" as const, label: t("portalClient"), hint: t("portalClientHint") },
    { id: "seller" as const, label: t("portalSeller"), hint: t("portalSellerHint") },
  ];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      setBusy(false);
      toast.error(error?.message ?? t("signInFailed"));
      return;
    }

    const { profile, seller } = await loadAccount(data.user.id);
    const result = homeForSession(portal, profile, seller);
    if (!result.ok) {
      await supabase.auth.signOut();
      setBusy(false);
      toast.error(result.message);
      return;
    }

    setBusy(false);
    toast.success(`${t("signedInAs")} ${portal === "client" ? t("portalClient") : t("portalSeller")}`);
    const next = portal === "client" && from && !from.startsWith("/console") && !from.startsWith("/seller") ? from : result.path;
    navigate(next, { replace: true });
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-12">
      <div className="absolute right-4 top-4 sm:right-8 sm:top-8">
        <LanguageSwitcher />
      </div>
      <form onSubmit={submit} className="glass w-full max-w-lg rounded-3xl p-8">
        <img src="/logo.png?v=2" alt="" className="mx-auto h-24 w-24 object-contain" />
        <p className="mt-4 text-center text-sm font-bold tracking-widest">{STORE.short}</p>
        <p className="gradient-text text-center text-xs font-semibold">{STORE.tagline}</p>
        <h1 className="mt-4 text-center text-3xl font-extrabold">{t("signInTitle")}</h1>
        <p className="mt-2 text-center text-sm text-white/55">{t("choosePortal")}</p>

        <div className="mt-6 grid grid-cols-2 gap-2">
          {portals.map((p) => {
            const Icon = portalIcon[p.id];
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setPortal(p.id)}
                className={cn(
                  "rounded-2xl border px-2 py-3 text-center transition",
                  portal === p.id ? "border-transparent bg-brand-grad text-white" : "border-white/10 bg-white/5 hover:bg-white/10",
                )}
              >
                <Icon className="mx-auto h-5 w-5" />
                <span className="mt-1 block text-sm font-extrabold">{p.label}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-center text-xs text-white/50">{portals.find((p) => p.id === portal)?.hint}</p>

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
            {t("continueAs")} {portal === "client" ? t("portalClient") : t("portalSeller")}
          </Button>
        </div>
        <div className="mt-4 flex justify-between text-sm">
          <Link to="/forgot-password" className="gradient-text">
            {t("forgotPassword")}
          </Link>
          <Link to={portal === "seller" ? "/register?as=seller" : "/register"}>{t("createAccount")}</Link>
        </div>
      </form>
    </div>
  );
}

export function RegisterPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useI18n();
  const startAsSeller = new URLSearchParams(location.search).get("as") === "seller";
  const [asSeller, setAsSeller] = useState(startAsSeller);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [shopName, setShopName] = useState("");
  const [bio, setBio] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone,
          ...(asSeller ? { shop_name: shopName, shop_bio: bio } : {}),
        },
      },
    });
    if (error) {
      setBusy(false);
      toast.error(error.message);
      return;
    }

    if (asSeller && data.session?.user) {
      const { error: applyError } = await supabase.rpc("apply_as_seller", {
        p_shop_name: shopName,
        p_bio: bio || null,
      });
      if (applyError) toast.error(applyError.message);
    }

    setBusy(false);
    if (asSeller) {
      toast.success(t("applicationSent"));
      navigate(data.session ? "/seller/pending" : "/login");
    } else {
      toast.success(t("createYourAccount"));
      navigate(data.session ? "/account" : "/login");
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-12">
      <div className="absolute right-4 top-4 sm:right-8 sm:top-8">
        <LanguageSwitcher />
      </div>
      <form onSubmit={submit} className="glass w-full max-w-lg rounded-3xl p-8">
        <h1 className="text-3xl font-extrabold">{t("createYourAccount")}</h1>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setAsSeller(false)}
            className={cn("rounded-2xl border px-3 py-3 text-sm font-extrabold", !asSeller ? "border-transparent bg-brand-grad text-white" : "border-white/10")}
          >
            {t("portalClient")}
          </button>
          <button
            type="button"
            onClick={() => setAsSeller(true)}
            className={cn("rounded-2xl border px-3 py-3 text-sm font-extrabold", asSeller ? "border-transparent bg-brand-grad text-white" : "border-white/10")}
          >
            {t("portalSeller")}
          </button>
        </div>
        <p className="mt-3 text-sm text-white/55">{asSeller ? t("sellerRegisterHint") : t("clientRegisterHint")}</p>
        <div className="mt-6 space-y-4">
          <div>
            <label>{t("fullName")}</label>
            <input required value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div>
            <label>{t("phone")}</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          {asSeller ? (
            <>
              <div>
                <label>{t("shopName")}</label>
                <input required minLength={2} value={shopName} onChange={(e) => setShopName(e.target.value)} />
              </div>
              <div>
                <label>{t("aboutYourShop")}</label>
                <textarea rows={3} value={bio} onChange={(e) => setBio(e.target.value)} />
              </div>
            </>
          ) : null}
          <div>
            <label>{t("email")}</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label>{t("password")}</label>
            <PasswordField required minLength={6} value={password} onChange={setPassword} />
          </div>
          <Button type="submit" className="w-full" variant="gold" disabled={busy}>
            {asSeller ? t("applyAsSeller") : t("registerAsClient")}
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
