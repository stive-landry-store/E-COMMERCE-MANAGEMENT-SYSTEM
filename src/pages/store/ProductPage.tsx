import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { formatMoney } from "@/lib/format";
import { cn, onProductImageError, productImageUrl } from "@/lib/utils";
import { useI18n } from "@/contexts/LanguageContext";
import { AvailabilityBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { StarRating } from "@/components/StarRating";
import { STORE } from "@/lib/constants";
import {
  hasSealedOption,
  unitPriceForCondition,
  type PhoneCondition,
} from "@/lib/phoneCondition";
import type { Product, ProductVariant, SellerReview } from "@/types";

type AvailMeta = { variant_id: string; availability: string; available_stock: number };

function colorSwatch(color: string) {
  const key = color.toLowerCase();
  const map: Record<string, string> = {
    noir: "#1a1a1a",
    black: "#1a1a1a",
    blanc: "#f5f5f7",
    white: "#f5f5f7",
    argent: "#c0c0c0",
    silver: "#c0c0c0",
    or: "#f2d6a2",
    gold: "#f2d6a2",
    "or rose": "#e8b4b8",
    rose: "#f2a7c3",
    pink: "#f2a7c3",
    bleu: "#3b82f6",
    blue: "#3b82f6",
    vert: "#22c55e",
    green: "#22c55e",
    jaune: "#facc15",
    yellow: "#facc15",
    mauve: "#a78bfa",
    violet: "#8b5cf6",
    "violet intense": "#6d28d9",
    rouge: "#ef4444",
    red: "#ef4444",
    "product(red)": "#dc2626",
    minuit: "#111827",
    midnight: "#111827",
    "lumière stellaire": "#e8e4dc",
    "lumiere stellaire": "#e8e4dc",
    "gris sidéral": "#4b5563",
    "gris sideral": "#4b5563",
    graphite: "#374151",
    "titane naturel": "#9a9186",
    "titane bleu": "#5b6e8c",
    "titane blanc": "#e5e7eb",
    "titane noir": "#1f2937",
    "titane désert": "#c4a484",
    "titane desert": "#c4a484",
    "noir sidéral": "#0f172a",
    "space black": "#0f172a",
    "noir de jais": "#0a0a0a",
    corail: "#fb7185",
    sarcelle: "#14b8a6",
    ultramarin: "#1e3a8a",
    lavande: "#c4b5fd",
    sauge: "#86efac",
    "bleu brume": "#93c5fd",
    "bleu ciel": "#7dd3fc",
    "bleu pacifique": "#1d4ed8",
    "bleu alpin": "#3b82f6",
    "vert nuit": "#14532d",
    "cosmic orange": "#ea580c",
    "deep blue": "#1e3a8a",
  };
  for (const [k, v] of Object.entries(map)) {
    if (key.includes(k)) return v;
  }
  return "#94a3b8";
}

export function ProductPage() {
  const { slug } = useParams();
  const [params, setParams] = useSearchParams();
  const { user } = useAuth();
  const { addItem } = useCart();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [rating, setRating] = useState(5);
  const [remark, setRemark] = useState("");
  const qc = useQueryClient();

  const productQuery = useQuery({
    queryKey: ["product", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, brands(*), categories(*), product_variants(*), sellers(*)")
        .eq("slug", slug)
        .eq("status", "active")
        .single();
      if (error) throw error;
      return data as Product;
    },
    enabled: Boolean(slug),
  });

  const availQuery = useQuery({
    queryKey: ["availability", "product", productQuery.data?.id],
    enabled: Boolean(productQuery.data),
    queryFn: async () => {
      const ids = (productQuery.data?.product_variants ?? []).map((v) => v.id);
      if (!ids.length) return [] as AvailMeta[];
      const { data } = await supabase
        .from("variant_availability")
        .select("variant_id, availability, available_stock")
        .in("variant_id", ids);
      return (data ?? []) as AvailMeta[];
    },
  });

  const product = productQuery.data;
  const reviewsQuery = useQuery({
    queryKey: ["seller-reviews", product?.seller_id],
    enabled: Boolean(product?.seller_id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seller_reviews")
        .select("*, profiles(full_name)")
        .eq("seller_id", product!.seller_id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as SellerReview[];
    },
  });

  const variants = useMemo(
    () => (product?.product_variants ?? []).filter((v) => v.status === "active"),
    [product?.product_variants],
  );

  const colors = useMemo(() => [...new Set(variants.map((v) => v.color).filter(Boolean))] as string[], [variants]);
  const storages = useMemo(
    () => [...new Set(variants.map((v) => v.storage).filter(Boolean))] as string[],
    [variants],
  );

  const selectedId = params.get("v");
  const urlVariant = variants.find((v) => v.id === selectedId);

  const [pickedColor, setPickedColor] = useState<string | null>(null);
  const [pickedStorage, setPickedStorage] = useState<string | null>(null);
  const [condition, setCondition] = useState<PhoneCondition>("open_box");

  const activeColor = pickedColor ?? urlVariant?.color ?? colors[0] ?? null;
  const activeStorage = pickedStorage ?? urlVariant?.storage ?? storages[0] ?? null;

  const variant: ProductVariant | undefined = useMemo(() => {
    if (!variants.length) return undefined;
    const match = variants.find((v) => {
      const colorOk = !activeColor || v.color === activeColor;
      const storageOk = !activeStorage || v.storage === activeStorage;
      return colorOk && storageOk;
    });
    return match ?? urlVariant ?? variants[0];
  }, [variants, activeColor, activeStorage, urlVariant]);

  const availMap = useMemo(() => new Map((availQuery.data ?? []).map((a) => [a.variant_id, a])), [availQuery.data]);
  const meta = variant ? availMap.get(variant.id) : undefined;

  useEffect(() => {
    if (variant && !hasSealedOption(variant) && condition === "sealed") {
      setCondition("open_box");
    }
  }, [variant, condition]);

  function stockFor(filter: { color?: string; storage?: string }) {
    return variants
      .filter((v) => (!filter.color || v.color === filter.color) && (!filter.storage || v.storage === filter.storage))
      .reduce((sum, v) => sum + (availMap.get(v.id)?.available_stock ?? 0), 0);
  }

  function selectColor(color: string) {
    setPickedColor(color);
    const next =
      variants.find((v) => v.color === color && (!activeStorage || v.storage === activeStorage)) ??
      variants.find((v) => v.color === color);
    if (next) {
      if (next.storage) setPickedStorage(next.storage);
      setParams({ v: next.id }, { replace: true });
    }
  }

  function selectStorage(storage: string) {
    setPickedStorage(storage);
    const next =
      variants.find((v) => v.storage === storage && (!activeColor || v.color === activeColor)) ??
      variants.find((v) => v.storage === storage);
    if (next) {
      if (next.color) setPickedColor(next.color);
      setParams({ v: next.id }, { replace: true });
    }
  }

  async function requireAuth(next: () => Promise<void>) {
    if (!user) {
      toast.message("Create an account or sign in to continue.");
      navigate("/login");
      return;
    }
    await next();
  }

  async function onAdd() {
    if (!variant) return;
    if (!meta || meta.available_stock <= 0) {
      toast.error("This colour / storage is not in stock. Use Pre-order instead.");
      return;
    }
    const cond: PhoneCondition =
      condition === "sealed" && hasSealedOption(variant) ? "sealed" : "open_box";
    setBusy(true);
    try {
      await requireAuth(() => addItem(variant.id, 1, cond));
    } finally {
      setBusy(false);
    }
  }

  async function onReserve() {
    if (!variant) return;
    setBusy(true);
    try {
      await requireAuth(async () => {
        const { error } = await supabase.rpc("create_reservation", { p_variant_id: variant.id, p_quantity: 1 });
        if (error) throw error;
        toast.success("Reserved for your selected colour / storage.");
        navigate("/account/reservations");
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not reserve");
    } finally {
      setBusy(false);
    }
  }

  async function onPreorder() {
    if (!variant) return;
    setBusy(true);
    try {
      await requireAuth(async () => {
        const { error } = await supabase.rpc("create_preorder", { p_variant_id: variant.id, p_quantity: 1 });
        if (error) throw error;
        toast.success(
          `Pre-order submitted for ${[variant.storage, variant.color].filter(Boolean).join(" · ") || product?.name}.`,
        );
        navigate("/account/preorders");
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not pre-order");
    } finally {
      setBusy(false);
    }
  }

  if (productQuery.isLoading) return <Spinner />;
  if (!product || !variant) {
    return (
      <div className="container-page py-20 text-center">
        <p>Product not found.</p>
        <Link to="/shop" className="mt-4 inline-block font-bold gradient-text">
          Back to shop
        </Link>
      </div>
    );
  }

  const image = productImageUrl(variant.image_urls?.[0], product.slug);
  const specs = product.specs ?? {};
  const canBuy = (meta?.available_stock ?? 0) > 0;
  const canPreorder = !canBuy && variant.preorder_enabled;
  const pieces = meta?.available_stock ?? 0;
  const sealedAvailable = hasSealedOption(variant);
  const activeCondition: PhoneCondition =
    condition === "sealed" && sealedAvailable ? "sealed" : "open_box";
  const displayPrice = unitPriceForCondition(variant, activeCondition);

  return (
    <div className="container-page grid gap-10 py-10 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="glass overflow-hidden rounded-3xl p-8">
        {image ? (
          <img
            src={image}
            alt={`${product.name} ${variant.color ?? ""}`}
            className="mx-auto aspect-square w-full max-w-lg object-contain transition duration-500"
            fetchPriority="high"
            decoding="async"
            onError={(e) => onProductImageError(e, variant.image_urls?.[0], product.slug)}
          />
        ) : (
          <div className="aspect-square" />
        )}
      </div>
      <div>
        <p className="gradient-text text-sm font-bold">{product.brands?.name}</p>
        <h1 className="mt-2 text-4xl font-extrabold leading-tight">{product.name}</h1>
        <p className="mt-3 text-white/65">{product.description}</p>
        {product.sellers ? (
          <p className="mt-2 flex flex-wrap items-center gap-1.5 text-sm text-white/60">
            <span>
              {t("soldBy")}{" "}
              <span className="font-bold text-white">{product.sellers.shop_name}</span>
            </span>
            {product.sellers.is_verified ? <VerifiedBadge size="sm" /> : null}
            {(product.sellers.shop_location || product.sellers.work_area) && (
              <span className="w-full text-xs text-white/45">
                {[product.sellers.shop_location, product.sellers.work_area].filter(Boolean).join(" · ")}
              </span>
            )}
            {reviewsQuery.data?.length ? (
              <span className="gradient-text ml-2 font-bold">
                {(reviewsQuery.data.reduce((s, r) => s + r.rating, 0) / reviewsQuery.data.length).toFixed(1)} / 5
              </span>
            ) : null}
          </p>
        ) : (
          <p className="mt-2 flex items-center gap-1.5 text-sm text-white/60">
            <span>
              {t("soldBy")} <span className="font-bold text-white">{STORE.name}</span>
            </span>
            <VerifiedBadge size="sm" />
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <AvailabilityBadge value={meta?.availability} />
          <span className="rounded-full bg-white/10 px-3 py-1 text-sm font-semibold text-white">
            {pieces} {pieces === 1 ? t("piece") : t("pieces")} {t("piecesInStock")}
          </span>
          {[variant.storage, variant.color].filter(Boolean).length ? (
            <span className="text-sm text-white/55">
              {t("selected")}: {[variant.storage, variant.color].filter(Boolean).join(" · ")}
              {sealedAvailable ? ` · ${activeCondition === "sealed" ? t("conditionSealed") : t("conditionOpenBox")}` : ""}
            </span>
          ) : null}
        </div>

        <p className="mt-6 text-4xl font-extrabold">{formatMoney(displayPrice)}</p>
        {sealedAvailable && activeCondition === "open_box" && variant.price_sealed ? (
          <p className="mt-1 text-sm text-white/45">
            {t("conditionSealed")}: {formatMoney(variant.price_sealed)}
          </p>
        ) : null}

        {sealedAvailable ? (
          <div className="mt-8">
            <p className="text-xs uppercase tracking-wide text-white/50">{t("phoneCondition")}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(
                [
                  { id: "open_box" as const, label: t("conditionOpenBox"), hint: t("conditionOpenBoxHint") },
                  { id: "sealed" as const, label: t("conditionSealed"), hint: t("conditionSealedHint") },
                ] as const
              ).map((opt) => {
                const selected = activeCondition === opt.id;
                const price = unitPriceForCondition(variant, opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setCondition(opt.id)}
                    className={cn(
                      "min-w-[9.5rem] rounded-xl border px-3 py-2.5 text-left transition",
                      selected ? "border-transparent bg-brand-grad text-white" : "border-white/10 bg-white/5 hover:bg-white/10",
                    )}
                  >
                    <span className="block text-sm font-bold">{opt.label}</span>
                    <span className={cn("mt-0.5 block text-[11px]", selected ? "text-white/80" : "text-white/45")}>
                      {formatMoney(price)}
                    </span>
                    <span className={cn("mt-0.5 block text-[10px]", selected ? "text-white/70" : "text-white/40")}>
                      {opt.hint}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {colors.length > 0 ? (
          <div className="mt-8">
            <p className="text-xs uppercase tracking-wide text-white/50">Colour</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {colors.map((color) => {
                const stock = stockFor({ color, storage: activeStorage ?? undefined });
                const selected = activeColor === color;
                return (
                  <button
                    key={color}
                    type="button"
                    onClick={() => selectColor(color)}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold transition",
                      selected ? "border-transparent bg-brand-grad text-white" : "border-white/10 bg-white/5 hover:bg-white/10",
                    )}
                    title={`${color} — ${stock} in stock`}
                  >
                    <span
                      className="h-4 w-4 rounded-full border border-white/30"
                      style={{ backgroundColor: colorSwatch(color) }}
                    />
                    {color}
                    <span className={cn("text-[11px] font-semibold", selected ? "text-white/80" : "text-white/45")}>
                      {stock > 0 ? `${stock}` : "0"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {storages.length > 0 ? (
          <div className="mt-6">
            <p className="text-xs uppercase tracking-wide text-white/50">Storage / size</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {storages.map((storage) => {
                const stock = stockFor({ storage, color: activeColor ?? undefined });
                const selected = activeStorage === storage;
                return (
                  <button
                    key={storage}
                    type="button"
                    onClick={() => selectStorage(storage)}
                    className={cn(
                      "rounded-xl border px-3 py-2 text-sm font-bold transition",
                      selected ? "border-transparent bg-brand-grad text-white" : "border-white/10 bg-white/5 hover:bg-white/10",
                    )}
                    title={`${storage} — ${stock} in stock`}
                  >
                    {storage}
                    <span className={cn("ml-2 text-[11px]", selected ? "text-white/80" : "text-white/45")}>
                      {stock > 0 ? `${stock} pcs` : "pre-order"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="mt-8 flex flex-wrap gap-3">
          <Button onClick={onAdd} disabled={busy || !canBuy} variant="gold" size="lg">
            Add to cart
          </Button>
          <Button onClick={onReserve} disabled={busy || !canBuy || !variant.reservable} variant="secondary" size="lg">
            Reserve this config
          </Button>
          <Button onClick={onPreorder} disabled={busy || !canPreorder} variant="ghost" size="lg">
            Pre-order colour / storage
          </Button>
        </div>
        <p className="mt-3 text-xs text-white/45">
          Pre-order locks the exact colour and storage you selected. You can change either option above before submitting.
        </p>

        {Object.keys(specs).length > 0 ? (
          <dl className="mt-10 grid grid-cols-2 gap-4">
            {Object.entries(specs).map(([key, value]) => (
              <div key={key} className="glass rounded-2xl p-4">
                <dt className="text-xs uppercase tracking-wide text-white/45">{key}</dt>
                <dd className="mt-1 text-sm font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        {product.sellers ? (
          <div className="mt-10">
            <h2 className="text-xl font-extrabold">{t("clientRemarks")}</h2>
            <p className="mt-1 text-sm text-white/55">{t("rateSellerStarsHint")}</p>
            {user ? (
              <form
                className="mt-4 space-y-3"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const { error } = await supabase.from("seller_reviews").upsert(
                    {
                      seller_id: product.sellers!.id,
                      profile_id: user.id,
                      product_id: product.id,
                      rating,
                      remark: remark || null,
                    },
                    { onConflict: "seller_id,profile_id" },
                  );
                  if (error) toast.error(error.message);
                  else {
                    toast.success(t("remarkSaved"));
                    setRemark("");
                    qc.invalidateQueries({ queryKey: ["seller-reviews", product.seller_id] });
                  }
                }}
              >
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/45">{t("yourStars")}</p>
                  <StarRating value={rating} onChange={setRating} />
                  <p className="mt-1 text-xs text-white/40">{t("starsScaleHint")}</p>
                </div>
                <textarea rows={3} value={remark} onChange={(e) => setRemark(e.target.value)} placeholder={t("yourRemark")} />
                <Button type="submit" variant="gold">
                  {t("sendRemark")}
                </Button>
              </form>
            ) : (
              <Link to="/login" className="mt-3 inline-block gradient-text text-sm font-bold">
                {t("signInToRemark")}
              </Link>
            )}
            <div className="mt-6 space-y-3">
              {(reviewsQuery.data ?? []).map((r) => (
                <article key={r.id} className="glass rounded-2xl p-4">
                  <p className="text-sm font-bold">{r.profiles?.full_name ?? "Client"}</p>
                  <StarRating value={r.rating} readOnly size="sm" allowZero={false} className="mt-1" />
                  {r.remark ? <p className="mt-1 text-sm text-white/70">{r.remark}</p> : null}
                </article>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
