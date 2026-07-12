import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUserFromHeader, verifyRoleFromDB } from '@/lib/auth';
import { logActivity } from '@/lib/activity-logger';

/**
 * Admin approves a pending category — sets status to Active.
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUserFromHeader(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const role = await verifyRoleFromDB(user.userId);
    if (role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can approve categories' }, { status: 403 });
    }

    const { id } = params;
    const category = await prisma.assetCategory.findUnique({ where: { id } });
    if (!category) return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    if (category.status !== 'Pending') return NextResponse.json({ error: 'Category is not pending' }, { status: 400 });

    await prisma.assetCategory.update({ where: { id }, data: { status: 'Active' } });
    await logActivity(user.userId, 'APPROVE_CATEGORY', 'asset_category', id, { name: category.name });

    return NextResponse.json({ message: 'Category approved', name: category.name });
  } catch (error) {
    console.error('Approve category error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Admin rejects (deletes) a pending category.
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUserFromHeader(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const role = await verifyRoleFromDB(user.userId);
    if (role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can reject categories' }, { status: 403 });
    }

    const { id } = params;
    const category = await prisma.assetCategory.findUnique({ where: { id } });
    if (!category) return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    if (category.status !== 'Pending') return NextResponse.json({ error: 'Category is not pending' }, { status: 400 });

    await prisma.assetCategory.delete({ where: { id } });
    await logActivity(user.userId, 'REJECT_CATEGORY', 'asset_category', id, { name: category.name });

    return NextResponse.json({ message: 'Category rejected and removed' });
  } catch (error) {
    console.error('Reject category error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
