import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";

import { FinanceManager } from "@/components/finance/finance-manager";
import { PageHeader } from "@/components/shared/page-header";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import { getCompanyFinanceSnapshot } from "@/features/finance/store";

export default function FinanzasPage() {
  const snapshot = getCompanyFinanceSnapshot();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center gap-3 border-b border-border/50 bg-background/85 px-6 py-3 backdrop-blur-md">
        <Link href="/projects" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
          <ArrowLeftIcon className="size-3.5" data-icon="inline-start" />
          Proyectos
        </Link>
      </header>
      <div className="mx-auto w-full max-w-6xl">
        <PageHeader
          description="Caja, tarjetas, préstamos y movimientos mensuales de toda la empresa."
          eyebrow="Finanzas"
          title="Finanzas de la empresa"
        />
        <div className="px-4 py-6 md:px-6">
          <FinanceManager
            summary={snapshot.summary}
            cards={snapshot.cards}
            loans={snapshot.loans}
            payableContractors={snapshot.payable.contractors}
            monthlyMovements={snapshot.monthlyMovements}
          />
        </div>
      </div>
    </div>
  );
}
