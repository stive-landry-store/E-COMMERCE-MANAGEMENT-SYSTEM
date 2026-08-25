import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { playNotificationSound } from "@/lib/notificationSound";
import { resolveNotificationsPath } from "@/lib/notificationsPath";

type NotificationsContextValue = {
  unreadCount: number;
  notificationsPath: string;
  loading: boolean;
};

const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user, isStaff, isPrincipalAdmin } = useAuth();
  const qc = useQueryClient();
  const prevUnread = useRef<number | null>(null);

  const unread = useQuery({
    queryKey: ["notifications-unread", user?.id],
    enabled: Boolean(user && hasSupabaseConfig),
    queryFn: async () => {
      const { count, error } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .is("read_at", null);
      if (error) throw error;
      return count ?? 0;
    },
    refetchInterval: 25_000,
  });

  useEffect(() => {
    if (!user || !hasSupabaseConfig) return;

    const channel = supabase
      .channel(`notifications-live-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          playNotificationSound();
          qc.invalidateQueries({ queryKey: ["notifications-unread", user.id] });
          qc.invalidateQueries({ queryKey: ["notifications", user.id] });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["notifications-unread", user.id] });
          qc.invalidateQueries({ queryKey: ["notifications", user.id] });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user, qc]);

  useEffect(() => {
    const count = unread.data ?? 0;
    if (prevUnread.current === null) {
      prevUnread.current = count;
      return;
    }
    if (count > prevUnread.current) {
      playNotificationSound();
    }
    prevUnread.current = count;
  }, [unread.data]);

  useEffect(() => {
    if (!user) prevUnread.current = null;
  }, [user]);

  const notificationsPath = resolveNotificationsPath(user?.id, { isStaff, isPrincipalAdmin });

  const value = useMemo<NotificationsContextValue>(
    () => ({
      unreadCount: unread.data ?? 0,
      notificationsPath,
      loading: unread.isLoading,
    }),
    [unread.data, unread.isLoading, notificationsPath],
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationsProvider");
  return ctx;
}

/** Safe when provider is optional (logged-out header). */
export function useNotificationsOptional() {
  return useContext(NotificationsContext);
}
