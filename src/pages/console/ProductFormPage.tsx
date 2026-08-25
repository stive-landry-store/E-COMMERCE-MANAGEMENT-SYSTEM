import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/LanguageContext";
import { useDeskBase } from "@/lib/desk";
import { uploadProductImages } from "@/lib/upload";
import { invalidateStorefront } from "@/lib/catalogCache";
import {
  applyStoragePriceLadder,
  familyFromCategorySlug,
  pickAnchorVariant,
} from "@/lib/storagePriceLadder";
import { slugify } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { ProductImagePicker } from "@/components/ProductImagePicker";
import { EditablePriceCell, ProductPhotoCell } from "@/components/console/ProductTableCells";
import type { Brand, Category, Product, ProductVariant } from "@/types";

/** Hidden internal code — DB still requires a unique sku, users never see it. */
function autoSku(parts: (string | null | undefined)[]) {
  const base =
    parts
      .filter(Boolean)
      .map((p) => slugify(String(p)).replace(/-/g, "").slice(0, 10).toUpperCase())
      .filter(Boolean)
      .join("-") || "ITEM";
  return `${base}-${Date.now().toString(36).toUpperCase()}`;
}

export function ProductFormPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isNew = id === "new" || !id;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const base = useDeskBase();
  const { seller, isAdmin } = useAuth();
  const { t } = useI18n();

  const refs = useQuery({
    queryKey: ["catalog-refs"],
    queryFn: async () => {
      const [{ data: categories }, { data: brands }] = await Promise.all([
        supabase.from("categories").select("*").eq("status", "active").order("name"),
        supabase.from("brands").select("*").eq("status", "active").order("name"),
      ]);
      return { categories: (categories ?? []) as Category[], brands: (brands ?? []) as Brand[] };
    },
  });

  const existing = useQuery({
    queryKey: ["admin-product", id],
    enabled: !isNew,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, categories(slug), product_variants(*)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as Product;
    },
  });

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [basePrice, setBasePrice] = useState("0");
  const [categoryId, setCategoryId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [newBrandName, setNewBrandName] = useState("");
  const [brandBusy, setBrandBusy] = useState(false);
  const [featured, setFeatured] = useState(false);
  const [status, setStatus] = useState("active");
  const [listingType, setListingType] = useState<"product" | "service">("product");
  const [images, setImages] = useState<string[]>([]);
  const [initialStock, setInitialStock] = useState("0");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [vStorage, setVStorage] = useState("");
  const [vColor, setVColor] = useState("");
  const [vPrice, setVPrice] = useState("");
  const [vImages, setVImages] = useState<string[]>([]);
  const [vStock, setVStock] = useState("0");
  const [vUploading, setVUploading] = useState(false);

  useEffect(() => {
    if (isNew && searchParams.get("type") === "service") {
      setListingType("service");
    }
  }, [isNew, searchParams]);

  useEffect(() => {
    if (existing.data) {
      const p = existing.data;
      setName(p.name);
      setDescription(p.description ?? "");
      setCategoryId(p.category_id ?? "");
      setBrandId(p.brand_id ?? "");
      setFeatured(p.featured);
      setStatus(p.status);
      setListingType(p.listing_type === "service" ? "service" : "product");
      const first = pickAnchorVariant(p.product_variants ?? []);
      setImages(first?.image_urls ?? p.product_variants?.[0]?.image_urls ?? []);
      setBasePrice(String(first?.price ?? p.base_price));
    }
  }, [existing.data]);

  async function pickProductImages(files: File[]) {
    setUploading(true);
    try {
      const urls = await uploadProductImages(files);
      setImages((prev) => [...prev, ...urls]);
      toast.success(urls.length > 1 ? "Images added" : "Image added");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function createOwnBrand() {
    const nameValue = newBrandName.trim();
    if (nameValue.length < 2) {
      toast.error(t("brandNameRequired"));
      return;
    }
    setBrandBusy(true);
    try {
      const { data, error } = await supabase.rpc("seller_create_brand", { p_name: nameValue });
      if (error) throw error;
      const id = data as string;
      await refs.refetch();
      setBrandId(id);
      setNewBrandName("");
      toast.success(t("brandCreated"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("brandCreateFailed"));
    } finally {
      setBrandBusy(false);
    }
  }

  async function pickVariantImages(files: File[]) {
    setVUploading(true);
    try {
      const urls = await uploadProductImages(files);
      setVImages((prev) => [...prev, ...urls]);
      toast.success("Image added");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setVUploading(false);
    }
  }

  async function saveProduct() {
    if (!name.trim()) {
      toast.error("Product name is required");
      return;
    }
    setBusy(true);
    try {
      const sellerId = !isAdmin ? seller?.id ?? null : base === "/seller" ? seller?.id ?? null : null;
      const productSku = isNew ? autoSku([name]) : existing.data?.sku ?? autoSku([name]);
      const payload = {
        name: name.trim(),
        sku: productSku,
        slug: slugify(name),
        description,
        base_price: Number(basePrice),
        category_id: categoryId || null,
        brand_id: brandId || null,
        featured,
        status: status as Product["status"],
        listing_type: listingType,
        specs: existing.data?.specs ?? {},
        ...(isNew ? { seller_id: sellerId } : {}),
      };

      if (isNew) {
        if (!sellerId && !isAdmin) {
          throw new Error("Your seller account must be approved before posting products");
        }
        const { data, error } = await supabase.from("products").insert(payload).select("id").single();
        if (error) throw error;

        const { data: variant, error: vError } = await supabase
          .from("product_variants")
          .insert({
            product_id: data.id,
            model: name.trim(),
            sku: autoSku([name, "STD"]),
            price: Number(basePrice) || 0,
            image_urls: images,
            reservable: true,
            preorder_enabled: true,
            status: "active",
          })
          .select("id")
          .single();
        if (vError) throw vError;

        const stockQty = Number(initialStock);
        if (variant && stockQty > 0) {
          const { error: stockError } = await supabase.rpc("add_stock", {
            p_variant_id: variant.id,
            p_quantity: stockQty,
            p_reason: "Initial stock",
          });
          if (stockError) toast.error(stockError.message);
        }

        toast.success("Product created");
        invalidateStorefront(qc);
        qc.invalidateQueries({ queryKey: ["inventory-board"] });
        navigate(`${base}/products/${data.id}`);
      } else {
        const { error } = await supabase.from("products").update(payload).eq("id", id);
        if (error) throw error;

        const variants = existing.data?.product_variants ?? [];
        const firstVariant = pickAnchorVariant(variants) ?? variants[0];
        if (firstVariant) {
          const { error: imgError } = await supabase
            .from("product_variants")
            .update({ image_urls: images })
            .eq("id", firstVariant.id);
          if (imgError) throw imgError;
        }

        const nextPrice = Number(basePrice) || 0;
        const loaded = Number(firstVariant?.price ?? existing.data?.base_price ?? 0);
        if (firstVariant && nextPrice !== loaded) {
          await applyStoragePriceLadder(
            variants,
            firstVariant.id,
            nextPrice,
            familyFromCategorySlug(existing.data?.categories?.slug),
            "price",
          );
        }

        toast.success("Product saved");
        existing.refetch();
        invalidateStorefront(qc);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function addVariant() {
    if (!id || isNew) {
      toast.error("Save the product first");
      return;
    }
    if (!vStorage.trim() && !vColor.trim()) {
      toast.error("Enter storage and/or color for this variant");
      return;
    }
    const { data: variant, error } = await supabase
      .from("product_variants")
      .insert({
        product_id: id,
        model: name,
        storage: vStorage.trim() || null,
        color: vColor.trim() || null,
        sku: autoSku([name, vStorage, vColor]),
        price: Number(vPrice) || Number(basePrice) || 0,
        image_urls: vImages,
      })
      .select("id")
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }

    const stockQty = Number(vStock);
    if (variant && stockQty > 0) {
      const { error: stockError } = await supabase.rpc("add_stock", {
        p_variant_id: variant.id,
        p_quantity: stockQty,
        p_reason: "Initial stock",
      });
      if (stockError) toast.error(stockError.message);
    }

    toast.success("Variant added");
    setVStorage("");
    setVColor("");
    setVPrice("");
    setVImages([]);
    setVStock("0");
    existing.refetch();
    qc.invalidateQueries({ queryKey: ["inventory-board"] });
    invalidateStorefront(qc);
  }

  async function archive() {
    if (!id || isNew) return;
    const { error } = await supabase.from("products").update({ status: "archived" }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Archived");
      navigate(`${base}/products`);
    }
  }

  async function removeProduct() {
    if (!id || isNew) return;
    if (!window.confirm("Remove this product permanently?")) return;
    const { error: vError } = await supabase.from("product_variants").delete().eq("product_id", id);
    if (vError) {
      toast.error(vError.message);
      return;
    }
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Product removed");
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["inventory-board"] });
      navigate(`${base}/products`);
    }
  }

  async function saveVariantPrice(variantId: string, next: number) {
    const variants = existing.data?.product_variants ?? [];
    const { storages, rows } = await applyStoragePriceLadder(
      variants,
      variantId,
      next,
      familyFromCategorySlug(existing.data?.categories?.slug),
      "price",
    );
    const lowestPrice = Math.min(...rows.map((r) => r.price));
    await supabase.from("products").update({ base_price: lowestPrice }).eq("id", id);
    existing.refetch();
    invalidateStorefront(qc);
    if (storages.length > 1) {
      toast.success(`Other storages estimated from this one (${storages.join(", ")}).`);
    }
  }

  async function saveVariantSealedPrice(variantId: string, next: number) {
    const variants = existing.data?.product_variants ?? [];
    const { storages } = await applyStoragePriceLadder(
      variants,
      variantId,
      next,
      familyFromCategorySlug(existing.data?.categories?.slug),
      "price_sealed",
    );
    existing.refetch();
    invalidateStorefront(qc);
    if (storages.length > 1) {
      toast.success(`Other sealed storages estimated (${storages.join(", ")}).`);
    }
  }

  async function removeVariant(variantId: string) {
    if (!window.confirm("Remove this variant and its stock?")) return;
    const { error } = await supabase.from("product_variants").delete().eq("id", variantId);
    if (error) toast.error(error.message);
    else {
      toast.success("Variant removed");
      existing.refetch();
      qc.invalidateQueries({ queryKey: ["inventory-board"] });
    }
  }

  if (!isNew && existing.isLoading) return <Spinner />;

  const variants = (existing.data?.product_variants ?? []) as ProductVariant[];

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-3xl">{isNew ? "New product" : name}</h1>
      <p className="mt-1 text-sm text-ink-700/70">Add, edit or remove products at any time. Upload photos with the image button.</p>

      <div className="mt-6 grid gap-4 surface p-6">
        <ProductImagePicker images={images} onChange={setImages} onPickFiles={pickProductImages} uploading={uploading} />

        <div>
          <label>Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. iPhone 15 Pro" />
        </div>
        {base === "/seller" || seller ? (
          <div>
            <label>Listing type</label>
            <select value={listingType} onChange={(e) => setListingType(e.target.value as "product" | "service")}>
              <option value="product">Product (physical item)</option>
              <option value="service">Service (repair, setup, etc.)</option>
            </select>
          </div>
        ) : null}
        <div>
          <label>Starting storage price (FCFA, open box)</label>
          <input type="number" min={0} value={basePrice} onChange={(e) => setBasePrice(e.target.value)} />
          <p className="mt-1 text-xs text-ink-700/50">
            This is the smallest storage (e.g. 128 Go). Saving estimates 256 Go, 512 Go, 1 To… automatically. Same
            storage, different colors, stay the same price.
          </p>
        </div>
        {isNew ? (
          <div>
            <label>Initial stock (how many pieces you have now)</label>
            <input type="number" min={0} value={initialStock} onChange={(e) => setInitialStock(e.target.value)} />
            <p className="mt-1 text-xs text-ink-700/50">Example: type 5 if you have 5 units. You can change stock later in Inventory.</p>
          </div>
        ) : null}
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label>Category</label>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">Select</option>
              {(refs.data?.categories ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>{t("productBrand")}</label>
            <select value={brandId} onChange={(e) => setBrandId(e.target.value)}>
              <option value="">{t("selectBrand")}</option>
              {(refs.data?.brands ?? []).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <div className="mt-2 flex gap-2">
              <input
                value={newBrandName}
                onChange={(e) => setNewBrandName(e.target.value)}
                placeholder={t("ownBrandPlaceholder")}
              />
              <Button type="button" variant="secondary" disabled={brandBusy} onClick={() => void createOwnBrand()}>
                {t("addMyBrand")}
              </Button>
            </div>
            <p className="mt-1 text-xs text-ink-700/50">{t("ownBrandHint")}</p>
          </div>
        </div>
        <div>
          <label>Description</label>
          <textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm normal-case tracking-normal">
            <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} /> Featured
          </label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="max-w-xs">
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="archived">Archived</option>
          </select>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={saveProduct} disabled={busy || uploading} variant="gold">
            {isNew ? "Add product" : "Save product"}
          </Button>
          {!isNew ? (
            <>
              <Button variant="secondary" onClick={archive}>
                Archive
              </Button>
              <Button variant="danger" onClick={removeProduct}>
                Remove
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {!isNew ? (
        <div className="mt-8">
          <h2 className="font-medium">Variants</h2>
          <p className="text-sm text-ink-700/70">
            Change any storage price (128 Go, 256 Go…). The other capacities are estimated from the Cameroon storage
            ladder. Colours of the same storage keep the same price.
          </p>
          <div className="mt-3 overflow-x-auto surface">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-xs uppercase text-ink-700/60">
                  <th className="px-3 py-2">Photo</th>
                  <th className="px-3 py-2">Storage / color</th>
                  <th className="px-3 py-2">Open box</th>
                  <th className="px-3 py-2">Sealed</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {variants.map((v) => (
                  <tr key={v.id} className="border-b last:border-0">
                    <td className="px-3 py-2">
                      <ProductPhotoCell
                        url={v.image_urls?.[0]}
                        variantId={v.id}
                        alt={[v.storage, v.color].filter(Boolean).join(" ") || name}
                        onSaved={() => {
                          existing.refetch();
                          qc.invalidateQueries({ queryKey: ["admin-products"] });
                        }}
                      />
                    </td>
                    <td className="px-3 py-2">{[v.storage, v.color].filter(Boolean).join(" · ") || "—"}</td>
                    <td className="px-3 py-2">
                      <EditablePriceCell value={Number(v.price)} onSave={(next) => saveVariantPrice(v.id, next)} />
                    </td>
                    <td className="px-3 py-2">
                      <EditablePriceCell
                        value={Number(v.price_sealed ?? 0)}
                        onSave={(next) => saveVariantSealedPrice(v.id, next)}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <button className="text-xs font-bold text-red-600" onClick={() => removeVariant(v.id)}>
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 grid gap-3 surface p-4">
            <ProductImagePicker
              images={vImages}
              onChange={setVImages}
              onPickFiles={pickVariantImages}
              uploading={vUploading}
              label="Variant images"
            />
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label>Storage (e.g. 256GB)</label>
                <input placeholder="256GB" value={vStorage} onChange={(e) => setVStorage(e.target.value)} />
              </div>
              <div>
                <label>Color (e.g. Black)</label>
                <input placeholder="Black" value={vColor} onChange={(e) => setVColor(e.target.value)} />
              </div>
              <div>
                <label>Open box price (FCFA)</label>
                <input placeholder="e.g. 155000" type="number" value={vPrice} onChange={(e) => setVPrice(e.target.value)} />
              </div>
              <div>
                <label>Starting stock (how many pieces)</label>
                <input placeholder="e.g. 3" type="number" min={0} value={vStock} onChange={(e) => setVStock(e.target.value)} />
              </div>
            </div>
            <Button onClick={addVariant} disabled={vUploading}>
              Add variant
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
