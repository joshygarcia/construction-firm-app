import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { NextResponse } from "next/server";

import { getAppData } from "@/features/finance/store";

function fmtCurrency(value: number): string {
  return `RD$${value.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/export/invoice/[invoiceId]">,
) {
  const { invoiceId } = await ctx.params;
  const data = getAppData();
  const invoice = data.invoices.find((i) => i.id === invoiceId);

  if (!invoice) {
    return NextResponse.json(
      { error: "Factura no encontrada" },
      { status: 404 },
    );
  }

  const doc = new jsPDF();
  doc.setFont("helvetica");

  // Header - Organization name
  doc.setFontSize(16);
  doc.text(data.organization.name, 14, 20);
  doc.setFontSize(14);
  doc.text("FACTURA", 14, 30);
  doc.setFontSize(11);
  doc.text(`No. ${invoice.invoiceNumber}`, 14, 38);

  // Dates
  doc.setFontSize(9);
  doc.text(
    `Fecha de emision: ${new Date(invoice.issueDate + "T00:00:00").toLocaleDateString("es-DO")}`,
    14,
    46,
  );
  if (invoice.dueDate) {
    doc.text(
      `Fecha de vencimiento: ${new Date(invoice.dueDate + "T00:00:00").toLocaleDateString("es-DO")}`,
      14,
      52,
    );
  }

  // Recipient info
  const recipientY = invoice.dueDate ? 62 : 56;
  doc.setFontSize(10);
  doc.text("Facturar a:", 14, recipientY);
  doc.setFontSize(9);
  doc.text(invoice.recipientName, 14, recipientY + 6);
  if (invoice.recipientDetail) {
    doc.text(invoice.recipientDetail, 14, recipientY + 12);
  }

  // Line items table
  const tableStartY = recipientY + (invoice.recipientDetail ? 20 : 14);

  const tableHead = [["Descripcion", "Cantidad", "Precio Unitario", "Total"]];

  const tableBody = invoice.lineItems.map((item) => [
    item.description,
    item.quantity.toLocaleString("es-DO"),
    fmtCurrency(item.unitPrice),
    fmtCurrency(item.total),
  ]);

  autoTable(doc, {
    startY: tableStartY,
    head: tableHead,
    body: tableBody,
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [180, 120, 60], textColor: [255, 255, 255], fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { cellWidth: 25, halign: "right" },
      2: { cellWidth: 35, halign: "right" },
      3: { cellWidth: 35, halign: "right" },
    },
  });

  // Totals section
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const finalY = (doc as any).lastAutoTable?.finalY ?? tableStartY + 40;

  const totalsX = 130;
  let totalsY = finalY + 10;

  doc.setFontSize(9);
  doc.text("Subtotal:", totalsX, totalsY);
  doc.text(fmtCurrency(invoice.subtotal), 175, totalsY, { align: "right" });

  totalsY += 7;
  doc.text(`ITBIS (${(invoice.taxRate * 100).toFixed(0)}%):`, totalsX, totalsY);
  doc.text(fmtCurrency(invoice.taxAmount), 175, totalsY, { align: "right" });

  totalsY += 7;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Total:", totalsX, totalsY);
  doc.text(fmtCurrency(invoice.total), 175, totalsY, { align: "right" });

  // Notes section
  if (invoice.notes) {
    totalsY += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Notas:", 14, totalsY);
    doc.setFontSize(8);
    const noteLines = doc.splitTextToSize(invoice.notes, 170);
    doc.text(noteLines, 14, totalsY + 6);
  }

  const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

  return new Response(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="factura-${invoice.invoiceNumber}.pdf"`,
    },
  });
}
