"use client";

import { Fragment, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronDownIcon, PlusIcon, Trash2Icon } from "lucide-react";

import {
  submitBudgetGridLine,
  submitUpdateBudgetLine,
  submitDeleteBudgetLine,
  createQuickEntryCategory,
  createQuickEntrySubcategory,
} from "@/features/finance/actions";
import {
  CreatableCombobox,
  type CreatableOption,
} from "@/features/finance/components/creatable-combobox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

export type BudgetGridLine = {
  id: string;
  categoryId: string | null;
  subcategoryId: string | null;
  description: string;
  quantity: number | null;
  unit: string | null;
  unitPrice: number | null;
  totalBudgeted: number;
  isManualTotal: boolean;
  paid: number;
};

type Category = { id: string; name: string };
type Subcategory = { id: string; categoryId: string; name: string };
type RowState = BudgetGridLine;

const SIN_CATEGORIA = "__none__";
const SIN_SUBCATEGORIA = "__nonesub__";

export function BudgetGrid({
  projectId,
  categories,
  subcategories,
  lines,
}: {
  projectId: string;
  categories: Category[];
  subcategories: Subcategory[];
  lines: BudgetGridLine[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [rows, setRows] = useState<RowState[]>(lines);
  // Listas locales para reflejar al instante categorías/subcategorías creadas.
  const [cats, setCats] = useState<Category[]>(categories);
  const [subcats, setSubcats] = useState<Subcategory[]>(subcategories);

  const categoryName = useMemo(() => new Map(cats.map((c) => [c.id, c.name])), [cats]);

  const grouped = useMemo(() => {
    const map = new Map<string, RowState[]>();
    for (const row of rows) {
      const key = row.categoryId ?? SIN_CATEGORIA;
      const list = map.get(key) ?? [];
      list.push(row);
      map.set(key, list);
    }
    const order = [...cats.map((c) => c.id), SIN_CATEGORIA];
    return order
      .filter((id) => map.has(id))
      .map((id) => ({
        categoryId: id === SIN_CATEGORIA ? null : id,
        name: id === SIN_CATEGORIA ? "Sin categoría" : categoryName.get(id) ?? "Sin categoría",
        rows: map.get(id)!,
      }));
  }, [rows, cats, categoryName]);

  const grandBudget = rows.reduce((s, r) => s + r.totalBudgeted, 0);
  const grandPaid = rows.reduce((s, r) => s + r.paid, 0);

  // --- crear categorías/subcategorías -------------------------------------
  async function createCategoryOption(name: string): Promise<CreatableOption | null> {
    const r = await createQuickEntryCategory(name);
    if (!r.ok || !r.option) {
      toast.error(r.message);
      return null;
    }
    const opt = r.option;
    setCats((prev) => (prev.some((c) => c.id === opt.value) ? prev : [...prev, { id: opt.value, name: opt.label }]));
    toast.success(r.message);
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
    setSubcats((prev) =>
      prev.some((s) => s.id === opt.value) ? prev : [...prev, { id: opt.value, categoryId, name: opt.label }],
    );
    toast.success(r.message);
    return opt;
  }

  // --- edición inline -----------------------------------------------------
  const savedSnapshot = useRef(new Map<string, string>());
  function snapshotKey(r: RowState) {
    return JSON.stringify([r.description, r.quantity, r.unit, r.unitPrice, r.totalBudgeted, r.isManualTotal]);
  }

  function patchRow(id: string, patch: Partial<RowState>) {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const next = { ...r, ...patch };
        if (("quantity" in patch || "unitPrice" in patch) && !("totalBudgeted" in patch)) {
          const q = next.quantity ?? 0;
          const p = next.unitPrice ?? 0;
          next.totalBudgeted = Math.round(q * p * 100) / 100;
          next.isManualTotal = false;
        }
        if ("totalBudgeted" in patch) next.isManualTotal = true;
        return next;
      }),
    );
  }

  const rowsRef = useRef(rows);
  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  function persistRow(row: RowState) {
    return submitUpdateBudgetLine({
      id: row.id,
      categoryId: row.categoryId,
      subcategoryId: row.subcategoryId,
      description: row.description.trim() || "Sin descripción",
      quantity: row.quantity,
      unit: row.unit,
      unitPrice: row.unitPrice,
      totalBudgeted: row.totalBudgeted,
      isManualTotal: row.isManualTotal,
    });
  }

  function saveRow(id: string) {
    const row = rowsRef.current.find((r) => r.id === id);
    if (!row) return;
    const key = snapshotKey(row);
    if (savedSnapshot.current.get(id) === key) return;
    savedSnapshot.current.set(id, key);
    startTransition(async () => {
      const result = await persistRow(row);
      if (!result.ok) toast.error(result.message);
    });
  }

  // Mover a otra subcategoría (regrupa al instante con el estado local).
  function changeSubcategory(id: string, value: string | null) {
    let updated: RowState | undefined;
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        updated = { ...r, subcategoryId: value };
        return updated;
      }),
    );
    startTransition(async () => {
      if (!updated) return;
      const result = await persistRow(updated);
      if (!result.ok) toast.error(result.message);
    });
  }

  function deleteRow(id: string) {
    startTransition(async () => {
      const result = await submitDeleteBudgetLine(id);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Partida eliminada.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <QuickAdd
        projectId={projectId}
        categories={cats}
        subcategories={subcats}
        disabled={isPending}
        onCreateCategory={createCategoryOption}
        onCreateSubcategory={createSubcategoryOption}
        onAdded={() => router.refresh()}
      />

      {grouped.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/20 py-10 text-center text-sm text-muted-foreground">
          Aún no hay partidas. Agrega la primera con el formulario de arriba.
        </div>
      ) : (
        grouped.map((group) => (
          <CategorySection
            key={group.categoryId ?? SIN_CATEGORIA}
            projectId={projectId}
            categoryId={group.categoryId}
            name={group.name}
            rows={group.rows}
            subcatOptions={subcats.filter((s) => s.categoryId === group.categoryId)}
            disabled={isPending}
            onPatch={patchRow}
            onSave={saveRow}
            onDelete={deleteRow}
            onChangeSubcategory={changeSubcategory}
            onCreateSubcategory={createSubcategoryOption}
            onAdded={() => router.refresh()}
          />
        ))
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-copper/30 bg-copper/5 px-5 py-4">
        <span className="font-heading text-lg font-semibold text-copper">Total general</span>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
          <span className="text-muted-foreground">
            Presupuestado <span className="font-mono font-semibold text-foreground">{formatCurrency(grandBudget)}</span>
          </span>
          <span className="text-muted-foreground">
            Gastado <span className="font-mono font-semibold text-foreground">{formatCurrency(grandPaid)}</span>
          </span>
          <span className="text-muted-foreground">
            Restante{" "}
            <span className={cn("font-mono font-semibold", grandBudget - grandPaid < 0 ? "text-[var(--negative)]" : "text-foreground")}>
              {formatCurrency(grandBudget - grandPaid)}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}

function CategorySection({
  projectId,
  categoryId,
  name,
  rows,
  subcatOptions,
  disabled,
  onPatch,
  onSave,
  onDelete,
  onChangeSubcategory,
  onCreateSubcategory,
  onAdded,
}: {
  projectId: string;
  categoryId: string | null;
  name: string;
  rows: RowState[];
  subcatOptions: Subcategory[];
  disabled: boolean;
  onPatch: (id: string, patch: Partial<RowState>) => void;
  onSave: (id: string) => void;
  onDelete: (id: string) => void;
  onChangeSubcategory: (id: string, value: string | null) => void;
  onCreateSubcategory: (categoryId: string, name: string) => Promise<CreatableOption | null>;
  onAdded: () => void;
}) {
  const [open, setOpen] = useState(true);
  const budget = rows.reduce((s, r) => s + r.totalBudgeted, 0);
  const paid = rows.reduce((s, r) => s + r.paid, 0);
  const remaining = budget - paid;

  // Sub-grupos por subcategoría.
  const subgroups = useMemo(() => {
    const map = new Map<string, RowState[]>();
    for (const r of rows) {
      const k = r.subcategoryId ?? SIN_SUBCATEGORIA;
      const list = map.get(k) ?? [];
      list.push(r);
      map.set(k, list);
    }
    const order = [...subcatOptions.map((s) => s.id), SIN_SUBCATEGORIA];
    return order
      .filter((id) => map.has(id))
      .map((id) => ({
        subId: id === SIN_SUBCATEGORIA ? null : id,
        name: id === SIN_SUBCATEGORIA ? "Sin subcategoría" : subcatOptions.find((s) => s.id === id)?.name ?? "",
        rows: map.get(id)!,
      }));
  }, [rows, subcatOptions]);

  const showSubHeaders = subgroups.length > 1 || (subgroups.length === 1 && subgroups[0].subId !== null);
  const moveOptions = [
    { value: "", label: "Sin subcategoría" },
    ...subcatOptions.map((s) => ({ value: s.id, label: s.name })),
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[var(--shadow-card)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 bg-muted/40 px-4 py-3 text-left hover:bg-muted/60"
      >
        <span className="flex items-center gap-2 font-semibold uppercase tracking-wide">
          <ChevronDownIcon className={cn("size-4 transition-transform", !open && "-rotate-90")} />
          {name}
          <span className="rounded-full bg-background px-2 py-0.5 text-[11px] font-normal text-muted-foreground">{rows.length}</span>
        </span>
        <span className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
          <span>Presup. <span className="font-mono text-foreground">{formatCurrency(budget)}</span></span>
          <span>Gastado <span className="font-mono text-foreground">{formatCurrency(paid)}</span></span>
          <span>Restante <span className={cn("font-mono", remaining < 0 ? "text-[var(--negative)]" : "text-foreground")}>{formatCurrency(remaining)}</span></span>
        </span>
      </button>

      {open && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 text-left text-xs text-muted-foreground">
                <th className="px-3 py-2 font-medium">Descripción</th>
                <th className="w-20 px-2 py-2 text-right font-medium">Cant.</th>
                <th className="w-20 px-2 py-2 font-medium">Unidad</th>
                <th className="w-32 px-2 py-2 text-right font-medium">P. Unitario</th>
                <th className="w-32 px-2 py-2 text-right font-medium">Total</th>
                <th className="w-28 px-2 py-2 text-right font-medium">Gastado</th>
                <th className="w-44 px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {subgroups.map((g) => {
                const subBudget = g.rows.reduce((s, r) => s + r.totalBudgeted, 0);
                const subPaid = g.rows.reduce((s, r) => s + r.paid, 0);
                return (
                  <Fragment key={g.subId ?? SIN_SUBCATEGORIA}>
                    {showSubHeaders && (
                      <tr className="bg-muted/20 text-[13px]">
                        <td colSpan={4} className="px-4 py-1.5 font-medium text-copper">
                          {g.name}
                        </td>
                        <td className="px-2 py-1.5 text-right font-mono tabular-nums font-medium">{formatCurrency(subBudget)}</td>
                        <td className="px-3 py-1.5 text-right font-mono tabular-nums text-muted-foreground">
                          {subPaid > 0 ? formatCurrency(subPaid) : "—"}
                        </td>
                        <td />
                      </tr>
                    )}
                    {g.rows.map((row) => (
                      <tr key={row.id} className="border-b border-border/40 hover:bg-muted/20">
                        <td className="px-2 py-1">
                          <CellInput value={row.description} onChange={(v) => onPatch(row.id, { description: v })} onBlur={() => onSave(row.id)} disabled={disabled} />
                        </td>
                        <td className="px-1 py-1">
                          <CellInput type="number" align="right" value={row.quantity ?? ""} onChange={(v) => onPatch(row.id, { quantity: v === "" ? null : Number(v) })} onBlur={() => onSave(row.id)} disabled={disabled} />
                        </td>
                        <td className="px-1 py-1">
                          <CellInput value={row.unit ?? ""} onChange={(v) => onPatch(row.id, { unit: v })} onBlur={() => onSave(row.id)} disabled={disabled} />
                        </td>
                        <td className="px-1 py-1">
                          <CellInput type="number" align="right" value={row.unitPrice ?? ""} onChange={(v) => onPatch(row.id, { unitPrice: v === "" ? null : Number(v) })} onBlur={() => onSave(row.id)} disabled={disabled} />
                        </td>
                        <td className="px-1 py-1">
                          <CellInput type="number" align="right" value={row.totalBudgeted} onChange={(v) => onPatch(row.id, { totalBudgeted: v === "" ? 0 : Number(v) })} onBlur={() => onSave(row.id)} disabled={disabled} strong />
                        </td>
                        <td className="px-3 py-1 text-right font-mono tabular-nums text-muted-foreground">
                          {row.paid > 0 ? formatCurrency(row.paid) : "—"}
                        </td>
                        <td className="px-2 py-1">
                          <div className="flex items-center justify-end gap-1">
                            {subcatOptions.length > 0 && (
                              <select
                                value={row.subcategoryId ?? ""}
                                disabled={disabled}
                                onChange={(e) => onChangeSubcategory(row.id, e.target.value || null)}
                                title="Mover a subcategoría"
                                className="h-7 max-w-[120px] rounded-md border border-input bg-background px-1.5 text-[12px] text-muted-foreground outline-none focus:border-primary"
                              >
                                {moveOptions.map((o) => (
                                  <option key={o.value || "none"} value={o.value}>
                                    {o.label}
                                  </option>
                                ))}
                              </select>
                            )}
                            <Button variant="ghost" size="icon-sm" disabled={disabled} onClick={() => onDelete(row.id)} title="Eliminar partida">
                              <Trash2Icon className="size-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
          <InlineAddRow
            projectId={projectId}
            categoryId={categoryId}
            subcatOptions={subcatOptions}
            disabled={disabled}
            onCreateSubcategory={onCreateSubcategory}
            onAdded={onAdded}
          />
        </div>
      )}
    </div>
  );
}

function CellInput({
  value,
  onChange,
  onBlur,
  type = "text",
  align = "left",
  disabled,
  strong,
}: {
  value: string | number;
  onChange: (v: string) => void;
  onBlur: () => void;
  type?: "text" | "number";
  align?: "left" | "right";
  disabled?: boolean;
  strong?: boolean;
}) {
  return (
    <input
      type={type}
      inputMode={type === "number" ? "decimal" : undefined}
      step={type === "number" ? "0.01" : undefined}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      className={cn(
        "w-full rounded-md border border-transparent bg-transparent px-2 py-1.5 outline-none transition-colors hover:border-border focus:border-primary focus:bg-background",
        align === "right" && "text-right",
        type === "number" && "font-mono tabular-nums",
        strong && "font-medium",
      )}
    />
  );
}

function SubcatCombobox({
  categoryId,
  subcatOptions,
  value,
  onChange,
  onCreateSubcategory,
  disabled,
}: {
  categoryId: string | null;
  subcatOptions: Subcategory[];
  value: string;
  onChange: (v: string) => void;
  onCreateSubcategory: (categoryId: string, name: string) => Promise<CreatableOption | null>;
  disabled?: boolean;
}) {
  return (
    <CreatableCombobox
      value={value}
      options={subcatOptions.map((s) => ({ value: s.id, label: s.name }))}
      placeholder="Subcategoría (opcional)"
      searchPlaceholder="Buscar o crear subcategoría"
      createLabel="Crear subcategoría"
      clearLabel="Sin subcategoría"
      allowClear
      disabled={disabled || !categoryId}
      onChange={onChange}
      onCreate={categoryId ? (q) => onCreateSubcategory(categoryId, q) : undefined}
    />
  );
}

function InlineAddRow({
  projectId,
  categoryId,
  subcatOptions,
  disabled,
  onCreateSubcategory,
  onAdded,
}: {
  projectId: string;
  categoryId: string | null;
  subcatOptions: Subcategory[];
  disabled: boolean;
  onCreateSubcategory: (categoryId: string, name: string) => Promise<CreatableOption | null>;
  onAdded: () => void;
}) {
  const [desc, setDesc] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [qty, setQty] = useState("1");
  const [unit, setUnit] = useState("ud");
  const [price, setPrice] = useState("");
  const [pending, startTransition] = useTransition();

  function add() {
    if (!categoryId) {
      toast.error("Esta partida no tiene categoría. Usa el formulario de arriba.");
      return;
    }
    if (desc.trim().length < 2) {
      toast.error("Escribe una descripción.");
      return;
    }
    startTransition(async () => {
      const result = await submitBudgetGridLine({
        projectId,
        categoryId,
        subcategoryId: subcategoryId || null,
        description: desc.trim(),
        quantity: Number(qty) || 1,
        unit: unit.trim() || "ud",
        unitPrice: Number(price) || 0,
      });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      setDesc("");
      setSubcategoryId("");
      setPrice("");
      setQty("1");
      setUnit("ud");
      onAdded();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-dashed border-border/60 bg-muted/10 px-3 py-2">
      <Input
        placeholder="Nueva partida…"
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && add()}
        className="h-9 min-w-[160px] flex-1"
      />
      {subcatOptions.length > 0 && (
        <div className="w-48">
          <SubcatCombobox
            categoryId={categoryId}
            subcatOptions={subcatOptions}
            value={subcategoryId}
            onChange={setSubcategoryId}
            onCreateSubcategory={onCreateSubcategory}
            disabled={disabled}
          />
        </div>
      )}
      <Input value={qty} onChange={(e) => setQty(e.target.value)} className="h-9 w-16 text-right" inputMode="decimal" />
      <Input value={unit} onChange={(e) => setUnit(e.target.value)} className="h-9 w-20" />
      <Input
        placeholder="Precio"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && add()}
        className="h-9 w-28 text-right"
        inputMode="decimal"
      />
      <Button size="sm" onClick={add} disabled={disabled || pending} className="gap-1 rounded-lg">
        <PlusIcon className="size-4" />
        Agregar
      </Button>
    </div>
  );
}

function QuickAdd({
  projectId,
  categories,
  subcategories,
  disabled,
  onCreateCategory,
  onCreateSubcategory,
  onAdded,
}: {
  projectId: string;
  categories: Category[];
  subcategories: Subcategory[];
  disabled: boolean;
  onCreateCategory: (name: string) => Promise<CreatableOption | null>;
  onCreateSubcategory: (categoryId: string, name: string) => Promise<CreatableOption | null>;
  onAdded: () => void;
}) {
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [desc, setDesc] = useState("");
  const [qty, setQty] = useState("1");
  const [unit, setUnit] = useState("ud");
  const [price, setPrice] = useState("");
  const [pending, startTransition] = useTransition();

  const subcatOptions = subcategories.filter((s) => s.categoryId === categoryId);

  function add() {
    if (!categoryId) {
      toast.error("Selecciona una categoría.");
      return;
    }
    if (desc.trim().length < 2) {
      toast.error("Escribe una descripción.");
      return;
    }
    startTransition(async () => {
      const result = await submitBudgetGridLine({
        projectId,
        categoryId,
        subcategoryId: subcategoryId || null,
        description: desc.trim(),
        quantity: Number(qty) || 1,
        unit: unit.trim() || "ud",
        unitPrice: Number(price) || 0,
      });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Partida agregada.");
      setDesc("");
      setPrice("");
      onAdded();
    });
  }

  return (
    <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-[var(--shadow-card)]">
      <p className="mb-3 text-sm font-medium">Agregar partida</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
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
          <SubcatCombobox
            categoryId={categoryId}
            subcatOptions={subcatOptions}
            value={subcategoryId}
            onChange={setSubcategoryId}
            onCreateSubcategory={onCreateSubcategory}
            disabled={disabled}
          />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <Input
          placeholder="Descripción de la partida"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          className="min-w-[200px] flex-1"
        />
        <Input value={qty} onChange={(e) => setQty(e.target.value)} className="w-16 text-right" inputMode="decimal" title="Cantidad" />
        <Input value={unit} onChange={(e) => setUnit(e.target.value)} className="w-20" title="Unidad" />
        <Input
          placeholder="Precio"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          className="w-28 text-right"
          inputMode="decimal"
        />
        <Button onClick={add} disabled={disabled || pending} className="gap-1 rounded-lg">
          <PlusIcon className="size-4" />
          Agregar
        </Button>
      </div>
    </div>
  );
}
