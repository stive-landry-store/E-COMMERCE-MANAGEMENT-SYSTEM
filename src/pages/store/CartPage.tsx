import { Link, useNavigate } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { formatMoney } from "@/lib/format";
import { productImageUrl, variantLabel } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Spinner";

export function CartPage() {
  const { items, setQuantity, removeItem } = useCart();
  const navigate = useNavigate();
  const total = items.reduce((sum, item) => sum + Number(item.product_variants?.price ?? 0) * item.quantity, 0);

  if (items.length === 0) {
    return (
      <div className="container-page py-16">
        <h1 className="text-4xl font-extrabold">Cart</h1>
        <div className="mt-8">
          <EmptyState title="Your cart is empty" hint="Browse the shop and add an in-stock device." />
        </div>
        <Link to="/shop" className="mt-6 inline-block font-bold gradient-text">
          Continue shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="container-page grid gap-8 py-12 lg:grid-cols-[1fr_320px]">
      <div>
        <h1 className="text-4xl font-extrabold">Cart</h1>
        <div className="mt-6 space-y-4">
          {items.map((item) => {
            const v = item.product_variants;
            const p = v?.products;
            return (
              <div key={item.id} className="glass flex gap-4 rounded-2xl p-4">
                <img
                  src={productImageUrl(v?.image_urls?.[0], p?.slug)}
                  alt=""
                  className="h-24 w-24 rounded-xl object-cover bg-black/30"
                />
                <div className="flex-1">
                  <p className="font-semibold">{p?.name}</p>
                  <p className="text-sm text-white/55">{v ? variantLabel(v) : ""}</p>
                  <p className="mt-1 text-sm">{formatMoney(v?.price)}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      className="w-20"
                      value={item.quantity}
                      onChange={(e) => setQuantity(item.id, Number(e.target.value))}
                    />
                    <button className="text-sm text-rose-300" onClick={() => removeItem(item.id)}>
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <aside className="glass h-fit p-5">
        <p className="text-sm text-white/55">Subtotal</p>
        <p className="text-3xl font-extrabold">{formatMoney(total)}</p>
        <Button className="mt-5 w-full" variant="gold" onClick={() => navigate("/checkout")}>
          Checkout
        </Button>
      </aside>
    </div>
  );
}
