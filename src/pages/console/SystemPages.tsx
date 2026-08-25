import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/LanguageContext";
import { formatDate } from "@/lib/format";
import { resolveNotificationPath } from "@/lib/notificationRoutes";
import { resolveNotificationsPath } from "@/lib/notificationsPath";
import { Spinner, EmptyState } from "@/components/ui/Spinner";
import type { AuditLog, Notification, SiteSettings } from "@/types";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";

export function AuditPage() {
  const query = useQuery({
    queryKey: ["audit"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*, profiles(full_name,email)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as AuditLog[];
    },
  });
  if (query.isLoading) return <Spinner />;
  if (!query.data?.length) return <EmptyState title="No audit events yet" />;
  return (
    <div>
      <h1 className="font-display text-3xl">Audit log</h1>
      <div className="mt-6 overflow-x-auto surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b text-xs uppercase text-ink-700/60">
            <tr>
              <th className="px-3 py-2">When</th>
              <th className="px-3 py-2">User</th>
              <th className="px-3 py-2">Action</th>
              <th className="px-3 py-2">Module</th>
            </tr>
          </thead>
          <tbody>
            {query.data.map((r) => (
              <tr key={r.id} className="border-b last:border-0">
                <td className="px-3 py-2">{formatDate(r.created_at)}</td>
                <td className="px-3 py-2">{r.profiles?.full_name ?? "System"}</td>
                <td className="px-3 py-2">{r.action}</td>
                <td className="px-3 py-2">{r.module}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function NotificationsPage() {
  const { user, canAccessConsole, isMainAdmin, isCoAdmin, isStaff, isPrincipalAdmin } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const notificationsListPath = resolveNotificationsPath(user?.id, { isStaff, isPrincipalAdmin });
  const routeOpts = {
    canAccessConsole,
    isMainAdmin,
    isCoAdmin,
    notificationsListPath,
  };

  const query = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Notification[];
    },
    enabled: Boolean(user),
  });

  async function markRead(id: string) {
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["notifications"] });
    qc.invalidateQueries({ queryKey: ["notifications-unread"] });
  }

  async function openNotification(n: Notification) {
    const path = resolveNotificationPath(n, routeOpts);
    if (!n.read_at) await markRead(n.id);
    navigate(path);
  }

  if (query.isLoading) return <Spinner />;
  if (!query.data?.length) return <EmptyState title={t("noNotifications")} hint={t("noNotificationsHint")} />;

  return (
    <div>
      <h1 className="font-display text-3xl">{t("notifications")}</h1>
      <div className="mt-6 space-y-3">
        {query.data.map((n) => {
          const targetPath = resolveNotificationPath(n, routeOpts);
          const hasPanel = targetPath !== notificationsListPath;

          return (
            <article
              key={n.id}
              className={`surface p-4 transition hover:ring-1 hover:ring-brand-500/20 ${n.read_at ? "opacity-60" : ""}`}
            >
              <div className="flex items-start justify-between gap-3">
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => void openNotification(n)}
                >
                  <p className="font-medium">{n.title}</p>
                  <p className="whitespace-pre-line text-sm text-ink-700/70">{n.message}</p>
                  <p className="mt-1 text-xs text-ink-700/50">{formatDate(n.created_at)}</p>
                  {hasPanel ? (
                    <p className="mt-2 text-xs font-semibold gradient-text">{t("openNotificationPanel")}</p>
                  ) : null}
                </button>
                {!n.read_at ? (
                  <button type="button" className="gradient-text shrink-0 text-xs" onClick={() => void markRead(n.id)}>
                    {t("markNotificationRead")}
                  </button>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

export function SettingsPage() {
  const query = useQuery({
    queryKey: ["settings-admin"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("*").eq("id", 1).single();
      return data as SiteSettings;
    },
  });
  const [form, setForm] = useState<Partial<SiteSettings>>({});
  const s = { ...query.data, ...form };

  async function save() {
    const { error } = await supabase.from("site_settings").update(form).eq("id", 1);
    if (error) toast.error(error.message);
    else toast.success("Settings saved");
  }

  if (query.isLoading) return <Spinner />;

  return (
    <div className="max-w-xl">
      <h1 className="font-display text-3xl">Store settings</h1>
      <div className="mt-6 space-y-4 surface p-6">
        <div>
          <label>Store name</label>
          <input value={s.store_name ?? ""} onChange={(e) => setForm({ ...form, store_name: e.target.value })} />
        </div>
        <div>
          <label>Tagline</label>
          <input value={s.tagline ?? ""} onChange={(e) => setForm({ ...form, tagline: e.target.value })} />
        </div>
        <div>
          <label>Phone</label>
          <input value={s.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <div>
          <label>Email</label>
          <input value={s.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div>
          <label>Address</label>
          <input value={s.address ?? ""} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </div>
        <div>
          <label>Hours</label>
          <input value={s.hours ?? ""} onChange={(e) => setForm({ ...form, hours: e.target.value })} />
        </div>
        <div>
          <label>Reservation hold (hours)</label>
          <input
            type="number"
            value={s.reservation_hold_hours ?? 48}
            onChange={(e) => setForm({ ...form, reservation_hold_hours: Number(e.target.value) })}
          />
        </div>
        <Button onClick={save} variant="gold">
          Save settings
        </Button>
      </div>
    </div>
  );
}
