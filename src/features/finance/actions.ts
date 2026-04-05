"use server";

import { refresh } from "next/cache";

import type {
  CreateBudgetLineInput,
  CreateBudgetSectionInput,
  CreateBudgetVersionInput,
  CreateContractorContractInput,
  CreateContractorInput,
  CreateContractorPaymentInput,
  CreateExpenseInput,
  CreateIncomeInput,
  CreateInvoiceInput,
  CreateProjectInput,
  InvoiceLineItem,
  InvoiceStatus,
  SuggestionKind,
  UpdateBudgetLineInput as LedgerUpdateBudgetLineInput,
  UpdateBudgetSectionInput as LedgerUpdateBudgetSectionInput,
  UpdateBudgetVersionInput as LedgerUpdateBudgetVersionInput,
  UpdateContractorContractInput as LedgerUpdateContractorContractInput,
  UpdateContractorInput as LedgerUpdateContractorInput,
  UpdateProjectInput as LedgerUpdateProjectInput,
  UpdateTransactionInput as LedgerUpdateTransactionInput,
} from "@/features/finance/ledger";
import { parseExcelFile } from "@/features/finance/excel-import";
import {
  budgetLineSchema,
  budgetSectionSchema,
  budgetVersionSchema,
  contractorContractSchema,
  contractorPaymentSchema,
  contractorSchema,
  expenseSchema,
  incomeSchema,
  projectSchema,
  quickEntrySchema,
  updateBudgetLineSchema,
  updateBudgetSectionSchema,
  updateBudgetVersionSchema,
  updateContractorContractSchema,
  updateContractorSchema,
  updateProjectSchema,
  updateTransactionSchema,
  type BudgetLineInput,
  type ContractorPaymentInput,
  type ExpenseInput,
  type IncomeInput,
  type ProjectInput,
  type QuickEntryInput,
  type UpdateBudgetLineInput,
  type UpdateProjectInput,
  type UpdateTransactionInput,
} from "@/features/finance/schemas";
import {
  changeInvoiceStatus,
  editBudgetLine,
  editBudgetSection,
  editBudgetVersion,
  editContractor,
  editContractorContract,
  editProject,
  editTransaction,
  lockBudgetVersion,
  removeBudgetLine,
  removeBudgetSection,
  removeBudgetVersion,
  removeContractor,
  removeContractorContract,
  removeInvoice,
  removeProject,
  removeTransaction,
  saveBudgetLine,
  saveBudgetSection,
  saveBudgetVersion,
  editCategory,
  editSubcategory,
  removeCategory,
  removeSubcategory,
  saveCategory,
  saveContractor,
  saveContractorContract,
  saveContractorPayment,
  saveExpense,
  saveIncome,
  saveInvoice,
  saveProject,
  saveSubcategory,
  saveSuggestionOption,
  getAppData,
} from "@/features/finance/store";

export type ActionResult = {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string[] | undefined>;
  projectId?: string;
};

export type QuickEntryOptionResult = ActionResult & {
  option?: {
    value: string;
    label: string;
  };
};

function invalidResult(
  message: string,
  fieldErrors?: Record<string, string[] | undefined>,
): ActionResult {
  return {
    ok: false,
    message,
    fieldErrors,
  };
}

function invalidOptionResult(message: string): QuickEntryOptionResult {
  return {
    ok: false,
    message,
  };
}

function validateOptionValue(value: string, fieldLabel: string) {
  const trimmed = value.trim();

  if (trimmed.length < 2) {
    throw new Error(`${fieldLabel} debe tener al menos 2 caracteres.`);
  }

  return trimmed;
}

function mapProjectInput(input: ProjectInput): CreateProjectInput {
  return {
    name: input.name,
    clientName: input.clientName,
    location: input.location,
    startDate: input.startDate,
    endDate: input.endDate ?? null,
    notes: input.notes ?? "",
  };
}

function mapExpenseInput(input: ExpenseInput): CreateExpenseInput {
  return {
    projectId: input.projectId,
    transactionDate: input.transactionDate,
    categoryId: input.categoryId,
    subcategoryId: input.subcategoryId ?? null,
    budgetLineId: input.budgetLineId ?? null,
    amount: input.amount,
    detail: input.detail,
    payeeOrSource: input.payeeOrSource,
    paymentMethod: input.paymentMethod,
  };
}

function mapIncomeInput(input: IncomeInput): CreateIncomeInput {
  return {
    projectId: input.projectId,
    transactionDate: input.transactionDate,
    amount: input.amount,
    detail: input.detail,
    payeeOrSource: input.payeeOrSource,
    paymentMethod: input.paymentMethod,
  };
}

function mapContractorPaymentInput(
  input: ContractorPaymentInput,
): CreateContractorPaymentInput {
  return {
    projectId: input.projectId,
    contractorContractId: input.contractorContractId,
    transactionDate: input.transactionDate,
    amount: input.amount,
    detail: input.detail,
    paymentMethod: input.paymentMethod,
    notes: input.notes ?? "",
  };
}

function mapBudgetLineInput(input: BudgetLineInput): CreateBudgetLineInput {
  return {
    projectId: input.projectId,
    budgetVersionId: input.budgetVersionId,
    categoryId: input.categoryId,
    subcategoryId: input.subcategoryId ?? null,
    description: input.description,
    phase: input.phase ?? null,
    area: input.area ?? null,
    lineCode: input.lineCode ?? null,
    quantity: input.quantity,
    unit: input.unit,
    unitPrice: input.unitPrice,
    totalBudgeted:
      input.isManualTotal && typeof input.totalBudgeted === "number"
        ? input.totalBudgeted
        : input.quantity * input.unitPrice,
    notes: input.notes ?? "",
    isManualTotal: input.isManualTotal,
  };
}

export async function submitProject(input: ProjectInput): Promise<ActionResult> {
  const parsed = projectSchema.safeParse(input);

  if (!parsed.success) {
    return invalidResult("Revisa los campos del proyecto.", parsed.error.flatten().fieldErrors);
  }

  try {
    const project = saveProject(mapProjectInput(parsed.data));
    refresh();
    return {
      ok: true,
      message: "Proyecto creado correctamente.",
      projectId: project?.id,
    };
  } catch (error) {
    return invalidResult(
      error instanceof Error ? error.message : "No se pudo crear el proyecto.",
    );
  }
}

export async function createQuickEntryCategory(
  name: string,
): Promise<QuickEntryOptionResult> {
  try {
    const category = saveCategory({
      name: validateOptionValue(name, "La categoria"),
    });

    if (!category) {
      return invalidOptionResult("No se pudo crear la categoria.");
    }

    refresh();
    return {
      ok: true,
      message: "Categoria disponible para quick entry.",
      option: {
        value: category.id,
        label: category.name,
      },
    };
  } catch (error) {
    return invalidOptionResult(
      error instanceof Error ? error.message : "No se pudo crear la categoria.",
    );
  }
}

export async function createQuickEntrySubcategory(
  categoryId: string,
  name: string,
): Promise<QuickEntryOptionResult> {
  try {
    if (!categoryId) {
      return invalidOptionResult("Selecciona una categoria antes de crear la subcategoria.");
    }

    const subcategory = saveSubcategory({
      categoryId,
      name: validateOptionValue(name, "La subcategoria"),
    });

    if (!subcategory) {
      return invalidOptionResult("No se pudo crear la subcategoria.");
    }

    refresh();
    return {
      ok: true,
      message: "Subcategoria disponible para quick entry.",
      option: {
        value: subcategory.id,
        label: subcategory.name,
      },
    };
  } catch (error) {
    return invalidOptionResult(
      error instanceof Error ? error.message : "No se pudo crear la subcategoria.",
    );
  }
}

export async function createQuickEntrySuggestion(
  kind: SuggestionKind,
  value: string,
): Promise<QuickEntryOptionResult> {
  try {
    const option = saveSuggestionOption(
      kind,
      validateOptionValue(value, "La opcion"),
    );

    if (!option) {
      return invalidOptionResult("No se pudo guardar la opcion.");
    }

    refresh();
    return {
      ok: true,
      message: "Opcion guardada para futuras entradas.",
      option: {
        value: option.value,
        label: option.value,
      },
    };
  } catch (error) {
    return invalidOptionResult(
      error instanceof Error ? error.message : "No se pudo guardar la opcion.",
    );
  }
}

export async function submitQuickEntry(input: QuickEntryInput): Promise<ActionResult> {
  const parsed = quickEntrySchema.safeParse(input);

  if (!parsed.success) {
    return invalidResult(
      "Revisa los campos del movimiento.",
      parsed.error.flatten().fieldErrors,
    );
  }

  try {
    switch (parsed.data.mode) {
      case "expense":
        saveExpense(mapExpenseInput(expenseSchema.parse(parsed.data)));
        break;
      case "income":
        saveIncome(mapIncomeInput(incomeSchema.parse(parsed.data)));
        break;
      case "contractor_payment":
        saveContractorPayment(
          mapContractorPaymentInput(contractorPaymentSchema.parse(parsed.data)),
        );
        break;
      case "budget_line":
        saveBudgetLine(mapBudgetLineInput(budgetLineSchema.parse(parsed.data)));
        break;
    }

    refresh();
    return { ok: true, message: "Movimiento guardado y distribuido correctamente." };
  } catch (error) {
    return invalidResult(
      error instanceof Error ? error.message : "No se pudo guardar el movimiento.",
    );
  }
}

export async function submitBudgetLine(input: BudgetLineInput): Promise<ActionResult> {
  const parsed = budgetLineSchema.safeParse(input);

  if (!parsed.success) {
    return invalidResult(
      "Revisa los campos de la línea presupuestaria.",
      parsed.error.flatten().fieldErrors,
    );
  }

  try {
    saveBudgetLine(mapBudgetLineInput(parsed.data));
    refresh();
    return { ok: true, message: "Línea presupuestaria agregada." };
  } catch (error) {
    return invalidResult(
      error instanceof Error ? error.message : "No se pudo guardar la línea.",
    );
  }
}

export async function submitBudgetApproval(
  budgetVersionId: string,
): Promise<ActionResult> {
  try {
    lockBudgetVersion(budgetVersionId);
    refresh();
    return { ok: true, message: "Versión aprobada y bloqueada." };
  } catch (error) {
    return invalidResult(
      error instanceof Error ? error.message : "No se pudo aprobar la versión.",
    );
  }
}

export async function submitUpdateProject(
  input: UpdateProjectInput,
): Promise<ActionResult> {
  const parsed = updateProjectSchema.safeParse(input);

  if (!parsed.success) {
    return invalidResult(
      "Revisa los campos del proyecto.",
      parsed.error.flatten().fieldErrors,
    );
  }

  try {
    const project = editProject(parsed.data as LedgerUpdateProjectInput);
    refresh();
    return {
      ok: true,
      message: "Proyecto actualizado correctamente.",
      projectId: project?.id,
    };
  } catch (error) {
    return invalidResult(
      error instanceof Error ? error.message : "No se pudo actualizar el proyecto.",
    );
  }
}

export async function submitDeleteProject(
  projectId: string,
): Promise<ActionResult> {
  try {
    removeProject(projectId);
    refresh();
    return { ok: true, message: "Proyecto eliminado correctamente." };
  } catch (error) {
    return invalidResult(
      error instanceof Error ? error.message : "No se pudo eliminar el proyecto.",
    );
  }
}

export async function submitUpdateTransaction(
  input: UpdateTransactionInput,
): Promise<ActionResult> {
  const parsed = updateTransactionSchema.safeParse(input);

  if (!parsed.success) {
    return invalidResult(
      "Revisa los campos del movimiento.",
      parsed.error.flatten().fieldErrors,
    );
  }

  try {
    editTransaction(parsed.data as LedgerUpdateTransactionInput);
    refresh();
    return { ok: true, message: "Movimiento actualizado correctamente." };
  } catch (error) {
    return invalidResult(
      error instanceof Error ? error.message : "No se pudo actualizar el movimiento.",
    );
  }
}

export async function submitDeleteTransaction(
  transactionId: string,
): Promise<ActionResult> {
  try {
    removeTransaction(transactionId);
    refresh();
    return { ok: true, message: "Movimiento eliminado correctamente." };
  } catch (error) {
    return invalidResult(
      error instanceof Error ? error.message : "No se pudo eliminar el movimiento.",
    );
  }
}

export async function submitUpdateBudgetLine(
  input: UpdateBudgetLineInput,
): Promise<ActionResult> {
  const parsed = updateBudgetLineSchema.safeParse(input);

  if (!parsed.success) {
    return invalidResult(
      "Revisa los campos de la línea presupuestaria.",
      parsed.error.flatten().fieldErrors,
    );
  }

  try {
    editBudgetLine(parsed.data as LedgerUpdateBudgetLineInput);
    refresh();
    return { ok: true, message: "Línea presupuestaria actualizada." };
  } catch (error) {
    return invalidResult(
      error instanceof Error ? error.message : "No se pudo actualizar la línea.",
    );
  }
}

export async function submitDeleteBudgetLine(
  budgetLineId: string,
): Promise<ActionResult> {
  try {
    removeBudgetLine(budgetLineId);
    refresh();
    return { ok: true, message: "Línea presupuestaria eliminada." };
  } catch (error) {
    return invalidResult(
      error instanceof Error ? error.message : "No se pudo eliminar la línea.",
    );
  }
}

export async function submitCategory(name: string): Promise<ActionResult> {
  try {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      return invalidResult("El nombre debe tener al menos 2 caracteres.");
    }
    saveCategory({ name: trimmed });
    refresh();
    return { ok: true, message: "Categoría creada correctamente." };
  } catch (error) {
    return invalidResult(
      error instanceof Error ? error.message : "No se pudo crear la categoría.",
    );
  }
}

export async function submitUpdateCategory(
  id: string,
  name: string,
): Promise<ActionResult> {
  try {
    if (!id) return invalidResult("Categoría no encontrada.");
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      return invalidResult("El nombre debe tener al menos 2 caracteres.");
    }
    editCategory({ id, name: trimmed });
    refresh();
    return { ok: true, message: "Categoría actualizada correctamente." };
  } catch (error) {
    return invalidResult(
      error instanceof Error ? error.message : "No se pudo actualizar la categoría.",
    );
  }
}

export async function submitDeleteCategory(id: string): Promise<ActionResult> {
  try {
    removeCategory(id);
    refresh();
    return { ok: true, message: "Categoría eliminada correctamente." };
  } catch (error) {
    return invalidResult(
      error instanceof Error ? error.message : "No se pudo eliminar la categoría.",
    );
  }
}

export async function submitUpdateSubcategory(
  id: string,
  name: string,
): Promise<ActionResult> {
  try {
    if (!id) return invalidResult("Subcategoría no encontrada.");
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      return invalidResult("El nombre debe tener al menos 2 caracteres.");
    }
    editSubcategory({ id, name: trimmed });
    refresh();
    return { ok: true, message: "Subcategoría actualizada correctamente." };
  } catch (error) {
    return invalidResult(
      error instanceof Error ? error.message : "No se pudo actualizar la subcategoría.",
    );
  }
}

export async function submitDeleteSubcategory(id: string): Promise<ActionResult> {
  try {
    removeSubcategory(id);
    refresh();
    return { ok: true, message: "Subcategoría eliminada correctamente." };
  } catch (error) {
    return invalidResult(
      error instanceof Error ? error.message : "No se pudo eliminar la subcategoría.",
    );
  }
}

export async function submitSubcategory(
  categoryId: string,
  name: string,
): Promise<ActionResult> {
  try {
    if (!categoryId) {
      return invalidResult("Selecciona una categoría.");
    }
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      return invalidResult("El nombre debe tener al menos 2 caracteres.");
    }
    saveSubcategory({ categoryId, name: trimmed });
    refresh();
    return { ok: true, message: "Subcategoría creada correctamente." };
  } catch (error) {
    return invalidResult(
      error instanceof Error ? error.message : "No se pudo crear la subcategoría.",
    );
  }
}

export async function submitInvoice(formData: FormData): Promise<ActionResult> {
  try {
    const projectId = formData.get("projectId") as string;
    const recipientName = (formData.get("recipientName") as string)?.trim();
    const recipientDetail = (formData.get("recipientDetail") as string)?.trim() ?? "";
    const issueDate = formData.get("issueDate") as string;
    const dueDate = (formData.get("dueDate") as string) || null;
    const taxRate = parseFloat(formData.get("taxRate") as string) || 0;
    const notes = (formData.get("notes") as string)?.trim() ?? "";

    if (!projectId) {
      return invalidResult("El proyecto es obligatorio.");
    }
    if (!recipientName || recipientName.length < 2) {
      return invalidResult("El nombre del destinatario es obligatorio.");
    }
    if (!issueDate) {
      return invalidResult("La fecha de emisión es obligatoria.");
    }

    const lineItemsJson = formData.get("lineItems") as string;
    let lineItems: InvoiceLineItem[];

    try {
      lineItems = JSON.parse(lineItemsJson);
    } catch {
      return invalidResult("Las líneas de la factura son inválidas.");
    }

    if (!Array.isArray(lineItems) || lineItems.length === 0) {
      return invalidResult("Agrega al menos una línea a la factura.");
    }

    for (const item of lineItems) {
      if (!item.description?.trim()) {
        return invalidResult("Cada línea debe tener una descripción.");
      }
      if (typeof item.quantity !== "number" || item.quantity <= 0) {
        return invalidResult("La cantidad debe ser mayor a cero.");
      }
      if (typeof item.unitPrice !== "number" || item.unitPrice <= 0) {
        return invalidResult("El precio unitario debe ser mayor a cero.");
      }
    }

    const input: CreateInvoiceInput = {
      projectId,
      recipientName,
      recipientDetail,
      issueDate,
      dueDate,
      lineItems: lineItems.map((li) => ({
        description: li.description.trim(),
        quantity: li.quantity,
        unitPrice: li.unitPrice,
        total: li.quantity * li.unitPrice,
      })),
      taxRate,
      notes,
    };

    saveInvoice(input);
    refresh();
    return { ok: true, message: "Factura creada correctamente." };
  } catch (error) {
    return invalidResult(
      error instanceof Error ? error.message : "No se pudo crear la factura.",
    );
  }
}

export async function submitInvoiceStatusChange(
  invoiceId: string,
  status: InvoiceStatus,
): Promise<ActionResult> {
  try {
    if (!invoiceId) {
      return invalidResult("La factura es obligatoria.");
    }
    changeInvoiceStatus(invoiceId, status);
    refresh();
    return { ok: true, message: "Estado de factura actualizado." };
  } catch (error) {
    return invalidResult(
      error instanceof Error ? error.message : "No se pudo actualizar el estado.",
    );
  }
}

export async function submitDeleteInvoice(
  invoiceId: string,
): Promise<ActionResult> {
  try {
    if (!invoiceId) {
      return invalidResult("La factura es obligatoria.");
    }
    removeInvoice(invoiceId);
    refresh();
    return { ok: true, message: "Factura eliminada correctamente." };
  } catch (error) {
    return invalidResult(
      error instanceof Error ? error.message : "No se pudo eliminar la factura.",
    );
  }
}

export async function submitExcelImport(formData: FormData): Promise<ActionResult> {
  try {
    const file = formData.get("file") as File | null;
    const projectId = formData.get("projectId") as string | null;

    if (!file || file.size === 0) {
      return invalidResult("Selecciona un archivo Excel (.xlsx).");
    }

    if (!projectId) {
      return invalidResult("Selecciona un proyecto destino.");
    }

    const buffer = await file.arrayBuffer();
    const { transactions, budgetLines, errors } = parseExcelFile(buffer);

    if (transactions.length === 0 && budgetLines.length === 0) {
      const msg =
        errors.length > 0
          ? `No se encontraron datos importables. ${errors[0]}`
          : "No se encontraron datos importables en el archivo.";
      return invalidResult(msg);
    }

    const data = getAppData();

    // Build case-insensitive lookup maps for categories / subcategories
    const categoryByName = new Map(
      data.categories.map((c) => [c.name.trim().toLowerCase(), c]),
    );
    const subcategoryByName = new Map(
      data.subcategories.map((s) => [
        `${s.categoryId}::${s.name.trim().toLowerCase()}`,
        s,
      ]),
    );

    let importedTransactions = 0;
    let importedBudgetLines = 0;
    const importErrors: string[] = [...errors];

    // --- Import transactions ------------------------------------------------
    for (const tx of transactions) {
      try {
        // Resolve category (create if missing)
        let categoryId: string | null = null;
        if (tx.categoryName) {
          const existing = categoryByName.get(tx.categoryName.toLowerCase());
          if (existing) {
            categoryId = existing.id;
          } else {
            const created = saveCategory({ name: tx.categoryName });
            if (created) {
              categoryId = created.id;
              categoryByName.set(tx.categoryName.toLowerCase(), created);
            }
          }
        }

        // Resolve subcategory
        let subcategoryId: string | null = null;
        if (categoryId && tx.subcategoryName) {
          const key = `${categoryId}::${tx.subcategoryName.toLowerCase()}`;
          const existing = subcategoryByName.get(key);
          if (existing) {
            subcategoryId = existing.id;
          } else {
            const created = saveSubcategory({
              categoryId,
              name: tx.subcategoryName,
            });
            if (created) {
              subcategoryId = created.id;
              subcategoryByName.set(key, created);
            }
          }
        }

        if (tx.transactionType === "income") {
          saveIncome({
            projectId,
            transactionDate: tx.transactionDate,
            amount: tx.amount,
            detail: tx.detail,
            payeeOrSource: tx.payeeOrSource || "Importado",
            paymentMethod: tx.paymentMethod || "Efectivo",
          });
        } else {
          saveExpense({
            projectId,
            transactionDate: tx.transactionDate,
            categoryId: categoryId ?? "",
            subcategoryId,
            amount: tx.amount,
            detail: tx.detail,
            payeeOrSource: tx.payeeOrSource || "Importado",
            paymentMethod: tx.paymentMethod || "Efectivo",
          });
        }

        importedTransactions++;
      } catch (err) {
        importErrors.push(
          `Transacción "${tx.detail}": ${err instanceof Error ? err.message : "error desconocido"}`,
        );
      }
    }

    // --- Import budget lines ------------------------------------------------
    if (budgetLines.length > 0) {
      // Find or pick the first draft budget version for this project
      const budgetVersion = data.budgetVersions.find(
        (v) => v.projectId === projectId && v.status === "draft",
      );

      if (!budgetVersion) {
        importErrors.push(
          "No se encontró una versión de presupuesto en borrador para este proyecto. Las líneas de presupuesto no fueron importadas.",
        );
      } else {
        for (const bl of budgetLines) {
          try {
            saveBudgetLine({
              projectId,
              budgetVersionId: budgetVersion.id,
              categoryId: null,
              subcategoryId: null,
              description: bl.description,
              lineCode: bl.lineCode || null,
              quantity: bl.quantity,
              unit: bl.unit,
              unitPrice: bl.unitPrice,
              totalBudgeted: bl.totalBudgeted,
              notes: "",
              isManualTotal: bl.totalBudgeted !== bl.quantity * bl.unitPrice,
            });
            importedBudgetLines++;
          } catch (err) {
            importErrors.push(
              `Línea "${bl.description}": ${err instanceof Error ? err.message : "error desconocido"}`,
            );
          }
        }
      }
    }

    refresh();

    const parts: string[] = [];
    if (importedTransactions > 0) {
      parts.push(
        `${importedTransactions} ${importedTransactions === 1 ? "transacción importada" : "transacciones importadas"}`,
      );
    }
    if (importedBudgetLines > 0) {
      parts.push(
        `${importedBudgetLines} ${importedBudgetLines === 1 ? "línea de presupuesto importada" : "líneas de presupuesto importadas"}`,
      );
    }
    if (importErrors.length > 0) {
      parts.push(`${importErrors.length} advertencia(s)`);
    }

    return {
      ok: true,
      message: parts.join(", ") + ".",
    };
  } catch (error) {
    return invalidResult(
      error instanceof Error ? error.message : "No se pudo procesar el archivo.",
    );
  }
}

// ---------- Contractor actions ----------

export async function submitContractor(formData: FormData): Promise<ActionResult> {
  const input = {
    fullName: String(formData.get("fullName") ?? ""),
    trade: String(formData.get("trade") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    email: String(formData.get("email") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  };

  const parsed = contractorSchema.safeParse(input);
  if (!parsed.success) {
    return invalidResult(
      "Revisa los campos del contratista.",
      parsed.error.flatten().fieldErrors,
    );
  }

  try {
    saveContractor(parsed.data as CreateContractorInput);
    refresh();
    return { ok: true, message: "Contratista creado correctamente." };
  } catch (error) {
    return invalidResult(
      error instanceof Error ? error.message : "No se pudo crear el contratista.",
    );
  }
}

export async function submitUpdateContractor(formData: FormData): Promise<ActionResult> {
  const input = {
    id: String(formData.get("id") ?? ""),
    fullName: String(formData.get("fullName") ?? ""),
    trade: String(formData.get("trade") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    email: String(formData.get("email") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  };

  const parsed = updateContractorSchema.safeParse(input);
  if (!parsed.success) {
    return invalidResult(
      "Revisa los campos del contratista.",
      parsed.error.flatten().fieldErrors,
    );
  }

  try {
    editContractor(parsed.data as LedgerUpdateContractorInput);
    refresh();
    return { ok: true, message: "Contratista actualizado correctamente." };
  } catch (error) {
    return invalidResult(
      error instanceof Error ? error.message : "No se pudo actualizar el contratista.",
    );
  }
}

export async function submitDeleteContractor(contractorId: string): Promise<ActionResult> {
  try {
    removeContractor(contractorId);
    refresh();
    return { ok: true, message: "Contratista eliminado correctamente." };
  } catch (error) {
    return invalidResult(
      error instanceof Error ? error.message : "No se pudo eliminar el contratista.",
    );
  }
}

// ---------- ContractorContract actions ----------

export async function submitContractorContract(formData: FormData): Promise<ActionResult> {
  const agreedTotalRaw = formData.get("agreedTotal");
  const input = {
    projectId: String(formData.get("projectId") ?? ""),
    contractorId: String(formData.get("contractorId") ?? ""),
    categoryId: formData.get("categoryId") ? String(formData.get("categoryId")) : null,
    subcategoryId: formData.get("subcategoryId") ? String(formData.get("subcategoryId")) : null,
    scopeDescription: String(formData.get("scopeDescription") ?? ""),
    agreedTotal: agreedTotalRaw ? Number(agreedTotalRaw) : 0,
    status: (formData.get("status") as "draft" | "active" | "completed" | "cancelled" | null) ?? "active",
    startDate: formData.get("startDate") ? String(formData.get("startDate")) : null,
    endDate: formData.get("endDate") ? String(formData.get("endDate")) : null,
    notes: String(formData.get("notes") ?? ""),
  };

  const parsed = contractorContractSchema.safeParse(input);
  if (!parsed.success) {
    return invalidResult(
      "Revisa los campos del contrato.",
      parsed.error.flatten().fieldErrors,
    );
  }

  try {
    saveContractorContract(parsed.data as CreateContractorContractInput);
    refresh();
    return { ok: true, message: "Contrato creado correctamente." };
  } catch (error) {
    return invalidResult(
      error instanceof Error ? error.message : "No se pudo crear el contrato.",
    );
  }
}

export async function submitUpdateContractorContract(
  formData: FormData,
): Promise<ActionResult> {
  const agreedTotalRaw = formData.get("agreedTotal");
  const input = {
    id: String(formData.get("id") ?? ""),
    categoryId: formData.get("categoryId") ? String(formData.get("categoryId")) : null,
    subcategoryId: formData.get("subcategoryId") ? String(formData.get("subcategoryId")) : null,
    scopeDescription: String(formData.get("scopeDescription") ?? ""),
    agreedTotal: agreedTotalRaw ? Number(agreedTotalRaw) : 0,
    status: (formData.get("status") as "draft" | "active" | "completed" | "cancelled") ?? "active",
    startDate: formData.get("startDate") ? String(formData.get("startDate")) : null,
    endDate: formData.get("endDate") ? String(formData.get("endDate")) : null,
    notes: String(formData.get("notes") ?? ""),
  };

  const parsed = updateContractorContractSchema.safeParse(input);
  if (!parsed.success) {
    return invalidResult(
      "Revisa los campos del contrato.",
      parsed.error.flatten().fieldErrors,
    );
  }

  try {
    editContractorContract(parsed.data as LedgerUpdateContractorContractInput);
    refresh();
    return { ok: true, message: "Contrato actualizado correctamente." };
  } catch (error) {
    return invalidResult(
      error instanceof Error ? error.message : "No se pudo actualizar el contrato.",
    );
  }
}

export async function submitDeleteContractorContract(contractId: string): Promise<ActionResult> {
  try {
    removeContractorContract(contractId);
    refresh();
    return { ok: true, message: "Contrato eliminado correctamente." };
  } catch (error) {
    return invalidResult(
      error instanceof Error ? error.message : "No se pudo eliminar el contrato.",
    );
  }
}

// ---------- BudgetVersion actions ----------

export async function submitBudgetVersion(formData: FormData): Promise<ActionResult> {
  const input = {
    projectId: String(formData.get("projectId") ?? ""),
    versionName: String(formData.get("versionName") ?? ""),
  };

  const parsed = budgetVersionSchema.safeParse(input);
  if (!parsed.success) {
    return invalidResult(
      "Revisa los campos de la versión.",
      parsed.error.flatten().fieldErrors,
    );
  }

  try {
    saveBudgetVersion(parsed.data as CreateBudgetVersionInput);
    refresh();
    return { ok: true, message: "Versión de presupuesto creada." };
  } catch (error) {
    return invalidResult(
      error instanceof Error ? error.message : "No se pudo crear la versión.",
    );
  }
}

export async function submitUpdateBudgetVersion(formData: FormData): Promise<ActionResult> {
  const input = {
    id: String(formData.get("id") ?? ""),
    versionName: String(formData.get("versionName") ?? ""),
  };

  const parsed = updateBudgetVersionSchema.safeParse(input);
  if (!parsed.success) {
    return invalidResult(
      "Revisa los campos de la versión.",
      parsed.error.flatten().fieldErrors,
    );
  }

  try {
    editBudgetVersion(parsed.data as LedgerUpdateBudgetVersionInput);
    refresh();
    return { ok: true, message: "Versión actualizada correctamente." };
  } catch (error) {
    return invalidResult(
      error instanceof Error ? error.message : "No se pudo actualizar la versión.",
    );
  }
}

export async function submitDeleteBudgetVersion(budgetVersionId: string): Promise<ActionResult> {
  try {
    removeBudgetVersion(budgetVersionId);
    refresh();
    return { ok: true, message: "Versión eliminada correctamente." };
  } catch (error) {
    return invalidResult(
      error instanceof Error ? error.message : "No se pudo eliminar la versión.",
    );
  }
}

// ---------- BudgetSection actions ----------

export async function submitBudgetSection(formData: FormData): Promise<ActionResult> {
  const input = {
    budgetVersionId: String(formData.get("budgetVersionId") ?? ""),
    code: String(formData.get("code") ?? ""),
    name: String(formData.get("name") ?? ""),
    costType: (formData.get("costType") as "direct" | "indirect") ?? "direct",
  };

  const parsed = budgetSectionSchema.safeParse(input);
  if (!parsed.success) {
    return invalidResult(
      "Revisa los campos de la sección.",
      parsed.error.flatten().fieldErrors,
    );
  }

  try {
    saveBudgetSection(parsed.data as CreateBudgetSectionInput);
    refresh();
    return { ok: true, message: "Sección creada correctamente." };
  } catch (error) {
    return invalidResult(
      error instanceof Error ? error.message : "No se pudo crear la sección.",
    );
  }
}

export async function submitUpdateBudgetSection(formData: FormData): Promise<ActionResult> {
  const input = {
    id: String(formData.get("id") ?? ""),
    code: String(formData.get("code") ?? ""),
    name: String(formData.get("name") ?? ""),
    costType: (formData.get("costType") as "direct" | "indirect") ?? "direct",
  };

  const parsed = updateBudgetSectionSchema.safeParse(input);
  if (!parsed.success) {
    return invalidResult(
      "Revisa los campos de la sección.",
      parsed.error.flatten().fieldErrors,
    );
  }

  try {
    editBudgetSection(parsed.data as LedgerUpdateBudgetSectionInput);
    refresh();
    return { ok: true, message: "Sección actualizada correctamente." };
  } catch (error) {
    return invalidResult(
      error instanceof Error ? error.message : "No se pudo actualizar la sección.",
    );
  }
}

export async function submitDeleteBudgetSection(sectionId: string): Promise<ActionResult> {
  try {
    removeBudgetSection(sectionId);
    refresh();
    return { ok: true, message: "Sección eliminada correctamente." };
  } catch (error) {
    return invalidResult(
      error instanceof Error ? error.message : "No se pudo eliminar la sección.",
    );
  }
}
