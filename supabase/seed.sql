insert into public.organizations (id, slug, name)
values
  ('00000000-0000-0000-0000-000000000001', 'construction-firm', 'Control Central')
on conflict (id) do nothing;

insert into public.categories (id, organization_id, name, sort_order, is_active)
values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'PLOMERIA', 1, true),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'ELECTRICIDAD', 2, true),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'MOVIMIENTO DE TIERRA', 3, true)
on conflict (id) do nothing;

insert into public.subcategories (id, organization_id, category_id, name, sort_order, is_active)
values
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'M.D.O. Plomero', 1, true),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Materiales de plomeria', 2, true),
  ('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'Cableado', 1, true),
  ('20000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'Excavacion', 1, true)
on conflict (id) do nothing;

insert into public.projects (
  id,
  organization_id,
  name,
  client_name,
  location,
  status,
  start_date,
  end_date,
  notes
)
values
  (
    '30000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'Plaza Tigaiga',
    'Grupo Tigaiga',
    'Santiago, RD',
    'active',
    '2026-03-01',
    null,
    'Proyecto activo para demo del dashboard.'
  ),
  (
    '30000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'Casa Bonita',
    'Familia Rosario',
    'Puerto Plata, RD',
    'draft',
    '2026-04-01',
    null,
    'Proyecto en preparacion presupuestaria.'
  )
on conflict (id) do nothing;

insert into public.budget_versions (
  id,
  organization_id,
  project_id,
  version_name,
  status,
  is_locked,
  approved_at
)
values
  (
    '40000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    'Base Marzo',
    'approved',
    true,
    '2026-03-01T14:00:00Z'
  ),
  (
    '40000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000002',
    'Borrador Abril',
    'draft',
    false,
    null
  )
on conflict (id) do nothing;

insert into public.budget_lines (
  id,
  organization_id,
  budget_version_id,
  project_id,
  category_id,
  subcategory_id,
  phase,
  area,
  line_code,
  description,
  quantity,
  unit,
  unit_price,
  total_budgeted,
  notes,
  sort_order,
  is_manual_total
)
values
  (
    '50000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    'N1',
    'Banos',
    'PL-001',
    'Instalacion sanitaria principal',
    1,
    'PA',
    25000,
    25000,
    '',
    1,
    false
  ),
  (
    '50000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000003',
    'N1',
    'Primer nivel',
    'EL-001',
    'Canalizacion y cableado base',
    1,
    'PA',
    32000,
    32000,
    '',
    2,
    false
  )
on conflict (id) do nothing;

insert into public.contractors (
  id,
  organization_id,
  full_name,
  trade,
  phone,
  email,
  notes,
  is_active
)
values
  (
    '60000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'Plomero Juan',
    'Plomeria',
    '809-555-0101',
    'juan@example.com',
    '',
    true
  ),
  (
    '60000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'Electrico Pena',
    'Electricidad',
    '809-555-0102',
    'pena@example.com',
    '',
    true
  )
on conflict (id) do nothing;

insert into public.contractor_contracts (
  id,
  organization_id,
  project_id,
  contractor_id,
  category_id,
  subcategory_id,
  scope_description,
  agreed_total,
  status,
  start_date,
  end_date,
  notes
)
values
  (
    '70000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    'Trabajo general de plomeria',
    40000,
    'active',
    '2026-03-01',
    null,
    ''
  ),
  (
    '70000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000003',
    'Cableado y tableros',
    52000,
    'active',
    '2026-03-01',
    null,
    ''
  )
on conflict (id) do nothing;

insert into public.transactions (
  id,
  organization_id,
  project_id,
  budget_line_id,
  category_id,
  subcategory_id,
  transaction_type,
  transaction_date,
  amount,
  detail,
  payee_or_source,
  payment_method,
  external_reference,
  contractor_contract_id,
  created_by,
  deleted_at
)
values
  (
    '80000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    null,
    null,
    null,
    'income',
    '2026-03-12',
    30000,
    'Desembolso 1',
    'Cliente',
    'transferencia',
    '',
    null,
    null,
    null
  ),
  (
    '80000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    '50000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    'expense',
    '2026-03-08',
    12000,
    'Avance 1 plomero',
    'Plomero Juan',
    'transferencia',
    '',
    '70000000-0000-0000-0000-000000000001',
    null,
    null
  ),
  (
    '80000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    '50000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000003',
    'expense',
    '2026-03-15',
    9000,
    'Material electrico inicial',
    'Ferreteria Norte',
    'cheque',
    '',
    null,
    null,
    null
  )
on conflict (id) do nothing;

insert into public.contractor_payments (
  id,
  organization_id,
  contractor_contract_id,
  transaction_id,
  payment_date,
  amount,
  notes,
  deleted_at
)
values
  (
    '90000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    '70000000-0000-0000-0000-000000000001',
    '80000000-0000-0000-0000-000000000002',
    '2026-03-08',
    12000,
    'Primer avance',
    null
  )
on conflict (id) do nothing;
