"use client";

import { DownloadIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

type ExportButtonsProps = {
  projectId: string;
  type: "budget" | "report";
};

export function ExportButtons({ projectId, type }: ExportButtonsProps) {
  function handleExport() {
    const url = `/api/export/${type}/${encodeURIComponent(projectId)}`;
    window.open(url, "_blank");
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport}>
      <DownloadIcon className="mr-2 h-4 w-4" />
      Exportar PDF
    </Button>
  );
}
