export const STAFF_ROLES = [
  "sales_staff",
  "inventory_manager",
  "admin",
  "store_owner",
  "it_support",
] as const;

export const ROLE_LABELS: Record<string, string> = {
  customer: "Customer",
  sales_staff: "Sales staff",
  inventory_manager: "Inventory manager",
  admin: "Administrator",
  store_owner: "Store owner",
  it_support: "IT support",
};

export const ADMIN_ROLES = ["admin", "store_owner"] as const;

export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "ready_for_pickup",
  "completed",
  "cancelled",
] as const;

export const PAYMENT_STATUSES = ["unpaid", "pending", "paid", "failed", "refunded"] as const;

export function availabilityLabel(value: string | null | undefined) {
  switch (value) {
    case "in_stock":
      return "In stock";
    case "low_stock":
      return "Low stock";
    case "out_of_stock":
      return "Out of stock";
    case "preorder":
      return "Pre-order";
    default:
      return "Checking";
  }
}

export const STORE = {
  name: "Stive Landry Store",
  short: "STIVE LANDRY",
  tagline: "QUALITY BEFOR PRICE",
};
