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
    if (dbRole !== 'admin' && dbRole !== 'asset_manager' && dbRole !== 'department_head') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const transfer = await prisma.transferRequest.findUnique({
      where: { id: params.id },
      include: {
        allocation: { include: { asset: true } },
        requester: { select: { id: true, name: true } },
      },
    });
    if (!transfer) {
      return NextResponse.json({ error: 'Transfer request not found' }, { status: 404 });
    }
    if (transfer.status !== 'Requested') {
      return NextResponse.json({ error: 'Transfer already processed' }, { status: 400 });
    }

    // Check target validity
    if (transfer.newTargetType === 'department') {
      const dept = await prisma.department.findUnique({ where: { id: transfer.newTargetId } });
      if (!dept || dept.status !== 'Active') {
        return NextResponse.json({ error: 'Target department not found or inactive' }, { status: 400 });
      }
    }

    // Execute transfer in a transaction
    await prisma.$transaction(async (tx) => {
      // Mark old allocation as Transferred
      await tx.allocation.update({
        where: { id: transfer.allocationId },
        data: { status: 'Transferred', returnedAt: new Date() },
      });

      // Create new allocation
      await tx.allocation.create({
        data: {
          assetId: transfer.allocation.assetId,
          targetType: transfer.newTargetType,
          targetId: transfer.newTargetId,
          allocatedBy: user.userId,
          status: 'Active',
        },
      });

      // Update transfer status
      await tx.transferRequest.update({
        where: { id: params.id },
        data: { status: 'Completed', approvedBy: user.userId },
      });
    });

    // Notify requester
    await notify(
      transfer.requestedBy,
      'TRANSFER_APPROVED',
      `Transfer request for asset ${transfer.allocation.asset.assetTag} has been approved.`
    );

    await logActivity(user.userId, 'APPROVE_TRANSFER', 'transfer_request', params.id, {
      asset_id: transfer.allocation.assetId,
    });

    return NextResponse.json({ message: 'Transfer approved' });
  } catch (error) {
    console.error('Approve transfer error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
