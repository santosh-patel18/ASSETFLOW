import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUserFromHeader, verifyRoleFromDB } from '@/lib/auth';
import { logActivity } from '@/lib/activity-logger';
import { notify } from '@/lib/notifier';

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

    const mr = await prisma.maintenanceRequest.findUnique({
      where: { id: params.id },
      include: { asset: true },
    });
    if (!mr) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (mr.status !== 'Pending') {
      return NextResponse.json({ error: 'Request is not in Pending status' }, { status: 400 });
    }

    await prisma.maintenanceRequest.update({
      where: { id: params.id },
      data: { status: 'Rejected', approvedBy: user.userId },
    });

    await notify(mr.raisedBy, 'MAINTENANCE_REJECTED', `Your maintenance request for ${mr.asset.assetTag} has been rejected.`);
    await logActivity(user.userId, 'REJECT_MAINTENANCE', 'maintenance_request', params.id);

    return NextResponse.json({ message: 'Maintenance request rejected' });
  } catch (error) {
    console.error('Reject maintenance error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
