import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUserFromHeader } from '@/lib/auth';
import { createMaintenanceSchema } from '@/lib/validations/maintenance';
import { logActivity } from '@/lib/activity-logger';
import { notify } from '@/lib/notifier';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUserFromHeader(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const assetId = searchParams.get('asset_id');

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (assetId) where.assetId = assetId;

    const requests = await prisma.maintenanceRequest.findMany({
      where,
      include: {
        asset: { select: { id: true, name: true, assetTag: true, status: true } },
        raiser: { select: { id: true, name: true } },
        approver: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ requests });
  } catch (error) {
    console.error('Get maintenance requests error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUserFromHeader(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const result = createMaintenanceSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation error', details: result.error.flatten().fieldErrors },
        { status: 422 }
      );
    }

    const data = result.data;
    const asset = await prisma.asset.findUnique({ where: { id: data.asset_id } });
    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    const maintenanceRequest = await prisma.maintenanceRequest.create({
      data: {
        assetId: data.asset_id,
        raisedBy: user.userId,
        issue: data.issue,
        priority: data.priority,
        photoUrl: data.photo_url || null,
        status: 'Pending',
      },
      include: {
        asset: { select: { id: true, name: true, assetTag: true } },
      },
    });

    // Notify asset managers
    const managers = await prisma.employee.findMany({
      where: { role: { in: ['asset_manager', 'admin'] }, status: 'Active' },
      select: { id: true },
    });
    for (const m of managers) {
      await notify(
        m.id,
        'MAINTENANCE_REQUESTED',
        `Maintenance request raised for ${asset.assetTag} (${asset.name}): ${data.issue}`
      );
    }

    await logActivity(user.userId, 'RAISE_MAINTENANCE', 'maintenance_request', maintenanceRequest.id, {
      asset_id: data.asset_id,
      priority: data.priority,
    });

    return NextResponse.json({ request: maintenanceRequest }, { status: 201 });
  } catch (error) {
    console.error('Create maintenance request error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
