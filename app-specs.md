Construction Accounting App Spec
Construction / Architecture Project Accounting App
Goal

Build a web app for a construction / architecture firm that replaces the current Excel workflow and lets the client work from one main place instead of entering the same data in multiple sheets.

The main outcome:

The user records a transaction once.
The app automatically updates:
project budget consumption
monthly expense control
worker / subcontractor balances
project cashflow
overall report dashboard
What the current Excel is doing

The uploaded workbook is trying to manage five things at the same time:

Partidas / categories Examples: Diseño, Solar, Hormigón Armado, Costos Indirectos, Electricidad, Plomería, Pintura.
Subcategories Examples: Cálculo estructural, Topógrafo, Movimiento de tierra, Sanja y relleno, M.D.O. Plomero.
Budget / Presupuesto A project estimate with quantity, unit, unit price, line total, and section subtotal.
Monthly expenses Expenses are entered in monthly sheets like ENE, FEB, MAR.
Reporting / control A report compares budget vs real spending and also tracks incoming cash.

There is also a separate need for:

advances paid to workers / subcontractors
balances pending to each person
manual mapping of those payments back into the monthly report
Main problem in the Excel model

The workbook is not structured around one source of truth.

Right now the same information is being represented in multiple places:

budget
monthly sheets
report
worker/advance tracking
income sheet

That creates these problems:

duplicate manual work
broken formulas
inconsistent category names
hard-to-maintain monthly tabs
risk of report not matching real expenses

There are also brittle formulas in the report sheet, including broken references, which confirms the workbook has already reached its limit.

Best product approach

Do not build the app as a spreadsheet clone.

Build it as a project accounting system with one transaction ledger.

Core rule

Every expense, income, budget line, and worker advance should be stored as a structured record in a database.

The reports should be generated from those records automatically.

Recommended app structure
1) Main modules
A. Projects

Each construction job is its own project.

Fields:

Project name
Client name
Location
Start date
End date
Status
Total budget
Notes
B. Budget setup

This replaces the current Presupuesto sheet.

Each budget line should belong to:

project
category
subcategory
description
quantity
unit
unit price
line total
optional stage/area (N1, N2, Exterior, etc.)
C. Expense entry

This is the most important screen.

The user should be able to enter:

date
project
type = expense
category
subcategory
detail / memo
amount
payment method
vendor or person
linked budget line (optional but recommended)
month is auto-calculated from date

This screen replaces ENE / FEB / MAR tabs.

D. Income / disbursements

This replaces the INGRESOS sheet.

Fields:

date
project
type = income
amount
payment source
payment method
related milestone / avance
notes
E. Workers / subcontractors

This replaces the manual “advance” tracking.

Fields:

worker / subcontractor name
trade / role
project
task / scope
agreed total
advances paid
balance pending
payment history
linked category/subcategory
F. Reports / dashboard

Auto-generated from database records.

Reports should show:

budget vs actual by category
budget vs actual by subcategory
monthly spending
total income vs total expenses
cash remaining
worker balances pending
over-budget alerts
2) One-page workflow the client actually wants

The client said: “I want to fill one page and let everything else distribute automatically.”

That means the app should have a single operational entry screen.

Recommended “Quick Entry” page

Tabs or modes inside one page:

Add expense
Add income
Add worker payment
Add budget line
Example logic

If user adds:

Project: Plaza Tigaiga
Date: 2026-03-20
Category: Plomería
Subcategory: M.D.O. Plomero
Detail: Avance 1 plomero
Amount: 25,000
Worker: Plomero Juan

Then the app automatically updates:

March expense totals
Plomería actual spend
M.D.O. Plomero actual spend
worker payment ledger for Plomero Juan
budget consumption for that subcategory
dashboard charts
cashflow totals

No second manual entry anywhere.

Suggested database design
Tables
projects
id
name
client_name
location
start_date
end_date
status
notes
created_at
categories
id
name
sort_order
is_active
subcategories
id
category_id
name
sort_order
is_active
budget_lines
id
project_id
category_id
subcategory_id
phase
description
quantity
unit
unit_price
total_budgeted
notes
transactions

This is the core ledger.

id
project_id
transaction_type // expense or income
transaction_date
category_id nullable
subcategory_id nullable
budget_line_id nullable
payee_or_source
payment_method
detail
amount
reference_number
created_by
created_at
contractors
id
name
phone
trade
notes
contractor_contracts
id
project_id
contractor_id
category_id nullable
subcategory_id nullable
scope_description
agreed_total
status
contractor_payments
id
contractor_contract_id
transaction_id
payment_date
amount
notes
attachments
id
transaction_id nullable
budget_line_id nullable
file_url
file_type
uploaded_at
Important derived values

These should be calculated automatically, not manually typed.

Per subcategory
budgeted amount
actual spent
remaining budget
variance
variance percent
Per category
total budgeted
total spent
total remaining
Per project
total budget
total income received
total expenses
available cash
committed to workers
pending worker balances
Per contractor
agreed total
total advances
pending balance
Key screens
1. Login

Simple role-based access.

Admin
Accountant / finance
Project manager
Read-only client view (optional)
2. Projects list

Cards or table with:

project name
client
budget
spent
remaining
status
3. Project detail

Sections:

Summary KPIs
Budget tab
Expenses tab
Income tab
Workers tab
Monthly control tab
Documents tab
4. Quick entry page

Fast data entry form with smart defaults.

Useful UI behaviors:

category dropdown updates subcategory dropdown
month auto-detected from date
suggested budget line based on category/subcategory
repeat last entry button
attach receipt/invoice photo
5. Budget editor

Grid view like Excel but controlled.

Columns:

Phase
Category
Subcategory
Description
Qty
Unit
Unit Price
Total
6. Reports page

Widgets and tables:

Budget vs Actual chart
Monthly expenses chart
Expenses by category pie/bar
Cash in vs cash out
Subcontractor balances
Over-budget list
7. Worker / subcontractor page

Table:

Name
Trade
Scope
Agreed total
Paid to date
Balance
Last payment date
App logic rules
Rule 1

A subcategory must belong to exactly one category.

Rule 2

Every expense should be linked to a project.

Rule 3

If an expense is linked to a worker contract, it should update that worker’s balance automatically.

Rule 4

If an expense matches a budget line, it should reduce the remaining budget automatically.

Rule 5

Monthly reports should come from transaction dates, not from separate monthly tables.

Rule 6

The dashboard must never require manual copy-paste from another screen.

Recommended MVP

Build this first.

Phase 1 — Must have
Projects
Categories and subcategories
Budget lines
Expense entry
Income entry
Worker/subcontractor payment tracking
Budget vs actual report
Monthly expense summary
Phase 2 — Strong upgrade
Receipt uploads
Excel import from old templates
PDF export of project report
over-budget alerts
search and filters
role permissions
Phase 3 — Premium version
mobile app / PWA
WhatsApp share of reports
approval workflow for payments
purchase orders
invoice generation
payroll support
Best tech stack for this project
Option A — Fastest build
Frontend: Next.js
UI: Tailwind + shadcn/ui
Backend: Supabase
Database: PostgreSQL
Auth: Supabase Auth
Storage: Supabase Storage
Charts: Recharts

Why this is good:

fast to build
simple auth
relational database is perfect for this use case
easy CRUD + reporting
easy file uploads
Option B — More custom / scalable
Frontend: Next.js
Backend: NestJS or Express
Database: PostgreSQL
ORM: Prisma
Storage: S3 or Cloudinary

Use this only if you want stronger backend control.

Import strategy from their current Excel

Do not force them to manually retype everything.

Build import tools for:

categories and subcategories from “Tipo de Gastos”
budget lines from “PRESUPUESTO”
existing income records from “INGRESOS”
existing monthly expense rows from ENE/FEB/MAR/etc.
Import mapping idea
Budget import

Excel columns:

PARTIDAS -> description or section
CANT. -> quantity
UNIDAD -> unit
PU -> unit_price
VALOR -> computed total
Expense import

Monthly sheets:

CATEGORÍA -> category
SUBCATEGORÍA -> subcategory
FECHA -> transaction_date
DETALLE -> detail
IMPORTE -> amount
What not to do
Do not create one database table per month.
Do not create one screen per month.
Do not store reports as editable records.
Do not make the report a manual form.
Do not keep totals as hardcoded numbers if they can be calculated.
Suggested homepage / dashboard KPIs
Total budget
Total spent
Total income received
Cash available
Budget remaining
% budget consumed
Pending contractor balances
Top 5 categories by spend
This month spend
This month income
Example user flow
Create project
User creates project Plaza Tigaiga.
User imports or enters budget lines.
App calculates total budget.
Record expense
User opens Quick Entry.
Chooses expense.
Selects category and subcategory.
Writes detail and amount.
Saves.
App updates reports instantly.
Record worker advance
User opens worker payment tab.
Selects contractor.
Enters payment.
App updates contractor balance and project expenses.
View report
User opens project report.
Sees budget vs actual by category and subcategory.
Sees monthly cashflow.
Exports PDF if needed.
Recommended UI sections for the first version
Sidebar
Dashboard
Projects
Budgets
Transactions
Contractors
Reports
Settings
Top filters
Project
Date range
Category
Transaction type
Contractor
Tables should support
search
filters
export to Excel/PDF
inline status badges
totals at footer
Strong product angle for the client

When you present this, describe it like this:

This will not be just an accounting sheet in app form. It will be a project financial control system for construction jobs.

The benefit is not only “saving time.” The real benefit is:

one source of truth
fewer mistakes
instant reports
control over worker advances
clear budget consumption per project
better decision making while the job is still active
My recommendation

If you build this, start with:

project setup
categories/subcategories
budget import
transaction ledger
report dashboard
contractor payments

That is the cleanest version of what the client is asking for.

Workbook-specific findings from the uploaded file

This section is based on the actual uploaded workbook GASTOS E INGRESOS PLAZA TIGAIGA.xlsx.

Current workbook structure

The file is organized like this:

Tipo de Gastos
PRESUPUESTO
INGRESOS
Reporte
CROMOGRAMA
monthly tabs such as ENE, FEB, MAR
older month tabs for prior year such as JULIOS, AGOSTOS, SEPTIEMBRES, etc.
What the month tabs really are

The sheets ENE, FEB, MAR, etc. are basically transaction-entry forms.

Common columns:

CATEGORÍA
SUBCATEGORÍA
FECHA
DETALLE
IMPORTE

That means these tabs should become a single transactions table in the app.

Real categories found in the workbook

From the uploaded monthly sheets, these categories are actively being used:

PERMISOLOGIA
DISEÑO
SOLAR
COSTOS_INDIRECTOS
HORMIGON_ARMADO
ELECTRICIDAD
PINTURA
PLOMERIA
Real subcategory examples found
PERMISOLOGIA
CARTA NO OBJECION
IMP. AYUNTAMIENTO
MEDIO AMBIENTE
PAGO CARTA
DISEÑO
CALCULO ELECTRICO
CALCULO ESTRUCTURA
CALCULO SANITARIO
DISEÑO ARQ.
SOLAR
BOTE
CASETA DE MATERIALES
CIERRE SOLAR
CISTERNA
ESTUDIO DE SUELO
MOVIMIENTO DE TIERRA
RELLENO
TOPOGRAFO
COSTOS_INDIRECTOS
DIRECCION TECNICA
FONDO DE PENSION
GASTO ADMINISTRATIVO
GASTO OFICINA
IMPREVISTO
PERSONAL FIJO EN OBRA
TRANSPORTE
HORMIGON_ARMADO
CHAPAPOTE MATERIALES
MATERIALES LOSA
MDO LOSA
MDO. CHAPAPOTE
MDO. ENCOFRADO
MDO. MUROS
MDO. VARILLA HASTA 1 N
MUROS MATERIALES
SANJA Y RELLENO
ZAPATAS Y COLUMNAS MATERIALES
PLOMERIA
M.D.O. Plomero
Materiales de plomeria
What the report sheet is really doing

The Reporte sheet is a big matrix where:

rows are partidas / subcategories
columns are months
values are SUMIF results pulling from monthly sheets by SUBCATEGORÍA and IMPORTE

So the report is not original data. It is a derived view.

That means in the app:

the report should never be editable
the report should be generated live from transactions
What the budget sheet is really doing

The PRESUPUESTO sheet is a line-item estimate with fields like:

PARTIDAS
CANT.
UNIDAD
PU
VALOR
SUBTOTAL

This should map directly to a budget_lines table.

What the income sheet is doing

The INGRESOS sheet tracks:

DESEMBOLSOS
FECHA DE INGRESO
Tipo de Pago
PARTIDA AFECTADA
DETALLES

In the app, this should become transactions where transaction_type = income.

What the app should preserve from the workbook

Keep these familiar business concepts because the client already thinks this way:

proyecto
partida / categoría
subcategoría
presupuesto
ingreso / desembolso
avance a trabajador
reporte mensual
cronograma
What should be removed from the workbook logic

Do not preserve these behaviors:

one sheet per month
manual copying from monthly sheet to report
manual duplicate entry for contractor advances
formulas that depend on exact sheet names
report rows as editable input
Wireframe plan
Screen 1 — Dashboard
Top KPIs
Presupuesto total
Gastado real
Ingresos recibidos
Caja disponible
Pendiente por pagar
% ejecutado
Visuals
Budget vs Actual by category
Monthly expenses line/bar chart
Cash in vs Cash out chart
Top over-budget subcategories
Contractor balances widget
Screen 2 — Projects
Table columns
Project
Client
Start date
Status
Budget
Spent
Remaining
Income received
Cash available

Action buttons:

View project
Edit project
Export report
Screen 3 — Project detail
Tabs
Summary
KPIs
latest expenses
latest income
alert cards
Budget
grid of budget lines
grouped by category
subtotals per category
Transactions
unified list of expenses and incomes
filters by month/category/type
Contractors
contractor cards or table
agreed amount / paid / balance
Reports
budget vs actual table
monthly matrix view
PDF export
Schedule
optional future link with cronograma
Screen 4 — Quick Entry

This is the core operational page.

Layout

Left side:

entry mode selector
Expense
Income
Contractor payment
Budget line

Right side:

live impact preview
affects category total
affects subcategory total
affects contractor balance
affects project cash
Expense form fields
Date
Project
Category
Subcategory
Detail
Amount
Vendor / person
Payment method
Link to budget line
Attach receipt
Income form fields
Date
Project
Amount
Source / payer
Payment method
Related milestone
Detail
Contractor payment form fields
Date
Project
Contractor
Scope / contract
Category
Subcategory
Advance amount
Notes
Screen 5 — Budget builder

Make it feel familiar to Excel users.

Table columns
Code
Category
Subcategory
Description
Quantity
Unit
Unit price
Line total
Stage / area
Notes
Must-have actions
add row
duplicate row
group by category
import from Excel
lock approved budget version
Screen 6 — Monthly control

This gives the client the same comfort as ENE/FEB/MAR without separate sheets.

Controls
month dropdown
project filter
category filter
Main table
Date
Category
Subcategory
Detail
Vendor
Amount
Payment method
Summary cards
total spent this month
highest expense
lowest expense
total by category
Screen 7 — Contractor ledger
Table columns
Contractor
Trade
Project
Scope
Agreed total
Total paid
Pending balance
Last payment
Status
Drill-down

Open one contractor and show:

all payment history
remaining balance
linked category/subcategory
notes
Backend logic mapping from workbook to app
Mapping 1

ENE, FEB, MAR, etc. -> transactions

Mapping 2

INGRESOS -> transactions with type income

Mapping 3

PRESUPUESTO -> budget_lines

Mapping 4

Tipo de Gastos -> categories + subcategories

Mapping 5

Reporte -> generated SQL views / API aggregations / dashboard widgets

Mapping 6

manual worker advance table -> contractor_contracts + contractor_payments

SQL/view logic the app will need
Budget vs actual by subcategory

For each project + subcategory:

budgeted = sum(budget_lines.total_budgeted)
actual = sum(expense transactions.amount)
remaining = budgeted - actual
variance = actual - budgeted
Monthly expense summary

For each project + month:

total expenses
total income
net cashflow
Contractor balance

For each contractor contract:

balance = agreed_total - sum(payments)
Product pitch for the client

This system will let you work from one place only.

Instead of writing the same expense in:

the month tab
the report
and the worker advance control

You will enter it once, and the system will update all reports automatically.

That gives you:

faster control of the project
fewer mistakes
real budget tracking
clear balances with workers
immediate reports by month, category, and project
Technical Dev Spec
1) Product scope

Build a web app for a construction / architecture firm that centralizes:

project budgets
project expenses
project income / client disbursements
contractor / worker advances
monthly control
generated financial reports

This is not general accounting software. It is a project cost control system for construction jobs.

2) Core product principle

Use a ledger-first architecture.

The current workbook uses:

many month sheets
formula-driven reports
manual copy-paste
repeated data entry

The app must instead use:

one normalized transaction ledger
one normalized budget table
derived reports and aggregates
contractor payment records linked to transactions
3) Source workbook findings that affect the build
File A — GASTOS E INGRESOS PLAZA TIGAIGA.xlsx

This is the real domain workbook.

It contains:

Tipo de Gastos
PRESUPUESTO
INGRESOS
Reporte
CROMOGRAMA
month sheets like ENE, FEB, MAR, etc.
Key technical findings
The month sheets are the real input source.
The Reporte sheet is a derived layer built with SUMIF + INDIRECT + structured table references.
The workbook already contains broken formulas like #REF! in total budget/report sections.
The budget and actual expenses are not tied by a real ID system, only by human naming.
Contractor / payroll / advance logic is mixed inside monthly tabs and budget notes, not modeled cleanly.
File B — PLANILLAS DE GESTION FINANCIERA.xlsx

This looks like a generic personal-finance template.

Use it only as UX inspiration for:

dashboard cards
monthly summary layout
category summaries

Do not copy its data model directly because it is not built for construction jobs.

4) System architecture
Recommended stack
Frontend
Next.js 15+
TypeScript
Tailwind CSS
shadcn/ui
TanStack Table
React Hook Form
Zod
Recharts
Backend
Next.js Route Handlers or separate API layer
Supabase Auth
Supabase Postgres
Supabase Storage
optional Edge Functions for import jobs and report generation
Why this stack
fast MVP
relational data support
easy auth
easy storage for receipts and PDFs
good fit for dashboards and CRUD-heavy systems
5) High-level architecture
Main domains
Auth
Projects
Categories
Budget
Transactions
Contractors
Reports
Imports
Files / attachments
Core architectural rule

All dashboards and reports must be computed from:

budget lines
transactions
contractor payment records

No report table should be the source of truth.

6) User roles
Admin
full access
manage users
manage settings
import data
edit budgets
edit/delete transactions
Finance / Accountant
manage transactions
manage income
manage contractor payments
view and export reports
Project Manager
create/update project expenses
view budgets and reports
upload receipts
limited edit permissions
Viewer / Client
read-only access to project dashboard and reports
7) Information architecture
Main navigation
Dashboard
Projects
Transactions
Budget
Contractors
Reports
Imports
Settings
Project sub-navigation
Summary
Budget
Transactions
Income
Contractors
Monthly Control
Reports
Files
Schedule
8) Route map
App routes
/login
/dashboard
/projects
/projects/[projectId]
/projects/[projectId]/budget
/projects/[projectId]/transactions
/projects/[projectId]/income
/projects/[projectId]/contractors
/projects/[projectId]/reports
/projects/[projectId]/files
/transactions/new
/imports
/settings/categories
/settings/users
9) UI wireframes
Screen A — Dashboard
+---------------------------------------------------------------+
| Topbar: Project Filter | Date Range | Export | User Menu       |
+---------------------------------------------------------------+
| KPI: Budget | Spent | Remaining | Income | Cash | Pending      |
+---------------------------------------------------------------+
| Budget vs Actual Chart        | Cash In vs Cash Out Chart     |
+---------------------------------------------------------------+
| Top Categories by Spend       | Over Budget Alerts            |
+---------------------------------------------------------------+
| Recent Transactions           | Contractor Balances           |
+---------------------------------------------------------------+
Screen B — Projects List
+---------------------------------------------------------------+
| Search | Status Filter | Client Filter | New Project          |
+---------------------------------------------------------------+
| Project | Client | Budget | Spent | Remaining | Status | View |
| Plaza   | Tigaiga| ...    | ...   | ...       | Active | ->   |
+---------------------------------------------------------------+
Screen C — Project Summary
+---------------------------------------------------------------+
| Project Header: Name | Client | Status | Start | End           |
+---------------------------------------------------------------+
| KPI row                                                    |
+---------------------------------------------------------------+
| Tabs: Summary | Budget | Transactions | Income | Contractors   |
|       Monthly Control | Reports | Files | Schedule           |
+---------------------------------------------------------------+
| Summary widgets, recent items, alerts                        |
+---------------------------------------------------------------+
Screen D — Quick Entry
+---------------------------------------------------------------+
| Mode: [Expense] [Income] [Contractor Payment] [Budget Line]  |
+---------------------------------------------------------------+
| Left: Form                                                   |
|  Date                                                        |
|  Project                                                     |
|  Category                                                    |
|  Subcategory                                                 |
|  Detail                                                      |
|  Amount                                                      |
|  Vendor / Contractor                                         |
|  Payment Method                                              |
|  Attach Receipt                                              |
|  [Save] [Save & New]                                         |
|--------------------------------------------------------------|
| Right: Live Impact Preview                                   |
|  Affects category total                                      |
|  Affects subcategory total                                   |
|  Affects budget remaining                                    |
|  Affects contractor balance                                  |
|  Affects monthly control                                     |
+---------------------------------------------------------------+
Screen E — Budget Builder
+-----------------------------------------------------------------------+
| Import Excel | Add Row | Duplicate | Lock Version | Export            |
+-----------------------------------------------------------------------+
| Code | Category | Subcategory | Description | Qty | Unit | PU | Total |
| ...                                                                ... |
+-----------------------------------------------------------------------+
| Subtotals by category                                                 |
+-----------------------------------------------------------------------+
Screen F — Monthly Control
+---------------------------------------------------------------+
| Month Filter | Project Filter | Category Filter | Export      |
+---------------------------------------------------------------+
| Date | Category | Subcategory | Detail | Vendor | Amount     |
+---------------------------------------------------------------+
| Summary: total / highest / lowest / count / by category       |
+---------------------------------------------------------------+
Screen G — Contractors
+----------------------------------------------------------------+
| Search | Trade Filter | Pending Only | Add Contractor          |
+----------------------------------------------------------------+
| Name | Trade | Scope | Agreed | Paid | Balance | Last Pay     |
+----------------------------------------------------------------+
| Click row -> payment history, notes, linked category          |
+----------------------------------------------------------------+
Screen H — Reports
+----------------------------------------------------------------+
| Project | Date Range | Group By | Export PDF / Excel          |
+----------------------------------------------------------------+
| Budget vs Actual table                                         |
| Monthly spend heatmap                                          |
| Category breakdown                                             |
| Contractor balances                                            |
| Variance list                                                  |
+----------------------------------------------------------------+
10) Data model
Entity relationship summary
A project has many budget lines
A project has many transactions
A category has many subcategories
A budget line belongs to one category and one optional subcategory
A transaction belongs to one project and may link to one budget line
A contractor can have many contracts in many projects
A contractor contract can have many payments
A contractor payment should link back to a transaction
11) Database schema
organizations

For future multi-tenant support.

create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);
profiles
create table profiles (
  id uuid primary key,
  organization_id uuid not null references organizations(id),
  full_name text not null,
  email text unique not null,
  role text not null check (role in ('admin','finance','project_manager','viewer')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
projects
create table projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  name text not null,
  client_name text,
  location text,
  description text,
  start_date date,
  end_date date,
  status text not null default 'active' check (status in ('draft','active','paused','completed','cancelled')),
  currency_code text not null default 'DOP',
  notes text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
categories
create table categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  code text,
  name text not null,
  sort_order int not null default 0,
  is_active boolean not null default true,
  unique (organization_id, name)
);
subcategories
create table subcategories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  category_id uuid not null references categories(id),
  code text,
  name text not null,
  sort_order int not null default 0,
  is_active boolean not null default true,
  unique (category_id, name)
);
budget_versions

Allows multiple versions per project.

create table budget_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  version_name text not null,
  status text not null default 'draft' check (status in ('draft','approved','archived')),
  is_locked boolean not null default false,
  approved_at timestamptz,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
budget_lines
create table budget_lines (
  id uuid primary key default gen_random_uuid(),
  budget_version_id uuid not null references budget_versions(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  category_id uuid references categories(id),
  subcategory_id uuid references subcategories(id),
  line_code text,
  phase text,
  area text,
  description text not null,
  quantity numeric(14,2),
  unit text,
  unit_price numeric(14,2),
  total_budgeted numeric(14,2) not null default 0,
  notes text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
transactions

This is the source-of-truth ledger.

create table transactions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  budget_line_id uuid references budget_lines(id),
  category_id uuid references categories(id),
  subcategory_id uuid references subcategories(id),
  transaction_type text not null check (transaction_type in ('expense','income','transfer','adjustment')),
  transaction_date date not null,
  amount numeric(14,2) not null check (amount >= 0),
  detail text,
  payee_or_source text,
  payment_method text,
  external_reference text,
  month_key text generated always as (to_char(transaction_date, 'YYYY-MM')) stored,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
contractors
create table contractors (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  full_name text not null,
  phone text,
  email text,
  trade text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
contractor_contracts
create table contractor_contracts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  contractor_id uuid not null references contractors(id),
  category_id uuid references categories(id),
  subcategory_id uuid references subcategories(id),
  scope_description text not null,
  agreed_total numeric(14,2) not null default 0,
  status text not null default 'active' check (status in ('draft','active','completed','cancelled')),
  start_date date,
  end_date date,
  notes text,
  created_at timestamptz not null default now()
);
contractor_payments
create table contractor_payments (
  id uuid primary key default gen_random_uuid(),
  contractor_contract_id uuid not null references contractor_contracts(id) on delete cascade,
  transaction_id uuid unique references transactions(id) on delete cascade,
  payment_date date not null,
  amount numeric(14,2) not null check (amount >= 0),
  notes text,
  created_at timestamptz not null default now()
);
attachments
create table attachments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  transaction_id uuid references transactions(id) on delete cascade,
  budget_line_id uuid references budget_lines(id) on delete cascade,
  file_path text not null,
  file_name text not null,
  file_type text,
  file_size bigint,
  uploaded_by uuid references profiles(id),
  uploaded_at timestamptz not null default now()
);
import_jobs
create table import_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  project_id uuid references projects(id),
  source_file_name text not null,
  import_type text not null check (import_type in ('categories','budget','transactions','income','full_workbook')),
  status text not null default 'pending' check (status in ('pending','processing','completed','failed')),
  summary jsonb,
  error_log text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
12) Indexes
create index idx_projects_org on projects(organization_id);
create index idx_categories_org on categories(organization_id);
create index idx_subcategories_category on subcategories(category_id);
create index idx_budget_lines_project on budget_lines(project_id);
create index idx_transactions_project_date on transactions(project_id, transaction_date);
create index idx_transactions_month_key on transactions(month_key);
create index idx_transactions_category on transactions(category_id);
create index idx_transactions_subcategory on transactions(subcategory_id);
create index idx_contractor_contracts_project on contractor_contracts(project_id);
create index idx_contractor_payments_contract on contractor_payments(contractor_contract_id);
13) Derived views
vw_project_budget_vs_actual

Purpose:

compare budget vs actual at category/subcategory level

Pseudo-SQL:

select
  bl.project_id,
  bl.category_id,
  bl.subcategory_id,
  sum(bl.total_budgeted) as budgeted,
  coalesce(sum(case when t.transaction_type = 'expense' then t.amount end), 0) as actual,
  sum(bl.total_budgeted) - coalesce(sum(case when t.transaction_type = 'expense' then t.amount end), 0) as remaining,
  coalesce(sum(case when t.transaction_type = 'expense' then t.amount end), 0) - sum(bl.total_budgeted) as variance
from budget_lines bl
left join transactions t
  on t.project_id = bl.project_id
 and t.category_id = bl.category_id
 and coalesce(t.subcategory_id, '00000000-0000-0000-0000-000000000000') = coalesce(bl.subcategory_id, '00000000-0000-0000-0000-000000000000')
group by 1,2,3;
vw_project_cashflow

Purpose:

monthly cash in vs cash out per project
select
  project_id,
  month_key,
  sum(case when transaction_type = 'income' then amount else 0 end) as total_income,
  sum(case when transaction_type = 'expense' then amount else 0 end) as total_expense,
  sum(case when transaction_type = 'income' then amount else -amount end) as net_cashflow
from transactions
where deleted_at is null
group by 1,2;
vw_contractor_balances
select
  cc.id as contractor_contract_id,
  cc.project_id,
  cc.contractor_id,
  cc.agreed_total,
  coalesce(sum(cp.amount),0) as total_paid,
  cc.agreed_total - coalesce(sum(cp.amount),0) as pending_balance
from contractor_contracts cc
left join contractor_payments cp on cp.contractor_contract_id = cc.id
group by 1,2,3,4;
14) Import mapping from workbook
Import type A — Categories/Subcategories

Source sheet: Tipo de Gastos

Parsing rule
Row 20 = category headers
Rows below = subcategories under each category column
Ignore blank columns and decorative fields
Result

Insert into:

categories
subcategories
Example mapping
PLOMERIA -> category
M.D.O. Plomero -> subcategory under PLOMERIA
Materiales de plomeria -> subcategory under PLOMERIA
Import type B — Budget

Source sheet: PRESUPUESTO

Parsing rule

Use rows that contain real line items with:

description in PARTIDAS
quantity
unit
unit price
value
Issue

The source budget is visually rich but structurally messy. Some rows are:

headings
subtotals
notes
labor notes in side columns
mixed descriptive text
Recommendation

Budget import should be semi-assisted:

detect candidate line rows
preview parsed rows
allow user to assign category/subcategory before final import
Insert into
budget_versions
budget_lines
Import type C — Expenses from month sheets

Source sheets:

ENE
FEB
MAR
and other monthly tabs
Parsing rule

Read from row 14 onward using columns:

B = category
C = subcategory
D = date
E = detail
F = amount
Ignore
side notes placed outside the main table
internal salary summary notes in extra columns
total/max/min helper formulas
Insert into
transactions with transaction_type = 'expense'
Import type D — Income

Source sheet: INGRESOS

Columns detected
DESEMBOLSOS
FECHA DE INGRESO
Tipo de Pago
PARTIDA AFECTADA
DETALLES
Insert into
transactions with transaction_type = 'income'
15) Validation rules
Categories/Subcategories
category required for expense transactions
if subcategory is supplied, it must belong to selected category
Transactions
amount must be > 0
transaction date required
project required
income cannot be linked to contractor payment record directly
if transaction_type = expense, category is required
soft delete only; never hard delete financial rows from UI
Contractor payments
payment amount cannot exceed configurable threshold above remaining balance without override permission
contractor contract required
must create linked expense transaction in same save operation
Budget lines
if quantity and unit price exist, total is auto-calculated
if total entered manually, keep manual flag
locked budget versions cannot be edited
16) Business logic rules
Rule A — One-save workflow

When user saves an expense:

create transaction
update cached aggregates or invalidate report cache
if linked to contractor contract, create contractor_payment
if linked receipt exists, upload attachment
return updated impact summary
Rule B — Month handling

Do not store one dataset per month. Month is derived from transaction_date.

Rule C — Report handling

No editable report table. All reports are computed.

Rule D — Budget matching

Budget matching priority:

explicit budget_line_id
exact category + subcategory match
category-only fallback
Rule E — Auditability

Every financial change should leave:

created_by
created_at
updated_at
optional future audit log table
17) API design
Authentication

Use Supabase Auth. Every endpoint should enforce organization scoping.

Projects API
GET /api/projects

Returns paginated projects with summary KPIs.

Response:

{
  "items": [
    {
      "id": "proj_123",
      "name": "Plaza Tigaiga",
      "clientName": "Tigaiga",
      "status": "active",
      "budget": 12500000,
      "spent": 3367250,
      "remaining": 9132750,
      "income": 4144700,
      "cashAvailable": 777450
    }
  ]
}
POST /api/projects
{
  "name": "Plaza Tigaiga",
  "clientName": "Tigaiga",
  "location": "Santiago, RD",
  "currencyCode": "DOP"
}
Categories API
GET /api/categories

Returns category tree.

Response:

{
  "items": [
    {
      "id": "cat_1",
      "name": "PLOMERIA",
      "subcategories": [
        { "id": "sub_1", "name": "M.D.O. Plomero" },
        { "id": "sub_2", "name": "Materiales de plomeria" }
      ]
    }
  ]
}
Budget API
GET /api/projects/:projectId/budget

Returns active budget version and rows.

POST /api/projects/:projectId/budget/lines
{
  "budgetVersionId": "bv_1",
  "categoryId": "cat_1",
  "subcategoryId": "sub_1",
  "description": "Instalación tuberías baño nivel 1",
  "quantity": 1,
  "unit": "PA",
  "unitPrice": 25000,
  "phase": "N1"
}
Transactions API
GET /api/projects/:projectId/transactions

Query params:

type
month
categoryId
subcategoryId
page
pageSize
POST /api/transactions

Expense example:

{
  "projectId": "proj_123",
  "transactionType": "expense",
  "transactionDate": "2026-03-07",
  "categoryId": "cat_hormigon",
  "subcategoryId": "sub_encofrado",
  "budgetLineId": null,
  "amount": 35000,
  "detail": "Avance 2 nómina 2",
  "payeeOrSource": "Equipo encofrado",
  "paymentMethod": "efectivo"
}

Income example:

{
  "projectId": "proj_123",
  "transactionType": "income",
  "transactionDate": "2026-03-12",
  "amount": 2000000,
  "detail": "Avance 2",
  "payeeOrSource": "Cliente",
  "paymentMethod": "deposito santa cruz"
}
Contractor payments API
POST /api/contractor-payments

This endpoint should create both:

expense transaction
contractor payment record
{
  "projectId": "proj_123",
  "contractorContractId": "cc_1",
  "transactionDate": "2026-03-07",
  "amount": 25000,
  "detail": "Avance 1 plomero",
  "paymentMethod": "transferencia"
}

Response:

{
  "transactionId": "txn_1",
  "contractorPaymentId": "cp_1",
  "pendingBalance": 55000
}
Reports API
GET /api/projects/:projectId/reports/summary

Returns KPIs.

GET /api/projects/:projectId/reports/budget-vs-actual

Returns grouped rows.

GET /api/projects/:projectId/reports/monthly-control?month=2026-03

Returns all expenses + summary for month.

GET /api/projects/:projectId/reports/cashflow

Returns monthly income/expense series.

Imports API
POST /api/imports/workbook

Multipart upload.

Server flow:

upload file
create import_job
parse workbook
preview mappings
user confirms
commit rows
POST /api/imports/workbook/confirm

Commits parsed data.

18) Frontend state model
Suggested query keys
projects.list
projects.detail(projectId)
budget.active(projectId)
transactions.list(projectId, filters)
contractors.list(projectId)
reports.summary(projectId)
reports.cashflow(projectId)
reports.budgetVsActual(projectId)
Form strategy

Use React Hook Form + Zod schemas for:

expense form
income form
contractor payment form
budget line form
project form
19) Caching and performance
Good enough for MVP
server-side aggregate queries
pagination on transactions
memoized chart transforms on frontend
Upgrade when data grows
materialized views or cached summary tables
nightly refresh jobs or event-driven updates
background PDF generation
20) Security rules
Must have
all data scoped by organization
row-level security if using Supabase directly
file storage paths scoped by organization/project
viewers cannot mutate data
no destructive delete for financial records in standard UI
Recommended audit table later

audit_logs

entity_type
entity_id
action
before_json
after_json
actor_id
created_at
21) Error handling
Import errors

Show rows that failed with reasons like:

unknown category
unknown subcategory
invalid date
missing amount
invalid budget line match
Transaction errors
category/subcategory mismatch
locked project period
missing contractor contract for contractor payment mode
22) Reporting logic details
Budget vs Actual table columns
Category
Subcategory
Budgeted
Actual Spent
Remaining
Variance
Variance %
Status badge
Status logic
on_track if actual <= 90% of budget consumed relative to progress
warning if actual between 90% and 100%
over_budget if actual > budget

For MVP, simpler rule:

green if remaining >= 0
red if remaining < 0
Monthly Control summary cards
total expenses this month
total income this month
net cashflow
top subcategory spend
transaction count
Contractor report columns
Contractor
Project
Scope
Agreed Total
Paid To Date
Pending Balance
Last Payment
23) Suggested component list
Shared components
KpiCard
FilterBar
DateRangePicker
ProjectSelector
CategorySelector
CurrencyCell
VarianceBadge
EmptyState
ImportPreviewTable
Feature components
QuickEntryPanel
BudgetTable
TransactionsTable
MonthlyControlTable
ContractorLedgerTable
BudgetVsActualChart
CashflowChart
ReceiptUploader
24) Suggested folder structure
src/
  app/
    dashboard/
    projects/
    transactions/
    imports/
    settings/
    api/
  components/
    ui/
    shared/
    dashboard/
    budget/
    transactions/
    contractors/
    reports/
  features/
    auth/
    projects/
    budget/
    transactions/
    contractors/
    reports/
    imports/
  lib/
    db/
    auth/
    validations/
    utils/
    permissions/
  types/
25) Zod schema examples
Expense form schema
const expenseSchema = z.object({
  projectId: z.string().uuid(),
  transactionType: z.literal('expense'),
  transactionDate: z.string(),
  categoryId: z.string().uuid(),
  subcategoryId: z.string().uuid().optional().nullable(),
  budgetLineId: z.string().uuid().optional().nullable(),
  amount: z.number().positive(),
  detail: z.string().max(500).optional(),
  payeeOrSource: z.string().max(255).optional(),
  paymentMethod: z.string().max(100).optional()
});
Contractor payment schema
const contractorPaymentSchema = z.object({
  projectId: z.string().uuid(),
  contractorContractId: z.string().uuid(),
  transactionDate: z.string(),
  amount: z.number().positive(),
  detail: z.string().max(500).optional(),
  paymentMethod: z.string().max(100).optional()
});
26) Migration strategy from current Excel workflow
Phase 0 — Discovery
confirm category naming cleanup
identify which month tabs are real data vs placeholders
define project opening balance if needed
Phase 1 — Seed master data
import categories/subcategories
create project record
create approved budget version
Phase 2 — Import financial history
import incomes
import month sheet expenses
import contractor-related payments where identifiable
Phase 3 — Validate
compare Excel monthly totals vs app monthly totals
compare Excel total disbursements vs app total income
compare budgeted totals vs imported budget totals
Phase 4 — Go live
freeze workbook as archive
start entering all new data in app only
27) Known data cleanup issues from workbook

These must be handled in import cleanup:

inconsistent spelling and punctuation in subcategories
decorative or helper text mixed into sheets
broken formulas in report totals
extra side-note columns in ENE, FEB, MAR
category labels with underscores and mixed styles
some budget rows are section headers, not real cost lines
28) MVP delivery plan
Sprint 1
auth
organization/project setup
categories/subcategories
base layout
project list/detail
Sprint 2
budget versioning
budget lines CRUD
import preview for budget and categories
Sprint 3
transaction ledger
quick entry page
monthly control page
receipt upload
Sprint 4
contractor contracts
contractor payments
contractor ledger report
Sprint 5
dashboard
budget vs actual
cashflow
exports
import finalization
29) Definition of done

A release is done only if:

expense entered once appears in project transactions
same expense affects monthly control automatically
same expense affects budget vs actual automatically
contractor payment affects contractor balance automatically
income updates cashflow automatically
report exports match live data
no manual duplicate entry is required anywhere
30) Final recommendation

Do not waste time cloning every Excel behavior. Clone only what is useful for the user’s mental model:

categories / partidas
subcategories
budget
monthly control
income tracking
contractor advances

Replace everything else with proper system logic:

one ledger
one budget model
one contractor payment model
generated reports
import tools for old workbook data

That is the correct build.