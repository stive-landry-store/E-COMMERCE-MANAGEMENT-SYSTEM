import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/LanguageContext";
import { WORK_AREAS } from "@/lib/constants";
import { Button } from "@/components/ui/Button";

export function SellerPendingPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { seller, isAdmin, isApprovedSeller, refreshProfile, signOut } = useAuth();
  const [shopName, setShopName] = useState(seller?.shop_name ?? "");
  const [shopLocation, setShopLocation] = useState(seller?.shop_location ?? "");
  const [workArea, setWorkArea] = useState(seller?.work_area ?? "");
  const [bio, setBio] = useState(seller?.bio ?? "");
  const [busy, setBusy] = useState(false);

  const status = seller?.status ?? "pending";

  useEffect(() => {
    if (isAdmin || seller?.status === "approved") {
      navigate("/seller", { replace: true });
    }
  }, [isAdmin, isApprovedSeller, seller?.status, navigate]);

  useEffect(() => {
    setShopName(seller?.shop_name ?? "");
    setShopLocation(seller?.shop_location ?? "");
    setWorkArea(seller?.work_area ?? "");
    setBio(seller?.bio ?? "");
  }, [seller]);

  async function savePlace() {
    if (!seller) return;
    if (!shopLocation.trim() || !workArea.trim()) {
      return toast.error(t("sellerPlaceRequired"));
    }
    setBusy(true);
    const { error } = await supabase.rpc("update_my_seller_place", {
      p_shop_location: shopLocation.trim(),
      p_work_area: workArea.trim(),
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success(t("profileUpdated"));
      await refreshProfile();
    }
  }

  if (!seller) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-12">
        <div className="glass w-full max-w-lg rounded-3xl p-8">
          <p className="gradient-text text-sm font-bold tracking-widest">{t("sellerDesk")}</p>
          <h1 className="mt-2 text-3xl font-bold">{t("sellerAccount")}</h1>
          <p className="mt-3 text-sm text-white/60">{t("applySellerCta")}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/sell">
              <Button variant="gold">{t("applySellerLink")}</Button>
            </Link>
            <Link to="/" className="inline-flex items-center gradient-text text-sm font-semibold">
              {t("viewStorefront")}
            </Link>
          </div>
          <button className="mt-6 block text-sm text-white/60" onClick={() => signOut()}>
            {t("signOut")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="glass w-full max-w-lg rounded-3xl p-8">
        <p className="gradient-text text-sm font-bold tracking-widest">{t("sellerDesk")}</p>
        <h1 className="mt-2 text-3xl font-bold">
          {status === "rejected" ? t("applicationDeclined") : status === "suspended" ? t("shopSuspended") : t("waitingApproval")}
        </h1>
        <p className="mt-3 text-sm text-white/60">
          {status === "rejected"
            ? t("rejectedHint")
            : status === "suspended"
              ? t("suspendedHint")
              : t("pendingHint")}
        </p>
        {status !== "suspended" ? (
          <div className="mt-6 space-y-4">
            <div>
              <label>{t("shopName")}</label>
              <input value={shopName} onChange={(e) => setShopName(e.target.value)} disabled={status === "pending"} />
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
              <textarea rows={4} value={bio} onChange={(e) => setBio(e.target.value)} />
            </div>
            <Button onClick={savePlace} disabled={busy} variant="gold" className="w-full">
              {t("save")}
            </Button>
          </div>
        ) : null}
        <button className="mt-6 text-sm text-white/60" onClick={() => signOut()}>
          {t("signOut")}
        </button>
      </div>
    </div>
  );
}
