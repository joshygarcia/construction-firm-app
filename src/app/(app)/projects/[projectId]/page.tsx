import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { ProjectDetailView } from "@/components/projects/project-detail-view";
import { getDashboardSnapshot } from "@/features/finance/store";

export default async function ProjectDashboardPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const snapshot = getDashboardSnapshot(projectId);

  if (!snapshot) {
    notFound();
  }

  const { projectOverview } = snapshot;

  return (
    <>
      <PageHeader
        description="Lo importante de tu proyecto: caja, presupuesto y últimos movimientos."
        eyebrow="Panel"
        title={projectOverview.project.name}
      />
      <ProjectDetailView
        project={projectOverview.project}
        summary={projectOverview.summary}
        transactions={projectOverview.transactions}
        budgetVsActual={projectOverview.budgetVsActual}
        cashflow={projectOverview.cashflow}
      />
    </>
  );
}
