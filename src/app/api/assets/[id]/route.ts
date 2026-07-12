import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUserFromHeader } from '@/lib/auth';
import { updateAssetSchema } from '@/lib/validations/assets';
import { logActivity } from '@/lib/activity-logger';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUserFromHeader(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const asset = await prisma.asset.findUnique({
      where: { id: params.id },
      include: {
        category: true,
        department: { select: { id: true, name: true } },
        allocations: {
          include: {
            allocator: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        maintenanceRequests: {
          include: {
            raiser: { select: { id: true, name: true } },
            approver: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        stateLog: {
          include: {
            changer: { select: { id: true, name: true } },
          },
          orderBy: { changedAt: 'desc' },
        },
        bookings: {
          include: {
            booker: { select: { id: true, name: true } },
          },
          orderBy: { startTime: 'desc' },
          take: 20,
        },
      },
    });

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    return NextResponse.json({ asset });
  } catch (error) {
    console.error('Get asset error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUserFromHeader(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const result = updateAssetSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation error', details: result.error.flatten().fieldErrors },
        { status: 422 }
      );
    }

    const existing = await prisma.asset.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    const data = result.data;
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.serial_number !== undefined) updateData.serialNumber = data.serial_number;
    if (data.acquisition_date !== undefined) updateData.acquisitionDate = data.acquisition_date ? new Date(data.acquisition_date) : null;
    if (data.acquisition_cost !== undefined) updateData.acquisitionCost = data.acquisition_cost;
    if (data.condition !== undefined) updateData.condition = data.condition;
    if (data.location !== undefined) updateData.location = data.location;
    if (data.department_id !== undefined) updateData.departmentId = data.department_id;
    if (data.is_bookable !== undefined) updateData.isBookable = data.is_bookable;
    if (data.attributes !== undefined) updateData.attributes = data.attributes;
    if (data.photo_url !== undefined) updateData.photoUrl = data.photo_url;
    if (data.document_urls !== undefined) updateData.documentUrls = data.document_urls;

    const asset = await prisma.asset.update({
      where: { id: params.id },
      data: updateData,
      include: {
        category: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
      },
    });

    await logActivity(user.userId, 'UPDATE_ASSET', 'asset', asset.id, {
      changes: data,
    });

    return NextResponse.json({ asset });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2002') {
      return NextResponse.json(
        { error: 'Duplicate serial number' },
        { status: 409 }
      );
    }
    console.error('Update asset error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
