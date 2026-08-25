import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BadgeCheck, ExternalLink, Search, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/format";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/Button";
import { Spinner, EmptyState } from "@/components/ui/Spinner";
import { StatusPill } from "@/components/ui/Badge";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import type { Profile, Seller, SellerStatus } from "@/types";

type Tab = "pending" | "all";

type AdminSellerRow = {
  id: string;
  profile_id: string;
  shop_name: string;
  bio: string | null;
  shop_location?: string | null;
  work_area?: string | null;
  status: SellerStatus;
  is_verified?: boolean;
  verified_at?: string | null;
  verified_source?: "admin" | "auto" | null;
  verification_revoked_at?: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  owner_full_name?: string | null;
  owner_email?: string | null;
  owner_phone?: string | null;
  owner_country?: string | null;
  owner_role?: Profile["role"] | null;
  owner_avatar_url?: string | null;
};

function mapAdminSellerRow(row: AdminSellerRow): Seller {
  return {
    id: row.id,
    profile_id: row.profile_id,
    shop_name: row.shop_name,
    bio: row.bio,
    shop_location: row.shop_location,
    work_area: row.work_area,
    status: row.status,
    is_verified: row.is_verified,
    verified_at: row.verified_at,
    verified_source: row.verified_source,
    verification_revoked_at: row.verification_revoked_at,
    approved_by: row.approved_by,
    approved_at: row.approved_at,
    created_at: row.created_at,
    profiles: {
      full_name: row.owner_full_name ?? "",
      email: row.owner_email ?? null,
      phone: row.owner_phone ?? null,
      country: row.owner_country ?? null,
      role: row.owner_role ?? "customer",
      avatar_url: row.owner_avatar_url ?? null,
    },
  };
}

async function fetchAdminSellers(): Promise<Seller[]> {
  const { data, error } = await supabase.rpc("admin_list_sellers");
  if (!error && data) {
    return (data as AdminSellerRow[]).map(mapAdminSellerRow);
  }

  const { data: fallback, error: fallbackError } = await supabase
    .from("sellers")
    .select("*, profiles(full_name,email,phone,country,role,avatar_url)")
    .order("shop_name");
  if (fallbackError) throw fallbackError;
  return (fallback ?? []) as Seller[];
}

export function SellersAdminPage() {
  const { t } = useI18n();
  const { isMainAdmin, isPrincipalAdmin } = useAuth();
  const qc = useQueryClient();
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>(() => (searchParams.get("tab") === "pending" ? "pending" : "all"));
  const [listSearch, setListSearch] = useState("");
  const [shopName, setShopName] = useState("");
  const [profileId, setProfileId] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const sellers = useQuery({
    queryKey: ["admin-sellers"],
    queryFn: fetchAdminSellers,
  });

  useEffect(() => {
    const nextTab = searchParams.get("tab") === "pending" ? "pending" : "all";
    setTab(nextTab);
  }, [searchParams]);

  useEffect(() => {
    if (sellers.isError) {
      toast.error(sellers.error instanceof Error ? sellers.error.message : t("sellersLoadError"));
    }
  }, [sellers.isError, sellers.error, t]);

  const reviewStats = useQuery({
    queryKey: ["admin-seller-review-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.from("seller_reviews").select("seller_id, rating");
      if (error) throw error;
      const map = new Map<string, { total: number; fourPlus: number; avg: number }>();
      for (const row of data ?? []) {
        const cur = map.get(row.seller_id) ?? { total: 0, fourPlus: 0, avg: 0 };
        cur.total += 1;
        if (row.rating >= 4) cur.fourPlus += 1;
        cur.avg += row.rating;
        map.set(row.seller_id, cur);
      }
      for (const [id, cur] of map) {
        map.set(id, { ...cur, avg: cur.total ? cur.avg / cur.total : 0 });
      }
      return map;
    },
  });

  const customers = useQuery({
    queryKey: ["profiles-for-seller"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,full_name,email,role")
        .eq("role", "customer")
        .order("full_name");
      if (error) throw error;
      return data as Pick<Profile, "id" | "full_name" | "email" | "role">[];
    },
  });

  const pending = useMemo(
    () => (sellers.data ?? []).filter((s) => s.status === "pending"),
    [sellers.data],
  );

  const filteredAll = useMemo(() => {
    const q = listSearch.trim().toLowerCase();
    const all = sellers.data ?? [];
    if (!q) return all;
    return all.filter((s) => {
      const shop = s.shop_name.toLowerCase();
      const email = (s.profiles?.email ?? "").toLowerCase();
      const name = (s.profiles?.full_name ?? "").toLowerCase();
      return shop.includes(q) || email.includes(q) || name.includes(q);
    });
  }, [sellers.data, listSearch]);

  const rows = tab === "pending" ? pending : filteredAll;

  async function setStatus(id: string, status: SellerStatus) {
    setBusyId(id);
    const { error } = await supabase.rpc("set_seller_status", { p_seller_id: id, p_status: status });
    setBusyId(null);
    if (error) toast.error(error.message);
    else {
      toast.success(status === "approved" ? t("sellerApprovedToast") : `Seller ${status}`);
      qc.invalidateQueries({ queryKey: ["admin-sellers"] });
    }
  }

  async function setVerified(id: string, verified: boolean) {
    setBusyId(id);
    const { error } = await supabase.rpc("set_seller_verified", {
      p_seller_id: id,
      p_verified: verified,
    });
    setBusyId(null);
    if (error) toast.error(error.message);
    else {
      toast.success(verified ? t("badgeGrantedToast") : t("badgeRemovedToast"));
      qc.invalidateQueries({ queryKey: ["admin-sellers"] });
    }
  }

  async function addSeller() {
    if (!profileId || !shopName.trim()) return toast.error(t("chooseClientAndShop"));
    const { error } = await supabase.rpc("admin_add_seller", {
      p_profile_id: profileId,
      p_shop_name: shopName.trim(),
    });
    if (error) toast.error(error.message);
    else {
      toast.success(t("sellerApprovedToast"));
      setShopName("");
      setProfileId("");
      qc.invalidateQueries({ queryKey: ["admin-sellers"] });
    }
  }

  async function removeSeller(id: string) {
    if (!window.confirm(t("removeSellerConfirm"))) return;
    const { error } = await supabase.rpc("admin_remove_seller", { p_seller_id: id });
    if (error) toast.error(error.message);
    else {
      toast.success(t("sellerRemoved"));
      qc.invalidateQueries({ queryKey: ["admin-sellers"] });
    }
  }

  async function setCoAdmin(id: string, enabled: boolean) {
    setBusyId(id);
    const { error } = await supabase.rpc("set_co_admin", { p_seller_id: id, p_enabled: enabled });
    setBusyId(null);
    if (error) toast.error(error.message);
    else {
      toast.success(enabled ? t("coAdminGranted") : t("coAdminRemoved"));
      qc.invalidateQueries({ queryKey: ["admin-sellers"] });
    }
  }

  if (sellers.isLoading) return <Spinner />;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">{t("verifySellersTitle")}</h1>
          <p className="mt-1 max-w-2xl text-sm text-ink-700/70">{t("approveVsVerifyHint")}</p>
        </div>
        <div className="flex items-center gap-2 rounded-2xl bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700">
          <BadgeCheck className="h-5 w-5 fill-[#1D9BF0] text-white" strokeWidth={0} />
          {pending.length} {t("awaitingVerification")}
        </div>
      </div>

      {isMainAdmin ? (
        <div className="mt-6 grid gap-3 rounded-2xl border border-black/5 bg-white p-4 shadow-sm md:grid-cols-3">
          <select value={profileId} onChange={(e) => setProfileId(e.target.value)} className="rounded-xl border px-3 py-2">
            <option value="">{t("chooseClientAccount")}</option>
            {(customers.data ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name} · {p.email}
              </option>
            ))}
          </select>
          <input
            className="rounded-xl border px-3 py-2"
            placeholder={t("shopName")}
            value={shopName}
            onChange={(e) => setShopName(e.target.value)}
          />
          <Button onClick={addSeller} className="border-0 bg-brand-grad text-white">
            <ShieldCheck className="h-4 w-4" />
            {t("addAndApproveSeller")}
          </Button>
        </div>
      ) : null}

      {isMainAdmin ? (
        <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          <p className="font-bold">{t("coAdminHowTitle")}</p>
          <p className="mt-1">{t("coAdminHowHint")}</p>
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setTab("all")}
          className={`rounded-xl px-4 py-2 text-sm font-bold ${tab === "all" ? "bg-ink-950 text-white" : "bg-white"}`}
        >
          {t("allSellers")} ({sellers.data?.length ?? 0})
        </button>
        <button
          type="button"
          onClick={() => setTab("pending")}
          className={`rounded-xl px-4 py-2 text-sm font-bold ${tab === "pending" ? "bg-ink-950 text-white" : "bg-white"}`}
        >
          {t("toApprove")} ({pending.length})
        </button>
      </div>

      {tab === "all" ? (
        <div className="relative mt-4 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-700/40" />
          <input
            value={listSearch}
            onChange={(e) => setListSearch(e.target.value)}
            placeholder={t("searchSellerByShopOrEmail")}
            className="w-full rounded-xl border py-2.5 pl-10 pr-3 text-sm"
          />
        </div>
      ) : null}

      {!rows.length ? (
        <div className="mt-6">
          <EmptyState
            title={tab === "pending" ? t("noSellersToVerify") : t("noSellerApplications")}
            hint={
              tab === "all" && listSearch
                ? t("noSellerSearchMatch")
                : sellers.isError
                  ? t("sellersLoadErrorHint")
                  : t("noSellerApplicationsHint")
            }
          />
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-black/5 bg-white shadow-sm">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="border-b text-xs uppercase text-ink-700/60">
              <tr>
                <th className="px-3 py-3">{t("shop")}</th>
                <th className="px-3 py-3">{t("owner")}</th>
                <th className="px-3 py-3">{t("ratings")}</th>
                <th className="px-3 py-3">{t("status")}</th>
                <th className="px-3 py-3">{t("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const stats = reviewStats.data?.get(row.id);
                const canManage = isPrincipalAdmin;
                return (
                  <tr key={row.id} className="border-b last:border-0 align-top">
                    <td className="px-3 py-3">
                      <Link
                        to={`/vendor/${row.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="group flex items-start gap-2 font-medium hover:text-[#ff2d95]"
                      >
                        <ProfileAvatar profile={row.profiles ?? undefined} size="sm" />
                        <span className="min-w-0">
                          <span className="flex items-center gap-1.5">
                            {row.shop_name}
                            {row.is_verified ? <VerifiedBadge size="sm" /> : null}
                            <ExternalLink className="h-3.5 w-3.5 opacity-0 transition group-hover:opacity-60" />
                          </span>
                          <span className="mt-0.5 block text-xs font-normal text-ink-700/60 group-hover:text-[#ff2d95]/80">
                            {t("viewShopProfile")}
                          </span>
                        </span>
                      </Link>
                      <div className="mt-2 text-xs text-ink-700/60">{row.bio}</div>
                      {(row.shop_location || row.work_area) && (
                        <div className="mt-1 text-xs text-ink-700/55">
                          {row.shop_location ? <span>{row.shop_location}</span> : null}
                          {row.shop_location && row.work_area ? " · " : null}
                          {row.work_area ? <span>{row.work_area}</span> : null}
                        </div>
                      )}
                      {row.profiles?.country ? (
                        <div className="mt-0.5 text-xs text-ink-700/45">{row.profiles.country}</div>
                      ) : null}
                      <div className="mt-1 text-xs text-ink-700/45">{formatDate(row.created_at)}</div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <ProfileAvatar profile={row.profiles ?? undefined} size="sm" />
                        <div>
                          <div>{row.profiles?.full_name}</div>
                          <div className="text-xs text-ink-700/60">{row.profiles?.email}</div>
                          {row.profiles?.role === "co_admin" ? (
                            <span className="mt-1 inline-block rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold uppercase text-sky-800">
                              {t("coAdminBadge")}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-xs text-ink-700/70">
                      {stats ? (
                        <>
                          <p>
                            ★ {stats.avg.toFixed(1)} · {stats.total} {t("reviews")}
                          </p>
                          <p className="mt-0.5">
                            {stats.fourPlus}/9 {t("fourStarProgress")}
                          </p>
                        </>
                      ) : (
                        <span>—</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-col gap-2">
                        <StatusPill value={row.status} />
                        {row.is_verified ? (
                          <VerifiedBadge size="sm" withLabel />
                        ) : row.status === "approved" ? (
                          <span className="text-xs font-semibold text-ink-700/50">{t("notVerifiedYet")}</span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        {canManage && row.status !== "approved" ? (
                          <Button
                            size="sm"
                            className="border-0 bg-brand-grad text-white"
                            disabled={busyId === row.id}
                            onClick={() => setStatus(row.id, "approved")}
                          >
                            {t("approveSellerOnly")}
                          </Button>
                        ) : null}
                        {canManage && row.status === "approved" && !row.is_verified ? (
                          <Button
                            size="sm"
                            className="border-0 bg-[#1D9BF0] text-white hover:brightness-110"
                            disabled={busyId === row.id}
                            onClick={() => setVerified(row.id, true)}
                          >
                            <BadgeCheck className="h-4 w-4" />
                            {t("giveVerifiedBadge")}
                          </Button>
                        ) : null}
                        {canManage && row.is_verified ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={busyId === row.id}
                            onClick={() => setVerified(row.id, false)}
                          >
                            {t("removeVerifiedBadge")}
                          </Button>
                        ) : null}
                        {canManage && row.status === "pending" ? (
                          <Button size="sm" variant="secondary" disabled={busyId === row.id} onClick={() => setStatus(row.id, "rejected")}>
                            {t("reject")}
                          </Button>
                        ) : null}
                        {canManage && row.status === "approved" ? (
                          <Button size="sm" variant="secondary" disabled={busyId === row.id} onClick={() => setStatus(row.id, "suspended")}>
                            {t("suspend")}
                          </Button>
                        ) : null}
                        {isMainAdmin && row.status === "approved" && row.is_verified && row.profiles?.role !== "co_admin" && row.profiles?.role !== "admin" ? (
                          <Button
                            size="sm"
                            className="border-0 bg-ink-950 text-white"
                            disabled={busyId === row.id}
                            onClick={() => setCoAdmin(row.id, true)}
                          >
                            {t("nominateCoAdmin")}
                          </Button>
                        ) : null}
                        {isMainAdmin && row.profiles?.role === "co_admin" ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={busyId === row.id}
                            onClick={() => setCoAdmin(row.id, false)}
                          >
                            {t("removeCoAdmin")}
                          </Button>
                        ) : null}
                        {isMainAdmin ? (
                          <Button size="sm" variant="danger" onClick={() => removeSeller(row.id)}>
                            {t("remove")}
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
