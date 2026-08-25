import { Navigate, Route, Routes } from "react-router-dom";
import { StoreLayout } from "@/components/layout/StoreLayout";
import { GuestRoute, ProtectedRoute, SellerRoute, StaffRoute } from "@/components/layout/ProtectedRoute";
import { lazyPage } from "@/lib/lazyPage";
import { hasSupabaseConfig } from "@/lib/supabase";
import { BrandGradientDefs } from "@/components/BrandGradient";

const HomePage = lazyPage(() => import("@/pages/store/HomePage"), "HomePage");
const ShopPage = lazyPage(() => import("@/pages/store/ShopPage"), "ShopPage");
const ProductPage = lazyPage(() => import("@/pages/store/ProductPage"), "ProductPage");
const AboutPage = lazyPage(() => import("@/pages/store/AboutPage"), "AboutPage");
const ContactPage = lazyPage(() => import("@/pages/store/ContactPage"), "ContactPage");
const CartPage = lazyPage(() => import("@/pages/store/CartPage"), "CartPage");
const CheckoutPage = lazyPage(() => import("@/pages/store/CheckoutPage"), "CheckoutPage");
const ServicesPage = lazyPage(() => import("@/pages/store/ServicesPage"), "ServicesPage");
const VendorShopPage = lazyPage(() => import("@/pages/store/VendorShopPage"), "VendorShopPage");
const VendorsPage = lazyPage(() => import("@/pages/store/VendorShopPage"), "VendorsPage");

const LoginPage = lazyPage(() => import("@/pages/auth/AuthPages"), "LoginPage");
const RegisterPage = lazyPage(() => import("@/pages/auth/AuthPages"), "RegisterPage");
const ForgotPasswordPage = lazyPage(() => import("@/pages/auth/AuthPages"), "ForgotPasswordPage");
const ResetPasswordPage = lazyPage(() => import("@/pages/auth/AuthPages"), "ResetPasswordPage");
const SellerRegisterPage = lazyPage(() => import("@/pages/seller/SellerMarketplacePages"), "SellerRegisterPage");
const SellPage = lazyPage(() => import("@/pages/seller/SellerMarketplacePages"), "SellPage");

const AccountLayout = lazyPage(() => import("@/pages/account/AccountLayout"), "AccountLayout");
const ClientDashboardPage = lazyPage(() => import("@/pages/account/ClientDashboardPage"), "ClientDashboardPage");
const ProfilePage = lazyPage(() => import("@/pages/account/ProfilePage"), "ProfilePage");
const OrdersPage = lazyPage(() => import("@/pages/account/OrdersPage"), "OrdersPage");
const ReservationsPage = lazyPage(() => import("@/pages/account/ReservationsPage"), "ReservationsPage");
const PreordersPage = lazyPage(() => import("@/pages/account/PreordersPage"), "PreordersPage");
const ReviewsPage = lazyPage(() => import("@/pages/account/ReviewsPage"), "ReviewsPage");

const ConsoleLayout = lazyPage(() => import("@/components/layout/ConsoleLayout"), "ConsoleLayout");
const DashboardPage = lazyPage(() => import("@/pages/console/DashboardPage"), "DashboardPage");
const ProductsPage = lazyPage(() => import("@/pages/console/ProductsPage"), "ProductsPage");
const ProductFormPage = lazyPage(() => import("@/pages/console/ProductFormPage"), "ProductFormPage");
const CategoriesPage = lazyPage(() => import("@/pages/console/CatalogPages"), "CategoriesPage");
const BrandsPage = lazyPage(() => import("@/pages/console/CatalogPages"), "BrandsPage");
const InventoryPage = lazyPage(() => import("@/pages/console/InventoryPage"), "InventoryPage");
const OrdersConsolePage = lazyPage(() => import("@/pages/console/OrdersConsolePage"), "OrdersConsolePage");
const ReservationsConsolePage = lazyPage(() => import("@/pages/console/HoldsConsolePages"), "ReservationsConsolePage");
const PreordersConsolePage = lazyPage(() => import("@/pages/console/HoldsConsolePages"), "PreordersConsolePage");
const CustomersPage = lazyPage(() => import("@/pages/console/PeoplePages"), "CustomersPage");
const UsersPage = lazyPage(() => import("@/pages/console/PeoplePages"), "UsersPage");
const ReportsPage = lazyPage(() => import("@/pages/console/ReportsPage"), "ReportsPage");
const AuditPage = lazyPage(() => import("@/pages/console/SystemPages"), "AuditPage");
const NotificationsPage = lazyPage(() => import("@/pages/console/SystemPages"), "NotificationsPage");
const SettingsPage = lazyPage(() => import("@/pages/console/SystemPages"), "SettingsPage");
const SellersAdminPage = lazyPage(() => import("@/pages/console/SellersAdminPage"), "SellersAdminPage");
const PromotionsAdminPage = lazyPage(() => import("@/pages/console/PromotionsAdminPage"), "PromotionsAdminPage");
const ServiceAccountsAdminPage = lazyPage(
  () => import("@/pages/console/ServiceAccountsAdminPage"),
  "ServiceAccountsAdminPage",
);

const SellerLayout = lazyPage(() => import("@/components/layout/SellerLayout"), "SellerLayout");
const SellerDashboardPage = lazyPage(() => import("@/pages/seller/SellerDashboardPage"), "SellerDashboardPage");
const SellerPendingPage = lazyPage(() => import("@/pages/seller/SellerPendingPage"), "SellerPendingPage");
const SellerOrdersPage = lazyPage(() => import("@/pages/seller/SellerOrdersPage"), "SellerOrdersPage");
const SellerChatPage = lazyPage(() => import("@/pages/seller/SellerChatPage"), "SellerChatPage");
const SellerPromotionsPage = lazyPage(() => import("@/pages/seller/SellerPromotionsPage"), "SellerPromotionsPage");

function SetupBanner() {
  if (hasSupabaseConfig) return null;
  return (
    <div className="bg-gradient-to-r from-[#ff7a45] via-[#ff2d95] to-[#c026d3] px-4 py-2 text-center text-sm font-semibold text-white">
      Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to <code>.env</code>, then run the SQL in{" "}
      <code>supabase/migrations</code> and <code>supabase/seed.sql</code>.
    </div>
  );
}

export default function App() {
  return (
    <>
      <BrandGradientDefs />
      <SetupBanner />
      <Routes>
        <Route element={<GuestRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/register/seller" element={<SellerRegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        </Route>
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        <Route element={<StoreLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/shop" element={<ShopPage />} />
          <Route path="/sell" element={<SellPage />} />
          <Route path="/vendors" element={<VendorsPage />} />
          <Route path="/vendor/:sellerId" element={<VendorShopPage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/product/:slug" element={<ProductPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/account" element={<AccountLayout />}>
              <Route index element={<ClientDashboardPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="orders" element={<OrdersPage />} />
              <Route path="reservations" element={<ReservationsPage />} />
              <Route path="preorders" element={<PreordersPage />} />
              <Route path="reviews" element={<ReviewsPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
            </Route>
          </Route>
        </Route>

        <Route element={<SellerRoute allowPending />}>
          <Route path="/seller/pending" element={<SellerPendingPage />} />
        </Route>

        <Route element={<SellerRoute />}>
          <Route path="/seller" element={<SellerLayout />}>
            <Route index element={<SellerDashboardPage />} />
            <Route path="products" element={<ProductsPage />} />
            <Route path="products/:id" element={<ProductFormPage />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="orders" element={<SellerOrdersPage />} />
            <Route path="promotions" element={<SellerPromotionsPage />} />
            <Route path="chat" element={<SellerChatPage />} />
          </Route>
        </Route>

        <Route element={<StaffRoute />}>
          <Route path="/console" element={<ConsoleLayout />}>
            <Route index element={<DashboardPage />} />
            <Route element={<StaffRoute roles={["admin", "co_admin"]} />}>
              <Route path="sellers" element={<SellersAdminPage />} />
            </Route>
            <Route element={<StaffRoute roles={["admin", "co_admin"]} />}>
              <Route path="products" element={<ProductsPage />} />
              <Route path="products/:id" element={<ProductFormPage />} />
              <Route path="categories" element={<CategoriesPage />} />
              <Route path="brands" element={<BrandsPage />} />
            </Route>
            <Route element={<StaffRoute roles={["admin", "co_admin"]} />}>
              <Route path="digital-accounts" element={<ServiceAccountsAdminPage />} />
            </Route>
            <Route element={<StaffRoute roles={["admin"]} />}>
              <Route path="promotions" element={<PromotionsAdminPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
            <Route element={<StaffRoute roles={["admin", "co_admin", "inventory_manager"]} />}>
              <Route path="inventory" element={<InventoryPage />} />
            </Route>
            <Route element={<StaffRoute roles={["admin", "co_admin", "sales_staff", "store_owner"]} />}>
              <Route path="orders" element={<OrdersConsolePage />} />
            </Route>
            <Route element={<StaffRoute roles={["admin", "co_admin", "sales_staff"]} />}>
              <Route path="reservations" element={<ReservationsConsolePage />} />
              <Route path="preorders" element={<PreordersConsolePage />} />
              <Route path="customers" element={<CustomersPage />} />
            </Route>
            <Route element={<StaffRoute roles={["admin", "it_support"]} />}>
              <Route path="users" element={<UsersPage />} />
            </Route>
            <Route element={<StaffRoute roles={["admin", "co_admin", "store_owner"]} />}>
              <Route path="reports" element={<ReportsPage />} />
            </Route>
            <Route element={<StaffRoute roles={["admin", "co_admin", "it_support", "store_owner"]} />}>
              <Route path="audit" element={<AuditPage />} />
            </Route>
            <Route path="notifications" element={<NotificationsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
