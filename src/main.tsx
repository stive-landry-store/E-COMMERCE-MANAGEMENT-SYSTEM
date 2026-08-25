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
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AppSplash } from "@/components/ui/AppSplash";
import { initNativeApp } from "@/lib/native";
import { applyPlatformClass } from "@/lib/platform";
import "./index.css";

applyPlatformClass();
void initNativeApp();

function VercelSpeedInsights() {
  const location = useLocation();
  return <SpeedInsights route={location.pathname} />;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 0,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60_000,
      gcTime: 30 * 60_000,
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
                  <Toaster richColors position="top-right" />
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
