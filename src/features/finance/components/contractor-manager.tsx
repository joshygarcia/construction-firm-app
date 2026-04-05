"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LoaderCircleIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";

import {
  submitContractor,
  submitContractorContract,
  submitDeleteContractor,
  submitDeleteContractorContract,
  submitUpdateContractor,
  submitUpdateContractorContract,
} from "@/features/finance/actions";
import type {
  Contractor,
  ContractorContract,
  ContractorContractStatus,
} from "@/features/finance/ledger";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/format";

type ContractFormState = {
  contractorId: string;
  scopeDescription: string;
  agreedTotal: string;
  status: ContractorContractStatus;
  startDate: string;
  endDate: string;
  notes: string;
};

const emptyContractor = {
  fullName: "",
  trade: "",
  phone: "",
  email: "",
  notes: "",
};

const emptyContract: ContractFormState = {
  contractorId: "",
  scopeDescription: "",
  agreedTotal: "",
  status: "active",
  startDate: "",
  endDate: "",
  notes: "",
};

function ContractorDialog({
  mode,
  contractor,
  trigger,
}: {
  mode: "create" | "edit";
  contractor?: Contractor;
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [values, setValues] = useState(
    contractor
      ? {
          fullName: contractor.fullName,
          trade: contractor.trade,
          phone: contractor.phone,
          email: contractor.email,
          notes: contractor.notes,
        }
      : emptyContractor,
  );

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    startTransition(async () => {
      try {
        const formData = new FormData();
        if (mode === "edit" && contractor) formData.set("id", contractor.id);
        Object.entries(values).forEach(([k, v]) => formData.set(k, v));
        const result =
          mode === "create"
            ? await submitContractor(formData)
            : await submitUpdateContractor(formData);
        if (result.ok) {
          toast.success(result.message);
          setOpen(false);
          if (mode === "create") setValues(emptyContractor);
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Nuevo contratista" : "Editar contratista"}
          </DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="cont-name">Nombre completo</FieldLabel>
              <Input
                id="cont-name"
                value={values.fullName}
                onChange={(e) => setValues({ ...values, fullName: e.target.value })}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="cont-trade">Oficio</FieldLabel>
              <Input
                id="cont-trade"
                value={values.trade}
                onChange={(e) => setValues({ ...values, trade: e.target.value })}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="cont-phone">Teléfono</FieldLabel>
              <Input
                id="cont-phone"
                value={values.phone}
                onChange={(e) => setValues({ ...values, phone: e.target.value })}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="cont-email">Email</FieldLabel>
              <Input
                id="cont-email"
                value={values.email}
                onChange={(e) => setValues({ ...values, email: e.target.value })}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="cont-notes">Notas</FieldLabel>
              <Textarea
                id="cont-notes"
                rows={3}
                value={values.notes}
                onChange={(e) => setValues({ ...values, notes: e.target.value })}
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

function ContractDialog({
  mode,
  projectId,
  contractors,
  contract,
  trigger,
}: {
  mode: "create" | "edit";
  projectId: string;
  contractors: Contractor[];
  contract?: ContractorContract;
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [values, setValues] = useState<ContractFormState>(
    contract
      ? {
          contractorId: contract.contractorId,
          scopeDescription: contract.scopeDescription,
          agreedTotal: String(contract.agreedTotal),
          status: contract.status,
          startDate: contract.startDate ?? "",
          endDate: contract.endDate ?? "",
          notes: contract.notes ?? "",
        }
      : emptyContract,
  );

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    startTransition(async () => {
      try {
        const formData = new FormData();
        if (mode === "edit" && contract) {
          formData.set("id", contract.id);
        } else {
          formData.set("projectId", projectId);
          formData.set("contractorId", values.contractorId);
        }
        formData.set("scopeDescription", values.scopeDescription);
        formData.set("agreedTotal", values.agreedTotal);
        formData.set("status", values.status);
        formData.set("startDate", values.startDate);
        formData.set("endDate", values.endDate);
        formData.set("notes", values.notes);
        const result =
          mode === "create"
            ? await submitContractorContract(formData)
            : await submitUpdateContractorContract(formData);
        if (result.ok) {
          toast.success(result.message);
          setOpen(false);
          if (mode === "create") setValues(emptyContract);
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Nuevo contrato" : "Editar contrato"}
          </DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <FieldGroup>
            {mode === "create" && (
              <Field>
                <FieldLabel htmlFor="ctr-contractor">Contratista</FieldLabel>
                <select
                  id="ctr-contractor"
                  className="h-9 rounded-md border border-border/50 bg-background px-3 text-sm"
                  value={values.contractorId}
                  onChange={(e) => setValues({ ...values, contractorId: e.target.value })}
                  required
                >
                  <option value="">Selecciona un contratista...</option>
                  {contractors.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName} — {c.trade}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <Field>
              <FieldLabel htmlFor="ctr-scope">Descripción del alcance</FieldLabel>
              <Textarea
                id="ctr-scope"
                rows={2}
                value={values.scopeDescription}
                onChange={(e) =>
                  setValues({ ...values, scopeDescription: e.target.value })
                }
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="ctr-amount">Monto acordado</FieldLabel>
              <Input
                id="ctr-amount"
                type="number"
                step="0.01"
                value={values.agreedTotal}
                onChange={(e) => setValues({ ...values, agreedTotal: e.target.value })}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="ctr-status">Estado</FieldLabel>
              <select
                id="ctr-status"
                className="h-9 rounded-md border border-border/50 bg-background px-3 text-sm"
                value={values.status}
                onChange={(e) =>
                  setValues({
                    ...values,
                    status: e.target.value as ContractorContractStatus,
                  })
                }
              >
                <option value="draft">Borrador</option>
                <option value="active">Activo</option>
                <option value="completed">Completado</option>
                <option value="cancelled">Cancelado</option>
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel htmlFor="ctr-start">Inicio</FieldLabel>
                <Input
                  id="ctr-start"
                  type="date"
                  value={values.startDate}
                  onChange={(e) => setValues({ ...values, startDate: e.target.value })}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="ctr-end">Fin</FieldLabel>
                <Input
                  id="ctr-end"
                  type="date"
                  value={values.endDate}
                  onChange={(e) => setValues({ ...values, endDate: e.target.value })}
                />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="ctr-notes">Notas</FieldLabel>
              <Textarea
                id="ctr-notes"
                rows={2}
                value={values.notes}
                onChange={(e) => setValues({ ...values, notes: e.target.value })}
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

export function ContractorManager({
  projectId,
  contractors,
  contracts,
}: {
  projectId: string;
  contractors: Contractor[];
  contracts: ContractorContract[];
}) {
  const router = useRouter();
  const contractorMap = new Map(contractors.map((c) => [c.id, c]));

  async function handleDeleteContractor(id: string) {
    const result = await submitDeleteContractor(id);
    if (result.ok) {
      toast.success(result.message);
      router.refresh();
    } else {
      toast.error(result.message);
    }
    return result;
  }

  async function handleDeleteContract(id: string) {
    const result = await submitDeleteContractorContract(id);
    if (result.ok) {
      toast.success(result.message);
      router.refresh();
    } else {
      toast.error(result.message);
    }
    return result;
  }

  const statusLabel: Record<ContractorContractStatus, string> = {
    draft: "Borrador",
    active: "Activo",
    completed: "Completado",
    cancelled: "Cancelado",
  };

  return (
    <div className="flex flex-col gap-6">
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Contratistas</CardTitle>
          <ContractorDialog
            mode="create"
            trigger={
              <Button size="sm">
                <PlusIcon data-icon="inline-start" />
                Nuevo contratista
              </Button>
            }
          />
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Oficio</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {contractors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Aún no has registrado contratistas.
                  </TableCell>
                </TableRow>
              ) : (
                contractors.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.fullName}</TableCell>
                    <TableCell className="text-muted-foreground">{c.trade}</TableCell>
                    <TableCell className="font-mono text-[13px]">{c.phone || "—"}</TableCell>
                    <TableCell className="text-[13px]">{c.email || "—"}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <ContractorDialog
                          mode="edit"
                          contractor={c}
                          trigger={
                            <Button variant="ghost" size="icon-sm">
                              <PencilIcon />
                            </Button>
                          }
                        />
                        <ConfirmDialog
                          title="Eliminar contratista"
                          description="No podrás eliminarlo si tiene contratos vinculados."
                          trigger={
                            <Button variant="ghost" size="icon-sm">
                              <Trash2Icon />
                            </Button>
                          }
                          onConfirm={() => handleDeleteContractor(c.id)}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Contratos del proyecto</CardTitle>
          <ContractDialog
            mode="create"
            projectId={projectId}
            contractors={contractors}
            trigger={
              <Button size="sm" disabled={contractors.length === 0}>
                <PlusIcon data-icon="inline-start" />
                Nuevo contrato
              </Button>
            }
          />
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contratista</TableHead>
                <TableHead>Alcance</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acordado</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {contracts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Sin contratos para este proyecto.
                  </TableCell>
                </TableRow>
              ) : (
                contracts.map((contract) => (
                  <TableRow key={contract.id}>
                    <TableCell className="font-medium">
                      {contractorMap.get(contract.contractorId)?.fullName ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {contract.scopeDescription}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{statusLabel[contract.status]}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {formatCurrency(contract.agreedTotal)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <ContractDialog
                          mode="edit"
                          projectId={projectId}
                          contractors={contractors}
                          contract={contract}
                          trigger={
                            <Button variant="ghost" size="icon-sm">
                              <PencilIcon />
                            </Button>
                          }
                        />
                        <ConfirmDialog
                          title="Eliminar contrato"
                          description="No podrás eliminarlo si ya registra pagos."
                          trigger={
                            <Button variant="ghost" size="icon-sm">
                              <Trash2Icon />
                            </Button>
                          }
                          onConfirm={() => handleDeleteContract(contract.id)}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
