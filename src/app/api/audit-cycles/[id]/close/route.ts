import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUserFromHeader, verifyRoleFromDB } from '@/lib/auth';
import { closeAuditCycleSchema } from '@/lib/validations/audit';
import { logActivity } from '@/lib/activity-logger';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUserFromHeader(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Re-verify role from DB — privileged mutation
    const dbRole = await verifyRoleFromDB(user.userId);
    if (dbRole !== 'admin' && dbRole !== 'asset_manager') {
      return NextResponse.json({ error: 'Forbidden: Asset Manager only' }, { status: 403 });
    }

    const cycle = await prisma.auditCycle.findUnique({
      where: { id: params.id },
      include: { items: { include: { asset: true } } },
    });
    if (!cycle) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (cycle.status === 'Closed') {
      return NextResponse.json({ error: 'Cycle already closed' }, { status: 400 });
    }

    const body = await request.json();
    const result = closeAuditCycleSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation error', details: result.error.flatten().fieldErrors },
        { status: 422 }
      );
    }

    const resolutions = result.data.resolutions;
    const resolutionMap = new Map(resolutions.map(r => [r.asset_id, r.action]));

    // Apply resolutions atomically
    await prisma.$transaction(async (tx) => {
      // Process each item
      for (const item of cycle.items) {
        const resolution = resolutionMap.get(item.assetId) || 'no_change';
        
        // Update audit item with resolution
        await tx.auditItem.update({
          where: { id: item.id },
          data: { resolution },
        });

        // Apply status changes based on resolution
        if (resolution === 'mark_lost') {
          await tx.asset.update({
            where: { id: item.assetId },
            data: { status: 'Lost' },
          });
          await tx.assetStateLog.create({
            data: {
              assetId: item.assetId,
              fromStatus: item.asset.status,
              toStatus: 'Lost',
              changedBy: user.userId,
            },
          });
        } else if (resolution === 'mark_available') {
          await tx.asset.update({
            where: { id: item.assetId },
            data: { status: 'Available' },
          });
          await tx.assetStateLog.create({
            data: {
              assetId: item.assetId,
              fromStatus: item.asset.status,
              toStatus: 'Available',
              changedBy: user.userId,
            },
          });
        }
        // 'no_change' — do nothing
      }

      // Close the cycle
      await tx.auditCycle.update({
        where: { id: params.id },
        data: { status: 'Closed', closedAt: new Date() },
      });
    });

    await logActivity(user.userId, 'CLOSE_AUDIT_CYCLE', 'audit_cycle', params.id, {
      resolutions_count: resolutions.length,
    });

    return NextResponse.json({ message: 'Audit cycle closed' });
  } catch (error) {
    console.error('Close audit cycle error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
