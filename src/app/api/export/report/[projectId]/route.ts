import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { NextResponse } from "next/server";

import { getProjectOverview } from "@/features/finance/store";

function fmtCurrency(value: number): string {
  return `RD$${value.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/export/report/[projectId]">,
) {
  const { projectId } = await ctx.params;
  const overview = getProjectOverview(projectId);

  if (!overview) {
    return NextResponse.json(
      { error: "Proyecto no encontrado" },
      { status: 404 },
    );
  }

  const { project, summary, budgetVsActualMonthly } = overview;

  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFont("helvetica");

  // Header
  doc.setFontSize(16);
  doc.text("REPORTE PRESUPUESTO VS REAL", 14, 20);
  doc.setFontSize(12);
  doc.text(project.name, 14, 28);
  doc.setFontSize(9);
  doc.text(`Fecha: ${new Date().toLocaleDateString("es-DO")}`, 14, 35);

  // Summary section
  doc.setFontSize(10);
  doc.text(`Presupuesto Total: ${fmtCurrency(summary.totalBudget)}`, 14, 43);
  doc.text(`Ingresos Totales: ${fmtCurrency(summary.totalIncome)}`, 100, 43);
  doc.text(`Gastos Totales: ${fmtCurrency(summary.totalExpenses)}`, 14, 50);
  doc.text(`Efectivo Disponible: ${fmtCurrency(summary.cashAvailable)}`, 100, 50);

  // Collect all unique months across all rows
  const monthSet = new Set<string>();
  for (const row of budgetVsActualMonthly) {
    for (const month of Object.keys(row.months)) {
      monthSet.add(month);
    }
  }
  const months = [...monthSet].sort();

  // Format month headers
  const monthLabels = months.map((m) => {
    const [year, monthNum] = m.split("-");
    const date = new Date(Number(year), Number(monthNum) - 1);
    return date.toLocaleDateString("es-DO", { month: "short", year: "2-digit" });
  });

  // Table head
  const tableHead = [
    ["Categoria", "Subcategoria", "Presupuesto", ...monthLabels, "Total Real", "Diferencia"],
  ];

  // Table body
  const tableBody = budgetVsActualMonthly.map((row) => [
    row.categoryName,
    row.subcategoryName,
    fmtCurrency(row.budgeted),
    ...months.map((m) => {
      const val = row.months[m];
      return val ? fmtCurrency(val) : "";
    }),
    fmtCurrency(row.totalActual),
    fmtCurrency(row.difference),
  ]);

  // Totals row
  const totalBudgeted = budgetVsActualMonthly.reduce((sum, r) => sum + r.budgeted, 0);
  const totalActual = budgetVsActualMonthly.reduce((sum, r) => sum + r.totalActual, 0);
  const totalDifference = totalBudgeted - totalActual;
  const monthTotals = months.map((m) => {
    const total = budgetVsActualMonthly.reduce((sum, r) => sum + (r.months[m] ?? 0), 0);
    return total > 0 ? fmtCurrency(total) : "";
  });

  tableBody.push([
    "TOTAL",
    "",
    fmtCurrency(totalBudgeted),
    ...monthTotals,
    fmtCurrency(totalActual),
    fmtCurrency(totalDifference),
  ]);

  autoTable(doc, {
    startY: 56,
    head: tableHead,
    body: tableBody,
    theme: "grid",
    styles: { fontSize: 7, cellPadding: 2 },
    headStyles: { fillColor: [180, 120, 60], textColor: [255, 255, 255], fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 30 },
      1: { cellWidth: 30 },
      2: { halign: "right" },
      ...Object.fromEntries(
        months.map((_, i) => [i + 3, { halign: "right" as const }]),
      ),
      [months.length + 3]: { halign: "right" },
      [months.length + 4]: { halign: "right" },
    },
    didParseCell(hookData) {
      // Style totals row
      if (hookData.row.index === tableBody.length - 1) {
        hookData.cell.styles.fontStyle = "bold";
        hookData.cell.styles.fillColor = [230, 230, 230];
      }
      // Highlight negative differences in red
      if (hookData.column.index === months.length + 4 && hookData.section === "body") {
        const row = budgetVsActualMonthly[hookData.row.index];
        if (row && row.difference < 0) {
          hookData.cell.styles.textColor = [200, 50, 50];
        }
      }
    },
  });

  const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

  return new Response(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="reporte-${project.name.replace(/[^a-zA-Z0-9]/g, "_")}.pdf"`,
    },
  });
}
