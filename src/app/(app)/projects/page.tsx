import Link from "next/link";
import { Settings2Icon } from "lucide-react";

import { ProjectForm } from "@/features/finance/components/project-form";
import { ProjectsTable } from "@/features/finance/components/projects-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getProjectsWithSummary } from "@/features/finance/store";

export default function ProjectsPage() {
  const projects = getProjectsWithSummary();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between border-b border-border/50 bg-background/85 px-6 py-3 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary/90 to-primary/60">
            <span className="font-heading text-xs font-bold text-primary-foreground">CC</span>
          </div>
          <p className="font-heading text-sm font-semibold">Control Central</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/settings">
            <Button variant="ghost" size="icon-sm">
              <Settings2Icon className="size-4" />
            </Button>
          </Link>
        </div>
      </header>
      <div className="flex flex-1 flex-col items-center px-4 py-10 md:px-6">
        <div className="w-full max-w-5xl space-y-8">
          <div className="space-y-1.5">
            <h1 className="font-heading text-[28px] font-semibold tracking-tight md:text-[32px]">
              Tus proyectos
            </h1>
            <p className="text-[15px] text-muted-foreground">
              Abre un proyecto para ver su panel, o crea uno nuevo.
            </p>
          </div>
          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Proyectos</CardTitle>
              </CardHeader>
              <CardContent>
                <ProjectsTable projects={projects} />
              </CardContent>
            </Card>
            <ProjectForm />
          </div>
        </div>
      </div>
    </div>
  );
}
