"use client";

import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type DragEvent,
} from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronDownIcon, GripVerticalIcon, PlusIcon, TagIcon, Trash2Icon } from "lucide-react";

import {
  submitBudgetGridLine,
  submitUpdateBudgetLine,
  submitDeleteBudgetLine,
  submitDeleteBudgetLines,
  submitClearBudget,
  submitReorderBudgetLines,
  submitApplyPrices,
  createQuickEntryCategory,
  createQuickEntrySubcategory,
} from "@/features/finance/actions";
import {
  CreatableCombobox,
  type CreatableOption,
} from "@/features/finance/components/creatable-combobox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { TypeToConfirmDialog } from "@/components/shared/type-to-confirm-dialog";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

export type BudgetGridLine = {
  id: string;
  categoryId: string | null;
  subcategoryId: string | null;
  area: string | null;
  description: string;
  quantity: number | null;
  unit: string | null;
  unitPrice: number | null;
  totalBudgeted: number;
  isManualTotal: boolean;
  sortOrder: number;
  paid: number;
};

type Category = { id: string; name: string };
type Subcategory = { id: string; categoryId: string; name: string };
type PriceItem = {
  categoryId: string | null;
  subcategoryId: string | null;
  name: string;
  normalizedName: string;
  unit: string | null;
  unitPrice: number;
};

/** Opciones de artículos de la tabla de precios para una categoría (y subcategoría). */
function priceOptionsFor(
  priceItems: PriceItem[],
  categoryId: string | null,
  subcategoryId: string | null,
): CreatableOption[] {
  const seen = new Set<string>();
  return priceItems
    .filter((p) => p.categoryId === (categoryId ?? null))
    .filter((p) => (subcategoryId ? p.subcategoryId === subcategoryId : true))
    .filter((p) => {
      const k = p.normalizedName;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .map((p) => ({ value: p.name, label: p.name }));
}

/** Busca el artículo por categoría + nombre. */
function lookupPriceItem(
  priceItems: PriceItem[],
  categoryId: string | null,
  name: string,
): PriceItem | null {
  const n = name.trim().toLocaleLowerCase();
  if (!n) return null;
  return priceItems.find((p) => p.categoryId === (categoryId ?? null) && p.normalizedName === n) ?? null;
}
type RowState = BudgetGridLine;

const SIN_CATEGORIA = "__none__";
const SIN_SUBCATEGORIA = "__nonesub__";
const SIN_NIVEL = "__nonivel__";
const SEP = "";

// ---------------------------------------------------------------------------
// Drag & drop: árbol de orden (nivel → categoría → subcategoría → partida)
// ---------------------------------------------------------------------------

type Level = "nivel" | "category" | "subcategory" | "line";

type TreeSub = { key: string; lines: RowState[] };
type TreeCat = { key: string; subs: TreeSub[]; subMap: Map<string, TreeSub> };
type TreeNivel = { key: string; cats: TreeCat[]; catMap: Map<string, TreeCat> };

function nivelKeyOfRow(r: RowState) {
  return r.area && r.area.trim() ? r.area : SIN_NIVEL;
}

/** Construye el árbol agrupando por primera aparición (idéntico al display). */
function buildTree(rows: RowState[]): TreeNivel[] {
  const niveles: TreeNivel[] = [];
  const nivelMap = new Map<string, TreeNivel>();
  for (const r of rows) {
    const nk = nivelKeyOfRow(r);
    let nivel = nivelMap.get(nk);
    if (!nivel) {
      nivel = { key: nk, cats: [], catMap: new Map() };
      nivelMap.set(nk, nivel);
      niveles.push(nivel);
    }
    const ck = r.categoryId ?? SIN_CATEGORIA;
    let cat = nivel.catMap.get(ck);
    if (!cat) {
      cat = { key: ck, subs: [], subMap: new Map() };
      nivel.catMap.set(ck, cat);
      nivel.cats.push(cat);
    }
    const sk = r.subcategoryId ?? SIN_SUBCATEGORIA;
    let sub = cat.subMap.get(sk);
    if (!sub) {
      sub = { key: sk, lines: [] };
      cat.subMap.set(sk, sub);
      cat.subs.push(sub);
    }
    sub.lines.push(r);
  }
  return niveles;
}

function flattenTree(niveles: TreeNivel[]): RowState[] {
  const out: RowState[] = [];
  for (const n of niveles) for (const c of n.cats) for (const s of c.subs) for (const l of s.lines) out.push(l);
  return out;
}

type Dnd = {
  activeKey: string | null;
  activeLevel: Level | null;
  overKey: string | null;
  disabled: boolean;
  canDrop: (level: Level, scope: string, key: string) => boolean;
  start: (level: Level, scope: string, key: string) => void;
  setOver: (key: string | null) => void;
  drop: (level: Level, scope: string, key: string) => void;
  end: () => void;
};

/** ¿Se está arrastrando este ítem ahora mismo? (atenúa el original) */
function isDragging(level: Level, key: string, dnd: Dnd) {
  return dnd.activeLevel === level && dnd.activeKey === key;
}

function dropHandlers(level: Level, scope: string, key: string, dnd: Dnd) {
  return {
    onDragOver: (e: DragEvent) => {
      if (!dnd.canDrop(level, scope, key)) return;
      e.preventDefault();
      if (dnd.overKey !== key) dnd.setOver(key);
    },
    onDragLeave: () => {
      if (dnd.overKey === key) dnd.setOver(null);
    },
    onDrop: (e: DragEvent) => {
      if (!dnd.canDrop(level, scope, key)) return;
      e.preventDefault();
      e.stopPropagation();
      dnd.drop(level, scope, key);
    },
  };
}

function isDropActive(level: Level, scope: string, key: string, dnd: Dnd) {
  return dnd.overKey === key && dnd.canDrop(level, scope, key);
}

function DragHandle({
  level,
  scope,
  dataKey,
  dnd,
  dragImageSelector,
  className,
}: {
  level: Level;
  scope: string;
  dataKey: string;
  dnd: Dnd;
  /** Selector del ancestro a usar como imagen arrastrada (la tarjeta/fila completa). */
  dragImageSelector: string;
  className?: string;
}) {
  if (dnd.disabled) return null;
  return (
    <span
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", dataKey);
        e.stopPropagation();
        // Usar la tarjeta/fila completa como "fantasma" que sigue al cursor.
        const card = e.currentTarget.closest(dragImageSelector);
        if (card instanceof HTMLElement) {
          const rect = card.getBoundingClientRect();
          e.dataTransfer.setDragImage(card, e.clientX - rect.left, e.clientY - rect.top);
        }
        dnd.start(level, scope, dataKey);
      }}
      onDragEnd={() => dnd.end()}
      onClick={(e) => e.stopPropagation()}
      title="Arrastra para reordenar"
      className={cn(
        "flex size-5 shrink-0 cursor-grab items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing",
        className,
      )}
    >
      <GripVerticalIcon className="size-3.5" />
    </span>
  );
}

export function BudgetGrid({
  projectId,
  categories,
  subcategories,
  niveles,
  priceItems,
  lines,
}: {
  projectId: string;
  categories: Category[];
  subcategories: Subcategory[];
  niveles: string[];
  priceItems: PriceItem[];
  lines: BudgetGridLine[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function applyPrices() {
    startTransition(async () => {
      const result = await submitApplyPrices(projectId);
      if (result.ok) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  async function deleteCategoryRows(ids: string[]) {
    const result = await submitDeleteBudgetLines(ids);
    if (result.ok) {
      toast.success(result.message);
      router.refresh();
    } else {
      toast.error(result.message);
    }
    return result;
  }

  async function clearWholeBudget() {
    const result = await submitClearBudget(projectId);
    if (result.ok) {
      toast.success(result.message);
      router.refresh();
    } else {
      toast.error(result.message);
    }
    return result;
  }

  const [rows, setRows] = useState<RowState[]>(lines);
  // Listas locales para reflejar al instante categorías/subcategorías/niveles creados.
  const [cats, setCats] = useState<Category[]>(categories);
  const [subcats, setSubcats] = useState<Subcategory[]>(subcategories);
  const [nivelList, setNivelList] = useState<string[]>(niveles);

  async function createNivelOption(name: string): Promise<CreatableOption | null> {
    const v = name.trim();
    if (!v) return null;
    setNivelList((prev) => (prev.includes(v) ? prev : [...prev, v]));
    return { value: v, label: v };
  }

  const groupedByNivel = useMemo(() => {
    const map = new Map<string, RowState[]>();
    for (const row of rows) {
      const key = row.area && row.area.trim() ? row.area : SIN_NIVEL;
      const list = map.get(key) ?? [];
      list.push(row);
      map.set(key, list);
    }
    const order: string[] = [];
    const seen = new Set<string>();
    for (const row of rows) {
      const k = row.area && row.area.trim() ? row.area : SIN_NIVEL;
      if (!seen.has(k)) {
        seen.add(k);
        order.push(k);
      }
    }
    return order.map((k) => ({
      nivel: k === SIN_NIVEL ? null : k,
      name: k === SIN_NIVEL ? "Sin nivel" : k,
      rows: map.get(k)!,
    }));
  }, [rows]);

  const hasNiveles = groupedByNivel.some((g) => g.nivel !== null);
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
      area: row.area,
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
    const target = rowsRef.current.find((r) => r.id === id);
    if (!target) return;
    const updated = { ...target, subcategoryId: value };
    setRows((prev) => prev.map((r) => (r.id === id ? updated : r)));
    startTransition(async () => {
      const result = await persistRow(updated);
      if (!result.ok) toast.error(result.message);
    });
  }

  async function deleteRow(id: string) {
    const result = await submitDeleteBudgetLine(id);
    if (result.ok) {
      toast.success("Partida eliminada.");
      router.refresh();
    } else {
      toast.error(result.message);
    }
    return result;
  }

  // --- drag & drop --------------------------------------------------------
  const [dragItem, setDragItem] = useState<{ level: Level; scope: string; key: string } | null>(null);
  const [overKey, setOverKey] = useState<string | null>(null);

  function reorder(level: Level, scope: string, fromKey: string, toKey: string) {
    if (fromKey === toKey) return;
    const tree = buildTree(rowsRef.current);
    const parts = scope.length ? scope.split(SEP) : [];

    const moveInArray = <T,>(arr: T[], keyer: (t: T) => string): boolean => {
      const fromIdx = arr.findIndex((t) => keyer(t) === fromKey);
      const toIdx = arr.findIndex((t) => keyer(t) === toKey);
      if (fromIdx < 0 || toIdx < 0) return false;
      const [moved] = arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, moved);
      return true;
    };

    let ok = false;
    if (level === "nivel") {
      ok = moveInArray(tree, (n) => n.key);
    } else {
      const nivel = tree.find((n) => n.key === parts[0]);
      if (!nivel) return;
      if (level === "category") {
        ok = moveInArray(nivel.cats, (c) => c.key);
      } else {
        const cat = nivel.cats.find((c) => c.key === parts[1]);
        if (!cat) return;
        if (level === "subcategory") {
          ok = moveInArray(cat.subs, (s) => s.key);
        } else {
          const sub = cat.subs.find((s) => s.key === parts[2]);
          if (!sub) return;
          ok = moveInArray(sub.lines, (l) => l.id);
        }
      }
    }
    if (!ok) return;

    const newRows = flattenTree(tree);
    setRows(newRows);
    startTransition(async () => {
      const result = await submitReorderBudgetLines(projectId, newRows.map((r) => r.id));
      if (!result.ok) {
        toast.error(result.message);
        router.refresh();
      }
    });
  }

  const dnd: Dnd = {
    activeKey: dragItem?.key ?? null,
    activeLevel: dragItem?.level ?? null,
    overKey,
    disabled: isPending,
    canDrop: (level, scope, key) =>
      !!dragItem && dragItem.level === level && dragItem.scope === scope && dragItem.key !== key,
    start: (level, scope, key) => setDragItem({ level, scope, key }),
    setOver: (key) => setOverKey(key),
    drop: (level, scope, key) => {
      if (dragItem && dragItem.level === level && dragItem.scope === scope && dragItem.key !== key) {
        reorder(level, scope, dragItem.key, key);
      }
      setDragItem(null);
      setOverKey(null);
    },
    end: () => {
      setDragItem(null);
      setOverKey(null);
    },
  };

  return (
    <div className="space-y-4">
      <QuickAdd
        projectId={projectId}
        categories={cats}
        subcategories={subcats}
        niveles={nivelList}
        disabled={isPending}
        priceItems={priceItems}
        onCreateCategory={createCategoryOption}
        onCreateSubcategory={createSubcategoryOption}
        onCreateNivel={createNivelOption}
        onAdded={() => router.refresh()}
      />

      {priceItems.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/60 bg-muted/20 px-4 py-2.5">
          <p className="text-[13px] text-muted-foreground">
            Aplica los precios de la tabla a las partidas que coincidan (categoría, subcategoría y nombre).
          </p>
          <Button variant="outline" size="sm" disabled={isPending} onClick={applyPrices} className="gap-1 rounded-lg">
            <TagIcon className="size-4" />
            Aplicar precios de la tabla
          </Button>
        </div>
      )}

      {rows.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[13px] text-muted-foreground">
            Arrastra <GripVerticalIcon className="inline size-3.5 align-text-bottom" /> para reordenar niveles,
            categorías, subcategorías y partidas.
          </p>
          <TypeToConfirmDialog
            title="Eliminar todo el presupuesto"
            description="Se eliminarán TODAS las partidas del presupuesto de este proyecto. Esta acción no se puede deshacer."
            confirmLabel="Eliminar presupuesto"
            trigger={
              <Button variant="outline" size="sm" className="gap-1 rounded-lg text-destructive hover:text-destructive">
                <Trash2Icon className="size-4" />
                Eliminar presupuesto
              </Button>
            }
            onConfirm={clearWholeBudget}
          />
        </div>
      )}

      {groupedByNivel.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/20 py-10 text-center text-sm text-muted-foreground">
          Aún no hay partidas. Agrega la primera con el formulario de arriba.
        </div>
      ) : (
        groupedByNivel.map((group) => (
          <NivelSection
            key={group.nivel ?? SIN_NIVEL}
            projectId={projectId}
            nivel={group.nivel}
            name={group.name}
            rows={group.rows}
            cats={cats}
            subcats={subcats}
            showHeader={hasNiveles}
            disabled={isPending}
            priceItems={priceItems}
            dnd={dnd}
            onPatch={patchRow}
            onSave={saveRow}
            onDelete={deleteRow}
            onDeleteCategory={deleteCategoryRows}
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

function NivelSection({
  projectId,
  nivel,
  name,
  rows,
  cats,
  subcats,
  showHeader,
  disabled,
  priceItems,
  dnd,
  onPatch,
  onSave,
  onDelete,
  onDeleteCategory,
  onChangeSubcategory,
  onCreateSubcategory,
  onAdded,
}: {
  projectId: string;
  nivel: string | null;
  name: string;
  rows: RowState[];
  cats: Category[];
  subcats: Subcategory[];
  showHeader: boolean;
  disabled: boolean;
  priceItems: PriceItem[];
  dnd: Dnd;
  onPatch: (id: string, patch: Partial<RowState>) => void;
  onSave: (id: string) => void;
  onDelete: (id: string) => Promise<{ ok: boolean; message: string }>;
  onDeleteCategory: (ids: string[]) => Promise<{ ok: boolean; message: string }>;
  onChangeSubcategory: (id: string, value: string | null) => void;
  onCreateSubcategory: (categoryId: string, name: string) => Promise<CreatableOption | null>;
  onAdded: () => void;
}) {
  const [open, setOpen] = useState(true);
  const budget = rows.reduce((s, r) => s + r.totalBudgeted, 0);
  const paid = rows.reduce((s, r) => s + r.paid, 0);
  const nivelKey = nivel ?? SIN_NIVEL;

  const byCat = useMemo(() => {
    const map = new Map<string, RowState[]>();
    for (const r of rows) {
      const k = r.categoryId ?? SIN_CATEGORIA;
      const list = map.get(k) ?? [];
      list.push(r);
      map.set(k, list);
    }
    const catName = new Map(cats.map((c) => [c.id, c.name]));
    const order: string[] = [];
    const seen = new Set<string>();
    for (const r of rows) {
      const k = r.categoryId ?? SIN_CATEGORIA;
      if (!seen.has(k)) {
        seen.add(k);
        order.push(k);
      }
    }
    return order.map((id) => ({
      categoryId: id === SIN_CATEGORIA ? null : id,
      name: id === SIN_CATEGORIA ? "Sin categoría" : catName.get(id) ?? "Sin categoría",
      rows: map.get(id)!,
    }));
  }, [rows, cats]);

  const categoryCards = (
    <div className={cn("space-y-4", showHeader && "mt-3")}>
      {byCat.map((group) => (
        <CategorySection
          key={group.categoryId ?? SIN_CATEGORIA}
          projectId={projectId}
          categoryId={group.categoryId}
          name={group.name}
          rows={group.rows}
          nivel={nivel}
          subcatOptions={subcats.filter((s) => s.categoryId === group.categoryId)}
          disabled={disabled}
          priceItems={priceItems}
          dnd={dnd}
          onPatch={onPatch}
          onSave={onSave}
          onDelete={onDelete}
          onDeleteCategory={onDeleteCategory}
          onChangeSubcategory={onChangeSubcategory}
          onCreateSubcategory={onCreateSubcategory}
          onAdded={onAdded}
        />
      ))}
    </div>
  );

  if (!showHeader) return categoryCards;

  const active = isDropActive("nivel", "", nivelKey, dnd);

  return (
    <div
      className={cn(
        "rounded-2xl border border-border/70 bg-muted/20 p-3 transition-opacity",
        isDragging("nivel", nivelKey, dnd) && "opacity-50",
      )}
    >
      <div
        data-nivel-head
        {...dropHandlers("nivel", "", nivelKey, dnd)}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1 transition-colors",
          active && "bg-primary/10 ring-2 ring-inset ring-primary",
        )}
      >
        <DragHandle level="nivel" scope="" dataKey={nivelKey} dnd={dnd} dragImageSelector="[data-nivel-head]" />
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex flex-1 items-center gap-2 text-left font-heading text-base font-semibold hover:opacity-80"
        >
          <ChevronDownIcon className={cn("size-4 transition-transform", !open && "-rotate-90")} />
          {name}
          <span className="rounded-full bg-card px-2 py-0.5 text-[10px] font-normal uppercase tracking-wide text-muted-foreground">
            Nivel
          </span>
        </button>
        <span className="flex flex-wrap items-center gap-x-4 text-xs text-muted-foreground">
          <span>Presup. <span className="font-mono text-foreground">{formatCurrency(budget)}</span></span>
          <span>Gastado <span className="font-mono text-foreground">{formatCurrency(paid)}</span></span>
        </span>
      </div>
      {open && categoryCards}
    </div>
  );
}

function CategorySection({
  projectId,
  categoryId,
  name,
  rows,
  nivel,
  subcatOptions,
  disabled,
  priceItems,
  dnd,
  onPatch,
  onSave,
  onDelete,
  onDeleteCategory,
  onChangeSubcategory,
  onCreateSubcategory,
  onAdded,
}: {
  projectId: string;
  categoryId: string | null;
  name: string;
  rows: RowState[];
  nivel: string | null;
  subcatOptions: Subcategory[];
  disabled: boolean;
  priceItems: PriceItem[];
  dnd: Dnd;
  onPatch: (id: string, patch: Partial<RowState>) => void;
  onSave: (id: string) => void;
  onDelete: (id: string) => Promise<{ ok: boolean; message: string }>;
  onDeleteCategory: (ids: string[]) => Promise<{ ok: boolean; message: string }>;
  onChangeSubcategory: (id: string, value: string | null) => void;
  onCreateSubcategory: (categoryId: string, name: string) => Promise<CreatableOption | null>;
  onAdded: () => void;
}) {
  const [open, setOpen] = useState(true);
  const budget = rows.reduce((s, r) => s + r.totalBudgeted, 0);
  const paid = rows.reduce((s, r) => s + r.paid, 0);
  const remaining = budget - paid;

  const nivelKey = nivel ?? SIN_NIVEL;
  const catKey = categoryId ?? SIN_CATEGORIA;
  const catScope = nivelKey;
  const subScope = `${nivelKey}${SEP}${catKey}`;

  // Sub-grupos por subcategoría.
  const subgroups = useMemo(() => {
    const map = new Map<string, RowState[]>();
    for (const r of rows) {
      const k = r.subcategoryId ?? SIN_SUBCATEGORIA;
      const list = map.get(k) ?? [];
      list.push(r);
      map.set(k, list);
    }
    const order: string[] = [];
    const seen = new Set<string>();
    for (const r of rows) {
      const k = r.subcategoryId ?? SIN_SUBCATEGORIA;
      if (!seen.has(k)) {
        seen.add(k);
        order.push(k);
      }
    }
    return order.map((id) => ({
      subId: id === SIN_SUBCATEGORIA ? null : id,
      subKey: id,
      name: id === SIN_SUBCATEGORIA ? "Sin subcategoría" : subcatOptions.find((s) => s.id === id)?.name ?? "",
      rows: map.get(id)!,
    }));
  }, [rows, subcatOptions]);

  const showSubHeaders = subgroups.length > 1 || (subgroups.length === 1 && subgroups[0].subId !== null);
  const moveOptions = [
    { value: "", label: "Sin subcategoría" },
    ...subcatOptions.map((s) => ({ value: s.id, label: s.name })),
  ];

  const catActive = isDropActive("category", catScope, catKey, dnd);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[var(--shadow-card)] transition-opacity",
        isDragging("category", catKey, dnd) && "opacity-50",
      )}
    >
      <div
        data-cat-head
        {...dropHandlers("category", catScope, catKey, dnd)}
        className={cn(
          "flex items-center justify-between gap-2 bg-muted/40 px-3 py-3 transition-colors",
          catActive && "bg-primary/10 ring-2 ring-inset ring-primary",
        )}
      >
        <DragHandle level="category" scope={catScope} dataKey={catKey} dnd={dnd} dragImageSelector="[data-cat-head]" />
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex flex-1 items-center gap-2 text-left font-semibold uppercase tracking-wide hover:opacity-80"
        >
          <ChevronDownIcon className={cn("size-4 transition-transform", !open && "-rotate-90")} />
          {name}
          <span className="rounded-full bg-background px-2 py-0.5 text-[11px] font-normal text-muted-foreground">{rows.length}</span>
        </button>
        <span className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
          <span>Presup. <span className="font-mono text-foreground">{formatCurrency(budget)}</span></span>
          <span>Gastado <span className="font-mono text-foreground">{formatCurrency(paid)}</span></span>
          <span>Restante <span className={cn("font-mono", remaining < 0 ? "text-[var(--negative)]" : "text-foreground")}>{formatCurrency(remaining)}</span></span>
        </span>
        <TypeToConfirmDialog
          title="Eliminar categoría completa"
          description={`Se eliminarán las ${rows.length} partida(s) de "${name}"${nivel ? ` en el nivel ${nivel}` : ""}. Esta acción no se puede deshacer.`}
          confirmLabel="Eliminar categoría"
          trigger={
            <Button variant="ghost" size="icon-sm" disabled={disabled} title="Eliminar categoría">
              <Trash2Icon className="size-3.5 text-destructive" />
            </Button>
          }
          onConfirm={() => onDeleteCategory(rows.map((r) => r.id))}
        />
      </div>

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
                const lineScope = `${nivelKey}${SEP}${catKey}${SEP}${g.subKey}`;
                const subActive = isDropActive("subcategory", subScope, g.subKey, dnd);
                return (
                  <Fragment key={g.subId ?? SIN_SUBCATEGORIA}>
                    {showSubHeaders && (
                      <tr
                        {...dropHandlers("subcategory", subScope, g.subKey, dnd)}
                        className={cn(
                          "bg-muted/20 text-[13px] transition-colors",
                          subActive && "bg-primary/10",
                          isDragging("subcategory", g.subKey, dnd) && "opacity-50",
                        )}
                      >
                        <td className="px-2 py-1.5">
                          <div className="flex items-center gap-1">
                            <DragHandle level="subcategory" scope={subScope} dataKey={g.subKey} dnd={dnd} dragImageSelector="tr" />
                            <span className="font-medium text-copper">{g.name}</span>
                          </div>
                        </td>
                        <td colSpan={3} />
                        <td className="px-2 py-1.5 text-right font-mono tabular-nums font-medium">{formatCurrency(subBudget)}</td>
                        <td className="px-3 py-1.5 text-right font-mono tabular-nums text-muted-foreground">
                          {subPaid > 0 ? formatCurrency(subPaid) : "—"}
                        </td>
                        <td />
                      </tr>
                    )}
                    {g.rows.map((row) => {
                      const lineActive = isDropActive("line", lineScope, row.id, dnd);
                      return (
                        <tr
                          key={row.id}
                          {...dropHandlers("line", lineScope, row.id, dnd)}
                          className={cn(
                            "border-b border-border/40 transition-colors hover:bg-muted/20",
                            lineActive && "bg-primary/10",
                            isDragging("line", row.id, dnd) && "opacity-50",
                          )}
                        >
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
                            <CurrencyCell value={row.unitPrice ?? ""} onChange={(v) => onPatch(row.id, { unitPrice: v === "" ? null : Number(v) })} onBlur={() => onSave(row.id)} disabled={disabled} />
                          </td>
                          <td className="px-1 py-1">
                            <CurrencyCell value={row.totalBudgeted} onChange={(v) => onPatch(row.id, { totalBudgeted: v === "" ? 0 : Number(v) })} onBlur={() => onSave(row.id)} disabled={disabled} strong />
                          </td>
                          <td className="px-3 py-1 text-right font-mono tabular-nums text-muted-foreground">
                            {row.paid > 0 ? formatCurrency(row.paid) : "—"}
                          </td>
                          <td className="px-2 py-1">
                            <div className="flex items-center justify-end gap-1">
                              <DragHandle level="line" scope={lineScope} dataKey={row.id} dnd={dnd} dragImageSelector="tr" />
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
                              <ConfirmDialog
                                title="Eliminar partida"
                                description={`Se eliminará "${row.description || "esta partida"}" del presupuesto. Esta acción no se puede deshacer.`}
                                trigger={
                                  <Button variant="ghost" size="icon-sm" disabled={disabled} title="Eliminar partida">
                                    <Trash2Icon className="size-3.5" />
                                  </Button>
                                }
                                onConfirm={() => onDelete(row.id)}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
          <InlineAddRow
            projectId={projectId}
            categoryId={categoryId}
            nivel={nivel}
            subcatOptions={subcatOptions}
            disabled={disabled}
            priceItems={priceItems}
            onCreateSubcategory={onCreateSubcategory}
            onAdded={onAdded}
          />
        </div>
      )}
    </div>
  );
}

function CurrencyCell({
  value,
  onChange,
  onBlur,
  disabled,
  strong,
}: {
  value: string | number;
  onChange: (v: string) => void;
  onBlur: () => void;
  disabled?: boolean;
  strong?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState("");
  const numeric = value === "" || value === null || value === undefined ? null : Number(value);
  const display = focused
    ? draft
    : numeric === null || Number.isNaN(numeric)
      ? ""
      : formatCurrency(numeric);

  return (
    <input
      type="text"
      inputMode="decimal"
      value={display}
      disabled={disabled}
      onFocus={() => {
        setDraft(numeric === null ? "" : String(value));
        setFocused(true);
      }}
      onChange={(e) => {
        setDraft(e.target.value);
        onChange(e.target.value);
      }}
      onBlur={() => {
        setFocused(false);
        onBlur();
      }}
      className={cn(
        "w-full rounded-md border border-transparent bg-transparent px-2 py-1.5 text-right font-mono tabular-nums outline-none transition-colors hover:border-border focus:border-primary focus:bg-background",
        strong && "font-medium",
      )}
    />
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
  nivel,
  subcatOptions,
  disabled,
  priceItems,
  onCreateSubcategory,
  onAdded,
}: {
  projectId: string;
  categoryId: string | null;
  nivel: string | null;
  subcatOptions: Subcategory[];
  disabled: boolean;
  priceItems: PriceItem[];
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
        area: nivel,
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
      <div className="min-w-[200px] flex-1">
        <CreatableCombobox
          value={desc}
          options={priceOptionsFor(priceItems, categoryId, subcategoryId || null)}
          placeholder="Artículo o nueva partida"
          searchPlaceholder="Buscar artículo o escribir"
          createLabel="Usar"
          onChange={(v) => {
            setDesc(v);
            const item = lookupPriceItem(priceItems, categoryId, v);
            if (item) {
              if (item.unit) setUnit(item.unit);
              setPrice(String(item.unitPrice));
            }
          }}
          onCreate={async (q) => ({ value: q.trim(), label: q.trim() })}
        />
      </div>
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
  niveles,
  disabled,
  priceItems,
  onCreateCategory,
  onCreateSubcategory,
  onCreateNivel,
  onAdded,
}: {
  projectId: string;
  categories: Category[];
  subcategories: Subcategory[];
  niveles: string[];
  disabled: boolean;
  priceItems: PriceItem[];
  onCreateCategory: (name: string) => Promise<CreatableOption | null>;
  onCreateSubcategory: (categoryId: string, name: string) => Promise<CreatableOption | null>;
  onCreateNivel: (name: string) => Promise<CreatableOption | null>;
  onAdded: () => void;
}) {
  const [nivel, setNivel] = useState("");
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
        area: nivel.trim() || null,
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
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-sky-600">Nivel</label>
          <CreatableCombobox
            value={nivel}
            options={niveles.map((n) => ({ value: n, label: n }))}
            placeholder="Nivel (opcional)"
            searchPlaceholder="Buscar o crear nivel"
            createLabel="Crear nivel"
            clearLabel="Sin nivel"
            allowClear
            onChange={setNivel}
            onCreate={onCreateNivel}
          />
        </div>
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
              setDesc("");
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
        <div className="min-w-[240px] flex-1">
          <CreatableCombobox
            value={desc}
            options={priceOptionsFor(priceItems, categoryId, subcategoryId || null)}
            placeholder="Artículo de la tabla o nueva descripción"
            searchPlaceholder="Buscar artículo o escribir descripción"
            createLabel="Usar"
            onChange={(v) => {
              setDesc(v);
              const item = lookupPriceItem(priceItems, categoryId, v);
              if (item) {
                if (item.unit) setUnit(item.unit);
                setPrice(String(item.unitPrice));
              }
            }}
            onCreate={async (q) => ({ value: q.trim(), label: q.trim() })}
          />
        </div>
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
