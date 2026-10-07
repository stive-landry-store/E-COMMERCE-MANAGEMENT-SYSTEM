import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ImagePlus, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/contexts/LanguageContext";
import { useSellerDeskScope } from "@/lib/desk";
import { uploadCategoryImage } from "@/lib/upload";
import { categoryImageUrl, slugify } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Spinner, EmptyState } from "@/components/ui/Spinner";
import { StatusPill } from "@/components/ui/Badge";
import type { Brand, Category } from "@/types";

function productCountBy(ids: (string | null | undefined)[]) {
  const map = new Map<string, number>();
  for (const id of ids) {
    if (!id) continue;
    map.set(id, (map.get(id) ?? 0) + 1);
  }
  return map;
}

export function CategoriesPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const { base, scoped, sellerId } = useSellerDeskScope();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["admin-categories", base, scoped, sellerId],
    queryFn: async () => {
      const [{ data, error }, products] = await Promise.all([
        supabase.from("categories").select("*").order("sort_order").order("name"),
        scoped && sellerId
          ? supabase.from("products").select("category_id").eq("seller_id", sellerId)
          : Promise.resolve({ data: null as { category_id: string | null }[] | null, error: null }),
      ]);
      if (error) throw error;
      if (products.error) throw products.error;
      const counts = productCountBy((products.data ?? []).map((p) => p.category_id));
      let rows = (data ?? []) as Category[];
      if (scoped && sellerId) {
        rows = rows.filter((c) => c.seller_id === sellerId || counts.has(c.id));
      }
      return rows.map((c) => ({ ...c, productCount: counts.get(c.id) ?? 0 }));
    },
  });

  const canEditRow = (row: Category) => !scoped || row.seller_id === sellerId;

  function resetForm() {
    setName("");
    setDescription("");
    setImageUrl("");
    setEditingId(null);
  }

  function startEdit(row: Category) {
    if (!canEditRow(row)) {
      toast.error(t("sellerCatalogReadOnly"));
      return;
    }
    setEditingId(row.id);
    setName(row.name);
    setDescription(row.description ?? "");
    setImageUrl(row.image_url ?? "");
  }

  async function pickImage(file: File) {
    setUploading(true);
    try {
      const url = await uploadCategoryImage(file);
      setImageUrl(url);
      toast.success("Image uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (!name.trim()) return toast.error("Category name is required");
    if (scoped && !sellerId) return toast.error(t("sellerShopRequired"));
    setBusy(true);
    const payload = {
      name: name.trim(),
      slug: slugify(name.trim()),
      description: description.trim() || null,
      image_url: imageUrl.trim() || null,
      show_on_home: scoped ? false : true,
      status: "active" as const,
      ...(scoped ? { seller_id: sellerId } : {}),
    };

    const { error } = editingId
      ? await supabase.from("categories").update(payload).eq("id", editingId)
      : await supabase.from("categories").insert({ ...payload, sort_order: (query.data?.length ?? 0) * 10 + 10 });

    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success(editingId ? "Category updated" : "Category created");
      resetForm();
      qc.invalidateQueries({ queryKey: ["admin-categories"] });
      qc.invalidateQueries({ queryKey: ["catalog-refs"] });
      qc.invalidateQueries({ queryKey: ["home-categories"] });
    }
  }

  async function changeCardImage(row: Category, file: File) {
    if (!canEditRow(row)) return toast.error(t("sellerCatalogReadOnly"));
    setUploading(true);
    try {
      const url = await uploadCategoryImage(file);
      const { error } = await supabase.from("categories").update({ image_url: url }).eq("id", row.id);
      if (error) throw error;
      toast.success("Card image updated");
      qc.invalidateQueries({ queryKey: ["admin-categories"] });
      qc.invalidateQueries({ queryKey: ["home-categories"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function toggleHome(row: Category) {
    if (scoped) return toast.error(t("sellerCatalogReadOnly"));
    const { error } = await supabase.from("categories").update({ show_on_home: !row.show_on_home }).eq("id", row.id);
    if (error) toast.error(error.message);
    else {
      qc.invalidateQueries({ queryKey: ["admin-categories"] });
      qc.invalidateQueries({ queryKey: ["home-categories"] });
    }
  }

  async function toggle(row: Category) {
    if (!canEditRow(row)) return toast.error(t("sellerCatalogReadOnly"));
    const { error } = await supabase
      .from("categories")
      .update({ status: row.status === "active" ? "inactive" : "active" })
      .eq("id", row.id);
    if (error) toast.error(error.message);
    else {
      toast.success(row.status === "active" ? "Category deactivated" : "Category activated");
      qc.invalidateQueries({ queryKey: ["admin-categories"] });
      qc.invalidateQueries({ queryKey: ["catalog-refs"] });
      qc.invalidateQueries({ queryKey: ["home-categories"] });
    }
  }

  async function remove(row: Category) {
    if (!canEditRow(row)) return toast.error(t("sellerCatalogReadOnly"));
    if (!window.confirm(`Remove category “${row.name}”? Products keep their listing but lose this category.`)) return;
    const { error } = await supabase.from("categories").delete().eq("id", row.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Category removed");
      if (editingId === row.id) resetForm();
      qc.invalidateQueries({ queryKey: ["admin-categories"] });
      qc.invalidateQueries({ queryKey: ["catalog-refs"] });
      qc.invalidateQueries({ queryKey: ["home-categories"] });
    }
  }

  if (query.isLoading) return <Spinner />;

  const productsPath = `${base}/products`;

  return (
    <div className="max-w-4xl">
      <h1 className="font-display text-3xl">{scoped ? t("categories") : "Category cards"}</h1>
      <p className="mt-1 text-sm text-ink-700/70">
        {scoped ? t("sellerCategoriesHint") : "Create cards and change the photos shown on the welcome page."}
      </p>

      <div className="mt-6 grid gap-4 surface p-5">
        <h2 className="font-semibold">{editingId ? "Edit category" : scoped ? t("createSellerCategory") : "Create a new category card"}</h2>
        <div className="grid gap-4 md:grid-cols-[180px_1fr]">
          <div>
            <label>Card image</label>
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              className="mt-1 flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border border-dashed border-black/20 bg-white text-sm font-semibold text-ink-950"
            >
              {imageUrl ? (
                <img src={categoryImageUrl(imageUrl) ?? imageUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <>
                  <ImagePlus className="h-8 w-8 text-[#ff2d95]" />
                  Add photo
                </>
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void pickImage(file);
              }}
            />
            {imageUrl ? (
              <button type="button" className="mt-2 text-xs font-bold text-red-600" onClick={() => setImageUrl("")}>
                Clear image
              </button>
            ) : null}
          </div>
          <div className="space-y-3">
            <div>
              <label>Name</label>
              <input placeholder="e.g. Laptop / MacBook" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label>Short description</label>
              <textarea
                rows={3}
                placeholder="Shown on the welcome page card"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            {!scoped ? (
              <div>
                <label>Or paste image URL</label>
                <input placeholder="/categories/macbook.jpg or https://…" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button onClick={save} disabled={busy || uploading} variant="gold">
                {editingId ? "Save" : scoped ? t("addCategory") : "Create card"}
              </Button>
              {editingId ? (
                <Button variant="secondary" onClick={resetForm}>
                  Cancel edit
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {!query.data?.length ? (
        <div className="mt-6">
          <EmptyState title="No categories" hint={scoped ? t("sellerCategoriesEmpty") : "Create the first welcome-page card above."} />
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {(query.data ?? []).map((c) => (
            <article key={c.id} className="overflow-hidden surface">
              <div className="relative aspect-[16/10] bg-black/5">
                {c.image_url ? (
                  <img src={categoryImageUrl(c.image_url) ?? c.image_url} alt={c.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full place-items-center text-sm text-ink-700/60">No image</div>
                )}
                {canEditRow(c) ? (
                  <label className="absolute bottom-3 right-3 cursor-pointer rounded-xl bg-white px-3 py-2 text-xs font-bold text-ink-950 shadow">
                    <span className="inline-flex items-center gap-1">
                      <ImagePlus className="h-3.5 w-3.5 text-[#ff2d95]" /> Change photo
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploading}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = "";
                        if (file) void changeCardImage(c, file);
                      }}
                    />
                  </label>
                ) : null}
              </div>
              <div className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-ink-950">{c.name}</h3>
                    <p className="text-xs text-ink-700/60">/{c.slug}</p>
                    {scoped ? (
                      <p className="mt-1 text-sm text-ink-700/80">
                        {c.productCount} {t("sellerProductsInCategory")}
                      </p>
                    ) : null}
                    {c.description ? <p className="mt-1 text-sm text-ink-700/80">{c.description}</p> : null}
                  </div>
                  <StatusPill value={c.status} />
                </div>
                <div className="flex flex-wrap gap-2">
                  {scoped ? (
                    <Link to={productsPath}>
                      <Button size="sm" variant="secondary">
                        {t("myProducts")}
                      </Button>
                    </Link>
                  ) : null}
                  {canEditRow(c) ? (
                    <>
                      <Button size="sm" variant="secondary" onClick={() => startEdit(c)}>
                        Edit
                      </Button>
                      {!scoped ? (
                        <Button size="sm" variant="secondary" onClick={() => toggleHome(c)}>
                          {c.show_on_home ? "Hide on home" : "Show on home"}
                        </Button>
                      ) : null}
                      <Button size="sm" variant="secondary" onClick={() => toggle(c)}>
                        {c.status === "active" ? "Deactivate" : "Activate"}
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => remove(c)}>
                        <Trash2 className="h-3.5 w-3.5" /> Remove
                      </Button>
                    </>
                  ) : (
                    <p className="text-xs text-ink-700/55">{t("storeCategoryHint")}</p>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export function BrandsPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const { base, scoped, sellerId } = useSellerDeskScope();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const query = useQuery({
    queryKey: ["admin-brands", base, scoped, sellerId],
    queryFn: async () => {
      const [{ data, error }, products] = await Promise.all([
        supabase.from("brands").select("*").order("name"),
        scoped && sellerId
          ? supabase.from("products").select("brand_id").eq("seller_id", sellerId)
          : Promise.resolve({ data: null as { brand_id: string | null }[] | null, error: null }),
      ]);
      if (error) throw error;
      if (products.error) throw products.error;
      const counts = productCountBy((products.data ?? []).map((p) => p.brand_id));
      let rows = (data ?? []) as Brand[];
      if (scoped && sellerId) {
        rows = rows.filter((b) => b.seller_id === sellerId || counts.has(b.id));
      }
      return rows.map((b) => ({ ...b, productCount: counts.get(b.id) ?? 0 }));
    },
  });

  const canEditRow = (row: Brand) => !scoped || row.seller_id === sellerId;

  async function add() {
    if (!name.trim()) return;
    setBusy(true);
    const { error } = scoped
      ? await supabase.rpc("seller_create_brand", { p_name: name.trim() })
      : await supabase.from("brands").insert({ name: name.trim(), slug: slugify(name.trim()), status: "active" });
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Brand added");
      setName("");
      qc.invalidateQueries({ queryKey: ["admin-brands"] });
      qc.invalidateQueries({ queryKey: ["catalog-refs"] });
    }
  }

  async function toggle(row: Brand) {
    if (!canEditRow(row)) return toast.error(t("sellerCatalogReadOnly"));
    const { error } = await supabase
      .from("brands")
      .update({ status: row.status === "active" ? "inactive" : "active" })
      .eq("id", row.id);
    if (error) toast.error(error.message);
    else {
      qc.invalidateQueries({ queryKey: ["admin-brands"] });
      qc.invalidateQueries({ queryKey: ["catalog-refs"] });
    }
  }

  async function remove(row: Brand) {
    if (!canEditRow(row)) return toast.error(t("sellerCatalogReadOnly"));
    if (!window.confirm(`Remove brand “${row.name}”?`)) return;
    const { error } = await supabase.from("brands").delete().eq("id", row.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Brand removed");
      qc.invalidateQueries({ queryKey: ["admin-brands"] });
      qc.invalidateQueries({ queryKey: ["catalog-refs"] });
    }
  }

  if (query.isLoading) return <Spinner />;

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-3xl">{t("brands")}</h1>
      <p className="mt-1 text-sm text-ink-700/70">
        {scoped ? t("sellerBrandsHint") : "Add or remove brands used on products."}
      </p>
      <div className="mt-4 flex gap-2">
        <input placeholder="New brand name" value={name} onChange={(e) => setName(e.target.value)} />
        <Button onClick={add} disabled={!name.trim() || busy} variant="gold">
          Add
        </Button>
      </div>
      <ul className="mt-6 divide-y surface">
        {(query.data ?? []).map((c) => (
          <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
            <div>
              <span>{c.name}</span>
              {scoped ? (
                <p className="text-xs text-ink-700/55">
                  {c.productCount} {t("sellerProductsInCategory")}
                  {c.seller_id === sellerId ? ` · ${t("yourBrand")}` : ""}
                </p>
              ) : null}
            </div>
            <div className="flex items-center gap-3">
              {canEditRow(c) ? (
                <>
                  <button type="button" className="gradient-text font-semibold capitalize" onClick={() => toggle(c)}>
                    <StatusPill value={c.status} />
                  </button>
                  <Button size="sm" variant="danger" onClick={() => remove(c)}>
                    <Trash2 className="h-3.5 w-3.5" /> Remove
                  </Button>
                </>
              ) : (
                <StatusPill value={c.status} />
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
