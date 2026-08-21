import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Spinner, EmptyState } from "@/components/ui/Spinner";
import { StatusPill } from "@/components/ui/Badge";
import type { Profile, Seller, SellerStatus } from "@/types";

export function SellersAdminPage() {
  const qc = useQueryClient();
  const [shopName, setShopName] = useState("");
  const [profileId, setProfileId] = useState("");

  const sellers = useQuery({
    queryKey: ["admin-sellers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sellers")
        .select("*, profiles(full_name,email,phone)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Seller[];
    },
  });

  const customers = useQuery({
    queryKey: ["profiles-for-seller"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id,full_name,email,role").eq("role", "customer").order("full_name");
      if (error) throw error;
      return data as Pick<Profile, "id" | "full_name" | "email" | "role">[];
    },
  });

  async function setStatus(id: string, status: SellerStatus) {
    const { error } = await supabase.rpc("set_seller_status", { p_seller_id: id, p_status: status });
    if (error) toast.error(error.message);
    else {
      toast.success(`Seller ${status}`);
      qc.invalidateQueries({ queryKey: ["admin-sellers"] });
    }
  }

  async function addSeller() {
    if (!profileId || !shopName.trim()) return toast.error("Choose a client and shop name");
    const { error } = await supabase.rpc("admin_add_seller", { p_profile_id: profileId, p_shop_name: shopName.trim() });
    if (error) toast.error(error.message);
    else {
      toast.success("Seller added and approved");
      setShopName("");
      setProfileId("");
      qc.invalidateQueries({ queryKey: ["admin-sellers"] });
    }
  }

  async function removeSeller(id: string) {
    if (!window.confirm("Remove this seller? Their products stay in the catalog without a shop owner.")) return;
    const { error } = await supabase.rpc("admin_remove_seller", { p_seller_id: id });
    if (error) toast.error(error.message);
    else {
      toast.success("Seller removed");
      qc.invalidateQueries({ queryKey: ["admin-sellers"] });
    }
  }

  if (sellers.isLoading) return <Spinner />;

  return (
    <div>
      <h1 className="font-display text-3xl">Sellers</h1>
      <p className="text-sm text-ink-700/70">Verify new shops before they can post products. Add or remove sellers at any time.</p>

      <div className="mt-6 grid gap-3 surface p-4 md:grid-cols-3">
        <select value={profileId} onChange={(e) => setProfileId(e.target.value)}>
          <option value="">Choose a client account</option>
          {(customers.data ?? []).map((p) => (
            <option key={p.id} value={p.id}>
              {p.full_name} · {p.email}
            </option>
          ))}
        </select>
        <input placeholder="Shop name" value={shopName} onChange={(e) => setShopName(e.target.value)} />
        <Button onClick={addSeller} variant="gold">
          Add & approve seller
        </Button>
      </div>

      {!sellers.data?.length ? (
        <div className="mt-6">
          <EmptyState title="No seller applications" hint="Clients can apply from seller registration." />
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto surface">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-b text-xs uppercase text-ink-700/60">
              <tr>
                <th className="px-3 py-2">Shop</th>
                <th className="px-3 py-2">Owner</th>
                <th className="px-3 py-2">Applied</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sellers.data.map((row) => (
                <tr key={row.id} className="border-b last:border-0 align-top">
                  <td className="px-3 py-3">
                    <div className="font-medium">{row.shop_name}</div>
                    <div className="text-xs text-ink-700/60">{row.bio}</div>
                  </td>
                  <td className="px-3 py-3">
                    <div>{row.profiles?.full_name}</div>
                    <div className="text-xs text-ink-700/60">{row.profiles?.email}</div>
                  </td>
                  <td className="px-3 py-3">{formatDate(row.created_at)}</td>
                  <td className="px-3 py-3">
                    <StatusPill value={row.status} />
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-2">
                      {row.status !== "approved" ? (
                        <Button size="sm" variant="gold" onClick={() => setStatus(row.id, "approved")}>
                          Approve
                        </Button>
                      ) : null}
                      {row.status === "pending" ? (
                        <Button size="sm" variant="secondary" onClick={() => setStatus(row.id, "rejected")}>
                          Reject
                        </Button>
                      ) : null}
                      {row.status === "approved" ? (
                        <Button size="sm" variant="secondary" onClick={() => setStatus(row.id, "suspended")}>
                          Suspend
                        </Button>
                      ) : null}
                      <Button size="sm" variant="danger" onClick={() => removeSeller(row.id)}>
                        Remove
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
