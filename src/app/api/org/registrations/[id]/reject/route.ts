import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUserFromHeader, verifyRoleFromDB } from '@/lib/auth';
import { logActivity } from '@/lib/activity-logger';

/**
 * Admin rejects a pending registration — deletes the pending record.
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUserFromHeader(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Must be admin
    const role = await verifyRoleFromDB(user.userId);
    if (role !== 'admin' && role !== 'department_head') {
      return NextResponse.json({ error: 'Only admins and department heads can reject registrations' }, { status: 403 });
    }

    const { id } = params;

    const employee = await prisma.employee.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, status: true },
    });

    if (!employee) {
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 });
    }

    if (employee.status !== 'Pending') {
      return NextResponse.json({ error: 'This registration is not pending' }, { status: 400 });
    }

    // Delete associated data first (FK constraints)
    await prisma.notification.deleteMany({ where: { recipientId: id } });

    // Delete the pending record entirely
    await prisma.employee.delete({ where: { id } });

    // Log activity
    await logActivity(user.userId, 'REJECT_REGISTRATION', 'employee', id, {
      rejected_name: employee.name,
      rejected_email: employee.email,
    });

    return NextResponse.json({ message: 'Registration rejected and removed' });
  } catch (error) {
    console.error('Reject registration error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
