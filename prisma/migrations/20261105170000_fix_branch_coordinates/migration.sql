-- Correct branch coordinates so the nearest-branch suggestion stops skipping
-- stores (Nueva Equipetrol was ~4.6 km off its real corner).
UPDATE "Branch" SET latitude = -17.76300, longitude = -63.19650 WHERE slug = 'nueva-equipetrol';
UPDATE "Branch" SET latitude = -17.79966, longitude = -63.18219 WHERE slug = 'trompillo';
UPDATE "Branch" SET latitude = -17.77060, longitude = -63.17340 WHERE slug = 'alemana-2do-anillo';
UPDATE "Branch" SET latitude = -17.79050, longitude = -63.19950 WHERE slug = 'pirai';
