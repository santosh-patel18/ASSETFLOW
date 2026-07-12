import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding AssetFlow database...');

  // --- 1. Create Admin user ---
  const adminPassword = await bcrypt.hash('Admin@123', 12);
  const admin = await prisma.employee.upsert({
    where: { email: 'admin@assetflow.com' },
    update: {},
    create: {
      name: 'System Admin',
      email: 'admin@assetflow.com',
      passwordHash: adminPassword,
      role: 'admin',
      status: 'Active',
    },
  });
  console.log('✓ Admin created:', admin.email);

  // --- 2. Create Departments (let DB auto-generate UUIDs) ---
  let engineering = await prisma.department.findFirst({ where: { name: 'Engineering' } });
  if (!engineering) {
    engineering = await prisma.department.create({
      data: { name: 'Engineering', status: 'Active' },
    });
  }

  let hr = await prisma.department.findFirst({ where: { name: 'Human Resources' } });
  if (!hr) {
    hr = await prisma.department.create({
      data: { name: 'Human Resources', status: 'Active' },
    });
  }

  let finance = await prisma.department.findFirst({ where: { name: 'Finance' } });
  if (!finance) {
    finance = await prisma.department.create({
      data: { name: 'Finance', status: 'Active' },
    });
  }

  let operations = await prisma.department.findFirst({ where: { name: 'Operations' } });
  if (!operations) {
    operations = await prisma.department.create({
      data: { name: 'Operations', status: 'Active' },
    });
  }

  let frontend = await prisma.department.findFirst({ where: { name: 'Frontend Team' } });
  if (!frontend) {
    frontend = await prisma.department.create({
      data: { name: 'Frontend Team', parentDepartmentId: engineering.id, status: 'Active' },
    });
  }

  let backend = await prisma.department.findFirst({ where: { name: 'Backend Team' } });
  if (!backend) {
    backend = await prisma.department.create({
      data: { name: 'Backend Team', parentDepartmentId: engineering.id, status: 'Active' },
    });
  }
  console.log('✓ Departments created');

  // --- 3. Create Users for each role ---
  const managerPassword = await bcrypt.hash('Manager@123', 12);
  const manager = await prisma.employee.upsert({
    where: { email: 'manager@assetflow.com' },
    update: {},
    create: {
      name: 'Alice Manager',
      email: 'manager@assetflow.com',
      passwordHash: managerPassword,
      role: 'asset_manager',
      departmentId: operations.id,
      status: 'Active',
    },
  });
  console.log('✓ Asset Manager created:', manager.email);

  const headPassword = await bcrypt.hash('Head@123', 12);
  const deptHead = await prisma.employee.upsert({
    where: { email: 'head@assetflow.com' },
    update: {},
    create: {
      name: 'Bob DeptHead',
      email: 'head@assetflow.com',
      passwordHash: headPassword,
      role: 'department_head',
      departmentId: engineering.id,
      status: 'Active',
    },
  });

  // Set dept head
  await prisma.department.update({
    where: { id: engineering.id },
    data: { headEmployeeId: deptHead.id },
  });
  console.log('✓ Department Head created:', deptHead.email);

  const empPassword = await bcrypt.hash('Employee@123', 12);
  const employee1 = await prisma.employee.upsert({
    where: { email: 'charlie@assetflow.com' },
    update: {},
    create: {
      name: 'Charlie Employee',
      email: 'charlie@assetflow.com',
      passwordHash: empPassword,
      role: 'employee',
      departmentId: frontend.id,
      status: 'Active',
    },
  });

  const employee2 = await prisma.employee.upsert({
    where: { email: 'diana@assetflow.com' },
    update: {},
    create: {
      name: 'Diana Employee',
      email: 'diana@assetflow.com',
      passwordHash: empPassword,
      role: 'employee',
      departmentId: backend.id,
      status: 'Active',
    },
  });
  console.log('✓ Employees created');

  // --- 4. Create Categories ---
  let laptopCat = await prisma.assetCategory.findFirst({ where: { name: 'Laptops' } });
  if (!laptopCat) {
    laptopCat = await prisma.assetCategory.create({
      data: { name: 'Laptops', fieldSchema: { brand: { type: 'string', required: true }, ram_gb: { type: 'number', required: true }, warranty_months: { type: 'number' } }, status: 'Active' },
    });
  }

  let furnitureCat = await prisma.assetCategory.findFirst({ where: { name: 'Furniture' } });
  if (!furnitureCat) {
    furnitureCat = await prisma.assetCategory.create({
      data: { name: 'Furniture', fieldSchema: { material: { type: 'string' }, color: { type: 'string' } }, status: 'Active' },
    });
  }

  let vehicleCat = await prisma.assetCategory.findFirst({ where: { name: 'Vehicles' } });
  if (!vehicleCat) {
    vehicleCat = await prisma.assetCategory.create({
      data: { name: 'Vehicles', fieldSchema: { make: { type: 'string' }, model: { type: 'string' }, year: { type: 'number' } }, status: 'Active' },
    });
  }

  let meetingRoomCat = await prisma.assetCategory.findFirst({ where: { name: 'Meeting Rooms' } });
  if (!meetingRoomCat) {
    meetingRoomCat = await prisma.assetCategory.create({
      data: { name: 'Meeting Rooms', fieldSchema: { capacity: { type: 'number', required: true }, has_projector: { type: 'boolean' } }, status: 'Active' },
    });
  }

  let networkCat = await prisma.assetCategory.findFirst({ where: { name: 'Network Equipment' } });
  if (!networkCat) {
    networkCat = await prisma.assetCategory.create({
      data: { name: 'Network Equipment', fieldSchema: { ports: { type: 'number' }, speed_gbps: { type: 'number' } }, status: 'Active' },
    });
  }
  console.log('✓ Categories created');

  // --- 5. Create Assets ---
  const assetsData = [
    { assetTag: 'AF-0001', name: 'MacBook Pro 16" M3', categoryId: laptopCat.id, serialNumber: 'SN-MBP-001', status: 'Available', location: 'Floor 2, Rack A', departmentId: engineering.id, isBookable: false, condition: 'New', acquisitionCost: 2499.99, acquisitionDate: new Date('2024-06-15'), attributes: { brand: 'Apple', ram_gb: 32, warranty_months: 24 } },
    { assetTag: 'AF-0002', name: 'ThinkPad X1 Carbon', categoryId: laptopCat.id, serialNumber: 'SN-TPX-001', status: 'Available', location: 'Floor 2, Rack A', departmentId: engineering.id, isBookable: false, condition: 'New', acquisitionCost: 1899.99, acquisitionDate: new Date('2024-07-01'), attributes: { brand: 'Lenovo', ram_gb: 16, warranty_months: 36 } },
    { assetTag: 'AF-0003', name: 'Dell Latitude 5540', categoryId: laptopCat.id, serialNumber: 'SN-DL5-001', status: 'Available', location: 'Floor 1, Rack B', departmentId: hr.id, isBookable: false, condition: 'Good', acquisitionCost: 1299.99, acquisitionDate: new Date('2024-03-10'), attributes: { brand: 'Dell', ram_gb: 16, warranty_months: 12 } },
    { assetTag: 'AF-0004', name: 'Standing Desk Pro', categoryId: furnitureCat.id, serialNumber: 'SN-SD-001', status: 'Available', location: 'Floor 2', departmentId: engineering.id, isBookable: false, condition: 'New', acquisitionCost: 899.00, acquisitionDate: new Date('2024-08-01'), attributes: { material: 'Bamboo', color: 'Natural' } },
    { assetTag: 'AF-0005', name: 'Ergonomic Chair', categoryId: furnitureCat.id, serialNumber: 'SN-EC-001', status: 'Available', location: 'Floor 2', departmentId: engineering.id, isBookable: false, condition: 'New', acquisitionCost: 1495.00, acquisitionDate: new Date('2024-08-01'), attributes: { material: 'Mesh', color: 'Black' } },
    { assetTag: 'AF-0006', name: 'Conference Room A', categoryId: meetingRoomCat.id, status: 'Available', location: 'Building 1, Floor 3', isBookable: true, condition: 'Good', attributes: { capacity: 20, has_projector: true } },
    { assetTag: 'AF-0007', name: 'Huddle Room B', categoryId: meetingRoomCat.id, status: 'Available', location: 'Building 1, Floor 2', isBookable: true, condition: 'Good', attributes: { capacity: 6, has_projector: false } },
    { assetTag: 'AF-0008', name: 'Toyota Corolla Fleet', categoryId: vehicleCat.id, serialNumber: 'VIN-TC-001', status: 'Available', location: 'Parking Lot A', departmentId: operations.id, isBookable: true, condition: 'Good', acquisitionCost: 25000, acquisitionDate: new Date('2023-01-15'), attributes: { make: 'Toyota', model: 'Corolla', year: 2023 } },
    { assetTag: 'AF-0009', name: 'Cisco Switch 24-Port', categoryId: networkCat.id, serialNumber: 'SN-CS24-001', status: 'Available', location: 'Server Room', departmentId: engineering.id, isBookable: false, condition: 'Good', acquisitionCost: 4500, acquisitionDate: new Date('2024-02-01'), attributes: { ports: 24, speed_gbps: 10 } },
    { assetTag: 'AF-0010', name: 'HP ProLiant Server', categoryId: networkCat.id, serialNumber: 'SN-HP-001', status: 'Available', location: 'Server Room', departmentId: engineering.id, isBookable: false, condition: 'New', acquisitionCost: 12000, acquisitionDate: new Date('2024-09-01'), attributes: { ports: 4, speed_gbps: 25 } },
  ];

  for (const assetData of assetsData) {
    await prisma.asset.upsert({
      where: { assetTag: assetData.assetTag },
      update: {},
      create: assetData,
    });
  }
  console.log('✓ 10 assets created');

  // --- 6. Create sample allocation ---
  const mbp = await prisma.asset.findUnique({ where: { assetTag: 'AF-0001' } });
  const existingAlloc = await prisma.allocation.findFirst({ where: { assetId: mbp!.id, status: 'Active' } });
  if (mbp && mbp.status === 'Available' && !existingAlloc) {
    await prisma.allocation.create({
      data: {
        assetId: mbp.id,
        targetType: 'employee',
        targetId: employee1.id,
        allocatedBy: manager.id,
        expectedReturnDate: new Date('2025-12-31'),
        status: 'Active',
      },
    });
    await prisma.asset.update({ where: { id: mbp.id }, data: { status: 'Allocated' } });
    await prisma.assetStateLog.create({ data: { assetId: mbp.id, fromStatus: 'Available', toStatus: 'Allocated', changedBy: manager.id } });
    console.log('✓ Sample allocation created (AF-0001 → Charlie)');
  }

  // --- 7. Create sample maintenance request ---
  const thinkpad = await prisma.asset.findUnique({ where: { assetTag: 'AF-0002' } });
  const existingMR = await prisma.maintenanceRequest.findFirst({ where: { assetId: thinkpad!.id } });
  if (thinkpad && !existingMR) {
    await prisma.maintenanceRequest.create({
      data: {
        assetId: thinkpad.id,
        raisedBy: employee2.id,
        issue: 'Screen flickering on startup — intermittent hardware issue',
        priority: 'medium',
        status: 'Pending',
      },
    });
    console.log('✓ Sample maintenance request created');
  }

  // --- 8. Create sample booking ---
  const confRoom = await prisma.asset.findUnique({ where: { assetTag: 'AF-0006' } });
  if (confRoom) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    const endTime = new Date(tomorrow);
    endTime.setHours(11, 30, 0, 0);

    const existingBooking = await prisma.resourceBooking.findFirst({
      where: { resourceId: confRoom.id, startTime: tomorrow },
    });
    if (!existingBooking) {
      await prisma.resourceBooking.create({
        data: {
          resourceId: confRoom.id,
          bookedBy: deptHead.id,
          startTime: tomorrow,
          endTime: endTime,
          status: 'Upcoming',
        },
      });
      console.log('✓ Sample booking created (Conference Room A)');
    }
  }

  console.log('\n✅ Seed complete! Login credentials:');
  console.log('   Admin:          admin@assetflow.com / Admin@123');
  console.log('   Asset Manager:  manager@assetflow.com / Manager@123');
  console.log('   Dept Head:      head@assetflow.com / Head@123');
  console.log('   Employee:       charlie@assetflow.com / Employee@123');
  console.log('   Employee:       diana@assetflow.com / Employee@123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
