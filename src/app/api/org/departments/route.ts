import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUserFromHeader, verifyRoleFromDB } from '@/lib/auth';
import { createDepartmentSchema } from '@/lib/validations/org';
import { logActivity } from '@/lib/activity-logger';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUserFromHeader(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const departments = await prisma.department.findMany({
      include: {
        parent: { select: { id: true, name: true } },
        headEmployee: { select: { id: true, name: true, email: true } },
        _count: { select: { employees: true, assets: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ departments });
  } catch (error) {
    console.error('Get departments error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUserFromHeader(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Admin only — re-verify from DB
    const dbRole = await verifyRoleFromDB(user.userId);
    if (dbRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin only' }, { status: 403 });
    }

    const body = await request.json();
    const result = createDepartmentSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation error', details: result.error.flatten().fieldErrors },
        { status: 422 }
      );
    }

    const data = result.data;

    // Check for circular parent reference
    if (data.parent_department_id) {
      const parent = await prisma.department.findUnique({
        where: { id: data.parent_department_id },
      });
      if (!parent) {
        return NextResponse.json({ error: 'Parent department not found' }, { status: 404 });
      }
    }

    const department = await prisma.department.create({
      data: {
        name: data.name,
        parentDepartmentId: data.parent_department_id || null,
        headEmployeeId: data.head_employee_id || null,
        status: data.status || 'Active',
      },
      include: {
        parent: { select: { id: true, name: true } },
        headEmployee: { select: { id: true, name: true } },
      },
    });

    await logActivity(user.userId, 'CREATE_DEPARTMENT', 'department', department.id, {
      name: department.name,
    });

    return NextResponse.json({ department }, { status: 201 });
  } catch (error) {
    console.error('Create department error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
