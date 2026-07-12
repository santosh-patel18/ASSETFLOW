import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUserFromHeader, verifyRoleFromDB, getDepartmentScope } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUserFromHeader(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const dbRole = await verifyRoleFromDB(user.userId);
    if (!dbRole) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const scope = searchParams.get('scope');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    let where: Record<string, unknown> = {};

    // Scope based on role
    if (dbRole === 'employee') {
      where.actorId = user.userId;
    } else if (dbRole === 'department_head') {
      // Get employees in department scope
      const deptIds = await getDepartmentScope(user.userId);
      const deptEmployees = await prisma.employee.findMany({
        where: { departmentId: { in: deptIds } },
        select: { id: true },
      });
      where.actorId = { in: deptEmployees.map(e => e.id) };
    }
    // Admin and asset_manager see everything

    if (scope) {
      where.targetType = scope;
    }

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        include: {
          actor: { select: { id: true, name: true, role: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.activityLog.count({ where }),
    ]);

    return NextResponse.json({ logs, total, page, limit });
  } catch (error) {
    console.error('Get activity log error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
