-- Raw SQL migration for PostgreSQL exclusion constraint
-- This file is maintained OUTSIDE Prisma's auto-managed migrations
-- because Prisma cannot correctly introspect PostgreSQL exclusion constraints.
--
-- Run this after `prisma migrate dev` or `prisma db push`:
--   psql $DATABASE_URL -f prisma/migrations/manual/001_exclusion_constraint.sql
-- Or via the helper script: npm run db:apply-exclusion

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Exclusion constraint: no two non-cancelled bookings may overlap on the same resource
-- Uses closed-open interval [start, end) so a booking ending at 10:00 does NOT conflict
-- with one starting at 10:00.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'no_overlapping_bookings'
    ) THEN
        ALTER TABLE resource_bookings ADD CONSTRAINT no_overlapping_bookings
            EXCLUDE USING gist (
                resource_id WITH =,
                tstzrange(start_time, end_time, '[)') WITH &&
            ) WHERE (status != 'Cancelled');
    END IF;
END
$$;

-- Partial unique index: only one Active allocation per asset at a time
-- (Prisma may or may not generate this correctly, so we ensure it exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'idx_one_active_allocation_per_asset'
    ) THEN
        CREATE UNIQUE INDEX idx_one_active_allocation_per_asset
            ON allocations(asset_id) WHERE status = 'Active';
    END IF;
END
$$;

-- GIN index on asset attributes JSONB column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'idx_assets_attributes_gin'
    ) THEN
        CREATE INDEX idx_assets_attributes_gin ON assets USING GIN (attributes);
    END IF;
END
$$;
