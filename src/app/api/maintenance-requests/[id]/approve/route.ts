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

    // Asset Manager only — re-verify from DB
    const dbRole = await verifyRoleFromDB(user.userId);
    if (dbRole !== 'admin' && dbRole !== 'asset_manager') {
      return NextResponse.json({ error: 'Forbidden: Asset Manager only' }, { status: 403 });
    }

    const mr = await prisma.maintenanceRequest.findUnique({
      where: { id: params.id },
      include: { asset: true },
    });
    if (!mr) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (mr.status !== 'Pending') {
      return NextResponse.json({ error: 'Request is not in Pending status' }, { status: 400 });
    }

    // Block if asset already Under Maintenance and another request is already Approved
    if (mr.asset.status === 'Under Maintenance') {
      const existingApproved = await prisma.maintenanceRequest.findFirst({
        where: {
          assetId: mr.assetId,
          status: { in: ['Approved', 'Technician Assigned', 'In Progress'] },
          id: { not: params.id },
        },
      });
      if (existingApproved) {
        return NextResponse.json(
          { error: 'Another maintenance request is already active for this asset. Resolve it first.' },
          { status: 409 }
        );
      }
    }

    // Single transaction: approve request + change asset status
    await prisma.$transaction(async (tx) => {
      await tx.maintenanceRequest.update({
        where: { id: params.id },
        data: { status: 'Approved', approvedBy: user.userId },
      });

      await tx.asset.update({
        where: { id: mr.assetId },
        data: { status: 'Under Maintenance' },
      });

      await tx.assetStateLog.create({
        data: {
          assetId: mr.assetId,
          fromStatus: mr.asset.status,
          toStatus: 'Under Maintenance',
          changedBy: user.userId,
        },
      });
    });

    await notify(mr.raisedBy, 'MAINTENANCE_APPROVED', `Your maintenance request for ${mr.asset.assetTag} has been approved.`);
    await logActivity(user.userId, 'APPROVE_MAINTENANCE', 'maintenance_request', params.id, { asset_id: mr.assetId });

    return NextResponse.json({ message: 'Maintenance request approved' });
  } catch (error) {
    console.error('Approve maintenance error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
