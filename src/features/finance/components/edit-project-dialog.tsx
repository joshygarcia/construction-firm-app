"use client";

import { startTransition, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircleIcon, PencilIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { submitUpdateProject } from "@/features/finance/actions";
import {
  updateProjectSchema,
} from "@/features/finance/schemas";
import type { z } from "zod";

type UpdateProjectForm = z.input<typeof updateProjectSchema>;
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type ProjectData = {
  id: string;
  name: string;
  clientName: string;
  location: string;
  status: "draft" | "active" | "paused" | "completed";
  startDate: string;
  endDate: string | null;
  notes: string;
};

export function EditProjectDialog({
  project,
}: {
  project: ProjectData;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const form = useForm<UpdateProjectForm>({
    resolver: zodResolver(updateProjectSchema),
    defaultValues: {
      id: project.id,
      name: project.name,
      clientName: project.clientName,
      location: project.location,
      status: project.status,
      startDate: project.startDate,
      endDate: project.endDate ?? "",
      notes: project.notes,
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await submitUpdateProject(values as any);

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      setOpen(false);
      router.refresh();
    });
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="icon-sm">
            <PencilIcon />
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar proyecto</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
          <FieldGroup>
            <Field data-invalid={!!form.formState.errors.name}>
              <FieldLabel htmlFor="edit-proj-name">Nombre</FieldLabel>
              <Input id="edit-proj-name" {...form.register("name")} />
              <FieldError errors={[form.formState.errors.name]} />
            </Field>
            <Field data-invalid={!!form.formState.errors.clientName}>
              <FieldLabel htmlFor="edit-proj-client">Cliente</FieldLabel>
              <Input id="edit-proj-client" {...form.register("clientName")} />
              <FieldError errors={[form.formState.errors.clientName]} />
            </Field>
            <Field data-invalid={!!form.formState.errors.location}>
              <FieldLabel htmlFor="edit-proj-location">Ubicación</FieldLabel>
              <Input id="edit-proj-location" {...form.register("location")} />
              <FieldError errors={[form.formState.errors.location]} />
            </Field>
            <Field data-invalid={!!form.formState.errors.startDate}>
              <FieldLabel htmlFor="edit-proj-start">Fecha de inicio</FieldLabel>
              <Input id="edit-proj-start" type="date" {...form.register("startDate")} />
              <FieldError errors={[form.formState.errors.startDate]} />
            </Field>
            <Field>
              <FieldLabel htmlFor="edit-proj-end">Fecha de fin</FieldLabel>
              <Input id="edit-proj-end" type="date" {...form.register("endDate")} />
            </Field>
            <Field>
              <FieldLabel htmlFor="edit-proj-notes">Notas</FieldLabel>
              <Textarea id="edit-proj-notes" rows={3} {...form.register("notes")} />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && (
                <LoaderCircleIcon className="animate-spin" data-icon="inline-start" />
              )}
              Guardar cambios
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
