"use client";

import * as React from "react";
import { FileSpreadsheetIcon, UploadIcon, XIcon, Loader2Icon, CheckCircle2Icon, AlertTriangleIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { submitExcelImport } from "@/features/finance/actions";
import type { ActionResult } from "@/features/finance/actions";
import { parseExcelFile, type ParsedTransaction, type ParsedBudgetLine } from "@/features/finance/excel-import";
import { formatCurrency } from "@/lib/format";

type PreviewData = {
  transactions: ParsedTransaction[];
  budgetLines: ParsedBudgetLine[];
  errors: string[];
};

export function ExcelImportPanel({
  projects,
}: {
  projects: { id: string; name: string }[];
}) {
  const [file, setFile] = React.useState<File | null>(null);
  const [projectId, setProjectId] = React.useState(projects[0]?.id ?? "");
  const [preview, setPreview] = React.useState<PreviewData | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isParsing, setIsParsing] = React.useState(false);
  const [result, setResult] = React.useState<ActionResult | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  async function handleFile(selected: File) {
    setFile(selected);
    setResult(null);
    setIsParsing(true);

    try {
      const buffer = await selected.arrayBuffer();
      const parsed = parseExcelFile(buffer);
      setPreview(parsed);
    } catch {
      setPreview({ transactions: [], budgetLines: [], errors: ["Error al leer el archivo."] });
    } finally {
      setIsParsing(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped && (dropped.name.endsWith(".xlsx") || dropped.name.endsWith(".xls"))) {
      handleFile(dropped);
    }
  }

  function handleClear() {
    setFile(null);
    setPreview(null);
    setResult(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleImport() {
    if (!file || !projectId) return;
    setIsLoading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("projectId", projectId);
      const res = await submitExcelImport(formData);
      setResult(res);
      if (res.ok) {
        setPreview(null);
        setFile(null);
        if (inputRef.current) inputRef.current.value = "";
      }
    } catch {
      setResult({ ok: false, message: "Error inesperado al importar." });
    } finally {
      setIsLoading(false);
    }
  }

  const totalTransactions = preview?.transactions.length ?? 0;
  const totalBudgetLines = preview?.budgetLines.length ?? 0;
  const hasData = totalTransactions > 0 || totalBudgetLines > 0;

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheetIcon className="size-4" />
          Importar desde Excel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Project selector */}
        <div className="space-y-1.5">
          <label htmlFor="import-project" className="text-sm font-medium text-foreground">
            Proyecto destino
          </label>
          <select
            id="import-project"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Dropzone */}
        <div
          role="button"
          tabIndex={0}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
          }}
          className={`relative flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
            isDragging
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-muted-foreground/50"
          }`}
        >
          <UploadIcon className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Arrastra un archivo .xlsx aquí o <span className="font-medium text-foreground underline">selecciónalo</span>
          </p>
          <p className="text-xs text-muted-foreground/70">
            Columnas esperadas: CATEGORÍA, FECHA, IMPORTE, DETALLE, etc.
          </p>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
        </div>

        {/* File info */}
        {file && (
          <div className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-sm">
            <div className="flex items-center gap-2">
              <FileSpreadsheetIcon className="size-4 text-muted-foreground" />
              <span className="font-medium">{file.name}</span>
              <span className="text-muted-foreground">
                ({(file.size / 1024).toFixed(1)} KB)
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleClear} disabled={isLoading}>
              <XIcon className="size-3.5" />
            </Button>
          </div>
        )}

        {/* Parsing indicator */}
        {isParsing && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2Icon className="size-4 animate-spin" />
            Analizando archivo...
          </div>
        )}

        {/* Parse errors */}
        {preview && preview.errors.length > 0 && (
          <div className="space-y-1 rounded-md border border-yellow-500/30 bg-yellow-500/5 p-3">
            <p className="flex items-center gap-1.5 text-sm font-medium text-yellow-700 dark:text-yellow-400">
              <AlertTriangleIcon className="size-3.5" />
              Advertencias ({preview.errors.length})
            </p>
            <ul className="list-inside list-disc space-y-0.5 text-xs text-yellow-700/80 dark:text-yellow-400/80">
              {preview.errors.slice(0, 5).map((err, i) => (
                <li key={i}>{err}</li>
              ))}
              {preview.errors.length > 5 && (
                <li>...y {preview.errors.length - 5} más</li>
              )}
            </ul>
          </div>
        )}

        {/* Preview summary badges */}
        {preview && hasData && (
          <div className="flex items-center gap-2">
            {totalTransactions > 0 && (
              <Badge variant="secondary">
                {totalTransactions} {totalTransactions === 1 ? "transacción" : "transacciones"}
              </Badge>
            )}
            {totalBudgetLines > 0 && (
              <Badge variant="secondary">
                {totalBudgetLines} {totalBudgetLines === 1 ? "línea presupuestaria" : "líneas presupuestarias"}
              </Badge>
            )}
          </div>
        )}

        {/* Transactions preview table */}
        {preview && totalTransactions > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Vista previa: Transacciones</h4>
            <div className="max-h-64 overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Detalle</TableHead>
                    <TableHead className="text-right">Importe</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.transactions.slice(0, 50).map((tx, i) => (
                    <TableRow key={i}>
                      <TableCell>{tx.transactionDate}</TableCell>
                      <TableCell>
                        <Badge variant={tx.transactionType === "income" ? "default" : "destructive"}>
                          {tx.transactionType === "income" ? "Ingreso" : "Gasto"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {tx.categoryName || "—"}
                        {tx.subcategoryName ? ` / ${tx.subcategoryName}` : ""}
                      </TableCell>
                      <TableCell className="max-w-48 truncate">{tx.detail}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(tx.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {totalTransactions > 50 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        ...y {totalTransactions - 50} filas más
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Budget lines preview table */}
        {preview && totalBudgetLines > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Vista previa: Líneas de presupuesto</h4>
            <div className="max-h-64 overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Sección</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Cant.</TableHead>
                    <TableHead>Unidad</TableHead>
                    <TableHead className="text-right">P. Unit.</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.budgetLines.slice(0, 50).map((bl, i) => (
                    <TableRow key={i}>
                      <TableCell>{bl.lineCode || "—"}</TableCell>
                      <TableCell className="max-w-40 truncate text-muted-foreground">
                        {bl.sectionName || bl.categoryName || "—"}
                      </TableCell>
                      <TableCell className="max-w-48 truncate">
                        {bl.description}
                        {(bl.phase || bl.area) && (
                          <span className="ml-1 text-xs text-muted-foreground">
                            {[bl.phase, bl.area].filter(Boolean).join(" · ")}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{bl.quantity}</TableCell>
                      <TableCell>{bl.unit}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(bl.unitPrice)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(bl.totalBudgeted)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {totalBudgetLines > 50 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        ...y {totalBudgetLines - 50} filas más
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Import button */}
        {preview && hasData && !result?.ok && (
          <Button onClick={handleImport} disabled={isLoading || !projectId}>
            {isLoading ? (
              <>
                <Loader2Icon className="size-3.5 animate-spin" data-icon="inline-start" />
                Importando...
              </>
            ) : (
              <>
                <UploadIcon className="size-3.5" data-icon="inline-start" />
                Importar {totalTransactions + totalBudgetLines} registros
              </>
            )}
          </Button>
        )}

        {/* Result feedback */}
        {result && (
          <div
            className={`flex items-start gap-2 rounded-md p-3 text-sm ${
              result.ok
                ? "border border-green-500/30 bg-green-500/5 text-green-700 dark:text-green-400"
                : "border border-destructive/30 bg-destructive/5 text-destructive"
            }`}
          >
            {result.ok ? (
              <CheckCircle2Icon className="mt-0.5 size-4 shrink-0" />
            ) : (
              <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
            )}
            <span>{result.message}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
