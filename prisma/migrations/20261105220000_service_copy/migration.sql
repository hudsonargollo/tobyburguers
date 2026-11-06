UPDATE "Setting"
SET value = jsonb_set(value, '{shipping,deliveryTime}', '"lo antes posible, según preparación y distancia"'::jsonb)
WHERE key = 'store'
  AND value #>> '{shipping,deliveryTime}' IN ('el mismo día', 'en 30 a 45 minutos');

UPDATE "Setting"
SET value = jsonb_set(value, '{announcements}', (
  SELECT jsonb_agg(
    CASE line
      WHEN '"Combos hechos al momento · Sabor de barrio"'::jsonb THEN '"Pedidos hechos al momento · Sabor de barrio"'::jsonb
      WHEN '"Elige tu sucursal SantaMaria y recibe el mismo día"'::jsonb THEN '"Delivery en moto en Santa Cruz"'::jsonb
      WHEN '"Calidad certificada · Pago contra entrega"'::jsonb THEN '"Hecho al momento · Pago contra entrega"'::jsonb
      ELSE line
    END ORDER BY position
  )
  FROM jsonb_array_elements(value->'announcements') WITH ORDINALITY AS lines(line, position)
))
WHERE key = 'store'
  AND jsonb_typeof(value->'announcements') = 'array'
  AND value->'announcements' ?| ARRAY[
    'Combos hechos al momento · Sabor de barrio',
    'Elige tu sucursal SantaMaria y recibe el mismo día',
    'Calidad certificada · Pago contra entrega'
  ];
