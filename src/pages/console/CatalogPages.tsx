import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ImagePlus, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { uploadCategoryImage } from "@/lib/upload";
import { slugify } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Spinner, EmptyState } from "@/components/ui/Spinner";
import { StatusPill } from "@/components/ui/Badge";
import type { Brand, Category } from "@/types";

export function CategoriesPage() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("sort_order").order("name");
      if (error) throw error;
      return data as Category[];
    },
  });

  function resetForm() {
    setName("");
    setDescription("");
    setImageUrl("");
    setEditingId(null);
  }

  function startEdit(row: Category) {
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
    setBusy(true);
    const payload = {
      name: name.trim(),
      slug: slugify(name.trim()),
      description: description.trim() || null,
      image_url: imageUrl.trim() || null,
      show_on_home: true,
      status: "active" as const,
    };

    const { error } = editingId
      ? await supabase.from("categories").update(payload).eq("id", editingId)
      : await supabase.from("categories").insert({ ...payload, sort_order: (query.data?.length ?? 0) * 10 + 10 });

    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success(editingId ? "Category card updated" : "Category card created");
      resetForm();
      qc.invalidateQueries({ queryKey: ["admin-categories"] });
      qc.invalidateQueries({ queryKey: ["catalog-refs"] });
      qc.invalidateQueries({ queryKey: ["home-categories"] });
    }
  }

  async function changeCardImage(row: Category, file: File) {
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
    const { error } = await supabase.from("categories").update({ show_on_home: !row.show_on_home }).eq("id", row.id);
    if (error) toast.error(error.message);
    else {
      qc.invalidateQueries({ queryKey: ["admin-categories"] });
      qc.invalidateQueries({ queryKey: ["home-categories"] });
    }
  }

  async function toggle(row: Category) {
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

  return (
    <div className="max-w-4xl">
      <h1 className="font-display text-3xl">Category cards</h1>
      <p className="mt-1 text-sm text-ink-700/70">
        Only the main administrator can create cards and change the photos shown on the welcome page.
      </p>

      <div className="mt-6 grid gap-4 surface p-5">
        <h2 className="font-semibold">{editingId ? "Edit category card" : "Create a new category card"}</h2>
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
                <img src={imageUrl} alt="" className="h-full w-full object-cover" />
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
            <div>
              <label>Or paste image URL</label>
              <input placeholder="/categories/macbook.jpg or https://…" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={save} disabled={busy || uploading} variant="gold">
                {editingId ? "Save card" : "Create card"}
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
          <EmptyState title="No categories" hint="Create the first welcome-page card above." />
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {(query.data ?? []).map((c) => (
            <article key={c.id} className="overflow-hidden surface">
              <div className="relative aspect-[16/10] bg-black/5">
                {c.image_url ? (
                  <img src={c.image_url} alt={c.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full place-items-center text-sm text-ink-700/60">No image</div>
                )}
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
              </div>
              <div className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-ink-950">{c.name}</h3>
                    <p className="text-xs text-ink-700/60">/{c.slug}</p>
                    {c.description ? <p className="mt-1 text-sm text-ink-700/80">{c.description}</p> : null}
                  </div>
                  <StatusPill value={c.status} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" onClick={() => startEdit(c)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => toggleHome(c)}>
                    {c.show_on_home ? "Hide on home" : "Show on home"}
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => toggle(c)}>
                    {c.status === "active" ? "Deactivate" : "Activate"}
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => remove(c)}>
                    <Trash2 className="h-3.5 w-3.5" /> Remove
                  </Button>
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
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const query = useQuery({
    queryKey: ["admin-brands"],
    queryFn: async () => {
      const { data, error } = await supabase.from("brands").select("*").order("name");
      if (error) throw error;
      return data as Brand[];
    },
  });

  async function add() {
    if (!name.trim()) return;
    setBusy(true);
    const { error } = await supabase.from("brands").insert({ name: name.trim(), slug: slugify(name.trim()), status: "active" });
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
      <h1 className="font-display text-3xl">Brands</h1>
      <p className="mt-1 text-sm text-ink-700/70">Add or remove brands used on products.</p>
      <div className="mt-4 flex gap-2">
        <input placeholder="New brand name" value={name} onChange={(e) => setName(e.target.value)} />
        <Button onClick={add} disabled={!name.trim() || busy} variant="gold">
          Add
        </Button>
      </div>
      <ul className="mt-6 divide-y surface">
        {(query.data ?? []).map((c) => (
          <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
            <span>{c.name}</span>
            <div className="flex items-center gap-3">
              <button type="button" className="gradient-text font-semibold capitalize" onClick={() => toggle(c)}>
                <StatusPill value={c.status} />
              </button>
              <Button size="sm" variant="danger" onClick={() => remove(c)}>
                <Trash2 className="h-3.5 w-3.5" /> Remove
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
