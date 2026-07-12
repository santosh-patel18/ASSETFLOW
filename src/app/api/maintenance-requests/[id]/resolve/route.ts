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
    if (!['Approved', 'Technician Assigned', 'In Progress'].includes(mr.status)) {
      return NextResponse.json({ error: 'Request cannot be resolved from current status' }, { status: 400 });
    }

    // Single transaction: resolve request + change asset status back to Available
    await prisma.$transaction(async (tx) => {
      await tx.maintenanceRequest.update({
        where: { id: params.id },
        data: { status: 'Resolved', resolvedAt: new Date() },
      });

      await tx.asset.update({
        where: { id: mr.assetId },
        data: { status: 'Available' },
      });

      await tx.assetStateLog.create({
        data: {
          assetId: mr.assetId,
          fromStatus: 'Under Maintenance',
          toStatus: 'Available',
          changedBy: user.userId,
        },
      });
    });

    await notify(mr.raisedBy, 'MAINTENANCE_RESOLVED', `Maintenance for ${mr.asset.assetTag} has been resolved.`);
    await logActivity(user.userId, 'RESOLVE_MAINTENANCE', 'maintenance_request', params.id, { asset_id: mr.assetId });

    return NextResponse.json({ message: 'Maintenance resolved' });
  } catch (error) {
    console.error('Resolve maintenance error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
