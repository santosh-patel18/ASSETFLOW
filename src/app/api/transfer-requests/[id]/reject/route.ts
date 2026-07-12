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
      },
    });
    if (!transfer) {
      return NextResponse.json({ error: 'Transfer request not found' }, { status: 404 });
    }
    if (transfer.status !== 'Requested') {
      return NextResponse.json({ error: 'Transfer already processed' }, { status: 400 });
    }

    await prisma.transferRequest.update({
      where: { id: params.id },
      data: { status: 'Rejected', approvedBy: user.userId },
    });

    await notify(
      transfer.requestedBy,
      'TRANSFER_REJECTED',
      `Transfer request for asset ${transfer.allocation.asset.assetTag} has been rejected.`
    );

    await logActivity(user.userId, 'REJECT_TRANSFER', 'transfer_request', params.id);

    return NextResponse.json({ message: 'Transfer rejected' });
  } catch (error) {
    console.error('Reject transfer error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
