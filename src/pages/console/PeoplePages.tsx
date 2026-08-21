import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { ROLE_LABELS } from "@/lib/constants";
import { StatusPill } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import type { Profile, UserRole } from "@/types";

export function UsersPage() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["staff-users"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Profile[];
    },
  });

  async function save(row: Profile, patch: Partial<Profile>) {
    const { error } = await supabase.from("profiles").update(patch).eq("id", row.id);
    if (error) toast.error(error.message);
    else {
      toast.success("User updated");
      qc.invalidateQueries({ queryKey: ["staff-users"] });
    }
  }

  if (query.isLoading) return <Spinner />;

  return (
    <div>
      <h1 className="font-display text-3xl">Staff & users</h1>
      <p className="text-sm text-ink-700/70">Promote a registered customer to staff. First admin must be set in SQL (see README).</p>
      <div className="mt-6 overflow-x-auto surface">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b text-xs uppercase text-ink-700/60">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {(query.data ?? []).map((u) => (
              <tr key={u.id} className="border-b last:border-0">
                <td className="px-3 py-2">{u.full_name}</td>
                <td className="px-3 py-2">{u.email}</td>
                <td className="px-3 py-2">
                  <select value={u.role} onChange={(e) => save(u, { role: e.target.value as UserRole })}>
                    {Object.entries(ROLE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <button onClick={() => save(u, { status: u.status === "active" ? "inactive" : "active" })}>
                    <StatusPill value={u.status} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function CustomersPage() {
  const query = useQuery({
    queryKey: ["staff-customers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*, profiles(full_name,email,phone,status)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  if (query.isLoading) return <Spinner />;

  return (
    <div>
      <h1 className="font-display text-3xl">Customers</h1>
      <div className="mt-6 overflow-x-auto surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b text-xs uppercase text-ink-700/60">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Phone</th>
              <th className="px-3 py-2">City</th>
            </tr>
          </thead>
          <tbody>
            {(query.data ?? []).map((c: {
              id: string;
              city: string | null;
              profiles: { full_name: string; email: string; phone: string | null } | null;
            }) => (
              <tr key={c.id} className="border-b last:border-0">
                <td className="px-3 py-2">{c.profiles?.full_name}</td>
                <td className="px-3 py-2">{c.profiles?.email}</td>
                <td className="px-3 py-2">{c.profiles?.phone}</td>
                <td className="px-3 py-2">{c.city ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
