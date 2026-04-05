import * as XLSX from "xlsx";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ParsedTransaction = {
  transactionDate: string;
  amount: number;
  detail: string;
  categoryName: string;
  subcategoryName: string;
  payeeOrSource: string;
  paymentMethod: string;
  transactionType: "expense" | "income";
};

export type ParsedBudgetLine = {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalBudgeted: number;
  lineCode: string;
  sectionName: string;
};

export type ExcelImportResult = {
  transactions: ParsedTransaction[];
  budgetLines: ParsedBudgetLine[];
  errors: string[];
};

// ---------------------------------------------------------------------------
// Header detection helpers
// ---------------------------------------------------------------------------

/** Normalise a header cell value for comparison. */
function norm(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // strip diacritics
}

/**
 * Known column aliases (normalised, without diacritics) mapped to canonical
 * field names used by the parser.
 */
const TRANSACTION_HEADER_MAP: Record<string, keyof ParsedTransaction> = {
  CATEGORIA: "categoryName",
  CATEGORÍA: "categoryName",
  SUBCATEGORIA: "subcategoryName",
  SUBCATEGORÍA: "subcategoryName",
  FECHA: "transactionDate",
  DETALLE: "detail",
  DESCRIPCION: "detail",
  DESCRIPCIÓN: "detail",
  IMPORTE: "amount",
  MONTO: "amount",
  CANTIDAD: "amount",
  VALOR: "amount",
  SUPLIDOR: "payeeOrSource",
  PROVEEDOR: "payeeOrSource",
  FUENTE: "payeeOrSource",
  BENEFICIARIO: "payeeOrSource",
  "METODO DE PAGO": "paymentMethod",
  "MÉTODO DE PAGO": "paymentMethod",
  METODO: "paymentMethod",
  MÉTODO: "paymentMethod",
  PAGO: "paymentMethod",
  TIPO: "transactionType",
};

const BUDGET_HEADER_MAP: Record<string, keyof ParsedBudgetLine> = {
  DESCRIPCION: "description",
  DESCRIPCIÓN: "description",
  DETALLE: "description",
  CANTIDAD: "quantity",
  QTY: "quantity",
  UNIDAD: "unit",
  UD: "unit",
  UND: "unit",
  "PRECIO UNITARIO": "unitPrice",
  "P. UNITARIO": "unitPrice",
  "P.U.": "unitPrice",
  UNITARIO: "unitPrice",
  TOTAL: "totalBudgeted",
  "TOTAL PRESUPUESTADO": "totalBudgeted",
  SUBTOTAL: "totalBudgeted",
  CODIGO: "lineCode",
  CÓDIGO: "lineCode",
  PARTIDA: "lineCode",
  SECCION: "sectionName",
  SECCIÓN: "sectionName",
};

type HeaderMapping<T> = { colIndex: number; field: keyof T };

/**
 * Scan rows until we find one where at least `minMatches` cells match
 * known header names. Returns the row index and a col→field mapping.
 */
function detectHeaders<T>(
  sheet: unknown[][],
  aliasMap: Record<string, keyof T>,
  minMatches: number,
): { headerRow: number; mapping: HeaderMapping<T>[] } | null {
  for (let r = 0; r < Math.min(sheet.length, 20); r++) {
    const row = sheet[r];
    if (!row) continue;
    const mapping: HeaderMapping<T>[] = [];
    const seenFields = new Set<keyof T>();

    for (let c = 0; c < row.length; c++) {
      const normalised = norm(row[c]);
      const field = aliasMap[normalised];
      if (field && !seenFields.has(field)) {
        mapping.push({ colIndex: c, field });
        seenFields.add(field);
      }
    }

    if (mapping.length >= minMatches) {
      return { headerRow: r, mapping };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Cell value helpers
// ---------------------------------------------------------------------------

function cellString(value: unknown): string {
  if (value == null) return "";
  return String(value).trim();
}

function cellNumber(value: unknown): number {
  if (value == null) return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Attempt to parse a date cell. XLSX often delivers a JS serial number for
 * dates; it can also be an ISO string or a local dd/mm/yyyy string.
 */
function cellDate(value: unknown): string | null {
  if (value == null) return null;

  // XLSX serial number
  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      const y = String(parsed.y).padStart(4, "0");
      const m = String(parsed.m).padStart(2, "0");
      const d = String(parsed.d).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
    return null;
  }

  const str = String(value).trim();

  // ISO-ish: 2024-03-15 or 2024-03-15T...
  const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2].padStart(2, "0")}-${isoMatch[3].padStart(2, "0")}`;
  }

  // dd/mm/yyyy or dd-mm-yyyy
  const localMatch = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (localMatch) {
    return `${localMatch[3]}-${localMatch[2].padStart(2, "0")}-${localMatch[1].padStart(2, "0")}`;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Transaction type heuristic
// ---------------------------------------------------------------------------

function inferTransactionType(
  raw: string,
  sheetName: string,
): "expense" | "income" {
  const upper = norm(raw);
  if (upper === "INGRESO" || upper === "INCOME") return "income";
  if (upper === "GASTO" || upper === "EGRESO" || upper === "EXPENSE")
    return "expense";

  // Fall back to sheet name
  const sn = norm(sheetName);
  if (sn.includes("INGRESO") || sn.includes("INCOME")) return "income";

  return "expense"; // default
}

// ---------------------------------------------------------------------------
// Main parse function
// ---------------------------------------------------------------------------

export function parseExcelFile(buffer: ArrayBuffer): ExcelImportResult {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: false });

  const transactions: ParsedTransaction[] = [];
  const budgetLines: ParsedBudgetLine[] = [];
  const errors: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    const ws = workbook.Sheets[sheetName];
    if (!ws) continue;

    const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, {
      header: 1,
      defval: null,
      blankrows: false,
    });

    if (rows.length < 2) continue;

    // Try transaction headers first
    const txDetect = detectHeaders<ParsedTransaction>(
      rows,
      TRANSACTION_HEADER_MAP,
      3, // need at least fecha + amount + one more
    );

    if (txDetect) {
      const { headerRow, mapping } = txDetect;

      for (let r = headerRow + 1; r < rows.length; r++) {
        const row = rows[r];
        if (!row) continue;

        try {
          const record: Record<string, unknown> = {};
          for (const m of mapping) {
            record[m.field as string] = row[m.colIndex];
          }

          const amount = cellNumber(record.amount);
          if (amount === 0) continue; // skip empty rows

          const dateStr = cellDate(record.transactionDate);
          if (!dateStr) {
            errors.push(
              `Hoja "${sheetName}", fila ${r + 1}: fecha inválida "${record.transactionDate}"`,
            );
            continue;
          }

          transactions.push({
            transactionDate: dateStr,
            amount: Math.abs(amount),
            detail: cellString(record.detail) || "Sin detalle",
            categoryName: cellString(record.categoryName),
            subcategoryName: cellString(record.subcategoryName),
            payeeOrSource: cellString(record.payeeOrSource),
            paymentMethod: cellString(record.paymentMethod) || "Efectivo",
            transactionType: inferTransactionType(
              cellString(record.transactionType),
              sheetName,
            ),
          });
        } catch {
          errors.push(
            `Hoja "${sheetName}", fila ${r + 1}: error al procesar fila`,
          );
        }
      }

      continue; // sheet handled, move on
    }

    // Try budget-line headers
    const blDetect = detectHeaders<ParsedBudgetLine>(
      rows,
      BUDGET_HEADER_MAP,
      3,
    );

    if (blDetect) {
      const { headerRow, mapping } = blDetect;

      for (let r = headerRow + 1; r < rows.length; r++) {
        const row = rows[r];
        if (!row) continue;

        try {
          const record: Record<string, unknown> = {};
          for (const m of mapping) {
            record[m.field as string] = row[m.colIndex];
          }

          const description = cellString(record.description);
          if (!description) continue;

          const quantity = cellNumber(record.quantity);
          const unitPrice = cellNumber(record.unitPrice);
          const totalBudgeted = cellNumber(record.totalBudgeted);

          budgetLines.push({
            description,
            quantity: quantity || 1,
            unit: cellString(record.unit) || "ud",
            unitPrice,
            totalBudgeted:
              totalBudgeted > 0 ? totalBudgeted : quantity * unitPrice,
            lineCode: cellString(record.lineCode),
            sectionName: cellString(record.sectionName),
          });
        } catch {
          errors.push(
            `Hoja "${sheetName}", fila ${r + 1}: error al procesar línea de presupuesto`,
          );
        }
      }

      continue;
    }

    // Sheet had no recognisable headers
    if (rows.length > 2) {
      errors.push(
        `Hoja "${sheetName}": no se detectaron columnas conocidas (CATEGORÍA, FECHA, IMPORTE, etc.)`,
      );
    }
  }

  return { transactions, budgetLines, errors };
}
