import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('📎 Applying exclusion constraint and indexes...');

  // 1. Partial unique index: only one Active allocation per asset
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_allocation_per_asset
    ON allocations (asset_id)
    WHERE status = 'Active';
  `);
  console.log('✓ Partial unique index for active allocation');

  // 2. Exclusion constraint: no overlapping bookings on same resource (non-cancelled)
  // btree_gist extension must be enabled first (we did this already)
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE resource_bookings
      ADD CONSTRAINT no_overlapping_bookings
      EXCLUDE USING gist (
        resource_id WITH =,
        tstzrange(start_time, end_time) WITH &&
      )
      WHERE (status <> 'Cancelled');
    `);
    console.log('✓ Exclusion constraint for non-overlapping bookings');
  } catch (e: any) {
    if (e.message?.includes('already exists')) {
      console.log('✓ Exclusion constraint already exists');
    } else {
      throw e;
    }
  }

  // 3. GIN index on attributes JSONB
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_asset_attributes
    ON assets USING gin (attributes);
  `);
  console.log('✓ GIN index on asset attributes');

  // 4. Index on activity log for fast queries
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_activity_log_actor
    ON activity_log (actor_id, created_at DESC);
  `);
  console.log('✓ Activity log index');

  console.log('\n✅ All constraints and indexes applied!');
}

main()
  .catch((e) => {
    console.error('❌ Failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
