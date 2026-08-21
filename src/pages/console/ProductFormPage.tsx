import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useDeskBase } from "@/lib/desk";
import { uploadProductImages } from "@/lib/upload";
import { slugify } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { ProductImagePicker } from "@/components/ProductImagePicker";
import { EditablePriceCell, ProductPhotoCell } from "@/components/console/ProductTableCells";
import type { Brand, Category, Product, ProductVariant } from "@/types";

export function ProductFormPage() {
  const { id } = useParams();
  const isNew = id === "new" || !id;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const base = useDeskBase();
  const { seller, isAdmin } = useAuth();

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
        .select("*, product_variants(*)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as Product;
    },
  });

  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [description, setDescription] = useState("");
  const [basePrice, setBasePrice] = useState("0");
  const [categoryId, setCategoryId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [featured, setFeatured] = useState(false);
  const [status, setStatus] = useState("active");
  const [images, setImages] = useState<string[]>([]);
  const [initialStock, setInitialStock] = useState("0");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [vModel, setVModel] = useState("");
  const [vStorage, setVStorage] = useState("");
  const [vColor, setVColor] = useState("");
  const [vSku, setVSku] = useState("");
  const [vPrice, setVPrice] = useState("");
  const [vImages, setVImages] = useState<string[]>([]);
  const [vStock, setVStock] = useState("0");
  const [vUploading, setVUploading] = useState(false);

  useEffect(() => {
    if (existing.data) {
      const p = existing.data;
      setName(p.name);
      setSku(p.sku);
      setDescription(p.description ?? "");
      setBasePrice(String(p.base_price));
      setCategoryId(p.category_id ?? "");
      setBrandId(p.brand_id ?? "");
      setFeatured(p.featured);
      setStatus(p.status);
      const first = p.product_variants?.[0];
      setImages(first?.image_urls ?? []);
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
    if (!name.trim() || !sku.trim()) {
      toast.error("Name and SKU are required");
      return;
    }
    setBusy(true);
    try {
      const sellerId = !isAdmin ? seller?.id ?? null : base === "/seller" ? seller?.id ?? null : null;
      const payload = {
        name: name.trim(),
        sku: sku.trim(),
        slug: slugify(name),
        description,
        base_price: Number(basePrice),
        category_id: categoryId || null,
        brand_id: brandId || null,
        featured,
        status: status as Product["status"],
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
            sku: `${sku.trim()}-STD`,
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
        qc.invalidateQueries({ queryKey: ["admin-products"] });
        qc.invalidateQueries({ queryKey: ["inventory-board"] });
        navigate(`${base}/products/${data.id}`);
      } else {
        const { error } = await supabase.from("products").update(payload).eq("id", id);
        if (error) throw error;

        const firstVariant = existing.data?.product_variants?.[0];
        if (firstVariant) {
          await supabase.from("product_variants").update({ image_urls: images }).eq("id", firstVariant.id);
        }

        toast.success("Product saved");
        existing.refetch();
        qc.invalidateQueries({ queryKey: ["admin-products"] });
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
    if (!vSku.trim()) {
      toast.error("Variant SKU is required");
      return;
    }
    const { data: variant, error } = await supabase
      .from("product_variants")
      .insert({
        product_id: id,
        model: vModel || name,
        storage: vStorage || null,
        color: vColor || null,
        sku: vSku.trim(),
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
    setVSku("");
    setVModel("");
    setVStorage("");
    setVColor("");
    setVPrice("");
    setVImages([]);
    setVStock("0");
    existing.refetch();
    qc.invalidateQueries({ queryKey: ["inventory-board"] });
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
    const { error } = await supabase.from("product_variants").update({ price: next }).eq("id", variantId);
    if (error) throw error;
    existing.refetch();
    qc.invalidateQueries({ queryKey: ["admin-products"] });
    qc.invalidateQueries({ queryKey: ["featured-products"] });
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
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Product name" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label>SKU</label>
            <input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="Unique SKU" />
          </div>
          <div>
            <label>Base price (FCFA)</label>
            <input type="number" min={0} value={basePrice} onChange={(e) => setBasePrice(e.target.value)} />
          </div>
        </div>
        {isNew ? (
          <div>
            <label>Initial stock</label>
            <input type="number" min={0} value={initialStock} onChange={(e) => setInitialStock(e.target.value)} />
            <p className="mt-1 text-xs text-ink-700/50">Stock is applied to the default variant. You can change it later in Inventory.</p>
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
            <label>Brand</label>
            <select value={brandId} onChange={(e) => setBrandId(e.target.value)}>
              <option value="">Select</option>
              {(refs.data?.brands ?? []).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
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
          <p className="text-sm text-ink-700/70">Add or remove variants. Each can have its own photos and starting stock.</p>
          <div className="mt-3 overflow-x-auto surface">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-xs uppercase text-ink-700/60">
                  <th className="px-3 py-2">Photo</th>
                  <th className="px-3 py-2">SKU</th>
                  <th className="px-3 py-2">Storage / color</th>
                  <th className="px-3 py-2">Price</th>
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
                        alt={v.sku}
                        onSaved={() => {
                          existing.refetch();
                          qc.invalidateQueries({ queryKey: ["admin-products"] });
                        }}
                      />
                    </td>
                    <td className="px-3 py-2">{v.sku}</td>
                    <td className="px-3 py-2">{[v.storage, v.color].filter(Boolean).join(" · ") || "—"}</td>
                    <td className="px-3 py-2">
                      <EditablePriceCell value={Number(v.price)} onSave={(next) => saveVariantPrice(v.id, next)} />
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
              <input placeholder="Model" value={vModel} onChange={(e) => setVModel(e.target.value)} />
              <input placeholder="Storage e.g. 256GB" value={vStorage} onChange={(e) => setVStorage(e.target.value)} />
              <input placeholder="Color" value={vColor} onChange={(e) => setVColor(e.target.value)} />
              <input placeholder="Variant SKU" value={vSku} onChange={(e) => setVSku(e.target.value)} />
              <input placeholder="Price" type="number" value={vPrice} onChange={(e) => setVPrice(e.target.value)} />
              <input placeholder="Initial stock" type="number" min={0} value={vStock} onChange={(e) => setVStock(e.target.value)} />
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
