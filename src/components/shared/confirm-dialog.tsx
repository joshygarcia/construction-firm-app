"use client";

import { startTransition, useState } from "react";
import { LoaderCircleIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function ConfirmDialog({
  title,
  description,
  confirmLabel = "Eliminar",
  trigger,
  onConfirm,
}: {
  title: string;
  description: string;
  confirmLabel?: string;
  trigger: React.ReactNode;
  onConfirm: () => Promise<{ ok: boolean; message: string }>;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  function handleConfirm() {
    setPending(true);
    startTransition(async () => {
      try {
        await onConfirm();
      } finally {
        setPending(false);
        setOpen(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={pending}>
            {pending && <LoaderCircleIcon className="animate-spin" data-icon="inline-start" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
