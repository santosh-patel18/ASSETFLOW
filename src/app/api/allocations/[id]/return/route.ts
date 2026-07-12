import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUserFromHeader } from '@/lib/auth';
import { returnAssetSchema } from '@/lib/validations/assets';
import { logActivity } from '@/lib/activity-logger';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUserFromHeader(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const result = returnAssetSchema.safeParse(body);
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

    // Return asset in a transaction
    await prisma.$transaction(async (tx) => {
      await tx.allocation.update({
        where: { id: params.id },
        data: {
          status: 'Returned',
          returnedAt: new Date(),
          conditionNotes: result.data.condition_notes || null,
        },
      });

      await tx.asset.update({
        where: { id: allocation.assetId },
        data: { status: 'Available' },
      });

      await tx.assetStateLog.create({
        data: {
          assetId: allocation.assetId,
          fromStatus: allocation.asset.status,
          toStatus: 'Available',
          changedBy: user.userId,
        },
      });
    });

    await logActivity(user.userId, 'RETURN_ASSET', 'asset', allocation.assetId, {
      allocation_id: params.id,
      condition_notes: result.data.condition_notes,
    });

    return NextResponse.json({ message: 'Asset returned successfully' });
  } catch (error) {
    console.error('Return asset error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
