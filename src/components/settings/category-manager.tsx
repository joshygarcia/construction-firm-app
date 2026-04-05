"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  submitCategory,
  submitDeleteCategory,
  submitDeleteSubcategory,
  submitSubcategory,
  submitUpdateCategory,
  submitUpdateSubcategory,
} from "@/features/finance/actions";
import type { Category, Subcategory } from "@/features/finance/ledger";

export function CategoryManager({
  categories,
  subcategories,
}: {
  categories: Category[];
  subcategories: Subcategory[];
}) {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newSubNames, setNewSubNames] = useState<Record<string, string>>({});
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [editingSubName, setEditingSubName] = useState("");
  const [pending, setPending] = useState(false);

  function run(fn: () => Promise<{ ok: boolean; message: string }>) {
    setPending(true);
    startTransition(async () => {
      try {
        const result = await fn();
        if (result.ok) {
          toast.success(result.message);
          router.refresh();
        } else {
          toast.error(result.message);
        }
      } finally {
        setPending(false);
      }
    });
  }

  async function handleAddCategory() {
    if (newCategoryName.trim().length < 2) return;
    run(async () => {
      const result = await submitCategory(newCategoryName);
      if (result.ok) setNewCategoryName("");
      return result;
    });
  }

  async function handleAddSubcategory(categoryId: string) {
    const name = newSubNames[categoryId]?.trim();
    if (!name || name.length < 2) return;
    run(async () => {
      const result = await submitSubcategory(categoryId, name);
      if (result.ok) {
        setNewSubNames((prev) => ({ ...prev, [categoryId]: "" }));
      }
      return result;
    });
  }

  function startEditCategory(cat: Category, event: React.MouseEvent) {
    event.stopPropagation();
    setEditingCategoryId(cat.id);
    setEditingCategoryName(cat.name);
  }

  function saveEditCategory() {
    if (!editingCategoryId || editingCategoryName.trim().length < 2) return;
    const id = editingCategoryId;
    const name = editingCategoryName;
    run(async () => {
      const result = await submitUpdateCategory(id, name);
      if (result.ok) {
        setEditingCategoryId(null);
        setEditingCategoryName("");
      }
      return result;
    });
  }

  function startEditSub(sub: Subcategory) {
    setEditingSubId(sub.id);
    setEditingSubName(sub.name);
  }

  function saveEditSub() {
    if (!editingSubId || editingSubName.trim().length < 2) return;
    const id = editingSubId;
    const name = editingSubName;
    run(async () => {
      const result = await submitUpdateSubcategory(id, name);
      if (result.ok) {
        setEditingSubId(null);
        setEditingSubName("");
      }
      return result;
    });
  }

  return (
    <div className="space-y-4">
      {categories.map((cat) => {
        const subs = subcategories.filter((s) => s.categoryId === cat.id);
        const isExpanded = expandedId === cat.id;
        const isEditing = editingCategoryId === cat.id;

        return (
          <div
            key={cat.id}
            className="rounded-lg border border-border/50 bg-muted/20"
          >
            <div
              className="flex w-full items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
            >
              <button
                type="button"
                className="flex flex-1 items-center gap-3 text-left"
                onClick={() => setExpandedId(isExpanded ? null : cat.id)}
              >
                {isExpanded ? (
                  <ChevronDownIcon className="size-4 text-muted-foreground" />
                ) : (
                  <ChevronRightIcon className="size-4 text-muted-foreground" />
                )}
                {isEditing ? (
                  <Input
                    autoFocus
                    value={editingCategoryName}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => setEditingCategoryName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        saveEditCategory();
                      } else if (e.key === "Escape") {
                        setEditingCategoryId(null);
                      }
                    }}
                    className="h-8 text-sm"
                  />
                ) : (
                  <span className="font-medium">{cat.name}</span>
                )}
                <Badge variant="secondary" className="ml-auto font-mono text-[11px]">
                  {subs.length} sub
                </Badge>
              </button>
              <div className="flex items-center gap-1">
                {isEditing ? (
                  <>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={pending}
                      onClick={(e) => {
                        e.stopPropagation();
                        saveEditCategory();
                      }}
                    >
                      <CheckIcon />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingCategoryId(null);
                      }}
                    >
                      <XIcon />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={(e) => startEditCategory(cat, e)}
                    >
                      <PencilIcon />
                    </Button>
                    <ConfirmDialog
                      title="Eliminar categoría"
                      description="No podrás eliminarla si tiene subcategorías, movimientos, líneas de presupuesto o contratos vinculados."
                      trigger={
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Trash2Icon />
                        </Button>
                      }
                      onConfirm={async () => {
                        const result = await submitDeleteCategory(cat.id);
                        if (result.ok) {
                          toast.success(result.message);
                          router.refresh();
                        } else {
                          toast.error(result.message);
                        }
                        return result;
                      }}
                    />
                  </>
                )}
              </div>
            </div>

            {isExpanded && (
              <div className="border-t border-border/50 px-4 py-3 space-y-2">
                {subs.map((sub) => {
                  const isEditingSub = editingSubId === sub.id;
                  return (
                    <div
                      key={sub.id}
                      className="flex items-center gap-3 rounded-md bg-background/50 px-3 py-2 text-sm"
                    >
                      <div className="h-1.5 w-1.5 rounded-full bg-copper/50" />
                      {isEditingSub ? (
                        <Input
                          autoFocus
                          value={editingSubName}
                          onChange={(e) => setEditingSubName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              saveEditSub();
                            } else if (e.key === "Escape") {
                              setEditingSubId(null);
                            }
                          }}
                          className="h-7 flex-1 text-sm"
                        />
                      ) : (
                        <span className="flex-1">{sub.name}</span>
                      )}
                      <div className="flex items-center gap-1">
                        {isEditingSub ? (
                          <>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              disabled={pending}
                              onClick={saveEditSub}
                            >
                              <CheckIcon />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => setEditingSubId(null)}
                            >
                              <XIcon />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => startEditSub(sub)}
                            >
                              <PencilIcon />
                            </Button>
                            <ConfirmDialog
                              title="Eliminar subcategoría"
                              description="No podrás eliminarla si tiene movimientos, líneas de presupuesto o contratos vinculados."
                              trigger={
                                <Button variant="ghost" size="icon-sm">
                                  <Trash2Icon />
                                </Button>
                              }
                              onConfirm={async () => {
                                const result = await submitDeleteSubcategory(sub.id);
                                if (result.ok) {
                                  toast.success(result.message);
                                  router.refresh();
                                } else {
                                  toast.error(result.message);
                                }
                                return result;
                              }}
                            />
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
                {subs.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Sin subcategorías definidas.
                  </p>
                )}
                <div className="flex items-center gap-2 pt-2">
                  <Input
                    placeholder="Nueva subcategoría..."
                    value={newSubNames[cat.id] ?? ""}
                    onChange={(e) =>
                      setNewSubNames((prev) => ({
                        ...prev,
                        [cat.id]: e.target.value,
                      }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddSubcategory(cat.id);
                      }
                    }}
                    className="h-8 text-sm"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pending || (newSubNames[cat.id]?.trim().length ?? 0) < 2}
                    onClick={() => handleAddSubcategory(cat.id)}
                  >
                    <PlusIcon className="size-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      <div className="flex items-center gap-2 pt-2 border-t border-border/50">
        <Input
          placeholder="Nueva categoría..."
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAddCategory();
            }
          }}
          className="h-9"
        />
        <Button
          size="sm"
          disabled={pending || newCategoryName.trim().length < 2}
          onClick={handleAddCategory}
        >
          <PlusIcon className="size-3.5 mr-1" />
          Agregar
        </Button>
      </div>
    </div>
  );
}
