import { jsPDF } from "jspdf";
import { NextResponse } from "next/server";

import { getAppData } from "@/features/finance/store";

function fmtCurrency(value: number): string {
  return `RD$${value.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/export/receipt/[transactionId]">,
) {
  const { transactionId } = await ctx.params;
  const data = getAppData();
  const txn = data.transactions.find(
    (t) => t.id === transactionId && t.deletedAt === null,
  );

  if (!txn) {
    return NextResponse.json(
      { error: "Movimiento no encontrado" },
      { status: 404 },
    );
  }

  const isIncome = txn.transactionType === "income";
  const categoryName = txn.categoryId
    ? data.categories.find((c) => c.id === txn.categoryId)?.name ?? ""
    : "";
  const subcategoryName = txn.subcategoryId
    ? data.subcategories.find((s) => s.id === txn.subcategoryId)?.name ?? ""
    : "";
  const receiptNo = `REC-${txn.id.slice(-6).toUpperCase()}`;

  const doc = new jsPDF();
  doc.setFont("helvetica");

  // Encabezado
  doc.setFontSize(16);
  doc.text(data.organization.name, 14, 20);
  doc.setFontSize(14);
  doc.text(isIncome ? "RECIBO DE INGRESO" : "RECIBO DE EGRESO", 14, 30);
  doc.setFontSize(11);
  doc.text(`No. ${receiptNo}`, 14, 38);

  doc.setFontSize(9);
  doc.text(
    `Fecha: ${new Date(txn.transactionDate + "T00:00:00").toLocaleDateString("es-DO")}`,
    14,
    46,
  );

  // Cuerpo
  let y = 60;
  const line = (label: string, value: string) => {
    if (!value) return;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(label, 14, y);
    doc.setFont("helvetica", "normal");
    const valueLines = doc.splitTextToSize(value, 150);
    doc.text(valueLines, 60, y);
    y += 7 * Math.max(1, valueLines.length);
  };

  line(isIncome ? "Recibido de:" : "Pagado a:", txn.payeeOrSource || "—");
  line("Concepto:", txn.detail || "—");
  if (!isIncome && categoryName) line("Categoría:", categoryName);
  if (!isIncome && subcategoryName) line("Subcategoría:", subcategoryName);
  line("Método de pago:", txn.paymentMethod || "—");

  // Monto destacado
  y += 6;
  doc.setDrawColor(180, 120, 60);
  doc.setLineWidth(0.5);
  doc.rect(14, y, 120, 16);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(`Monto: ${fmtCurrency(txn.amount)}`, 18, y + 11);

  // Firma
  y += 40;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.line(20, y, 90, y);
  doc.text("Firma", 45, y + 6);

  const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

  return new Response(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${receiptNo}.pdf"`,
    },
  });
}
