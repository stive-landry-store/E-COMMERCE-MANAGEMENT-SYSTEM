import { Navigate, Route, Routes } from "react-router-dom";
import { StoreLayout } from "@/components/layout/StoreLayout";
import { ConsoleLayout } from "@/components/layout/ConsoleLayout";
import { SellerLayout } from "@/components/layout/SellerLayout";
import { GuestRoute, ProtectedRoute, SellerRoute, StaffRoute } from "@/components/layout/ProtectedRoute";
import { HomePage } from "@/pages/store/HomePage";
import { ShopPage } from "@/pages/store/ShopPage";
import { ProductPage } from "@/pages/store/ProductPage";
import { AboutPage } from "@/pages/store/AboutPage";
import { ContactPage } from "@/pages/store/ContactPage";
import { CartPage } from "@/pages/store/CartPage";
import { CheckoutPage } from "@/pages/store/CheckoutPage";
import { LoginPage, RegisterPage, ForgotPasswordPage, ResetPasswordPage } from "@/pages/auth/AuthPages";
import { AccountLayout } from "@/pages/account/AccountLayout";
import { ClientDashboardPage } from "@/pages/account/ClientDashboardPage";
import { ProfilePage } from "@/pages/account/ProfilePage";
import { OrdersPage } from "@/pages/account/OrdersPage";
import { ReservationsPage } from "@/pages/account/ReservationsPage";
import { PreordersPage } from "@/pages/account/PreordersPage";
import { ReviewsPage } from "@/pages/account/ReviewsPage";
import { DashboardPage } from "@/pages/console/DashboardPage";
import { ProductsPage } from "@/pages/console/ProductsPage";
import { ProductFormPage } from "@/pages/console/ProductFormPage";
import { BrandsPage, CategoriesPage } from "@/pages/console/CatalogPages";
import { InventoryPage } from "@/pages/console/InventoryPage";
import { OrdersConsolePage } from "@/pages/console/OrdersConsolePage";
import { PreordersConsolePage, ReservationsConsolePage } from "@/pages/console/HoldsConsolePages";
import { CustomersPage, UsersPage } from "@/pages/console/PeoplePages";
import { ReportsPage } from "@/pages/console/ReportsPage";
import { AuditPage, NotificationsPage, SettingsPage } from "@/pages/console/SystemPages";
import { SellersAdminPage } from "@/pages/console/SellersAdminPage";
import { PromotionsAdminPage } from "@/pages/console/PromotionsAdminPage";
import { SellerDashboardPage } from "@/pages/seller/SellerDashboardPage";
import { ServicesPage } from "@/pages/store/ServicesPage";
import { SellerPendingPage } from "@/pages/seller/SellerPendingPage";
import { SellerOrdersPage } from "@/pages/seller/SellerOrdersPage";
import { hasSupabaseConfig } from "@/lib/supabase";
import { BrandGradientDefs } from "@/components/BrandGradient";

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
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        </Route>
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        <Route element={<StoreLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/shop" element={<ShopPage />} />
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
          </Route>
        </Route>

        <Route element={<StaffRoute />}>
          <Route path="/console" element={<ConsoleLayout />}>
            <Route index element={<DashboardPage />} />
            <Route element={<StaffRoute roles={["admin", "store_owner"]} />}>
              <Route path="sellers" element={<SellersAdminPage />} />
            </Route>
            <Route element={<StaffRoute roles={["admin"]} />}>
              <Route path="products" element={<ProductsPage />} />
              <Route path="products/:id" element={<ProductFormPage />} />
              <Route path="categories" element={<CategoriesPage />} />
              <Route path="brands" element={<BrandsPage />} />
              <Route path="promotions" element={<PromotionsAdminPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
            <Route element={<StaffRoute roles={["admin", "inventory_manager"]} />}>
              <Route path="inventory" element={<InventoryPage />} />
            </Route>
            <Route element={<StaffRoute roles={["admin", "sales_staff", "store_owner"]} />}>
              <Route path="orders" element={<OrdersConsolePage />} />
            </Route>
            <Route element={<StaffRoute roles={["admin", "sales_staff"]} />}>
              <Route path="reservations" element={<ReservationsConsolePage />} />
              <Route path="preorders" element={<PreordersConsolePage />} />
              <Route path="customers" element={<CustomersPage />} />
            </Route>
            <Route element={<StaffRoute roles={["admin", "it_support"]} />}>
              <Route path="users" element={<UsersPage />} />
            </Route>
            <Route element={<StaffRoute roles={["admin", "store_owner"]} />}>
              <Route path="reports" element={<ReportsPage />} />
            </Route>
            <Route element={<StaffRoute roles={["admin", "it_support", "store_owner"]} />}>
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
