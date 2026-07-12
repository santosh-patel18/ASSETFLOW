import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUserFromHeader } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUserFromHeader(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const departments = await prisma.department.findMany({
      select: {
        id: true,
        name: true,
        status: true,
        _count: { select: { assets: true, employees: true } },
      },
      orderBy: { name: 'asc' },
    });

    // Get allocation counts by department
    const deptAllocations = await prisma.allocation.groupBy({
      by: ['targetId'],
      where: { targetType: 'department', status: 'Active' },
      _count: { id: true },
    });

    const data = departments.map(dept => ({
      ...dept,
      active_allocations: deptAllocations.find(a => a.targetId === dept.id)?._count.id || 0,
    }));

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Department allocation report error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
