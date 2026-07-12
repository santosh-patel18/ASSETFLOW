import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

async function main() {
  const p = new PrismaClient();
  const h = await bcrypt.hash('Admin@123', 12);
  await p.employee.updateMany({ where: { email: 'admin@assetflow.com' }, data: { passwordHash: h } });
  console.log('✓ Admin password reset to: Admin@123');
  await p.$disconnect();
}
main();
