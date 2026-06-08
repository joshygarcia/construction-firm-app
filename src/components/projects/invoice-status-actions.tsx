"use client";

import { useTransition } from "react";
import { CheckCircleIcon, PrinterIcon, SendIcon, XCircleIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  submitInvoiceStatusChange,
  submitDeleteInvoice,
} from "@/features/finance/actions";
import type { InvoiceStatus } from "@/features/finance/ledger";

export function InvoiceStatusActions({
  invoiceId,
  status,
}: {
  invoiceId: string;
  status: InvoiceStatus;
}) {
  const [isPending, startTransition] = useTransition();

  function changeStatus(newStatus: InvoiceStatus) {
    startTransition(async () => {
      await submitInvoiceStatusChange(invoiceId, newStatus);
    });
  }

  function handleDelete() {
    startTransition(async () => {
      await submitDeleteInvoice(invoiceId);
    });
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        className="size-8"
        title="Imprimir / PDF"
        onClick={() => window.open(`/api/export/invoice/${invoiceId}`, "_blank")}
      >
        <PrinterIcon className="size-3.5" />
      </Button>
      {status === "draft" && (
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          title="Marcar como enviada"
          disabled={isPending}
          onClick={() => changeStatus("sent")}
        >
          <SendIcon className="size-3.5" />
        </Button>
      )}
      {(status === "draft" || status === "sent") && (
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          title="Marcar como pagada"
          disabled={isPending}
          onClick={() => changeStatus("paid")}
        >
          <CheckCircleIcon className="size-3.5" />
        </Button>
      )}
      {status !== "cancelled" && status !== "paid" && (
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          title="Cancelar factura"
          disabled={isPending}
          onClick={() => changeStatus("cancelled")}
        >
          <XCircleIcon className="size-3.5" />
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon"
        className="size-8 text-muted-foreground hover:text-destructive"
        title="Eliminar factura"
        disabled={isPending}
        onClick={handleDelete}
      >
        <Trash2Icon className="size-3.5" />
      </Button>
    </div>
  );
}
