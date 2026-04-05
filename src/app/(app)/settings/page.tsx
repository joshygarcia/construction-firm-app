import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { CategoryManager } from "@/components/settings/category-manager";
import { ExcelImportPanel } from "@/components/settings/excel-import-panel";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getAppData } from "@/features/finance/store";

export default function SettingsPage() {
  const data = getAppData();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center gap-3 border-b border-border/50 bg-background/85 px-6 py-3 backdrop-blur-md">
        <Link href="/projects" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
          <ArrowLeftIcon className="size-3.5" data-icon="inline-start" />
          Proyectos
        </Link>
      </header>
      <div className="mx-auto w-full max-w-5xl">
        <PageHeader
          description="Parámetros base del MVP y recordatorio de lo que esta primera entrega sí y no incluye."
          eyebrow="Ajustes"
          title="Configuración y alcance"
        />
        <div className="grid gap-6 px-4 py-6 md:px-6 xl:grid-cols-2">
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Categorías y subcategorías</CardTitle>
            </CardHeader>
            <CardContent>
              <CategoryManager
                categories={data.categories}
                subcategories={data.subcategories}
              />
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Configuración activa</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm leading-7 text-muted-foreground">
                <div className="flex items-center gap-3">
                  <div className="h-1.5 w-1.5 rounded-full bg-copper/60" />
                  <p>Idioma principal: Español</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-1.5 w-1.5 rounded-full bg-copper/60" />
                  <p>Moneda principal: Peso dominicano (DOP)</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-1.5 w-1.5 rounded-full bg-copper/60" />
                  <p>Auth: cookie interna simple con roles admin/member</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-1.5 w-1.5 rounded-full bg-copper/60" />
                  <p>Origen de verdad: ledger único por proyecto</p>
                </div>
              </CardContent>
            </Card>
            <ExcelImportPanel
              projects={data.projects.map((p) => ({ id: p.id, name: p.name }))}
            />
            <Alert>
              <AlertTitle>Fuera de alcance en v1</AlertTitle>
              <AlertDescription>
                Aprobaciones multi-nivel, PWA y permisos avanzados se
                dejan listados como siguientes fases, no como deuda oculta.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </div>
    </div>
  );
}
