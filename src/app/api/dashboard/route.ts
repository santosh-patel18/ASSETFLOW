import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUserFromHeader, verifyRoleFromDB, getDepartmentScope } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUserFromHeader(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const dbRole = await verifyRoleFromDB(user.userId);
    if (!dbRole) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Build role-scoped KPI data
    let assetFilter: Record<string, unknown> = {};
    let allocationFilter: Record<string, unknown> = {};

    if (dbRole === 'employee') {
      // Employee sees only their allocations
      allocationFilter = { targetType: 'employee', targetId: user.userId, status: 'Active' };
    } else if (dbRole === 'department_head') {
      const deptIds = await getDepartmentScope(user.userId);
      assetFilter = { departmentId: { in: deptIds } };
    }

    const [
      availableAssets,
      allocatedAssets,
      maintenanceToday,
      activeBookings,
      pendingTransfers,
      overdueReturns,
      upcomingReturns,
    ] = await Promise.all([
      prisma.asset.count({ where: { ...assetFilter, status: 'Available' } }),
      prisma.asset.count({ where: { ...assetFilter, status: 'Allocated' } }),
      prisma.maintenanceRequest.count({
        where: {
          status: { in: ['Pending', 'Approved', 'In Progress', 'Technician Assigned'] },
        },
      }),
      prisma.resourceBooking.count({
        where: { status: { in: ['Upcoming', 'Ongoing'] } },
      }),
      prisma.transferRequest.count({ where: { status: 'Requested' } }),
      prisma.allocation.findMany({
        where: {
          status: 'Active',
          expectedReturnDate: { lt: new Date() },
          ...allocationFilter,
        },
        include: {
          asset: { select: { id: true, name: true, assetTag: true } },
        },
        take: 10,
      }),
      prisma.allocation.findMany({
        where: {
          status: 'Active',
          expectedReturnDate: { gte: new Date() },
          ...allocationFilter,
        },
        include: {
          asset: { select: { id: true, name: true, assetTag: true } },
        },
        orderBy: { expectedReturnDate: 'asc' },
        take: 10,
      }),
    ]);

    return NextResponse.json({
      kpi: {
        availableAssets,
        allocatedAssets,
        maintenanceToday,
        activeBookings,
        pendingTransfers,
        overdueReturns: overdueReturns.length,
      },
      overdueReturns,
      upcomingReturns,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
