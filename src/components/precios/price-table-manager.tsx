"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PlusIcon, Trash2Icon, UploadIcon } from "lucide-react";

import {
  submitPriceItem,
  submitUpdatePriceItem,
  submitDeletePriceItem,
  submitPriceImport,
  createQuickEntryCategory,
  createQuickEntrySubcategory,
} from "@/features/finance/actions";
import {
  CreatableCombobox,
  type CreatableOption,
} from "@/features/finance/components/creatable-combobox";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SearchBar } from "@/components/shared/data-table-controls";
import { formatCurrency } from "@/lib/format";

type Category = { id: string; name: string };
type Subcategory = { id: string; categoryId: string; name: string };
type PriceRow = {
  id: string;
  categoryId: string | null;
  subcategoryId: string | null;
  name: string;
  unit: string | null;
  unitPrice: number;
};

export function PriceTableManager({
  items,
  categories,
  subcategories,
}: {
  items: PriceRow[];
  categories: Category[];
  subcategories: Subcategory[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [cats, setCats] = useState(categories);
  const [subcats, setSubcats] = useState(subcategories);
  const [query, setQuery] = useState("");

  const catName = useMemo(() => new Map(cats.map((c) => [c.id, c.name])), [cats]);
  const subName = useMemo(() => new Map(subcats.map((s) => [s.id, s.name])), [subcats]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => i.name.toLowerCase().includes(q));
  }, [items, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, PriceRow[]>();
    for (const i of filtered) {
      const k = i.categoryId ?? "__none";
      const list = map.get(k) ?? [];
      list.push(i);
      map.set(k, list);
    }
    const order = [...cats.map((c) => c.id), "__none"];
    return order
      .filter((id) => map.has(id))
      .map((id) => ({
        categoryId: id === "__none" ? null : id,
        name: id === "__none" ? "Sin categoría" : catName.get(id) ?? "Sin categoría",
        rows: map.get(id)!.sort((a, b) => a.name.localeCompare(b.name)),
      }));
  }, [filtered, cats, catName]);

  async function createCategoryOption(name: string): Promise<CreatableOption | null> {
    const r = await createQuickEntryCategory(name);
    if (!r.ok || !r.option) {
      toast.error(r.message);
      return null;
    }
    const opt = r.option;
    setCats((prev) => (prev.some((c) => c.id === opt.value) ? prev : [...prev, { id: opt.value, name: opt.label }]));
    return opt;
  }

  async function createSubcategoryOption(categoryId: string, name: string): Promise<CreatableOption | null> {
    if (!categoryId) {
      toast.error("Selecciona una categoría primero.");
      return null;
    }
    const r = await createQuickEntrySubcategory(categoryId, name);
    if (!r.ok || !r.option) {
      toast.error(r.message);
      return null;
    }
    const opt = r.option;
    setSubcats((prev) => (prev.some((s) => s.id === opt.value) ? prev : [...prev, { id: opt.value, categoryId, name: opt.label }]));
    return opt;
  }

  function saveCell(row: PriceRow, patch: Partial<PriceRow>) {
    const next = { ...row, ...patch };
    startTransition(async () => {
      const result = await submitUpdatePriceItem({
        id: next.id,
        categoryId: next.categoryId ?? "",
        subcategoryId: next.subcategoryId,
        name: next.name.trim() || row.name,
        unit: next.unit,
        unitPrice: next.unitPrice,
      });
      if (!result.ok) toast.error(result.message);
    });
  }

  async function deleteRow(id: string) {
    const result = await submitDeletePriceItem(id);
    if (result.ok) {
      toast.success(result.message);
      router.refresh();
    } else {
      toast.error(result.message);
    }
    return result;
  }

  return (
    <div className="flex flex-col gap-6">
      <AddPriceForm
        categories={cats}
        subcategories={subcats}
        disabled={isPending}
        onCreateCategory={createCategoryOption}
        onCreateSubcategory={createSubcategoryOption}
        onAdded={() => router.refresh()}
      />

      <ImportPrices onDone={() => router.refresh()} />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Precios ({items.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <SearchBar query={query} onQueryChange={setQuery} placeholder="Buscar por nombre…" />

          {grouped.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No hay precios. Agrégalos arriba o importa tu Excel de presupuesto.
            </p>
          ) : (
            grouped.map((group) => (
              <div key={group.categoryId ?? "none"} className="overflow-hidden rounded-xl border border-border/70">
                <div className="bg-muted/40 px-4 py-2 text-sm font-semibold uppercase tracking-wide">{group.name}</div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/60 text-left text-xs text-muted-foreground">
                      <th className="px-3 py-2 font-medium">Nombre</th>
                      <th className="w-40 px-2 py-2 font-medium">Subcategoría</th>
                      <th className="w-20 px-2 py-2 font-medium">Unidad</th>
                      <th className="w-40 px-2 py-2 text-right font-medium">Precio por unidad</th>
                      <th className="w-10 px-2 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {group.rows.map((row) => (
                      <tr key={row.id} className="border-b border-border/40 last:border-0 hover:bg-muted/20">
                        <td className="px-2 py-1">
                          <CellText value={row.name} disabled={isPending} onCommit={(v) => saveCell(row, { name: v })} />
                        </td>
                        <td className="px-2 py-1 text-[13px] text-muted-foreground">
                          {row.subcategoryId ? subName.get(row.subcategoryId) ?? "—" : "—"}
                        </td>
                        <td className="px-2 py-1">
                          <CellText value={row.unit ?? ""} disabled={isPending} onCommit={(v) => saveCell(row, { unit: v || null })} />
                        </td>
                        <td className="px-2 py-1">
                          <CellPrice value={row.unitPrice} disabled={isPending} onCommit={(v) => saveCell(row, { unitPrice: v })} />
                        </td>
                        <td className="px-2 py-1 text-right">
                          <ConfirmDialog
                            title="Eliminar precio"
                            description={`Se eliminará "${row.name}" de la tabla de precios.`}
                            trigger={
                              <Button variant="ghost" size="icon-sm" disabled={isPending} title="Eliminar">
                                <Trash2Icon className="size-3.5" />
                              </Button>
                            }
                            onConfirm={() => deleteRow(row.id)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CellText({ value, onCommit, disabled }: { value: string; onCommit: (v: string) => void; disabled?: boolean }) {
  const [v, setV] = useState(value);
  return (
    <input
      value={v}
      disabled={disabled}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => v !== value && onCommit(v)}
      className="w-full rounded-md border border-transparent bg-transparent px-2 py-1.5 outline-none transition-colors hover:border-border focus:border-primary focus:bg-background"
    />
  );
}

function CellPrice({ value, onCommit, disabled }: { value: number; onCommit: (v: number) => void; disabled?: boolean }) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const display = focused ? draft : formatCurrency(value);
  return (
    <input
      type="text"
      inputMode="decimal"
      value={display}
      disabled={disabled}
      onFocus={() => {
        setDraft(String(value));
        setFocused(true);
      }}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        setFocused(false);
        const n = Number(draft);
        if (!Number.isNaN(n) && n !== value) onCommit(n);
      }}
      className="w-full rounded-md border border-transparent bg-transparent px-2 py-1.5 text-right font-mono tabular-nums outline-none transition-colors hover:border-border focus:border-primary focus:bg-background"
    />
  );
}

function ImportPrices({ onDone }: { onDone: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.set("file", file);
    startTransition(async () => {
      const result = await submitPriceImport(fd);
      if (result.ok) {
        toast.success(result.message);
        onDone();
      } else {
        toast.error(result.message);
      }
      if (fileRef.current) fileRef.current.value = "";
    });
  }

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div>
          <p className="text-sm font-medium">Importar precios desde Excel</p>
          <p className="text-[13px] text-muted-foreground">
            Toma el precio por unidad de cada partida (ignora la cantidad).
          </p>
        </div>
        <input ref={fileRef} type="file" accept=".xlsx,.xls" hidden onChange={onFile} />
        <Button variant="outline" disabled={pending} onClick={() => fileRef.current?.click()} className="gap-2 rounded-lg">
          <UploadIcon className="size-4" />
          {pending ? "Importando…" : "Elegir archivo"}
        </Button>
      </CardContent>
    </Card>
  );
}

function AddPriceForm({
  categories,
  subcategories,
  disabled,
  onCreateCategory,
  onCreateSubcategory,
  onAdded,
}: {
  categories: Category[];
  subcategories: Subcategory[];
  disabled: boolean;
  onCreateCategory: (name: string) => Promise<CreatableOption | null>;
  onCreateSubcategory: (categoryId: string, name: string) => Promise<CreatableOption | null>;
  onAdded: () => void;
}) {
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("");
  const [price, setPrice] = useState("");
  const [pending, startTransition] = useTransition();

  const subcatOptions = subcategories.filter((s) => s.categoryId === categoryId);

  function add() {
    if (!categoryId) {
      toast.error("Selecciona una categoría.");
      return;
    }
    if (name.trim().length < 2) {
      toast.error("Escribe un nombre.");
      return;
    }
    startTransition(async () => {
      const result = await submitPriceItem({
        categoryId,
        subcategoryId: subcategoryId || null,
        name: name.trim(),
        unit: unit.trim() || null,
        unitPrice: Number(price) || 0,
      });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      setName("");
      setPrice("");
      onAdded();
    });
  }

  return (
    <Card>
      <CardContent className="pt-1">
        <p className="mb-3 text-sm font-medium">Agregar precio</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Categoría</label>
            <CreatableCombobox
              value={categoryId}
              options={categories.map((c) => ({ value: c.id, label: c.name }))}
              placeholder="Elige una categoría"
              searchPlaceholder="Buscar o crear categoría"
              createLabel="Crear categoría"
              onChange={(v) => {
                setCategoryId(v);
                setSubcategoryId("");
              }}
              onCreate={onCreateCategory}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-copper">Subcategoría</label>
            <CreatableCombobox
              value={subcategoryId}
              options={subcatOptions.map((s) => ({ value: s.id, label: s.name }))}
              placeholder="Subcategoría (opcional)"
              searchPlaceholder="Buscar o crear subcategoría"
              createLabel="Crear subcategoría"
              clearLabel="Sin subcategoría"
              allowClear
              disabled={disabled || !categoryId}
              onChange={setSubcategoryId}
              onCreate={categoryId ? (q) => onCreateSubcategory(categoryId, q) : undefined}
            />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <Input placeholder="Nombre (ej. Columnas C1)" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} className="min-w-[200px] flex-1" />
          <Input placeholder="Unidad" value={unit} onChange={(e) => setUnit(e.target.value)} className="w-24" title="Unidad" />
          <Input placeholder="Precio" value={price} onChange={(e) => setPrice(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} className="w-32 text-right" inputMode="decimal" />
          <Button onClick={add} disabled={disabled || pending} className="gap-1 rounded-lg">
            <PlusIcon className="size-4" />
            Agregar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
