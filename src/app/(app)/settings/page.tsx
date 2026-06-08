import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { CategoryManager } from "@/components/settings/category-manager";
import { ExcelImportPanel } from "@/components/settings/excel-import-panel";
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
          description="Categorías del presupuesto, importar desde Excel y datos del programa."
          eyebrow="Ajustes"
          title="Ajustes"
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
            <Card>
              <CardHeader>
                <CardTitle>Sobre el programa</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm leading-7 text-muted-foreground">
                <div className="flex items-center gap-3">
                  <div className="h-1.5 w-1.5 rounded-full bg-copper/60" />
                  <p>Idioma: Español · Moneda: Peso dominicano (DOP)</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-1.5 w-1.5 rounded-full bg-copper/60" />
                  <p>Funciona sin internet; tus datos se guardan en esta computadora.</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-1.5 w-1.5 rounded-full bg-copper/60" />
                  <p>Las tarjetas y préstamos se administran en la sección Finanzas.</p>
                </div>
              </CardContent>
            </Card>
            <ExcelImportPanel
              projects={data.projects.map((p) => ({ id: p.id, name: p.name }))}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
