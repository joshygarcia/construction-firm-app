import { z } from "zod";

const amountField = z.coerce.number().positive("El monto debe ser mayor a cero.");

export const projectSchema = z.object({
  name: z.string().min(2, "El proyecto es obligatorio."),
  clientName: z.string().min(2, "El cliente es obligatorio."),
  location: z.string().min(2, "La ubicación es obligatoria."),
  startDate: z.string().min(1, "La fecha de inicio es obligatoria."),
  endDate: z.string().optional().nullable(),
  notes: z.string().optional(),
});

export const expenseSchema = z.object({
  mode: z.literal("expense"),
  projectId: z.string().min(1, "Selecciona un proyecto."),
  transactionDate: z.string().min(1, "Selecciona una fecha."),
  categoryId: z.string().min(1, "Selecciona una categoría."),
  subcategoryId: z.string().optional().nullable(),
  budgetLineId: z.string().optional().nullable(),
  amount: amountField,
  detail: z.string().min(2, "Agrega un detalle."),
  payeeOrSource: z.string().min(2, "Agrega un suplidor o persona."),
  paymentMethod: z.string().min(2, "Selecciona el método de pago."),
});

export const incomeSchema = z.object({
  mode: z.literal("income"),
  projectId: z.string().min(1, "Selecciona un proyecto."),
  transactionDate: z.string().min(1, "Selecciona una fecha."),
  amount: amountField,
  detail: z.string().min(2, "Agrega un detalle."),
  payeeOrSource: z.string().min(2, "Agrega la fuente del ingreso."),
  paymentMethod: z.string().min(2, "Selecciona el método de pago."),
});

export const contractorPaymentSchema = z.object({
  mode: z.literal("contractor_payment"),
  projectId: z.string().min(1, "Selecciona un proyecto."),
  contractorContractId: z.string().min(1, "Selecciona un contrato."),
  transactionDate: z.string().min(1, "Selecciona una fecha."),
  amount: amountField,
  detail: z.string().min(2, "Agrega un detalle."),
  paymentMethod: z.string().min(2, "Selecciona el método de pago."),
  notes: z.string().optional(),
});

export const budgetLineSchema = z.object({
  mode: z.literal("budget_line"),
  projectId: z.string().min(1, "Selecciona un proyecto."),
  budgetVersionId: z.string().min(1, "Selecciona una versión."),
  categoryId: z.string().min(1, "Selecciona una categoría."),
  subcategoryId: z.string().optional().nullable(),
  description: z.string().min(2, "Agrega una descripción."),
  phase: z.string().optional(),
  area: z.string().optional(),
  lineCode: z.string().optional(),
  quantity: z.coerce.number().positive("La cantidad debe ser mayor a cero."),
  unit: z.string().min(1, "La unidad es obligatoria."),
  unitPrice: amountField,
  totalBudgeted: z.coerce.number().optional(),
  notes: z.string().optional(),
  isManualTotal: z.boolean().default(false),
});

export const quickEntrySchema = z.discriminatedUnion("mode", [
  expenseSchema,
  incomeSchema,
  contractorPaymentSchema,
  budgetLineSchema,
]);

export const updateProjectSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(2, "El proyecto es obligatorio."),
  clientName: z.string().min(2, "El cliente es obligatorio."),
  location: z.string().min(2, "La ubicación es obligatoria."),
  status: z.enum(["draft", "active", "paused", "completed"]).optional(),
  startDate: z.string().min(1, "La fecha de inicio es obligatoria."),
  endDate: z.string().optional().nullable(),
  notes: z.string().optional(),
});

export const updateTransactionSchema = z.object({
  id: z.string().min(1),
  transactionDate: z.string().min(1, "Selecciona una fecha."),
  categoryId: z.string().optional().nullable(),
  subcategoryId: z.string().optional().nullable(),
  amount: amountField,
  detail: z.string().min(2, "Agrega un detalle."),
  payeeOrSource: z.string().min(2, "Agrega un suplidor o persona."),
  paymentMethod: z.string().min(2, "Selecciona el método de pago."),
});

export const updateBudgetLineSchema = z.object({
  id: z.string().min(1),
  categoryId: z.string().nullable(),
  subcategoryId: z.string().optional().nullable(),
  description: z.string().min(2, "Agrega una descripción."),
  phase: z.string().optional().nullable(),
  area: z.string().optional().nullable(),
  lineCode: z.string().optional().nullable(),
  quantity: z.coerce.number().optional().nullable(),
  unit: z.string().optional().nullable(),
  unitPrice: z.coerce.number().optional().nullable(),
  totalBudgeted: z.coerce.number().optional().nullable(),
  notes: z.string().optional(),
  isManualTotal: z.boolean().default(false),
});

const contractorStatusEnum = z.enum(["draft", "active", "completed", "cancelled"]);

export const contractorSchema = z.object({
  fullName: z.string().min(2, "El nombre es obligatorio."),
  trade: z.string().min(2, "El oficio es obligatorio."),
  phone: z.string().optional(),
  email: z.string().optional(),
  notes: z.string().optional(),
});

export const updateContractorSchema = contractorSchema.extend({
  id: z.string().min(1),
  isActive: z.boolean().optional(),
});

export const contractorContractSchema = z.object({
  projectId: z.string().min(1, "Selecciona un proyecto."),
  contractorId: z.string().min(1, "Selecciona un contratista."),
  categoryId: z.string().optional().nullable(),
  subcategoryId: z.string().optional().nullable(),
  scopeDescription: z.string().min(2, "Agrega una descripción del alcance."),
  agreedTotal: amountField,
  status: contractorStatusEnum.optional(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  notes: z.string().optional(),
});

export const updateContractorContractSchema = z.object({
  id: z.string().min(1),
  categoryId: z.string().optional().nullable(),
  subcategoryId: z.string().optional().nullable(),
  scopeDescription: z.string().min(2, "Agrega una descripción del alcance."),
  agreedTotal: amountField,
  status: contractorStatusEnum,
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  notes: z.string().optional(),
});

export const budgetVersionSchema = z.object({
  projectId: z.string().min(1, "Selecciona un proyecto."),
  versionName: z.string().min(2, "El nombre de la versión es obligatorio."),
});

export const updateBudgetVersionSchema = z.object({
  id: z.string().min(1),
  versionName: z.string().min(2, "El nombre de la versión es obligatorio."),
});

export const budgetSectionSchema = z.object({
  budgetVersionId: z.string().min(1, "Selecciona una versión."),
  code: z.string().min(1, "El código es obligatorio."),
  name: z.string().min(2, "El nombre de la sección es obligatorio."),
  costType: z.enum(["direct", "indirect"]),
});

export const updateBudgetSectionSchema = z.object({
  id: z.string().min(1),
  code: z.string().min(1, "El código es obligatorio."),
  name: z.string().min(2, "El nombre de la sección es obligatorio."),
  costType: z.enum(["direct", "indirect"]),
});

export type ContractorFormInput = z.output<typeof contractorSchema>;
export type UpdateContractorFormInput = z.output<typeof updateContractorSchema>;
export type ContractorContractFormInput = z.output<typeof contractorContractSchema>;
export type UpdateContractorContractFormInput = z.output<typeof updateContractorContractSchema>;
export type BudgetVersionFormInput = z.output<typeof budgetVersionSchema>;
export type UpdateBudgetVersionFormInput = z.output<typeof updateBudgetVersionSchema>;
export type BudgetSectionFormInput = z.output<typeof budgetSectionSchema>;
export type UpdateBudgetSectionFormInput = z.output<typeof updateBudgetSectionSchema>;

export type ProjectInput = z.output<typeof projectSchema>;
export type ExpenseInput = z.output<typeof expenseSchema>;
export type IncomeInput = z.output<typeof incomeSchema>;
export type ContractorPaymentInput = z.output<typeof contractorPaymentSchema>;
export type BudgetLineInput = z.output<typeof budgetLineSchema>;
export type QuickEntryInput = z.output<typeof quickEntrySchema>;
export type ExpenseFormValues = z.input<typeof expenseSchema>;
export type IncomeFormValues = z.input<typeof incomeSchema>;
export type ContractorPaymentFormValues = z.input<typeof contractorPaymentSchema>;
export type BudgetLineFormValues = z.input<typeof budgetLineSchema>;
export type UpdateProjectInput = z.output<typeof updateProjectSchema>;
export type UpdateTransactionInput = z.output<typeof updateTransactionSchema>;
export type UpdateBudgetLineInput = z.output<typeof updateBudgetLineSchema>;
