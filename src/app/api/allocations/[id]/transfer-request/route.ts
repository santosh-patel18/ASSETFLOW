import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUserFromHeader } from '@/lib/auth';
import { transferRequestSchema } from '@/lib/validations/assets';
import { logActivity } from '@/lib/activity-logger';
import { notify } from '@/lib/notifier';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUserFromHeader(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const result = transferRequestSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation error', details: result.error.flatten().fieldErrors },
        { status: 422 }
      );
    }

    const allocation = await prisma.allocation.findUnique({
      where: { id: params.id },
      include: { asset: true },
    });
    if (!allocation) {
      return NextResponse.json({ error: 'Allocation not found' }, { status: 404 });
    }
    if (allocation.status !== 'Active') {
      return NextResponse.json({ error: 'Allocation is not active' }, { status: 400 });
    }

    const data = result.data;
    const transfer = await prisma.transferRequest.create({
      data: {
        allocationId: params.id,
        requestedBy: user.userId,
        newTargetType: data.new_target_type,
        newTargetId: data.new_target_id,
        status: 'Requested',
      },
    });

    // Notify asset managers
    const managers = await prisma.employee.findMany({
      where: { role: { in: ['asset_manager', 'admin'] }, status: 'Active' },
      select: { id: true },
    });
    for (const m of managers) {
      await notify(m.id, 'TRANSFER_REQUESTED', `Transfer request for asset ${allocation.asset.assetTag} (${allocation.asset.name}).`);
    }

    await logActivity(user.userId, 'REQUEST_TRANSFER', 'transfer_request', transfer.id, {
      asset_id: allocation.assetId,
      new_target_type: data.new_target_type,
      new_target_id: data.new_target_id,
    });

    return NextResponse.json({ transfer }, { status: 201 });
  } catch (error) {
    console.error('Transfer request error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
