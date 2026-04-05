import { notFound } from "next/navigation";

import { ProjectShell } from "@/components/project-shell";
import { getProjectOverview } from "@/features/finance/store";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const overview = getProjectOverview(projectId);

  if (!overview) {
    notFound();
  }

  return (
    <ProjectShell projectId={projectId} projectName={overview.project.name}>
      {children}
    </ProjectShell>
  );
}
