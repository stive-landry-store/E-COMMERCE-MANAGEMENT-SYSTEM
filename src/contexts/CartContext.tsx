import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import type { CartItem } from "@/types";

type CartContextValue = {
  items: CartItem[];
  count: number;
  loading: boolean;
  refresh: () => Promise<void>;
  addItem: (variantId: string, quantity?: number) => Promise<void>;
  setQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearLocal: () => void;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    if (!user) {
      setItems([]);
      return;
    }
    setLoading(true);
    const { data: cart } = await supabase.from("carts").select("id").eq("profile_id", user.id).maybeSingle();
    let cartId = cart?.id as string | undefined;
    if (!cartId) {
      const { data: created } = await supabase.from("carts").insert({ profile_id: user.id }).select("id").single();
      cartId = created?.id;
    }
    if (!cartId) {
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("cart_items")
      .select("*, product_variants(*, products(*))")
      .eq("cart_id", cartId);
    setItems((data as CartItem[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, [user?.id]);

  async function addItem(variantId: string, quantity = 1) {
    if (!user) {
      toast.error("Sign in to add items to your cart.");
      throw new Error("auth");
    }
    const { data: cartId, error: cartError } = await supabase.rpc("get_or_create_cart");
    if (cartError) {
      toast.error(cartError.message);
      throw cartError;
    }
    const existing = items.find((i) => i.variant_id === variantId);
    if (existing) {
      const { error } = await supabase
        .from("cart_items")
        .update({ quantity: existing.quantity + quantity })
        .eq("id", existing.id);
      if (error) toast.error(error.message);
    } else {
      const { error } = await supabase.from("cart_items").insert({
        cart_id: cartId,
        variant_id: variantId,
        quantity,
      });
      if (error) toast.error(error.message);
    }
    await refresh();
    toast.success("Added to cart");
  }

  async function setQuantity(itemId: string, quantity: number) {
    if (quantity <= 0) return removeItem(itemId);
    const { error } = await supabase.from("cart_items").update({ quantity }).eq("id", itemId);
    if (error) toast.error(error.message);
    await refresh();
  }

  async function removeItem(itemId: string) {
    const { error } = await supabase.from("cart_items").delete().eq("id", itemId);
    if (error) toast.error(error.message);
    await refresh();
  }

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      count: items.reduce((sum, i) => sum + i.quantity, 0),
      loading,
      refresh,
      addItem,
      setQuantity,
      removeItem,
      clearLocal: () => setItems([]),
    }),
    [items, loading],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
