import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUserFromHeader, verifyRoleFromDB } from '@/lib/auth';
import { createAuditCycleSchema } from '@/lib/validations/audit';
import { logActivity } from '@/lib/activity-logger';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUserFromHeader(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const cycles = await prisma.auditCycle.findMany({
      include: {
        scopeDepartment: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } },
        auditors: { include: { auditor: { select: { id: true, name: true } } } },
        _count: { select: { items: true } },
      },
      orderBy: { startDate: 'desc' },
    });

    return NextResponse.json({ cycles });
  } catch (error) {
    console.error('Get audit cycles error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUserFromHeader(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const dbRole = await verifyRoleFromDB(user.userId);
    if (dbRole !== 'admin' && dbRole !== 'asset_manager') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const result = createAuditCycleSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation error', details: result.error.flatten().fieldErrors },
        { status: 422 }
      );
    }

    const data = result.data;

    // Create cycle and auto-populate audit items for assets in scope
    const cycle = await prisma.$transaction(async (tx) => {
      const newCycle = await tx.auditCycle.create({
        data: {
          scopeDepartmentId: data.scope_department_id || null,
          scopeLocation: data.scope_location || null,
          startDate: new Date(data.start_date),
          endDate: new Date(data.end_date),
          status: 'Open',
          createdBy: user.userId,
        },
      });

      // Add auditors
      await tx.auditCycleAuditor.createMany({
        data: data.auditor_ids.map(id => ({
          auditCycleId: newCycle.id,
          auditorId: id,
        })),
      });

      // Find assets in scope and create audit items
      const assetWhere: Record<string, unknown> = {};
      if (data.scope_department_id) assetWhere.departmentId = data.scope_department_id;
      if (data.scope_location) assetWhere.location = { contains: data.scope_location, mode: 'insensitive' };

      const assetsInScope = await tx.asset.findMany({
        where: assetWhere,
        select: { id: true },
      });

      if (assetsInScope.length > 0) {
        await tx.auditItem.createMany({
          data: assetsInScope.map(a => ({
            auditCycleId: newCycle.id,
            assetId: a.id,
          })),
        });
      }

      return newCycle;
    });

    await logActivity(user.userId, 'CREATE_AUDIT_CYCLE', 'audit_cycle', cycle.id);

    return NextResponse.json({ cycle }, { status: 201 });
  } catch (error) {
    console.error('Create audit cycle error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
