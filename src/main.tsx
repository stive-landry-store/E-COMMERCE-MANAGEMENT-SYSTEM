/*!
 * Stive Landry Store — E-Commerce Management System
 * Conçu et développé par NYAMI TCHOUPE STIVE LANDRY
 * © NYAMI TCHOUPE STIVE LANDRY. Tous droits réservés.
 */
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Toaster } from "sonner";
import App from "./App";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { NotificationsProvider } from "@/contexts/NotificationsContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ThemeProvider, useTheme } from "@/contexts/ThemeContext";
import { AppSplash } from "@/components/ui/AppSplash";
import { initNativeApp } from "@/lib/native";
import { applyPlatformClass } from "@/lib/platform";
import "./index.css";

applyPlatformClass();
void initNativeApp();

function ThemedToaster() {
  const { theme } = useTheme();
  return (
    <Toaster
      richColors
      theme={theme}
      position="top-right"
      toastOptions={{ className: "sls-toast" }}
    />
  );
}

function VercelSpeedInsights() {
  const location = useLocation();
  return <SpeedInsights route={location.pathname} />;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 0,
      refetchOnWindowFocus: true,
      staleTime: 15_000,
      gcTime: 10 * 60_000,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider>
          <LanguageProvider>
            <AuthProvider>
              <NotificationsProvider>
                <CartProvider>
                  <AppSplash>
                    <App />
                  </AppSplash>
                  <ThemedToaster />
                  <VercelSpeedInsights />
                </CartProvider>
              </NotificationsProvider>
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
