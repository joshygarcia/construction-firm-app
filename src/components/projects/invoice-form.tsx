"use client";

import { useActionState, useState } from "react";
import { PlusIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitInvoice, type ActionResult } from "@/features/finance/actions";
import { formatCurrency } from "@/lib/format";

type LineItem = {
  description: string;
  quantity: number;
  unitPrice: number;
};

const emptyLine: LineItem = { description: "", quantity: 1, unitPrice: 0 };

export function InvoiceForm({ projectId }: { projectId: string }) {
  const [lineItems, setLineItems] = useState<LineItem[]>([{ ...emptyLine }]);
  const [taxRate, setTaxRate] = useState(0);

  function addLine() {
    setLineItems((prev) => [...prev, { ...emptyLine }]);
  }

  function removeLine(index: number) {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  }

  function updateLine(index: number, field: keyof LineItem, value: string) {
    setLineItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        if (field === "description") return { ...item, description: value };
        const num = parseFloat(value) || 0;
        return { ...item, [field]: num };
      }),
    );
  }

  const subtotal = lineItems.reduce((sum, li) => sum + li.quantity * li.unitPrice, 0);
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  async function handleSubmit(
    _prev: ActionResult | null,
    formData: FormData,
  ): Promise<ActionResult> {
    const itemsWithTotal = lineItems.map((li) => ({
      ...li,
      total: li.quantity * li.unitPrice,
    }));
    formData.set("lineItems", JSON.stringify(itemsWithTotal));
    formData.set("taxRate", String(taxRate));

    const result = await submitInvoice(formData);

    if (result.ok) {
      setLineItems([{ ...emptyLine }]);
      setTaxRate(0);
    }

    return result;
  }

  const [state, formAction, isPending] = useActionState(handleSubmit, null);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="projectId" value={projectId} />

      {state && !state.ok && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {state.message}
        </div>
      )}

      {state?.ok && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400">
          {state.message}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="recipientName">Destinatario *</Label>
          <Input
            id="recipientName"
            name="recipientName"
            placeholder="Nombre del cliente"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="recipientDetail">Detalle del destinatario</Label>
          <Input
            id="recipientDetail"
            name="recipientDetail"
            placeholder="RNC, dirección, etc."
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="issueDate">Fecha de emisión *</Label>
          <Input id="issueDate" name="issueDate" type="date" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dueDate">Fecha de vencimiento</Label>
          <Input id="dueDate" name="dueDate" type="date" />
        </div>
      </div>

      {/* Line items */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Líneas de factura</Label>
          <Button type="button" variant="outline" size="sm" onClick={addLine}>
            <PlusIcon className="mr-1 size-3.5" />
            Agregar línea
          </Button>
        </div>

        <div className="space-y-2">
          {/* Header row */}
          <div className="hidden gap-2 text-xs font-medium text-muted-foreground sm:grid sm:grid-cols-[1fr_80px_100px_100px_36px]">
            <span>Descripción</span>
            <span>Cantidad</span>
            <span>Precio unit.</span>
            <span className="text-right">Total</span>
            <span />
          </div>

          {lineItems.map((item, index) => (
            <div
              key={index}
              className="grid gap-2 sm:grid-cols-[1fr_80px_100px_100px_36px]"
            >
              <Input
                placeholder="Descripción"
                value={item.description}
                onChange={(e) => updateLine(index, "description", e.target.value)}
              />
              <Input
                type="number"
                min="0"
                step="any"
                placeholder="Cant."
                value={item.quantity || ""}
                onChange={(e) => updateLine(index, "quantity", e.target.value)}
              />
              <Input
                type="number"
                min="0"
                step="any"
                placeholder="Precio"
                value={item.unitPrice || ""}
                onChange={(e) => updateLine(index, "unitPrice", e.target.value)}
              />
              <div className="flex items-center justify-end font-mono text-sm tabular-nums">
                {formatCurrency(item.quantity * item.unitPrice)}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-9 text-muted-foreground hover:text-destructive"
                onClick={() => removeLine(index)}
                disabled={lineItems.length <= 1}
              >
                <Trash2Icon className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Tax rate */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="taxRateInput">Tasa de impuesto (%)</Label>
          <Input
            id="taxRateInput"
            type="number"
            min="0"
            max="100"
            step="any"
            value={taxRate || ""}
            onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="notes">Notas</Label>
          <Textarea id="notes" name="notes" placeholder="Notas adicionales..." rows={2} />
        </div>
      </div>

      {/* Totals */}
      <div className="rounded-lg border border-border/50 bg-muted/30 p-4">
        <div className="flex flex-col gap-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-mono tabular-nums">{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              Impuesto ({taxRate}%)
            </span>
            <span className="font-mono tabular-nums">{formatCurrency(taxAmount)}</span>
          </div>
          <div className="flex justify-between border-t border-border/50 pt-1.5 font-semibold">
            <span>Total</span>
            <span className="font-mono tabular-nums">{formatCurrency(total)}</span>
          </div>
        </div>
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? "Guardando..." : "Crear factura"}
      </Button>
    </form>
  );
}
