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
  /** Section code inferred from a dotted prefix in lineCode ("2" for "2.3.4"). */
  sectionCode: string;
  categoryName: string;
  subcategoryName: string;
  phase: string;
  area: string;
  notes: string;
};

export type ExcelImportResult = {
  transactions: ParsedTransaction[];
  budgetLines: ParsedBudgetLine[];
  errors: string[];
};

// ---------------------------------------------------------------------------
// Header detection helpers
// ---------------------------------------------------------------------------

/**
 * Normalise a header cell value for comparison. Strips accents, uppercases,
 * replaces dots with spaces (so "P. UNIT.", "P.U.", "P.UNIT" all collapse to
 * equivalent forms), and collapses whitespace. Keep this in sync with the
 * map keys below — keys should be written in the same normalised form.
 */
function norm(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .replace(/\./g, " ") // dots → spaces
    .replace(/\s+/g, " ") // collapse whitespace
    .trim();
}

/**
 * Known column aliases (normalised, without diacritics) mapped to canonical
 * field names used by the parser. Keys are pre-normalised — keep them
 * uppercase, no accents, single spaces.
 */
/**
 * Header alias maps. Keys MUST be written in the same form that norm()
 * produces: uppercase, no accents, no dots, collapsed whitespace.
 * Validated at module load time by a runtime assertion at the bottom.
 */
const TRANSACTION_HEADER_MAP: Record<string, keyof ParsedTransaction> = {
  CATEGORIA: "categoryName",
  RUBRO: "categoryName",
  SUBCATEGORIA: "subcategoryName",
  "SUB CATEGORIA": "subcategoryName",
  "SUB-CATEGORIA": "subcategoryName",
  FECHA: "transactionDate",
  "FECHA DE PAGO": "transactionDate",
  "FECHA MOVIMIENTO": "transactionDate",
  DETALLE: "detail",
  DESCRIPCION: "detail",
  CONCEPTO: "detail",
  IMPORTE: "amount",
  MONTO: "amount",
  VALOR: "amount",
  SUPLIDOR: "payeeOrSource",
  PROVEEDOR: "payeeOrSource",
  FUENTE: "payeeOrSource",
  BENEFICIARIO: "payeeOrSource",
  "PAGADO A": "payeeOrSource",
  "METODO DE PAGO": "paymentMethod",
  "FORMA DE PAGO": "paymentMethod",
  METODO: "paymentMethod",
  VIA: "paymentMethod",
  "VIA DE PAGO": "paymentMethod",
  PAGO: "paymentMethod",
  TIPO: "transactionType",
  "TIPO DE MOVIMIENTO": "transactionType",
  MOVIMIENTO: "transactionType",
};

const BUDGET_HEADER_MAP: Record<string, keyof ParsedBudgetLine> = {
  // Description
  DESCRIPCION: "description",
  DETALLE: "description",
  CONCEPTO: "description",
  ACTIVIDAD: "description",
  ITEM: "description",
  DESIGNACION: "description",
  TRABAJO: "description",
  TAREA: "description",

  // Quantity
  CANTIDAD: "quantity",
  CANT: "quantity",
  CANTIDADES: "quantity",
  QTY: "quantity",

  // Unit
  UNIDAD: "unit",
  UD: "unit",
  UND: "unit",
  UDS: "unit",
  U: "unit",
  UM: "unit",
  "U/M": "unit",

  // Unit price — remember dots are normalised to spaces, so
  // "P.U." and "P. U." both collapse to "P U".
  "PRECIO UNITARIO": "unitPrice",
  "PRECIO UNIT": "unitPrice",
  "P UNITARIO": "unitPrice",
  "P UNIT": "unitPrice",
  "P U": "unitPrice",
  "P/U": "unitPrice",
  PU: "unitPrice",
  UNITARIO: "unitPrice",
  "COSTO UNITARIO": "unitPrice",
  PRECIO: "unitPrice",

  // Totals
  TOTAL: "totalBudgeted",
  "TOTAL PRESUPUESTADO": "totalBudgeted",
  "TOTAL PARCIAL": "totalBudgeted",
  SUBTOTAL: "totalBudgeted",
  IMPORTE: "totalBudgeted",
  MONTO: "totalBudgeted",
  COSTO: "totalBudgeted",
  "COSTO TOTAL": "totalBudgeted",
  VALOR: "totalBudgeted",

  // Line code
  CODIGO: "lineCode",
  PARTIDA: "lineCode",
  NO: "lineCode",
  NUM: "lineCode",
  N: "lineCode",
  "#": "lineCode",

  // Section
  SECCION: "sectionName",
  CAPITULO: "sectionName",
  GRUPO: "sectionName",

  // Category (chart of accounts)
  CATEGORIA: "categoryName",
  RUBRO: "categoryName",
  SUBCATEGORIA: "subcategoryName",
  "SUB-CATEGORIA": "subcategoryName",
  "SUB CATEGORIA": "subcategoryName",

  // Phase / area / notes
  FASE: "phase",
  ETAPA: "phase",
  AREA: "area",
  ZONA: "area",
  UBICACION: "area",
  LUGAR: "area",
  NOTAS: "notes",
  OBSERVACIONES: "notes",
  OBSERVACION: "notes",
  COMENTARIOS: "notes",
  COMENTARIO: "notes",
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

/**
 * Parse a number from an Excel cell. Handles:
 *  - raw numbers
 *  - strings with thousand separators ("1,234.56" or "1.234,56")
 *  - currency prefixes ("RD$1,234.56", "$1,234")
 *  - parentheses for negatives ("(1,234)")
 */
function cellNumber(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  let s = String(value).trim();
  if (!s) return 0;

  // Parenthesis negative
  const neg = /^\(.*\)$/.test(s);
  if (neg) s = s.slice(1, -1);

  // Strip currency symbols & spaces
  s = s.replace(/RD\$|US\$|\$|€|£|\s/g, "");

  // Heuristic for "1.234,56" vs "1,234.56" vs the ambiguous single-separator
  // cases "1,234" and "1.000". For currency data we treat a lone separator
  // followed by exactly 3 digits as a thousand separator (since having
  // exactly 3 decimal places is rare for money).
  const hasComma = s.includes(",");
  const hasDot = s.includes(".");
  if (hasComma && hasDot) {
    // Whichever separator appears last is the decimal separator.
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (hasComma && !hasDot) {
    // "1,234" → 1234; "1,50" → 1.50
    const m = s.match(/^-?\d+,(\d{1,2})$/);
    s = m ? s.replace(",", ".") : s.replace(/,/g, "");
  } else if (!hasComma && hasDot) {
    // Multiple dots → all thousand separators ("1.234.567").
    // Single dot with exactly 3 digits after → thousand separator ("1.000").
    // Single dot with 1–2 or 4+ digits after → decimal point.
    const dotCount = (s.match(/\./g) ?? []).length;
    if (dotCount > 1) {
      s = s.replace(/\./g, "");
    } else {
      const m = s.match(/^-?\d+\.(\d+)$/);
      if (m && m[1].length === 3) s = s.replace(".", "");
    }
  }

  const n = Number(s);
  if (!Number.isFinite(n)) return 0;
  return neg ? -n : n;
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

  // dd/mm/yyyy or dd-mm-yyyy (also dd.mm.yyyy)
  const localMatch = str.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (localMatch) {
    const dd = localMatch[1].padStart(2, "0");
    const mm = localMatch[2].padStart(2, "0");
    let yyyy = localMatch[3];
    if (yyyy.length === 2) {
      // 2-digit years: 00-69 → 2000s, 70-99 → 1900s
      const n = parseInt(yyyy, 10);
      yyyy = n <= 69 ? String(2000 + n) : String(1900 + n);
    }
    return `${yyyy}-${mm}-${dd}`;
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
  if (upper === "INGRESO" || upper === "INGRESOS" || upper === "INCOME") return "income";
  if (
    upper === "GASTO" ||
    upper === "GASTOS" ||
    upper === "EGRESO" ||
    upper === "EGRESOS" ||
    upper === "EXPENSE"
  ) {
    return "expense";
  }

  // Fall back to sheet name
  const sn = norm(sheetName);
  if (sn.includes("INGRESO") || sn.includes("INCOME") || sn.includes("COBRO")) {
    return "income";
  }

  return "expense"; // default
}

// ---------------------------------------------------------------------------
// Section header detection (for hierarchical budget sheets)
// ---------------------------------------------------------------------------

/**
 * Extract the top-level section code from a dotted line code.
 * "2.3.4" → "2", "2.1" → "2", "2" → "2", "" → "".
 */
function topLevelCode(code: string): string {
  if (!code) return "";
  const m = code.trim().match(/^(\d+)/);
  return m ? m[1] : "";
}

/**
 * Determine if a row looks like a section header rather than a line item:
 *  - has a description,
 *  - no quantity, no unit price, no total,
 *  - no meaningful unit.
 * Header rows in DR budgets typically look like "2. HORMIGON ARMADO"
 * with the remaining cells empty.
 */
function isSectionHeaderRow(
  description: string,
  quantity: number,
  unitPrice: number,
  totalBudgeted: number,
  unit: string,
): boolean {
  if (!description) return false;
  if (quantity > 0) return false;
  if (unitPrice > 0) return false;
  if (totalBudgeted > 0) return false;
  if (unit) return false;
  return true;
}

// ---------------------------------------------------------------------------
// "ANÁLISIS DE COSTO" parser (formato jerárquico del cliente)
// ---------------------------------------------------------------------------
//
// Estructura de una sola hoja:
//   I.-  COSTOS DIRECTOS                      (sección romana -> directo)
//     A.-  NIVEL N1 / TRABAJOS PRELIMINARES   (letra -> área)
//        1   HORMIGON ARMADO                  (entero sin montos -> categoría)
//           1.01  Columnas C1  | CANT | UND | PU | VALOR   (partida)
//        SUB-TOTAL ...                        (se ignora)
//   II.- COSTOS INDIRECTOS                    (sección romana -> indirecto)
//        1   Dirección técnica  | 12 | % |  | | SUBTOTAL=monto  (partida indirecta)
//   TOTAL GENERAL                             (se ignora)

type CostAnalysisCols = {
  code?: number;
  desc?: number;
  qty?: number;
  unit?: number;
  pu?: number;
  valor?: number;
  subtotal?: number;
};

/**
 * Detecta la fila de encabezado del formato "ANÁLISIS DE COSTO". La firma es
 * una columna "PARTIDAS" junto a "VALOR" o "SUBTOTAL". Sólo se activa con
 * "PARTIDAS" para no secuestrar otros formatos de presupuesto.
 */
function detectCostAnalysisHeader(
  rows: unknown[][],
): { headerRow: number; cols: CostAnalysisCols } | null {
  for (let r = 0; r < Math.min(rows.length, 15); r++) {
    const row = rows[r];
    if (!row) continue;
    const cols: CostAnalysisCols = {};
    let hasPartidas = false;

    for (let c = 0; c < row.length; c++) {
      const n = norm(row[c]);
      if (n === "PARTIDAS") {
        hasPartidas = true;
        if (cols.desc == null) cols.desc = c;
      }
      if ((n === "DESCRIPCION" || n === "DESIGNACION") && cols.desc == null) cols.desc = c;
      if ((n === "NO" || n === "CODIGO" || n === "#" || n === "NUM" || n === "PARTIDA") && cols.code == null) cols.code = c;
      if ((n === "CANT" || n === "CANTIDAD") && cols.qty == null) cols.qty = c;
      if ((n === "UNIDAD" || n === "UND" || n === "UD" || n === "U") && cols.unit == null) cols.unit = c;
      if ((n === "PU" || n === "P U" || n === "P/U" || n === "PRECIO UNITARIO") && cols.pu == null) cols.pu = c;
      if ((n === "VALOR" || n === "IMPORTE") && cols.valor == null) cols.valor = c;
      if ((n === "SUBTOTAL" || n === "SUB TOTAL") && cols.subtotal == null) cols.subtotal = c;
    }

    if (hasPartidas && cols.desc != null && (cols.valor != null || cols.subtotal != null)) {
      return { headerRow: r, cols };
    }
  }
  return null;
}

const ROMAN_MARKER = /^(I{1,3}|IV|VI{0,3}|IX|XI{0,2}|V|X)\.?-?$/;
const LETTER_MARKER = /^[A-HJ-Z]\.?-?$/; // excluye "I" para no chocar con romano

function isTotalRow(row: unknown[]): boolean {
  return row.some((cell) => {
    const k = norm(cell).replace(/[^A-Z]/g, "");
    return k.startsWith("SUBTOTAL") || k.startsWith("TOTAL");
  });
}

function parseCostAnalysisSheet(
  rows: unknown[][],
  headerRow: number,
  cols: CostAnalysisCols,
): ParsedBudgetLine[] {
  const lines: ParsedBudgetLine[] = [];
  let costType: "direct" | "indirect" = "direct";
  let area = "";
  let category = "";

  const cell = (row: unknown[], c?: number) => (c != null ? row[c] : null);

  for (let r = headerRow + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row) continue;
    if (isTotalRow(row)) continue;

    const aRaw = cell(row, cols.code);
    const aStr = cellString(aRaw);
    const desc = cellString(cell(row, cols.desc));
    const qty = cellNumber(cell(row, cols.qty));
    const pu = cellNumber(cell(row, cols.pu));
    const valor = cellNumber(cell(row, cols.valor));
    const subtotal = cellNumber(cell(row, cols.subtotal));
    const unit = cellString(cell(row, cols.unit));
    const descNorm = norm(desc);

    // Sección romana (COSTOS DIRECTOS / INDIRECTOS)
    if (ROMAN_MARKER.test(aStr) || /COSTOS\s+(DIRECTOS|INDIRECTOS)/.test(descNorm)) {
      costType = descNorm.includes("INDIRECTO") ? "indirect" : "direct";
      area = "";
      category = "";
      continue;
    }

    // Grupo por letra (área / nivel)
    if (LETTER_MARKER.test(aStr)) {
      area = desc;
      category = "";
      continue;
    }

    // Categoría (entero sin montos) — sólo en costos directos
    const aIsInt = typeof aRaw === "number" && Number.isInteger(aRaw);
    if (costType === "direct" && aIsInt && qty === 0 && pu === 0 && valor === 0) {
      category = desc;
      continue;
    }

    // Partida: requiere descripción
    if (!desc) continue;

    const total = valor > 0 ? valor : subtotal > 0 ? subtotal : qty * pu;
    const lineCategory = costType === "indirect" ? "COSTOS INDIRECTOS" : category;
    const code =
      typeof aRaw === "number"
        ? Number.isInteger(aRaw)
          ? String(aRaw)
          : aRaw.toFixed(2)
        : aStr;

    lines.push({
      description: desc,
      quantity: qty > 0 ? qty : 1,
      unit: unit || (costType === "indirect" ? "%" : "ud"),
      unitPrice: pu,
      totalBudgeted: total,
      lineCode: code,
      sectionName: "",
      sectionCode: "",
      categoryName: lineCategory,
      subcategoryName: "",
      phase: "",
      area,
      notes: "",
    });
  }

  return lines;
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

    // Formato "ANÁLISIS DE COSTO" del cliente (jerárquico, columna PARTIDAS).
    // Se intenta primero porque el detector genérico no mapea "PARTIDAS".
    const costAnalysis = detectCostAnalysisHeader(rows);
    if (costAnalysis) {
      const caLines = parseCostAnalysisSheet(
        rows,
        costAnalysis.headerRow,
        costAnalysis.cols,
      );
      if (caLines.length > 0) {
        budgetLines.push(...caLines);
        continue;
      }
    }

    // Try transaction headers first. A sheet only counts as transactions if
    // it has a FECHA column — otherwise a budget sheet with CATEGORIA/
    // SUBCATEGORIA columns would be misinterpreted as one.
    const txDetect = detectHeaders<ParsedTransaction>(
      rows,
      TRANSACTION_HEADER_MAP,
      3, // need at least fecha + amount + one more
    );
    const hasDateColumn =
      txDetect?.mapping.some((m) => m.field === "transactionDate") ?? false;
    const hasAmountColumn =
      txDetect?.mapping.some((m) => m.field === "amount") ?? false;

    if (txDetect && hasDateColumn && hasAmountColumn) {
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
      2, // relaxed — many budget sheets have just description + price
    );

    if (blDetect) {
      const { headerRow, mapping } = blDetect;

      // Track the running section inferred from header-like rows.
      // Map keyed by top-level numeric code for fast lookup when rows
      // arrive out of order (they rarely do, but it's cheap).
      let currentSectionName = "";
      let currentSectionCode = "";
      const sectionByTopCode = new Map<string, string>();

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
          const unit = cellString(record.unit);
          const lineCode = cellString(record.lineCode);
          const explicitSection = cellString(record.sectionName);
          const topCode = topLevelCode(lineCode);

          // Detect a section header row — it has description but nothing
          // quantitative. We capture it as the running section and DON'T
          // emit it as a budget line.
          if (
            !explicitSection &&
            isSectionHeaderRow(
              description,
              quantity,
              unitPrice,
              totalBudgeted,
              unit,
            )
          ) {
            currentSectionName = description;
            currentSectionCode = topCode || "";
            if (currentSectionCode) {
              sectionByTopCode.set(currentSectionCode, description);
            }
            continue;
          }

          // Resolve the section: prefer the row's own section column, else
          // look up by top-level code from lineCode, else fall back to the
          // running section captured above.
          let sectionName = explicitSection;
          let sectionCode = explicitSection ? topCode : "";
          if (!sectionName && topCode && sectionByTopCode.has(topCode)) {
            sectionName = sectionByTopCode.get(topCode) ?? "";
            sectionCode = topCode;
          }
          if (!sectionName) {
            sectionName = currentSectionName;
            sectionCode = currentSectionCode;
          }

          budgetLines.push({
            description,
            quantity: quantity || 1,
            unit: unit || "ud",
            unitPrice,
            totalBudgeted:
              totalBudgeted > 0 ? totalBudgeted : quantity * unitPrice,
            lineCode,
            sectionName,
            sectionCode,
            categoryName: cellString(record.categoryName),
            subcategoryName: cellString(record.subcategoryName),
            phase: cellString(record.phase),
            area: cellString(record.area),
            notes: cellString(record.notes),
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
        `Hoja "${sheetName}": no se detectaron columnas conocidas (CATEGORÍA, FECHA, IMPORTE, DESCRIPCIÓN, etc.)`,
      );
    }
  }

  return { transactions, budgetLines, errors };
}
