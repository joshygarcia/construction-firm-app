import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";

import { parseExcelFile } from "@/features/finance/excel-import";

/**
 * Build an .xlsx buffer from a 2D array of cell values, using `sheetName`
 * as the single worksheet. Returns an ArrayBuffer for parseExcelFile().
 */
function buildWorkbook(sheetName: string, rows: unknown[][]): ArrayBuffer {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const out = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  // `out` is a Uint8Array. Copy into a standalone ArrayBuffer to avoid
  // view-into-larger-buffer surprises.
  const u8 = out instanceof Uint8Array ? out : new Uint8Array(out);
  const ab = new ArrayBuffer(u8.byteLength);
  new Uint8Array(ab).set(u8);
  return ab;
}

describe("parseExcelFile — budget sheets", () => {
  it("parses a flat sheet with DESCRIPCION / CANTIDAD / UNIDAD / P. UNITARIO / TOTAL", () => {
    const buffer = buildWorkbook("Presupuesto", [
      ["CODIGO", "DESCRIPCION", "UNIDAD", "CANTIDAD", "P. UNITARIO", "TOTAL"],
      ["1.1", "Zapata aislada", "m3", 15, 12000, 180000],
      ["1.2", "Columna 30x30", "ml", 50, 4500, 225000],
    ]);

    const { budgetLines, transactions, errors } = parseExcelFile(buffer);
    expect(transactions).toHaveLength(0);
    expect(errors).toHaveLength(0);
    expect(budgetLines).toHaveLength(2);

    expect(budgetLines[0]).toMatchObject({
      lineCode: "1.1",
      description: "Zapata aislada",
      unit: "m3",
      quantity: 15,
      unitPrice: 12000,
      totalBudgeted: 180000,
    });
    expect(budgetLines[1]).toMatchObject({
      lineCode: "1.2",
      description: "Columna 30x30",
      unit: "ml",
      quantity: 50,
      unitPrice: 4500,
      totalBudgeted: 225000,
    });
  });

  it("accepts Spanish aliases (CONCEPTO, CANT., P.U., IMPORTE)", () => {
    const buffer = buildWorkbook("Presupuesto", [
      ["PARTIDA", "CONCEPTO", "UND.", "CANT.", "P.U.", "IMPORTE"],
      ["A", "Pintura interior", "m2", 120, 350, 42000],
    ]);

    const { budgetLines } = parseExcelFile(buffer);
    expect(budgetLines).toHaveLength(1);
    expect(budgetLines[0]).toMatchObject({
      lineCode: "A",
      description: "Pintura interior",
      unit: "m2",
      quantity: 120,
      unitPrice: 350,
      totalBudgeted: 42000,
    });
  });

  it("detects section header rows and inherits section on child items", () => {
    const buffer = buildWorkbook("Presupuesto", [
      ["CODIGO", "DESCRIPCION", "UNIDAD", "CANTIDAD", "P. UNITARIO", "TOTAL"],
      // Section header — no unit, no quantity, no price
      ["1", "PRELIMINARES", null, null, null, null],
      ["1.1", "Limpieza del solar", "m2", 200, 150, 30000],
      ["1.2", "Replanteo", "m2", 200, 50, 10000],
      // Next section header
      ["2", "HORMIGON ARMADO", null, null, null, null],
      ["2.1", "Zapata aislada", "m3", 15, 12000, 180000],
    ]);

    const { budgetLines } = parseExcelFile(buffer);

    // The header rows themselves should NOT appear as budget lines.
    expect(budgetLines).toHaveLength(3);

    expect(budgetLines[0]).toMatchObject({
      description: "Limpieza del solar",
      sectionName: "PRELIMINARES",
      sectionCode: "1",
    });
    expect(budgetLines[1]).toMatchObject({
      description: "Replanteo",
      sectionName: "PRELIMINARES",
      sectionCode: "1",
    });
    expect(budgetLines[2]).toMatchObject({
      description: "Zapata aislada",
      sectionName: "HORMIGON ARMADO",
      sectionCode: "2",
    });
  });

  it("captures category, subcategory, phase, area, and notes columns", () => {
    const buffer = buildWorkbook("Presupuesto", [
      [
        "DESCRIPCION",
        "CATEGORIA",
        "SUBCATEGORIA",
        "FASE",
        "AREA",
        "CANTIDAD",
        "UNIDAD",
        "P. UNITARIO",
        "TOTAL",
        "OBSERVACIONES",
      ],
      [
        "Cableado principal",
        "ELECTRICIDAD",
        "Alambrado",
        "Fase 1",
        "Planta baja",
        100,
        "ml",
        85,
        8500,
        "Cable 10 AWG",
      ],
    ]);

    const { budgetLines } = parseExcelFile(buffer);
    expect(budgetLines).toHaveLength(1);
    expect(budgetLines[0]).toMatchObject({
      description: "Cableado principal",
      categoryName: "ELECTRICIDAD",
      subcategoryName: "Alambrado",
      phase: "Fase 1",
      area: "Planta baja",
      notes: "Cable 10 AWG",
      quantity: 100,
      unit: "ml",
      unitPrice: 85,
      totalBudgeted: 8500,
    });
  });

  it("parses numbers with currency prefixes and thousand separators", () => {
    const buffer = buildWorkbook("Presupuesto", [
      ["DESCRIPCION", "CANTIDAD", "UNIDAD", "P. UNITARIO", "TOTAL"],
      ["Bloques 6''", "1,250", "ud", "RD$ 42.50", "RD$53,125.00"],
    ]);

    const { budgetLines } = parseExcelFile(buffer);
    expect(budgetLines).toHaveLength(1);
    expect(budgetLines[0]).toMatchObject({
      description: "Bloques 6''",
      quantity: 1250,
      unit: "ud",
      unitPrice: 42.5,
      totalBudgeted: 53125,
    });
  });

  it("handles 'EU' decimal format (1.234,56)", () => {
    const buffer = buildWorkbook("Presupuesto", [
      ["DESCRIPCION", "CANTIDAD", "P. UNITARIO", "TOTAL"],
      ["Item", "1.000", "12,50", "12.500,00"],
    ]);

    const { budgetLines } = parseExcelFile(buffer);
    expect(budgetLines[0]).toMatchObject({
      quantity: 1000,
      unitPrice: 12.5,
      totalBudgeted: 12500,
    });
  });
});

describe("parseExcelFile — transaction sheets", () => {
  it("parses a transaction sheet with common Spanish aliases", () => {
    const buffer = buildWorkbook("Movimientos", [
      ["FECHA", "CONCEPTO", "CATEGORIA", "IMPORTE", "FORMA DE PAGO", "TIPO"],
      ["15/03/2026", "Compra de cemento", "HORMIGON ARMADO", 12500, "Transferencia", "GASTO"],
      ["20/03/2026", "Abono cliente", "INGRESO", 50000, "Efectivo", "INGRESO"],
    ]);

    const { transactions } = parseExcelFile(buffer);
    expect(transactions).toHaveLength(2);
    expect(transactions[0]).toMatchObject({
      transactionDate: "2026-03-15",
      detail: "Compra de cemento",
      categoryName: "HORMIGON ARMADO",
      amount: 12500,
      paymentMethod: "Transferencia",
      transactionType: "expense",
    });
    expect(transactions[1]).toMatchObject({
      transactionDate: "2026-03-20",
      detail: "Abono cliente",
      amount: 50000,
      transactionType: "income",
    });
  });

  it("parses dd.mm.yyyy and 2-digit years", () => {
    const buffer = buildWorkbook("Movimientos", [
      ["FECHA", "DETALLE", "IMPORTE"],
      ["05.01.26", "Test", 100],
      ["05-06-1998", "Test old", 200],
    ]);

    const { transactions } = parseExcelFile(buffer);
    expect(transactions[0].transactionDate).toBe("2026-01-05");
    expect(transactions[1].transactionDate).toBe("1998-06-05");
  });
});

describe("parseExcelFile — formato 'ANÁLISIS DE COSTO' (cliente)", () => {
  // Réplica reducida del presupuesto real: secciones romanas (directo/indirecto),
  // grupos por letra (área/nivel), categorías numeradas y partidas decimales.
  const buffer = buildWorkbook("Hoja1", [
    ["CONSTRUPROYECT S.R.L."],
    ["ANALISIS DE COSTO"],
    ["I.-", "COSTOS DIRECTOS"],
    ["NO", "PARTIDAS", "CANT.", "UNIDAD", "PU", "VALOR", "SUBTOTAL"],
    ["A.-", "NIVEL N1"],
    [3, "HORMIGON ARMADO"],
    [3.01, "Columnas C1", 1.59, "M3", 91589.93, 145627.99],
    [3.02, "Columnas C2", 0.21, "M3", 87878.18, 18454.42, 164082.41],
    [null, null, null, null, null, null, 164082.41], // subtotal suelto → ignorar
    ["SUB-TOTAL NIVEL N1", null, null, null, null, null, 164082.41], // total → ignorar
    ["II.-", "COSTOS INDIRECTOS"],
    [1, "Dirección técnica", 12, "%", null, null, 913914.04], // indirecto: monto en SUBTOTAL
    ["TOTAL GENERAL", null, null, null, null, null, 1077996.45], // total → ignorar
  ]);
  const { budgetLines, errors } = parseExcelFile(buffer);

  it("extrae las partidas con su categoría, área, código y total exacto", () => {
    expect(errors).toHaveLength(0);
    expect(budgetLines).toHaveLength(3);

    const c1 = budgetLines.find((l) => l.description === "Columnas C1");
    expect(c1).toMatchObject({
      categoryName: "HORMIGON ARMADO",
      area: "NIVEL N1",
      quantity: 1.59,
      unit: "M3",
      unitPrice: 91589.93,
      totalBudgeted: 145627.99,
      lineCode: "3.01",
    });
  });

  it("trata las filas indirectas como 'COSTOS INDIRECTOS' con monto del subtotal", () => {
    const indirect = budgetLines.find((l) => l.description === "Dirección técnica");
    expect(indirect).toMatchObject({
      categoryName: "COSTOS INDIRECTOS",
      totalBudgeted: 913914.04,
      unit: "%",
    });
  });

  it("ignora filas de subtotal/total y reconcilia el total general", () => {
    const total = budgetLines.reduce((s, l) => s + l.totalBudgeted, 0);
    expect(total).toBeCloseTo(1077996.45, 2);
  });
});
