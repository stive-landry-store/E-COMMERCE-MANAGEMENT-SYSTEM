export type UserRole =
  | "customer"
  | "sales_staff"
  | "inventory_manager"
  | "admin"
  | "co_admin"
  | "store_owner"
  | "it_support";

export type LoginPortal = "client" | "seller" | "admin";
export type SellerStatus = "pending" | "approved" | "rejected" | "suspended";

export type Seller = {
  id: string;
  profile_id: string;
  shop_name: string;
  bio: string | null;
  shop_location?: string | null;
  work_area?: string | null;
  status: SellerStatus;
  is_verified?: boolean;
  verified_at?: string | null;
  verified_source?: "admin" | "auto" | null;
  verification_revoked_at?: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  profiles?: Pick<Profile, "full_name" | "email" | "phone" | "country" | "role" | "avatar_url"> | null;
};

export type SellerReview = {
  id: string;
  seller_id: string;
  profile_id: string;
  product_id: string | null;
  rating: number;
  remark: string | null;
  created_at: string;
  sellers?: Pick<Seller, "shop_name" | "id" | "is_verified"> | null;
  profiles?: Pick<Profile, "full_name"> | null;
};

export type SellerMessage = {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string | null;
  attachment_url: string | null;
  attachment_name: string | null;
  attachment_mime: string | null;
  created_at: string;
  read_at: string | null;
};

export type UserStatus = "active" | "inactive";
export type ProductStatus = "active" | "inactive" | "archived";
export type Availability = "in_stock" | "low_stock" | "out_of_stock" | "preorder";
export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "ready_for_pickup"
  | "completed"
  | "cancelled";
export type PaymentStatus = "unpaid" | "pending" | "paid" | "failed" | "refunded";

export type PaymentMethod =
  | "pay_at_store"
  | "card"
  | "paypal"
  | "apple_pay"
  | "google_pay"
  | "orange_money"
  | "mtn_momo";

export type Profile = {
  id: string;
  email: string | null;
  full_name: string;
  phone: string | null;
  country?: string | null;
  avatar_url?: string | null;
  role: UserRole;
  status: UserStatus;
  created_at: string;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url?: string | null;
  sort_order?: number;
  show_on_home?: boolean;
  status: "active" | "inactive";
};

export type Brand = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  status: "active" | "inactive";
};

export type Product = {
  id: string;
  sku: string;
  name: string;
  slug: string;
  brand_id: string | null;
  category_id: string | null;
  description: string | null;
  specs: Record<string, string>;
  base_price: number;
  featured: boolean;
  status: ProductStatus;
  seller_id: string | null;
  listing_type?: "product" | "service";
  created_at: string;
  brands?: Brand | null;
  categories?: Category | null;
  product_variants?: ProductVariant[];
  sellers?: Seller | null;
};

export type ProductVariant = {
  id: string;
  product_id: string;
  model: string | null;
  storage: string | null;
  color: string | null;
  sku: string;
  /** Open box / non-scellé (FCFA) */
  price: number;
  /** Scellé (FCFA); null = sealed option not offered */
  price_sealed?: number | null;
  image_urls: string[];
  reservable: boolean;
  preorder_enabled: boolean;
  status: ProductStatus;
  inventory?: Inventory | null;
  availability?: AvailabilityRow | null;
};

export type Inventory = {
  id: string;
  variant_id: string;
  total_stock: number;
  reserved_stock: number;
  min_stock: number;
};

export type AvailabilityRow = {
  variant_id: string;
  product_id: string;
  total_stock: number;
  reserved_stock: number;
  available_stock: number;
  min_stock: number;
  availability: Availability;
};

export type CartItem = {
  id: string;
  cart_id: string;
  variant_id: string;
  quantity: number;
  /** open_box = non scellé; sealed = scellé */
  phone_condition?: "open_box" | "sealed";
  product_variants?: ProductVariant & { products?: Product };
};

export type Order = {
  id: string;
  order_number: string;
  customer_id: string;
  profile_id: string;
  subtotal: number;
  total: number;
  order_status: OrderStatus;
  payment_status: PaymentStatus;
  fulfillment: "pickup" | "delivery";
  payment_method: PaymentMethod;
  shipping_address: Record<string, string> | null;
  notes: string | null;
  promo_code?: string | null;
  discount_percent?: number | null;
  discount_amount?: number;
  seller_promo_id?: string | null;
  payment_proof_path?: string | null;
  payment_reference?: string | null;
  payment_proof_submitted_at?: string | null;
  payment_account_id?: string | null;
  destination_account?: string | null;
  created_at: string;
  order_items?: OrderItem[];
};

export type OrderItem = {
  id: string;
  order_id: string;
  variant_id: string;
  product_name: string;
  variant_label: string | null;
  quantity: number;
  unit_price: number;
};

export type Reservation = {
  id: string;
  variant_id: string;
  quantity: number;
  status: "active" | "converted" | "expired" | "cancelled";
  expires_at: string;
  created_at: string;
  product_variants?: ProductVariant & { products?: Product };
};

export type Preorder = {
  id: string;
  variant_id: string;
  quantity: number;
  status: "pending" | "confirmed" | "fulfilled" | "cancelled";
  expected_availability: string | null;
  created_at: string;
  product_variants?: ProductVariant & { products?: Product };
};

export type Notification = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  action_path?: string | null;
  read_at: string | null;
  created_at: string;
};

export type SiteSettings = {
  id: number;
  store_name: string;
  tagline: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  hours: string | null;
  reservation_hold_hours: number;
  low_stock_default: number;
  whatsapp: string | null;
};

export type StockMovement = {
  id: string;
  variant_id: string;
  type: string;
  quantity: number;
  reason: string | null;
  recorded_by: string | null;
  created_at: string;
  product_variants?: ProductVariant & { products?: Product };
  profiles?: Pick<Profile, "full_name" | "email"> | null;
};

export type AuditLog = {
  id: string;
  user_id: string | null;
  action: string;
  module: string;
  record_ref: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  profiles?: Pick<Profile, "full_name" | "email"> | null;
};

export type DigitalService = {
  id: string;
  slug: string;
  name: string;
  subtitle: string | null;
  description: string | null;
  logo_url: string | null;
  accent_from: string;
  accent_to: string;
  price_monthly: number;
  price_first_month: number | null;
  currency: string;
  badge: string | null;
  features: string[];
  sort_order: number;
  is_active: boolean;
};

export type PromoFlyer = {
  id: string;
  service_id: string | null;
  title: string;
  headline: string | null;
  body: string | null;
  logo_url: string | null;
  image_url: string | null;
  accent_from: string;
  accent_to: string;
  cta_label: string | null;
  cta_url: string | null;
  promo_code: string | null;
  discount_percent: number | null;
  show_on_services: boolean;
  show_on_home: boolean;
  sort_order: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  digital_services?: DigitalService | null;
};

export type PromoCode = {
  id: string;
  code: string;
  description: string | null;
  discount_percent: number;
  applies_to: string;
  service_id: string | null;
  is_active: boolean;
  max_uses: number | null;
  used_count: number;
};

export type SellerPromoCode = {
  id: string;
  seller_id: string;
  code: string;
  description: string | null;
  discount_percent: number;
  is_active: boolean;
  max_uses: number | null;
  used_count: number;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  seller_promo_code_products?: { product_id: string }[];
};

export type PaymentAccount = {
  id: string;
  method: string;
  sender_country?: string;
  label: string;
  account_number: string;
  account_name: string | null;
  bank_name: string | null;
  ussd_template: string | null;
  phone_format?: "local" | "international_237" | null;
  instructions: string | null;
  is_active: boolean;
  sort_order: number;
};

export type ServiceOrder = {
  id: string;
  user_id: string | null;
  service_id: string | null;
  service_slug: string | null;
  service_name: string;
  amount: number;
  original_amount: number;
  promo_code: string | null;
  discount_percent: number;
  payment_method: string;
  destination_account: string | null;
  status: string;
  customer_phone?: string | null;
  customer_email?: string | null;
  customer_name?: string | null;
  customer_icloud_email?: string | null;
  delivered_login?: string | null;
  delivered_password?: string | null;
  credential_id?: string | null;
  payment_confirmed_at?: string | null;
  payment_proof_path?: string | null;
  payment_reference?: string | null;
  payment_proof_submitted_at?: string | null;
  created_at: string;
  updated_at?: string;
};

export type ServiceCredential = {
  id: string;
  service_slug: string;
  login_email: string;
  login_password: string;
  label: string | null;
  notes: string | null;
  is_active: boolean;
  is_assigned: boolean;
  assigned_order_id: string | null;
  assigned_at: string | null;
  created_at: string;
};
