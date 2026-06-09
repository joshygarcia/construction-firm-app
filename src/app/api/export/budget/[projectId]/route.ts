import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { NextResponse } from "next/server";

import { orderBudgetLinesForDisplay } from "@/features/finance/ledger";
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
  const { project, budgetLines } = overview;
  const catName = new Map(data.categories.map((c) => [c.id, c.name]));
  const subName = new Map(data.subcategories.map((s) => [s.id, s.name]));

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

  // Tabla agrupada por Nivel -> Categoría -> Subcategoría
  const tableHead = [["Descripcion", "Cant.", "Und.", "P.U.", "Presupuestado"]];

  type Cell = string | { content: string; colSpan?: number; styles?: Record<string, unknown> };
  const tableBody: Cell[][] = [];

  const nivelOf = (area: string | null) => (area && area.trim() ? area.trim() : null);
  const hasNiveles = budgetLines.some((l) => nivelOf(l.area) !== null);

  const lineRow = (line: (typeof budgetLines)[number]): Cell[] => [
    line.description,
    fmtNumber(line.quantity),
    line.unit ?? "",
    line.unitPrice !== null ? fmtCurrency(line.unitPrice) : "",
    fmtCurrency(line.totalBudgeted),
  ];

  const subtotalRow = (label: string, b: number, styles: Record<string, unknown>): Cell[] => [
    { content: label, colSpan: 4, styles },
    { content: fmtCurrency(b), styles },
  ];

  // Orden de visualización idéntico al de la app (por sortOrder de las partidas).
  const ordered = orderBudgetLinesForDisplay(budgetLines);

  const nivelOrder: (string | null)[] = [];
  const seenNivel = new Set<string>();
  for (const l of ordered) {
    const n = nivelOf(l.area);
    const key = n ?? "__none";
    if (!seenNivel.has(key)) {
      seenNivel.add(key);
      nivelOrder.push(n);
    }
  }

  function renderCategory(catId: string | null, catLines: (typeof budgetLines)): number {
    tableBody.push([
      { content: catId ? catName.get(catId) ?? "Sin categoría" : "Sin categoría", colSpan: 5, styles: { fontStyle: "bold", fillColor: [235, 235, 235] } },
    ]);

    const bySub = new Map<string, typeof budgetLines>();
    for (const l of catLines) {
      const k = l.subcategoryId ?? "__nosub";
      if (!bySub.has(k)) bySub.set(k, []);
      bySub.get(k)!.push(l);
    }
    const subOrder: string[] = [];
    const seenSub = new Set<string>();
    for (const l of catLines) {
      const k = l.subcategoryId ?? "__nosub";
      if (!seenSub.has(k)) {
        seenSub.add(k);
        subOrder.push(k);
      }
    }
    const onlyNoSub = subOrder.length === 1 && subOrder[0] === "__nosub";

    let cb = 0;
    for (const subId of subOrder) {
      const subLines = bySub.get(subId)!;
      const subLabel = subId === "__nosub" ? "Sin subcategoría" : subName.get(subId) ?? "";
      if (!onlyNoSub) {
        tableBody.push([{ content: `   ${subLabel}`, colSpan: 5, styles: { fontStyle: "italic", textColor: [140, 90, 40] } }]);
      }
      let sb = 0;
      for (const line of subLines) {
        sb += line.totalBudgeted;
        tableBody.push(lineRow(line));
      }
      if (!onlyNoSub) {
        tableBody.push(subtotalRow(`   Subtotal ${subLabel}`, sb, { fontStyle: "italic" }));
      }
      cb += sb;
    }

    tableBody.push(subtotalRow(`Subtotal ${catId ? catName.get(catId) ?? "Sin categoría" : "Sin categoría"}`, cb, { fontStyle: "bold" }));
    return cb;
  }

  let grandBudgeted = 0;

  for (const nivel of nivelOrder) {
    const nivelLines = ordered.filter((l) => nivelOf(l.area) === nivel);
    if (hasNiveles) {
      tableBody.push([
        {
          content: `NIVEL · ${nivel ?? "Sin nivel"}`,
          colSpan: 5,
          styles: {
            fontStyle: "bold",
            fillColor: [38, 70, 120],
            textColor: [255, 255, 255],
            fontSize: 10,
            cellPadding: 3,
          },
        },
      ]);
    }
    const byCat = new Map<string, typeof budgetLines>();
    for (const l of nivelLines) {
      const k = l.categoryId ?? "__nocat";
      if (!byCat.has(k)) byCat.set(k, []);
      byCat.get(k)!.push(l);
    }
    const catKeyOrder: string[] = [];
    const seenCat = new Set<string>();
    for (const l of nivelLines) {
      const k = l.categoryId ?? "__nocat";
      if (!seenCat.has(k)) {
        seenCat.add(k);
        catKeyOrder.push(k);
      }
    }
    let nb = 0;
    for (const catKey of catKeyOrder) {
      nb += renderCategory(catKey === "__nocat" ? null : catKey, byCat.get(catKey)!);
    }
    if (hasNiveles) {
      tableBody.push(subtotalRow(`Subtotal nivel ${nivel ?? "Sin nivel"}`, nb, {
        fontStyle: "bold",
        fillColor: [219, 229, 245],
        textColor: [38, 70, 120],
      }));
    }
    grandBudgeted += nb;
  }

  tableBody.push([
    { content: "TOTAL GENERAL", colSpan: 4, styles: { fontStyle: "bold", fillColor: [180, 120, 60], textColor: [255, 255, 255] } },
    { content: fmtCurrency(grandBudgeted), styles: { fontStyle: "bold", fillColor: [180, 120, 60], textColor: [255, 255, 255] } },
  ]);

  autoTable(doc, {
    startY: 48,
    head: tableHead,
    body: tableBody,
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [180, 120, 60], textColor: [255, 255, 255], fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 88 },
      1: { cellWidth: 18, halign: "right" },
      2: { cellWidth: 16 },
      3: { cellWidth: 28, halign: "right" },
      4: { cellWidth: 32, halign: "right" },
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
