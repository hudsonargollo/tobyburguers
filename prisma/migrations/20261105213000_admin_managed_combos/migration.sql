UPDATE "Product" AS p
SET "active" = false, "featured" = false, "updatedAt" = CURRENT_TIMESTAMP
FROM "Category" AS c
WHERE p."categoryId" = c."id"
  AND c."slug" = 'combos'
  AND (p."slug", p."sku") IN (
    ('combo-cheese-burger', 'SM-CMB-01'),
    ('combo-cheese-filet', 'SM-CMB-02'),
    ('combo-cheese-corazon', 'SM-CMB-03'),
    ('combo-cheese-pollo-tocino', 'SM-CMB-04'),
    ('combo-burger-calabresa', 'SM-CMB-05'),
    ('combo-burger-vegetariana', 'SM-CMB-06'),
    ('combo-dulce', 'SM-CMB-07'),
    ('combo-para-dos', 'SM-CMB-08')
  );
