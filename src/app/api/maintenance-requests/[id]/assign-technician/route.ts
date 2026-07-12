import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUserFromHeader, verifyRoleFromDB } from '@/lib/auth';
import { assignTechnicianSchema } from '@/lib/validations/maintenance';
import { logActivity } from '@/lib/activity-logger';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUserFromHeader(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const dbRole = await verifyRoleFromDB(user.userId);
    if (dbRole !== 'admin' && dbRole !== 'asset_manager') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const result = assignTechnicianSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: 'Validation error', details: result.error.flatten().fieldErrors }, { status: 422 });
    }

    const mr = await prisma.maintenanceRequest.findUnique({ where: { id: params.id } });
    if (!mr) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (mr.status !== 'Approved') {
      return NextResponse.json({ error: 'Request must be Approved before assigning technician' }, { status: 400 });
    }

    await prisma.maintenanceRequest.update({
      where: { id: params.id },
      data: { status: 'Technician Assigned', technician: result.data.technician },
    });

    await logActivity(user.userId, 'ASSIGN_TECHNICIAN', 'maintenance_request', params.id, {
      technician: result.data.technician,
    });

    return NextResponse.json({ message: 'Technician assigned' });
  } catch (error) {
    console.error('Assign technician error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
