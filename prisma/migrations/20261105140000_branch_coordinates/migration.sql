-- Coordinates let the storefront suggest the closest branch from the
-- shopper's geolocation. Nullable: branches work without them.
ALTER TABLE "Branch"
  ADD COLUMN "latitude" DOUBLE PRECISION,
  ADD COLUMN "longitude" DOUBLE PRECISION;
