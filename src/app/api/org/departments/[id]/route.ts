import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUserFromHeader, verifyRoleFromDB } from '@/lib/auth';
import { updateDepartmentSchema } from '@/lib/validations/org';
import { logActivity } from '@/lib/activity-logger';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUserFromHeader(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const dbRole = await verifyRoleFromDB(user.userId);
    if (dbRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin only' }, { status: 403 });
    }

    const body = await request.json();
    const result = updateDepartmentSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation error', details: result.error.flatten().fieldErrors },
        { status: 422 }
      );
    }

    const existing = await prisma.department.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 });
    }

    const data = result.data;
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.parent_department_id !== undefined) updateData.parentDepartmentId = data.parent_department_id;
    if (data.head_employee_id !== undefined) updateData.headEmployeeId = data.head_employee_id;
    if (data.status !== undefined) updateData.status = data.status;

    const department = await prisma.department.update({
      where: { id: params.id },
      data: updateData,
      include: {
        parent: { select: { id: true, name: true } },
        headEmployee: { select: { id: true, name: true } },
      },
    });

    await logActivity(user.userId, 'UPDATE_DEPARTMENT', 'department', department.id, {
      changes: data,
    });

    return NextResponse.json({ department });
  } catch (error) {
    console.error('Update department error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
