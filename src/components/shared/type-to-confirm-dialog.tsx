"use client";

import { startTransition, useState } from "react";
import { LoaderCircleIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function TypeToConfirmDialog({
  title,
  description,
  requireText = "eliminar",
  confirmLabel = "Eliminar",
  trigger,
  onConfirm,
}: {
  title: string;
  description: string;
  requireText?: string;
  confirmLabel?: string;
  trigger: React.ReactNode;
  onConfirm: () => Promise<{ ok: boolean; message: string }>;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const canConfirm = text.trim().toLowerCase() === requireText.toLowerCase();

  function handleConfirm() {
    if (!canConfirm) return;
    setPending(true);
    startTransition(async () => {
      try {
        await onConfirm();
      } finally {
        setPending(false);
        setOpen(false);
        setText("");
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setText("");
      }}
    >
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Para confirmar, escribe{" "}
            <span className="font-semibold text-foreground">{requireText}</span>.
          </p>
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={requireText}
            onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={pending || !canConfirm}>
            {pending && <LoaderCircleIcon className="animate-spin" data-icon="inline-start" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
