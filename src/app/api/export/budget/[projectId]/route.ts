import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { NextResponse } from "next/server";

import { getAppData, getProjectOverview } from "@/features/finance/store";

function fmtCurrency(value: number): string {
  return `RD$${value.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtNumber(value: number | null): string {
  if (value === null) return "";
  return value.toLocaleString("es-DO", { maximumFractionDigits: 2 });
}

export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/export/budget/[projectId]">,
) {
  const { projectId } = await ctx.params;
  const overview = getProjectOverview(projectId);

  if (!overview) {
    return NextResponse.json(
      { error: "Proyecto no encontrado" },
      { status: 404 },
    );
  }

  const data = getAppData();
  const { project, budgetSections, budgetLines } = overview;

  const doc = new jsPDF();
  doc.setFont("helvetica");

  // Header
  doc.setFontSize(16);
  doc.text("ANALISIS DE COSTO", 14, 20);
  doc.setFontSize(11);
  doc.text(data.organization.name, 14, 28);
  doc.setFontSize(12);
  doc.text(project.name, 14, 36);
  doc.setFontSize(9);
  doc.text(`Fecha: ${new Date().toLocaleDateString("es-DO")}`, 14, 43);

  // Build table data grouped by section
  const tableHead = [
    ["Codigo", "Descripcion", "Cant.", "Und.", "P.U.", "Presupuestado", "Pagado", "Restante"],
  ];

  const tableBody: (string | { content: string; colSpan?: number; styles?: Record<string, unknown> })[][] = [];

  // Group lines by section
  const sectionMap = new Map(budgetSections.map((s) => [s.id, s]));

  // Build a map: sectionId -> lines
  const linesBySection = new Map<string | null, typeof budgetLines>();
  for (const line of budgetLines) {
    const key = line.sectionId;
    if (!linesBySection.has(key)) {
      linesBySection.set(key, []);
    }
    linesBySection.get(key)!.push(line);
  }

  // Calculate paid amounts per budget line from transactions
  const paidByBudgetLine = new Map<string, number>();
  for (const txn of overview.transactions) {
    if (txn.transactionType === "expense" && txn.budgetLineId) {
      paidByBudgetLine.set(
        txn.budgetLineId,
        (paidByBudgetLine.get(txn.budgetLineId) ?? 0) + txn.amount,
      );
    }
  }

  let grandBudgeted = 0;
  let grandPaid = 0;
  let directTotal = 0;
  let indirectTotal = 0;

  // Sort sections by sortOrder
  const sortedSections = [...budgetSections].sort((a, b) => a.sortOrder - b.sortOrder);

  for (const section of sortedSections) {
    const lines = linesBySection.get(section.id) ?? [];
    if (lines.length === 0) continue;

    // Section header row
    tableBody.push([
      {
        content: `${section.code} - ${section.name}`,
        colSpan: 8,
        styles: { fontStyle: "bold", fillColor: [230, 230, 230] },
      },
    ]);

    let sectionBudgeted = 0;
    let sectionPaid = 0;

    const sortedLines = [...lines].sort((a, b) => a.sortOrder - b.sortOrder);

    for (const line of sortedLines) {
      const paid = paidByBudgetLine.get(line.id) ?? 0;
      const remaining = line.totalBudgeted - paid;
      sectionBudgeted += line.totalBudgeted;
      sectionPaid += paid;

      tableBody.push([
        line.lineCode ?? "",
        line.description,
        fmtNumber(line.quantity),
        line.unit ?? "",
        line.unitPrice !== null ? fmtCurrency(line.unitPrice) : "",
        fmtCurrency(line.totalBudgeted),
        fmtCurrency(paid),
        fmtCurrency(remaining),
      ]);
    }

    // Section subtotal
    const sectionRemaining = sectionBudgeted - sectionPaid;
    tableBody.push([
      {
        content: `Subtotal ${section.name}`,
        colSpan: 5,
        styles: { fontStyle: "bold" },
      },
      { content: fmtCurrency(sectionBudgeted), styles: { fontStyle: "bold" } },
      { content: fmtCurrency(sectionPaid), styles: { fontStyle: "bold" } },
      { content: fmtCurrency(sectionRemaining), styles: { fontStyle: "bold" } },
    ]);

    grandBudgeted += sectionBudgeted;
    grandPaid += sectionPaid;

    if (section.costType === "direct") {
      directTotal += sectionBudgeted;
    } else {
      indirectTotal += sectionBudgeted;
    }
  }

  // Handle lines without a section
  const unsectionedLines = linesBySection.get(null) ?? [];
  if (unsectionedLines.length > 0) {
    tableBody.push([
      {
        content: "Sin seccion",
        colSpan: 8,
        styles: { fontStyle: "bold", fillColor: [230, 230, 230] },
      },
    ]);

    let unsectionedBudgeted = 0;
    let unsectionedPaid = 0;

    for (const line of unsectionedLines) {
      const paid = paidByBudgetLine.get(line.id) ?? 0;
      const remaining = line.totalBudgeted - paid;
      unsectionedBudgeted += line.totalBudgeted;
      unsectionedPaid += paid;

      tableBody.push([
        line.lineCode ?? "",
        line.description,
        fmtNumber(line.quantity),
        line.unit ?? "",
        line.unitPrice !== null ? fmtCurrency(line.unitPrice) : "",
        fmtCurrency(line.totalBudgeted),
        fmtCurrency(paid),
        fmtCurrency(remaining),
      ]);
    }

    grandBudgeted += unsectionedBudgeted;
    grandPaid += unsectionedPaid;
    directTotal += unsectionedBudgeted;
  }

  // Grand totals
  const grandRemaining = grandBudgeted - grandPaid;

  tableBody.push([
    {
      content: `Costos Directos`,
      colSpan: 5,
      styles: { fontStyle: "bold", fillColor: [200, 200, 200] },
    },
    { content: fmtCurrency(directTotal), styles: { fontStyle: "bold", fillColor: [200, 200, 200] } },
    { content: "", styles: { fillColor: [200, 200, 200] } },
    { content: "", styles: { fillColor: [200, 200, 200] } },
  ]);

  tableBody.push([
    {
      content: `Costos Indirectos`,
      colSpan: 5,
      styles: { fontStyle: "bold", fillColor: [200, 200, 200] },
    },
    { content: fmtCurrency(indirectTotal), styles: { fontStyle: "bold", fillColor: [200, 200, 200] } },
    { content: "", styles: { fillColor: [200, 200, 200] } },
    { content: "", styles: { fillColor: [200, 200, 200] } },
  ]);

  tableBody.push([
    {
      content: "TOTAL GENERAL",
      colSpan: 5,
      styles: { fontStyle: "bold", fillColor: [180, 120, 60], textColor: [255, 255, 255] },
    },
    { content: fmtCurrency(grandBudgeted), styles: { fontStyle: "bold", fillColor: [180, 120, 60], textColor: [255, 255, 255] } },
    { content: fmtCurrency(grandPaid), styles: { fontStyle: "bold", fillColor: [180, 120, 60], textColor: [255, 255, 255] } },
    { content: fmtCurrency(grandRemaining), styles: { fontStyle: "bold", fillColor: [180, 120, 60], textColor: [255, 255, 255] } },
  ]);

  autoTable(doc, {
    startY: 48,
    head: tableHead,
    body: tableBody,
    theme: "grid",
    styles: { fontSize: 7, cellPadding: 2 },
    headStyles: { fillColor: [180, 120, 60], textColor: [255, 255, 255], fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 18 },
      1: { cellWidth: 42 },
      2: { cellWidth: 14, halign: "right" },
      3: { cellWidth: 12 },
      4: { cellWidth: 22, halign: "right" },
      5: { cellWidth: 26, halign: "right" },
      6: { cellWidth: 26, halign: "right" },
      7: { cellWidth: 26, halign: "right" },
    },
  });

  const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

  return new Response(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="presupuesto-${project.name.replace(/[^a-zA-Z0-9]/g, "_")}.pdf"`,
    },
  });
}
