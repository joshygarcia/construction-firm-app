"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LoaderCircleIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";

import {
  submitBudgetSection,
  submitBudgetVersion,
  submitDeleteBudgetSection,
  submitDeleteBudgetVersion,
  submitUpdateBudgetSection,
  submitUpdateBudgetVersion,
} from "@/features/finance/actions";
import type { BudgetSection, BudgetVersion, CostType } from "@/features/finance/ledger";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

function VersionDialog({
  mode,
  projectId,
  version,
  trigger,
}: {
  mode: "create" | "edit";
  projectId: string;
  version?: BudgetVersion;
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [name, setName] = useState(version?.versionName ?? "");

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    startTransition(async () => {
      try {
        const formData = new FormData();
        if (mode === "edit" && version) {
          formData.set("id", version.id);
        } else {
          formData.set("projectId", projectId);
        }
        formData.set("versionName", name);
        const result =
          mode === "create"
            ? await submitBudgetVersion(formData)
            : await submitUpdateBudgetVersion(formData);
        if (result.ok) {
          toast.success(result.message);
          setOpen(false);
          if (mode === "create") setName("");
          router.refresh();
        } else {
          toast.error(result.message);
        }
      } finally {
        setPending(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Nueva versión de presupuesto" : "Editar versión"}
          </DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="ver-name">Nombre de la versión</FieldLabel>
              <Input
                id="ver-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Presupuesto v1"
                required
              />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <LoaderCircleIcon className="animate-spin" data-icon="inline-start" />}
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SectionDialog({
  mode,
  budgetVersionId,
  section,
  trigger,
}: {
  mode: "create" | "edit";
  budgetVersionId?: string;
  section?: BudgetSection;
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [values, setValues] = useState({
    code: section?.code ?? "",
    name: section?.name ?? "",
    costType: (section?.costType ?? "direct") as CostType,
  });

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    startTransition(async () => {
      try {
        const formData = new FormData();
        if (mode === "edit" && section) {
          formData.set("id", section.id);
        } else if (budgetVersionId) {
          formData.set("budgetVersionId", budgetVersionId);
        }
        formData.set("code", values.code);
        formData.set("name", values.name);
        formData.set("costType", values.costType);
        const result =
          mode === "create"
            ? await submitBudgetSection(formData)
            : await submitUpdateBudgetSection(formData);
        if (result.ok) {
          toast.success(result.message);
          setOpen(false);
          if (mode === "create")
            setValues({ code: "", name: "", costType: "direct" });
          router.refresh();
        } else {
          toast.error(result.message);
        }
      } finally {
        setPending(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Nueva sección" : "Editar sección"}
          </DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="sec-code">Código</FieldLabel>
              <Input
                id="sec-code"
                value={values.code}
                onChange={(e) => setValues({ ...values, code: e.target.value })}
                placeholder="A"
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="sec-name">Nombre</FieldLabel>
              <Input
                id="sec-name"
                value={values.name}
                onChange={(e) => setValues({ ...values, name: e.target.value })}
                placeholder="TRABAJOS PRELIMINARES"
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="sec-type">Tipo de costo</FieldLabel>
              <select
                id="sec-type"
                className="h-9 rounded-md border border-border/50 bg-background px-3 text-sm"
                value={values.costType}
                onChange={(e) =>
                  setValues({ ...values, costType: e.target.value as CostType })
                }
              >
                <option value="direct">Directo</option>
                <option value="indirect">Indirecto</option>
              </select>
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <LoaderCircleIcon className="animate-spin" data-icon="inline-start" />}
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function BudgetStructureManager({
  projectId,
  versions,
  sections,
}: {
  projectId: string;
  versions: BudgetVersion[];
  sections: BudgetSection[];
}) {
  const router = useRouter();
  const editableVersion = versions.find((v) => !v.isLocked) ?? versions[0] ?? null;

  async function handleDeleteVersion(id: string) {
    const result = await submitDeleteBudgetVersion(id);
    if (result.ok) {
      toast.success(result.message);
      router.refresh();
    } else {
      toast.error(result.message);
    }
    return result;
  }

  async function handleDeleteSection(id: string) {
    const result = await submitDeleteBudgetSection(id);
    if (result.ok) {
      toast.success(result.message);
      router.refresh();
    } else {
      toast.error(result.message);
    }
    return result;
  }

  const sectionsByVersion = new Map<string, BudgetSection[]>();
  for (const section of sections) {
    const list = sectionsByVersion.get(section.budgetVersionId) ?? [];
    list.push(section);
    sectionsByVersion.set(section.budgetVersionId, list);
  }

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Versiones y secciones</CardTitle>
        <VersionDialog
          mode="create"
          projectId={projectId}
          trigger={
            <Button size="sm">
              <PlusIcon data-icon="inline-start" />
              Nueva versión
            </Button>
          }
        />
      </CardHeader>
      <CardContent className="space-y-4">
        {versions.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Aún no has creado versiones de presupuesto.
          </p>
        )}
        {versions.map((version) => {
          const versionSections = (sectionsByVersion.get(version.id) ?? []).sort(
            (a, b) => a.sortOrder - b.sortOrder,
          );
          return (
            <div
              key={version.id}
              className="rounded-lg border border-border/50 bg-muted/10 p-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{version.versionName}</p>
                  <p className="text-[12px] text-muted-foreground">
                    {version.isLocked ? "Aprobada · bloqueada" : "Borrador · editable"}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {!version.isLocked && (
                    <VersionDialog
                      mode="edit"
                      projectId={projectId}
                      version={version}
                      trigger={
                        <Button variant="ghost" size="icon-sm">
                          <PencilIcon />
                        </Button>
                      }
                    />
                  )}
                  {!version.isLocked && (
                    <ConfirmDialog
                      title="Eliminar versión"
                      description="Se eliminarán también sus secciones y líneas. No podrás eliminarla si hay movimientos vinculados."
                      trigger={
                        <Button variant="ghost" size="icon-sm">
                          <Trash2Icon />
                        </Button>
                      }
                      onConfirm={() => handleDeleteVersion(version.id)}
                    />
                  )}
                </div>
              </div>
              <div className="mt-3 space-y-2">
                {versionSections.length === 0 ? (
                  <p className="text-[12px] text-muted-foreground">Sin secciones.</p>
                ) : (
                  versionSections.map((section) => (
                    <div
                      key={section.id}
                      className="flex items-center justify-between rounded-md border border-border/40 bg-background/60 px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[12px] font-bold text-copper">
                          {section.code}.-
                        </span>
                        <span className="text-sm">{section.name}</span>
                        {section.costType === "indirect" && (
                          <Badge variant="outline" className="text-[10px]">
                            Indirecto
                          </Badge>
                        )}
                      </div>
                      {!version.isLocked && (
                        <div className="flex items-center gap-1">
                          <SectionDialog
                            mode="edit"
                            section={section}
                            trigger={
                              <Button variant="ghost" size="icon-sm">
                                <PencilIcon />
                              </Button>
                            }
                          />
                          <ConfirmDialog
                            title="Eliminar sección"
                            description="Las líneas ligadas perderán su sección."
                            trigger={
                              <Button variant="ghost" size="icon-sm">
                                <Trash2Icon />
                              </Button>
                            }
                            onConfirm={() => handleDeleteSection(section.id)}
                          />
                        </div>
                      )}
                    </div>
                  ))
                )}
                {!version.isLocked && (
                  <SectionDialog
                    mode="create"
                    budgetVersionId={version.id}
                    trigger={
                      <Button variant="outline" size="sm" className="mt-1">
                        <PlusIcon data-icon="inline-start" />
                        Agregar sección
                      </Button>
                    }
                  />
                )}
              </div>
            </div>
          );
        })}
        {editableVersion ? null : (
          <p className="text-[12px] text-muted-foreground">
            Crea una versión borrador para añadir secciones.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
