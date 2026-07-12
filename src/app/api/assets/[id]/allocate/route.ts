import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUserFromHeader, verifyRoleFromDB } from '@/lib/auth';
import { allocateAssetSchema } from '@/lib/validations/assets';
import { logActivity } from '@/lib/activity-logger';
import { notify } from '@/lib/notifier';

export async function POST(
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

    const body = await request.json();
    const result = allocateAssetSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation error', details: result.error.flatten().fieldErrors },
        { status: 422 }
      );
    }

    const asset = await prisma.asset.findUnique({ where: { id: params.id } });
    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // Only Available assets can be allocated
    if (asset.status !== 'Available') {
      // If allocated, find the current holder
      if (asset.status === 'Allocated') {
        const activeAllocation = await prisma.allocation.findFirst({
          where: { assetId: params.id, status: 'Active' },
          include: {
            allocator: { select: { name: true } },
          },
        });

        let currentHolder = 'Unknown';
        if (activeAllocation) {
          if (activeAllocation.targetType === 'employee') {
            const emp = await prisma.employee.findUnique({
              where: { id: activeAllocation.targetId },
              select: { name: true },
            });
            currentHolder = emp?.name || 'Unknown';
          } else {
            const dept = await prisma.department.findUnique({
              where: { id: activeAllocation.targetId },
              select: { name: true },
            });
            currentHolder = dept?.name || 'Unknown';
          }
        }

        return NextResponse.json(
          {
            error: 'already_allocated',
            current_holder: currentHolder,
            allocation_id: activeAllocation?.id,
            suggest: 'transfer_request',
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: `Asset is currently ${asset.status} and cannot be allocated` },
        { status: 409 }
      );
    }

    // Check target validity
    const data = result.data;
    if (data.target_type === 'employee') {
      const target = await prisma.employee.findUnique({ where: { id: data.target_id } });
      if (!target || target.status !== 'Active') {
        return NextResponse.json({ error: 'Target employee not found or inactive' }, { status: 404 });
      }
    } else {
      const target = await prisma.department.findUnique({ where: { id: data.target_id } });
      if (!target || target.status !== 'Active') {
        return NextResponse.json({ error: 'Target department not found or inactive' }, { status: 404 });
      }
    }

    // Create allocation and update asset status in a transaction
    const allocation = await prisma.$transaction(async (tx) => {
      const alloc = await tx.allocation.create({
        data: {
          assetId: params.id,
          targetType: data.target_type,
          targetId: data.target_id,
          allocatedBy: user.userId,
          expectedReturnDate: data.expected_return_date ? new Date(data.expected_return_date) : null,
          status: 'Active',
        },
      });

      await tx.asset.update({
        where: { id: params.id },
        data: { status: 'Allocated' },
      });

      await tx.assetStateLog.create({
        data: {
          assetId: params.id,
          fromStatus: 'Available',
          toStatus: 'Allocated',
          changedBy: user.userId,
        },
      });

      return alloc;
    });

    // Notify target
    if (data.target_type === 'employee') {
      await notify(data.target_id, 'ASSET_ASSIGNED', `Asset ${asset.assetTag} (${asset.name}) has been allocated to you.`);
    }

    await logActivity(user.userId, 'ALLOCATE_ASSET', 'asset', params.id, {
      target_type: data.target_type,
      target_id: data.target_id,
      allocation_id: allocation.id,
    });

    return NextResponse.json({ allocation }, { status: 201 });
  } catch (error: unknown) {
    // Catch the unique constraint from idx_one_active_allocation_per_asset
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2002') {
      return NextResponse.json(
        { error: 'already_allocated', suggest: 'transfer_request' },
        { status: 409 }
      );
    }
    console.error('Allocate asset error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
