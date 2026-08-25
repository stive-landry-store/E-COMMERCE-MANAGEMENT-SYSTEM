import type { Notification } from "@/types";

type ResolveOpts = {
  canAccessConsole: boolean;
  isMainAdmin: boolean;
  isCoAdmin: boolean;
  notificationsListPath: string;
};

function isStaffSellerAlert(n: Pick<Notification, "type" | "title" | "message">) {
  const blob = `${n.title} ${n.message}`.toLowerCase();
  return (
    n.type === "seller" &&
    (blob.includes("application") ||
      blob.includes("candidature") ||
      blob.includes("asked to sell") ||
      blob.includes("demande") ||
      blob.includes("vendre sur"))
  );
}

/** Console or account destination when user opens a notification. */
export function resolveNotificationPath(
  n: Pick<Notification, "type" | "title" | "message" | "action_path">,
  opts: ResolveOpts,
): string {
  if (n.action_path?.startsWith("/")) return n.action_path;

  if (opts.canAccessConsole) {
    switch (n.type) {
      case "seller":
        return isStaffSellerAlert(n) ? "/console/sellers?tab=pending" : "/console/sellers";
      case "order":
        return "/console/orders";
      case "reservation":
        return "/console/reservations";
      case "preorder":
        return "/console/preorders";
      case "inventory":
        return "/console/inventory";
      case "service_payment":
      case "service_payment_nostock":
      case "icloud_payment":
        return "/console/digital-accounts?tab=orders";
      default:
        break;
    }
  }

  switch (n.type) {
    case "seller":
      return "/seller";
    case "order":
      return "/account/orders";
    case "reservation":
      return "/account/reservations";
    case "preorder":
      return "/account/preorders";
    default:
      return opts.notificationsListPath;
  }
}
