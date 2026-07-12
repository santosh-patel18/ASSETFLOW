import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUserFromHeader, verifyRoleFromDB, getDepartmentScope } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUserFromHeader(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const dbRole = await verifyRoleFromDB(user.userId);
    if (!dbRole) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let where: Record<string, unknown> = {};

    // Scope based on role
    if (dbRole === 'department_head') {
      const deptScope = await getDepartmentScope(user.userId);
      // Department heads see employees in their dept + pending registrations for their dept
      where = {
        OR: [
          { departmentId: { in: deptScope }, status: { not: 'Pending' } },
          { departmentId: { in: deptScope }, status: 'Pending' },
        ],
      };
    } else if (dbRole !== 'admin' && dbRole !== 'asset_manager') {
      // Regular employees can only see themselves
      where = { id: user.userId };
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const department = searchParams.get('department');
    const role = searchParams.get('role');
    const status = searchParams.get('status');

    if (search) {
      where = {
        ...where,
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      };
    }
    if (department) where.departmentId = department;
    if (role) where.role = role;
    if (status) where.status = status;

    const employees = await prisma.employee.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        departmentId: true,
        department: { select: { id: true, name: true } },
        createdAt: true,
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ employees });
  } catch (error) {
    console.error('Get employees error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
