"use client";

import { startTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircleIcon, PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { submitProject } from "@/features/finance/actions";
import { projectSchema, type ProjectInput } from "@/features/finance/schemas";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function ProjectForm() {
  const router = useRouter();
  const form = useForm<ProjectInput>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: "",
      clientName: "",
      location: "",
      startDate: new Date().toISOString().slice(0, 10),
      endDate: "",
      notes: "",
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await submitProject(values);

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      if (result.projectId) {
        router.push(`/projects/${result.projectId}`);
        router.refresh();
        return;
      }
      form.reset({
        name: "",
        clientName: "",
        location: "",
        startDate: new Date().toISOString().slice(0, 10),
        endDate: "",
        notes: "",
      });
      router.refresh();
    });
  });

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="font-heading text-xl tracking-tight">
          Crear proyecto
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-5" onSubmit={onSubmit}>
          <FieldGroup>
            <Field data-invalid={!!form.formState.errors.name}>
              <FieldLabel htmlFor="project-name">Nombre del proyecto</FieldLabel>
              <Input
                id="project-name"
                aria-invalid={!!form.formState.errors.name}
                {...form.register("name")}
              />
              <FieldError errors={[form.formState.errors.name]} />
            </Field>
            <Field data-invalid={!!form.formState.errors.clientName}>
              <FieldLabel htmlFor="client-name">Cliente</FieldLabel>
              <Input
                id="client-name"
                aria-invalid={!!form.formState.errors.clientName}
                {...form.register("clientName")}
              />
              <FieldError errors={[form.formState.errors.clientName]} />
            </Field>
            <Field data-invalid={!!form.formState.errors.location}>
              <FieldLabel htmlFor="project-location">Ubicación</FieldLabel>
              <Input
                id="project-location"
                aria-invalid={!!form.formState.errors.location}
                {...form.register("location")}
              />
              <FieldError errors={[form.formState.errors.location]} />
            </Field>
            <Field data-invalid={!!form.formState.errors.startDate}>
              <FieldLabel htmlFor="project-start">Fecha de inicio</FieldLabel>
              <Input
                id="project-start"
                aria-invalid={!!form.formState.errors.startDate}
                type="date"
                {...form.register("startDate")}
              />
              <FieldDescription>El proyecto queda activo inmediatamente.</FieldDescription>
              <FieldError errors={[form.formState.errors.startDate]} />
            </Field>
            <Field>
              <FieldLabel htmlFor="project-notes">Notas</FieldLabel>
              <Textarea id="project-notes" rows={4} {...form.register("notes")} />
            </Field>
          </FieldGroup>
          <Button disabled={form.formState.isSubmitting} type="submit">
            {form.formState.isSubmitting ? (
              <LoaderCircleIcon className="animate-spin" data-icon="inline-start" />
            ) : (
              <PlusIcon data-icon="inline-start" />
            )}
            Crear proyecto
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
