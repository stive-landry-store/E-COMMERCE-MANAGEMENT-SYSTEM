export const STAFF_ROLES = [
  "sales_staff",
  "inventory_manager",
  "admin",
  "co_admin",
  "store_owner",
  "it_support",
] as const;

export const ROLE_LABELS: Record<string, string> = {
  customer: "Customer",
  sales_staff: "Sales staff",
  inventory_manager: "Inventory manager",
  admin: "Administrator",
  co_admin: "Co-administrator",
  store_owner: "Store owner",
  it_support: "IT support",
};

export const PRINCIPAL_ADMIN_ROLES = ["admin", "co_admin"] as const;

export const ADMIN_ROLES = ["admin", "store_owner", "co_admin"] as const;

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

/** Customer support WhatsApp (digits only for wa.me) */
export const WHATSAPP_SUPPORT = {
  display: "+237 6 58 66 04 87",
  e164: "237658660487",
  href: "https://wa.me/237658660487",
};

/** Countries shown at signup / profile (Cameroon first). */
export const COUNTRIES = [
  "Cameroon",
  "Nigeria",
  "Ghana",
  "Ivory Coast",
  "Senegal",
  "Gabon",
  "Congo",
  "DR Congo",
  "Chad",
  "Central African Republic",
  "Equatorial Guinea",
  "Benin",
  "Togo",
  "Mali",
  "Burkina Faso",
  "Niger",
  "Guinea",
  "Rwanda",
  "Kenya",
  "Uganda",
  "Tanzania",
  "South Africa",
  "France",
  "Belgium",
  "Canada",
  "United States",
  "United Kingdom",
  "Other",
] as const;

/** Seller area of work / product focus. */
export const WORK_AREAS = [
  "Phones & smartphones",
  "Laptops & computers",
  "Tablets & iPads",
  "Audio & headphones",
  "Accessories",
  "Wearables & watches",
  "Digital subscriptions",
  "Repairs & services",
  "General electronics",
  "Other",
] as const;
