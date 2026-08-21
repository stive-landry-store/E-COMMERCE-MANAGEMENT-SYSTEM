import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";

export function ProfilePage() {
  const { profile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");

  useEffect(() => {
    setFullName(profile?.full_name ?? "");
    setPhone(profile?.phone ?? "");
  }, [profile]);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!profile) return;
    setBusy(true);
    const { error } = await supabase.from("profiles").update({ full_name: fullName, phone }).eq("id", profile.id);
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      await refreshProfile();
      toast.success("Profile updated");
    }
  }

  return (
    <div className="max-w-lg surface p-6">
      <div className="space-y-4">
        <div>
          <label>Full name</label>
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div>
          <label>Phone</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div>
          <label>Email</label>
          <input value={profile?.email ?? ""} disabled />
        </div>
        <Button onClick={save} disabled={busy}>
          Save
        </Button>
      </div>
    </div>
  );
}
