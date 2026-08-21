import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import App from "./App";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AppSplash } from "@/components/ui/AppSplash";
import { initNativeApp } from "@/lib/native";
import "./index.css";

void initNativeApp();

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <LanguageProvider>
          <AuthProvider>
            <CartProvider>
              <AppSplash>
                <App />
              </AppSplash>
              <Toaster richColors position="top-right" />
            </CartProvider>
          </AuthProvider>
        </LanguageProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
