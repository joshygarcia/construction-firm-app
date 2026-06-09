import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";

import { PriceTableManager } from "@/components/precios/price-table-manager";
import { PageHeader } from "@/components/shared/page-header";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import { getAppData } from "@/features/finance/store";

export default function PreciosPage() {
  const data = getAppData();

  const items = data.priceItems.map((p) => ({
    id: p.id,
    categoryId: p.categoryId,
    subcategoryId: p.subcategoryId,
    name: p.name,
    unit: p.unit,
    unitPrice: p.unitPrice,
  }));
  const categories = data.categories.map((c) => ({ id: c.id, name: c.name }));
  const subcategories = data.subcategories.map((s) => ({
    id: s.id,
    categoryId: s.categoryId,
    name: s.name,
  }));

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
          description="Precios por unidad reutilizables. En el presupuesto se autocompletan al coincidir categoría, subcategoría y nombre."
          eyebrow="Tabla de precios"
          title="Tabla de precios"
        />
        <div className="px-4 py-6 md:px-6">
          <PriceTableManager items={items} categories={categories} subcategories={subcategories} />
        </div>
      </div>
    </div>
  );
}
