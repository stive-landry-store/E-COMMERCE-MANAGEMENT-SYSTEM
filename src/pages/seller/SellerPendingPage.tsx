import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";

export function SellerPendingPage() {
  const navigate = useNavigate();
  const { seller, isAdmin, isApprovedSeller, refreshProfile, signOut } = useAuth();
  const [shopName, setShopName] = useState(seller?.shop_name ?? "");
  const [bio, setBio] = useState(seller?.bio ?? "");
  const [busy, setBusy] = useState(false);

  const status = seller?.status ?? "pending";

  useEffect(() => {
    if (isAdmin || seller?.status === "approved") {
      navigate("/seller", { replace: true });
    }
  }, [isAdmin, isApprovedSeller, seller?.status, navigate]);

  async function apply() {
    setBusy(true);
    const { error } = await supabase.rpc("apply_as_seller", { p_shop_name: shopName, p_bio: bio || null });
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Application sent to the administrator");
      await refreshProfile();
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="glass w-full max-w-lg rounded-3xl p-8">
        <p className="gradient-text text-sm font-bold tracking-widest">Seller desk</p>
        <h1 className="mt-2 text-3xl font-bold">
          {status === "rejected" ? "Application declined" : status === "suspended" ? "Shop suspended" : "Waiting for approval"}
        </h1>
        <p className="mt-3 text-sm text-white/60">
          {status === "rejected"
            ? "An administrator declined this shop. You can update your details and apply again."
            : status === "suspended"
              ? "An administrator suspended your seller access. Contact the store if this is a mistake."
              : "An administrator must verify you before you can post products. You will be able to add, edit and remove listings after approval."}
        </p>
        {status !== "suspended" ? (
          <div className="mt-6 space-y-4">
            <div>
              <label>Shop name</label>
              <input value={shopName} onChange={(e) => setShopName(e.target.value)} />
            </div>
            <div>
              <label>About your shop</label>
              <textarea rows={4} value={bio} onChange={(e) => setBio(e.target.value)} />
            </div>
            <Button onClick={apply} disabled={busy} variant="gold" className="w-full">
              {seller ? "Resubmit application" : "Apply as seller"}
            </Button>
          </div>
        ) : null}
        <button className="mt-6 text-sm text-white/60" onClick={() => signOut()}>
          Sign out
        </button>
      </div>
    </div>
  );
}
