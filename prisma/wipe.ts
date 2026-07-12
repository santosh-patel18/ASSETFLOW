import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🗑️  Wiping all data from AssetFlow database...\n');

  // Delete in correct order (foreign key dependencies)
  const notifs = await prisma.notification.deleteMany({});
  console.log(`  ✓ Deleted ${notifs.count} notifications`);

  const actLogs = await prisma.activityLog.deleteMany({});
  console.log(`  ✓ Deleted ${actLogs.count} activity logs`);

  const auditItems = await prisma.auditItem.deleteMany({});
  console.log(`  ✓ Deleted ${auditItems.count} audit items`);

  const auditAuditors = await prisma.auditCycleAuditor.deleteMany({});
  console.log(`  ✓ Deleted ${auditAuditors.count} audit auditors`);

  const auditCycles = await prisma.auditCycle.deleteMany({});
  console.log(`  ✓ Deleted ${auditCycles.count} audit cycles`);

  const maintenance = await prisma.maintenanceRequest.deleteMany({});
  console.log(`  ✓ Deleted ${maintenance.count} maintenance requests`);

  const bookings = await prisma.resourceBooking.deleteMany({});
  console.log(`  ✓ Deleted ${bookings.count} bookings`);

  const transfers = await prisma.transferRequest.deleteMany({});
  console.log(`  ✓ Deleted ${transfers.count} transfer requests`);

  const allocations = await prisma.allocation.deleteMany({});
  console.log(`  ✓ Deleted ${allocations.count} allocations`);

  const stateLogs = await prisma.assetStateLog.deleteMany({});
  console.log(`  ✓ Deleted ${stateLogs.count} state log entries`);

  const assets = await prisma.asset.deleteMany({});
  console.log(`  ✓ Deleted ${assets.count} assets`);

  const categories = await prisma.assetCategory.deleteMany({});
  console.log(`  ✓ Deleted ${categories.count} categories`);

  // Clear dept head references before deleting
  await prisma.department.updateMany({ data: { headEmployeeId: null } });

  // Delete all non-admin employees
  const employees = await prisma.employee.deleteMany({
    where: { role: { not: 'admin' } },
  });
  console.log(`  ✓ Deleted ${employees.count} employees (kept admin)`);

  const departments = await prisma.department.deleteMany({});
  console.log(`  ✓ Deleted ${departments.count} departments`);

  // Reset the admin password in case it was changed
  const adminPassword = await bcrypt.hash('Admin@123', 12);
  await prisma.employee.updateMany({
    where: { role: 'admin' },
    data: { passwordHash: adminPassword },
  });

  console.log('\n✅ All data wiped! Database is clean.');
  console.log('   Only the Admin account remains:');
  console.log('   Email: admin@assetflow.com');
  console.log('   Password: Admin@123');
}

main()
  .catch((e) => {
    console.error('❌ Wipe failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
