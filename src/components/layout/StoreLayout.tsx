import { useEffect, useRef, useState, type CSSProperties } from "react";
import { SoundToggle } from "@/components/SoundToggle";
import { SideRail } from "@/components/store/SideRail";
import { RenewalPopup } from "@/components/store/RenewalPopup";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  Info,
  LayoutDashboard,
  MonitorPlay,
  Package,
  Phone,
  Smartphone,
  Store as StoreIcon,
  UserPlus,
  Users,
  LogOut,
  Menu,
  Search,
  Settings,
  ShoppingBag,
  UserRound,
  X,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useI18n } from "@/contexts/LanguageContext";
import { SupportFabStack } from "@/components/SupportFabStack";
import { NotificationBell } from "@/components/NotificationBell";
import { WhatsAppSupportButton } from "@/components/WhatsAppSupportButton";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { STORE } from "@/lib/constants";
import { logoStroke } from "@/components/BrandGradient";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { isVerifiedAccount, accountTypeLabelKey } from "@/lib/access";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
import { PageTransition } from "@/components/motion/Motion";

export function StoreLayout() {
  const { user, profile, seller, signOut, isStaff, isPrincipalAdmin, isApprovedSeller, isSellerApplicant } = useAuth();
  const { count } = useCart();
  const { t } = useI18n();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [q, setQ] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  // Hide header while scrolling down, reveal on scroll up
  useEffect(() => {
    let last = window.scrollY;
    let raf = 0;
    const update = () => {
      raf = 0;
      const y = window.scrollY;
      const el = headerRef.current;
      if (!el) return;
      el.classList.toggle("is-scrolled", y > 12);
      if (y > 220 && y > last + 4) el.classList.add("is-hidden");
      else if (y < last - 4 || y < 220) el.classList.remove("is-hidden");
      last = y;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
  const verified = isVerifiedAccount(profile, seller);
  const accountType = isPrincipalAdmin ? "adminAccount" : accountTypeLabelKey(profile, seller);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  useEffect(() => {
    const prefetch = () => {
      void import("@/pages/store/ShopPage");
      void import("@/pages/store/ProductPage");
      void import("@/pages/store/ServicesPage");
    };
    if (typeof requestIdleCallback === "function") {
      const id = requestIdleCallback(prefetch, { timeout: 1200 });
      return () => cancelIdleCallback(id);
    }
    const t = window.setTimeout(prefetch, 300);
    return () => window.clearTimeout(t);
  }, []);

  const navWithIcons = [
    { to: "/", label: t("home"), icon: Home },
    { to: "/shop", label: t("electronicsNav"), icon: Smartphone },
    { to: "/services", label: t("services"), icon: MonitorPlay },
    { to: "/vendors", label: t("ourVendors"), icon: Users },
    { to: "/sell", label: t("sellOnStore"), icon: StoreIcon },
    { to: "/about", label: t("about"), icon: Info },
    { to: "/contact", label: t("contact"), icon: Phone },
  ];
  const nav = navWithIcons.filter((n) => n.to !== "/");
  const accountLinks = [
    { to: user ? "/account" : "/login", label: user ? t("account") : t("signIn"), icon: UserRound, badge: 0 },
    user
      ? { to: "/account/orders", label: t("myOrders"), icon: Package, badge: 0 }
      : { to: "/register", label: t("createAccount"), icon: UserPlus, badge: 0 },
    { to: "/cart", label: t("cart"), icon: ShoppingBag, badge: count },
  ];

  const staffLinks = [
    isPrincipalAdmin ? { to: "/console", label: t("admin") } : null,
    isStaff && !isPrincipalAdmin ? { to: "/console", label: t("console") } : null,
    isApprovedSeller && !isPrincipalAdmin ? { to: "/seller", label: t("seller") } : null,
    isPrincipalAdmin ? { to: "/seller", label: t("sellerDesk") } : null,
    isSellerApplicant && !isApprovedSeller ? { to: "/seller/pending", label: t("sellerStatus") } : null,
  ].filter(Boolean) as { to: string; label: string }[];

  return (
    <div className="store-shell min-h-screen min-h-[100dvh]">
      {/* Clears Dynamic Island / Android status bar before any chrome */}
      <div className="theme-safe-bar safe-top bg-[var(--app-bg)]">
        <div className="theme-marquee overflow-hidden border-b border-white/10 bg-black/30">
          <div className="flex w-max animate-marquee gap-10 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70 sm:text-xs sm:tracking-[0.22em]">
            {Array.from({ length: 8 }).map((_, i) => (
              <span key={i} className="flex gap-10">
                <span>{STORE.tagline}</span>
                <span className="gradient-text">{t("liveStock")}</span>
                <span>{t("pickupInStore")}</span>
                <span className="gradient-text">{t("reservePreorder")}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      <header ref={headerRef} className="store-header theme-chrome sticky top-0 z-40 border-b border-white/10 bg-[#07051a]/90 backdrop-blur-xl">
        <div className="container-page flex h-14 items-center gap-2 sm:h-[76px] sm:gap-4">
          <button
            type="button"
            className="theme-icon-btn grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/15 bg-white/5 transition hover:bg-white/10"
            onClick={() => setMenuOpen(true)}
            aria-label={t("settingsMenu")}
            aria-expanded={menuOpen}
          >
            <Menu className="h-6 w-6" stroke="currentColor" strokeWidth={2.25} />
          </button>

          <Link to="/" className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-3">
            <img
              src="/logo.webp"
              alt={STORE.name}
              width={48}
              height={48}
              decoding="async"
              fetchPriority="high"
              className="h-10 w-10 object-contain drop-shadow-[0_0_16px_rgba(255,45,149,0.55)] sm:h-12 sm:w-12"
            />
            <span className="hidden leading-tight sm:block">
              <span className="block text-xs font-extrabold tracking-widest sm:text-sm">{STORE.short}</span>
              <span className="gradient-text text-[10px] font-bold tracking-[0.28em] sm:text-xs">STORE</span>
            </span>
          </Link>

          <form
            className="relative hidden min-w-0 flex-1 md:block"
            onSubmit={(e) => {
              e.preventDefault();
              navigate(q.trim() ? `/shop?q=${encodeURIComponent(q.trim())}` : "/shop");
            }}
          >
            <Search
              className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2"
              stroke={logoStroke}
            />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="h-12 rounded-full pl-11"
            />
          </form>

          <div className="ml-auto flex items-center gap-0.5 sm:gap-1">
            <ThemeToggle className="mr-0.5" />
            <LanguageSwitcher
              className="mr-0.5 hidden sm:inline-flex"
              variant={isDark ? "dark" : "light"}
            />
            {staffLinks.map((link) => (
              <Link
                key={link.to + link.label}
                to={link.to}
                className="hidden rounded-full px-3 py-2 text-sm font-semibold gradient-text hover:bg-white/5 md:inline"
              >
                {link.label}
              </Link>
            ))}
            <Link
              to={user ? "/account" : "/login"}
              className="hidden h-10 items-center gap-2 rounded-full px-2.5 text-sm font-semibold hover:bg-white/5 sm:flex sm:px-3"
            >
              <UserRound className="h-5 w-5" stroke={logoStroke} />
              <span className="hidden lg:inline">{user ? t("account") : t("signIn")}</span>
            </Link>
            {user ? <NotificationBell variant="store" /> : null}
            <Link
              to="/cart"
              data-cart-target
              className="relative flex h-10 items-center gap-2 rounded-full px-2.5 text-sm font-semibold hover:bg-white/5 sm:px-3"
            >
              <ShoppingBag className="h-5 w-5" stroke={logoStroke} />
              <span className="hidden lg:inline">{t("cart")}</span>
              {count > 0 ? (
                <span
                  key={count}
                  className="cart-bump absolute right-0.5 top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-brand-grad px-1 text-[10px] font-bold text-white"
                >
                  {count}
                </span>
              ) : null}
            </Link>
          </div>
        </div>

        <form
          className="px-4 pb-3 md:hidden"
          onSubmit={(e) => {
            e.preventDefault();
            navigate(q.trim() ? `/shop?q=${encodeURIComponent(q.trim())}` : "/shop");
          }}
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("searchProducts")}
            className="h-11 rounded-full pl-4 text-base"
            enterKeyHint="search"
          />
        </form>

        <nav className="theme-nav container-page flex gap-5 overflow-x-auto overscroll-x-contain pb-3 text-sm font-semibold text-white/60 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:gap-6">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn("nav-link inline-flex shrink-0 touch-manipulation items-center gap-1.5 py-1 transition hover:text-white", isActive && "text-white")
              }
            >
              <item.icon className="h-4 w-4 text-[#ff2d95]" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      {menuOpen ? (
        <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true">
          <button
            type="button"
            className="console-backdrop absolute inset-0 bg-black/75 backdrop-blur-sm"
            aria-label={t("closeMenu")}
            onClick={() => setMenuOpen(false)}
          />
          <div className="menu-overlay absolute inset-0 flex flex-col bg-[#0c0a1c]">
            <div className="safe-top container-page flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-[#ff2d95]" />
                <p className="text-sm font-extrabold tracking-wide">{t("settings")}</p>
              </div>
              <button
                type="button"
                className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/5"
                onClick={() => setMenuOpen(false)}
                aria-label={t("closeMenu")}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto" data-lenis-prevent>
              <div className="container-page grid gap-x-10 pb-6 lg:grid-cols-2">
                <div>
                  <p className="menu-section-title">{t("menuShop")}</p>
                  {navWithIcons.map((item, i) => (
                    <NavLink
                      key={item.to + item.label}
                      to={item.to}
                      end={item.to === "/"}
                      onClick={() => setMenuOpen(false)}
                      style={{ "--i": `${i * 40}ms` } as CSSProperties}
                      className="menu-link"
                    >
                      <span className="menu-link-icon">
                        <item.icon className="h-5 w-5" />
                      </span>
                      {item.label}
                    </NavLink>
                  ))}
                </div>
                <div>
                  <p className="menu-section-title">{t("menuMyAccount")}</p>
                  {accountLinks.map((item, i) => (
                    <NavLink
                      key={item.to + item.label}
                      to={item.to}
                      end
                      onClick={() => setMenuOpen(false)}
                      style={{ "--i": `${(i + 4) * 40}ms` } as CSSProperties}
                      className="menu-link"
                    >
                      <span className="menu-link-icon">
                        <item.icon className="h-5 w-5" />
                      </span>
                      {item.label}
                      {item.badge ? (
                        <span className="ml-auto rounded-full bg-brand-grad px-2 py-0.5 text-[10px] font-bold text-white">{item.badge}</span>
                      ) : null}
                    </NavLink>
                  ))}

                  {staffLinks.length > 0 ? (
                    <>
                      <p className="menu-section-title">{t("console")}</p>
                      {staffLinks.map((link) => (
                        <Link key={link.to + link.label} to={link.to} onClick={() => setMenuOpen(false)} className="menu-link">
                          <span className="menu-link-icon">
                            <LayoutDashboard className="h-5 w-5" />
                          </span>
                          {link.label}
                        </Link>
                      ))}
                    </>
                  ) : null}

                  <p className="menu-section-title">{t("appearance")}</p>
                  <div className="flex flex-wrap items-center gap-2 px-2">
                    <ThemeToggle />
                    <LanguageSwitcher />
                    <SoundToggle />
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom: profile + verified + sign in/out */}
            <div className="safe-bottom container-page border-t border-white/10 pt-3">
              {user ? (
                <>
                  <p className="flex items-center gap-2 truncate text-sm font-bold text-white">
                    <ProfileAvatar profile={profile} email={user.email} size="sm" />
                    <span className="truncate">{profile?.full_name || user.email}</span>
                    {verified ? <VerifiedBadge size="sm" /> : null}
                  </p>
                  <p className="mt-0.5 text-xs text-white/45">{t(accountType)}</p>
                  <button
                    type="button"
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-3 text-sm font-semibold text-white/80 hover:bg-white/5"
                    onClick={async () => {
                      await signOut();
                      setMenuOpen(false);
                      navigate("/");
                    }}
                  >
                    <LogOut className="h-4 w-4" />
                    {t("signOut")}
                  </button>
                </>
              ) : (
                <div className="space-y-2">
                  <Link
                    to="/login"
                    onClick={() => setMenuOpen(false)}
                    className="flex w-full items-center justify-center rounded-xl bg-brand-grad px-3 py-3 text-sm font-bold text-white"
                  >
                    {t("signIn")}
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMenuOpen(false)}
                    className="flex w-full items-center justify-center rounded-xl border border-white/15 px-3 py-3 text-sm font-semibold text-white/80"
                  >
                    {t("createAccount")}
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <main className="min-w-0">
        <PageTransition>
          <Outlet />
        </PageTransition>
      </main>

      <footer className="footer-reveal mt-16 border-t border-white/10 bg-black/30">
        <div className="container-page grid gap-8 py-10 sm:gap-10 sm:py-14 md:grid-cols-4">
          <div>
            <img src="/logo.webp" alt="" width={80} height={80} loading="lazy" decoding="async" className="h-16 w-16 object-contain sm:h-20 sm:w-20" />
            <p className="mt-4 text-sm font-bold tracking-widest">{STORE.short} STORE</p>
            <p className="gradient-text mt-1 text-sm font-semibold">{STORE.tagline}</p>
            <p className="mt-3 text-sm text-white/55">{t("footerBlurb")}</p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <ThemeToggle />
              <LanguageSwitcher />
            </div>
            <div className="mt-4">
              <WhatsAppSupportButton variant="inline" />
            </div>
          </div>
          <div>
            <p className="text-sm font-bold">{t("shop")}</p>
            <div className="mt-3 space-y-2 text-sm text-white/60">
              <Link to="/shop?category=laptop-macbook" className="block py-0.5 hover:text-white">MacBook</Link>
              <Link to="/shop?category=mac-desktop" className="block py-0.5 hover:text-white">Mac</Link>
              <Link to="/shop?category=iphone" className="block py-0.5 hover:text-white">iPhone</Link>
              <Link to="/shop?category=ipad" className="block py-0.5 hover:text-white">iPad</Link>
              <Link to="/shop?category=audio" className="block py-0.5 hover:text-white">{t("audio")}</Link>
              <Link to="/shop?category=accessories" className="block py-0.5 hover:text-white">{t("accessories")}</Link>
            </div>
          </div>
          <div>
            <p className="text-sm font-bold">{t("store")}</p>
            <div className="mt-3 space-y-2 text-sm text-white/60">
              <Link to="/services" className="block py-0.5 hover:text-white">{t("services")}</Link>
              <Link to="/about" className="block py-0.5 hover:text-white">{t("about")}</Link>
              <Link to="/contact" className="block py-0.5 hover:text-white">{t("contactPickup")}</Link>
              <Link to={user ? "/account/orders" : "/register"} className="block py-0.5 hover:text-white">
                {user ? t("myOrders") : t("createAccount")}
              </Link>
            </div>
          </div>
          <div>
            <p className="text-sm font-bold">{t("promise")}</p>
            <ul className="mt-3 space-y-2 text-sm text-white/60">
              <li>{t("qualityBeforePrice")}</li>
              <li>{t("honestAvailability")}</li>
              <li>{t("warrantySupport")}</li>
            </ul>
          </div>
        </div>
        <span className="footer-giant" aria-hidden>
          STIVE LANDRY
        </span>
        <div className="border-t border-white/10 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-center text-xs text-white/35">
          © {new Date().getFullYear()} {STORE.name}
        </div>
      </footer>

      <SupportFabStack />
      <SideRail />
      <RenewalPopup />
    </div>
  );
}
