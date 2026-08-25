import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/contexts/LanguageContext";
import { useNotificationsOptional } from "@/contexts/NotificationsContext";
import { logoStroke } from "@/components/BrandGradient";

type Variant = "store" | "light";

export function NotificationBell({ variant = "store", className }: { variant?: Variant; className?: string }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const notif = useNotificationsOptional();
  const [pop, setPop] = useState(false);
  const [touchActive, setTouchActive] = useState(false);

  if (!notif || notif.notificationsPath === "/login") return null;

  const { unreadCount, notificationsPath } = notif;
  const stroke = variant === "store" ? logoStroke : "currentColor";

  function goNotifications() {
    setPop(true);
    window.setTimeout(() => {
      navigate(notificationsPath);
      setPop(false);
    }, 200);
  }

  return (
    <button
      type="button"
      aria-label={t("notifications")}
      title={t("notifications")}
      onClick={goNotifications}
      onMouseEnter={() => setTouchActive(true)}
      onMouseLeave={() => setTouchActive(false)}
      onTouchStart={() => setTouchActive(true)}
      onTouchEnd={() => window.setTimeout(() => setTouchActive(false), 600)}
      className={cn(
        "notification-bell group relative flex h-10 items-center justify-center rounded-full px-2.5 transition hover:bg-white/5 sm:px-3",
        pop && "notification-bell-pop",
        touchActive && "notification-bell-active",
        variant === "light" && "text-ink-950 hover:bg-black/[0.04]",
        className,
      )}
    >
      <span className="notification-bell-wrap relative inline-flex">
        <Bell
          className={cn(
            "notification-bell-icon h-5 w-5",
            variant === "store" ? "" : "text-ink-800",
          )}
          stroke={stroke}
          strokeWidth={2}
        />
        {unreadCount > 0 ? (
          <span className="absolute -right-2 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-brand-grad px-1 text-[10px] font-bold text-white shadow-sm">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </span>
      <span className="sr-only">{t("notifications")}</span>
    </button>
  );
}
