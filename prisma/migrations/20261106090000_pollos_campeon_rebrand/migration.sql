-- Pollos Campeón rebrand: rename the placeholder branch row left over from the
-- SantaMaria deploy and refresh the announcement bar copy stored in Settings.
-- Fresh databases have neither row, so every statement is guarded.

-- 1. Placeholder branch -> first real Pollos Campeón location.
--    Children are moved explicitly (the FKs are not all ON UPDATE CASCADE).
UPDATE "Order" SET "branchId" = 'polloscampeon-principal'
WHERE "branchId" = 'santamaria-principal';

UPDATE "BranchStock" SET "branchId" = 'polloscampeon-principal'
WHERE "branchId" = 'santamaria-principal';

UPDATE "User" SET "branchId" = 'polloscampeon-principal'
WHERE "branchId" = 'santamaria-principal';

UPDATE "Branch"
SET "id" = 'polloscampeon-principal',
    "name" = 'Casco Viejo',
    "slug" = 'casco-viejo',
    "code" = 'PC00',
    "address" = 'Av. Cañoto 571, esquina Junín',
    "city" = 'Santa Cruz',
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = 'santamaria-principal';

-- 2. Legacy announcement lines -> Pollos Campeón copy.
UPDATE "Setting"
SET value = jsonb_set(value, '{announcements}', (
  SELECT jsonb_agg(
    CASE line
      WHEN '"Delivery en moto en Santa Cruz · 13 sucursales"'::jsonb THEN '"Delivery en moto en Santa Cruz"'::jsonb
      WHEN '"Elige tu sucursal SantaMaria y recibe el mismo día"'::jsonb THEN '"18 sucursales · Pide por WhatsApp"'::jsonb
      WHEN '"Combos hechos al momento · Sabor de barrio"'::jsonb THEN '"Hecho al momento · Pago contra entrega"'::jsonb
      WHEN '"Sabor de barrio"'::jsonb THEN '"El pollo #1 de Bolivia"'::jsonb
      ELSE line
    END ORDER BY position
  )
  FROM jsonb_array_elements(value->'announcements') WITH ORDINALITY AS lines(line, position)
))
WHERE key = 'store'
  AND jsonb_typeof(value->'announcements') = 'array'
  AND value->'announcements' ?| ARRAY[
    'Delivery en moto en Santa Cruz · 13 sucursales',
    'Elige tu sucursal SantaMaria y recibe el mismo día',
    'Combos hechos al momento · Sabor de barrio',
    'Sabor de barrio'
  ];
