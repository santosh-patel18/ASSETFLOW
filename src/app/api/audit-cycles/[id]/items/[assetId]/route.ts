import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUserFromHeader } from '@/lib/auth';
import { markAuditItemSchema } from '@/lib/validations/audit';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string; assetId: string } }
) {
  try {
    const user = await getCurrentUserFromHeader(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const cycle = await prisma.auditCycle.findUnique({ where: { id: params.id } });
    if (!cycle) return NextResponse.json({ error: 'Audit cycle not found' }, { status: 404 });
    if (cycle.status === 'Closed') {
      return NextResponse.json({ error: 'Audit cycle is closed' }, { status: 400 });
    }

    // Check if user is an assigned auditor
    const isAuditor = await prisma.auditCycleAuditor.findUnique({
      where: {
        auditCycleId_auditorId: { auditCycleId: params.id, auditorId: user.userId },
      },
    });
    // Allow admins and asset managers too
    const employee = await prisma.employee.findUnique({ where: { id: user.userId }, select: { role: true } });
    if (!isAuditor && employee?.role !== 'admin' && employee?.role !== 'asset_manager') {
      return NextResponse.json({ error: 'Not authorized to mark items in this audit' }, { status: 403 });
    }

    const body = await request.json();
    const result = markAuditItemSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation error', details: result.error.flatten().fieldErrors },
        { status: 422 }
      );
    }

    const item = await prisma.auditItem.findFirst({
      where: { auditCycleId: params.id, assetId: params.assetId },
    });
    if (!item) {
      return NextResponse.json({ error: 'Audit item not found' }, { status: 404 });
    }

    await prisma.auditItem.update({
      where: { id: item.id },
      data: {
        result: result.data.result,
        markedBy: user.userId,
        markedAt: new Date(),
      },
    });

    return NextResponse.json({ message: 'Item marked' });
  } catch (error) {
    console.error('Mark audit item error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
