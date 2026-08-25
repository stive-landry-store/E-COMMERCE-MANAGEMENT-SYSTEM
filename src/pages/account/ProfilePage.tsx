import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Camera } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/LanguageContext";
import { supabase } from "@/lib/supabase";
import { COUNTRIES, WORK_AREAS } from "@/lib/constants";
import { uploadAvatar } from "@/lib/upload";
import { Button } from "@/components/ui/Button";
import { ProfileAvatar } from "@/components/ProfileAvatar";

export function ProfilePage() {
  const { t } = useI18n();
  const { profile, seller, isApprovedSeller, isSellerApplicant, refreshProfile, user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [country, setCountry] = useState(profile?.country ?? "Cameroon");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? "");
  const [shopLocation, setShopLocation] = useState(seller?.shop_location ?? "");
  const [workArea, setWorkArea] = useState(seller?.work_area ?? "");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setFullName(profile?.full_name ?? "");
    setPhone(profile?.phone ?? "");
    setCountry(profile?.country ?? "Cameroon");
    setAvatarUrl(profile?.avatar_url ?? "");
    setShopLocation(seller?.shop_location ?? "");
    setWorkArea(seller?.work_area ?? "");
  }, [profile, seller]);

  const showSellerFields = isApprovedSeller || isSellerApplicant || Boolean(seller);

  async function pickAvatar(file: File) {
    if (!profile || !user) return;
    setUploading(true);
    try {
      const url = await uploadAvatar(file, user.id);
      const { error } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", profile.id);
      if (error) throw error;
      setAvatarUrl(url);
      await refreshProfile();
      toast.success(t("profilePhotoUpdated"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("uploadFailed"));
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (!profile) return;
    if (!country.trim()) return toast.error(t("countryRequired"));
    if (showSellerFields && (!shopLocation.trim() || !workArea.trim())) {
      return toast.error(t("sellerPlaceRequired"));
    }

    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName, phone, country: country.trim() })
      .eq("id", profile.id);
    if (error) {
      setBusy(false);
      toast.error(error.message);
      return;
    }
    await supabase.from("customers").update({ country: country.trim() }).eq("profile_id", profile.id);

    if (showSellerFields && seller) {
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

    setBusy(false);
    await refreshProfile();
    toast.success(t("profileUpdated"));
  }

  return (
    <div className="max-w-lg surface p-6">
      <div className="mb-6 flex items-center gap-4">
        <label className="group relative shrink-0 cursor-pointer">
          <ProfileAvatar profile={profile ? { ...profile, avatar_url: avatarUrl } : null} size="lg" />
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-full bg-black/45 opacity-0 transition group-hover:opacity-100">
            <Camera className="h-5 w-5 text-white" />
          </span>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,image/heic,image/heif,.heic,.heif"
            className="absolute inset-0 cursor-pointer opacity-0"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void pickAvatar(file);
              e.target.value = "";
            }}
          />
        </label>
        <div>
          <p className="font-bold">{fullName || profile?.email}</p>
          <button
            type="button"
            className="mt-1 text-sm gradient-text font-semibold"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? t("uploading") : t("changeProfilePhoto")}
          </button>
          <p className="mt-1 text-xs text-white/45">{t("profilePhotoHint")}</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label>{t("fullName")}</label>
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div>
          <label>{t("phone")}</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div>
          <label>{t("country")}</label>
          <select required value={country} onChange={(e) => setCountry(e.target.value)}>
            <option value="">{t("selectCountry")}</option>
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        {showSellerFields ? (
          <>
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
          </>
        ) : null}
        <div>
          <label>{t("email")}</label>
          <input value={profile?.email ?? ""} disabled />
        </div>
        <Button onClick={save} disabled={busy}>
          {t("save")}
        </Button>
      </div>
    </div>
  );
}
