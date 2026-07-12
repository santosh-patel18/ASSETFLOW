import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUserFromHeader, verifyRoleFromDB } from '@/lib/auth';
import { changeRoleSchema } from '@/lib/validations/org';
import { logActivity } from '@/lib/activity-logger';
import { notify } from '@/lib/notifier';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUserFromHeader(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Re-verify role from DB — this is a privileged mutation
    const dbRole = await verifyRoleFromDB(user.userId);
    if (dbRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin only' }, { status: 403 });
    }

    const body = await request.json();
    const result = changeRoleSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation error', details: result.error.flatten().fieldErrors },
        { status: 422 }
      );
    }

    const targetEmployee = await prisma.employee.findUnique({
      where: { id: params.id },
    });
    if (!targetEmployee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const newRole = result.data.role;
    const oldRole = targetEmployee.role;

    // Block self-demotion if sole Admin
    if (user.userId === params.id && oldRole === 'admin' && newRole !== 'admin') {
      const adminCount = await prisma.employee.count({
        where: { role: 'admin', status: 'Active' },
      });
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: 'Cannot demote yourself: you are the only Admin' },
          { status: 403 }
        );
      }
    }

    const updated = await prisma.employee.update({
      where: { id: params.id },
      data: { role: newRole },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        departmentId: true,
      },
    });

    // Log the role change
    await logActivity(user.userId, 'CHANGE_ROLE', 'employee', params.id, {
      old_role: oldRole,
      new_role: newRole,
      target_name: targetEmployee.name,
    });

    // Notify the target employee
    await notify(
      params.id,
      'ROLE_CHANGE',
      `Your role has been changed from ${oldRole} to ${newRole}.`
    );

    return NextResponse.json({ employee: updated });
  } catch (error) {
    console.error('Change role error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
