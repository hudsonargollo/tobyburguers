-- Replace the old grocery announcement bar copy with the SantaMaria Fast Food lines.
UPDATE "Setting"
SET value = jsonb_set(
  value,
  '{announcements}',
  '["Delivery en moto en Santa Cruz · 13 sucursales","Pago contra entrega al recibir tu pedido","Combos hechos al momento · Sabor de barrio","Atención rápida por WhatsApp"]'::jsonb,
  true
)
WHERE key = 'store';
