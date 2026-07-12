import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUserFromHeader, verifyRoleFromDB } from '@/lib/auth';
import { createCategorySchema } from '@/lib/validations/org';
import { logActivity } from '@/lib/activity-logger';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUserFromHeader(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const categories = await prisma.assetCategory.findMany({
      include: { _count: { select: { assets: true } } },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ categories });
  } catch (error) {
    console.error('Get categories error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUserFromHeader(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const dbRole = await verifyRoleFromDB(user.userId);
    if (dbRole !== 'admin' && dbRole !== 'department_head') {
      return NextResponse.json({ error: 'Forbidden: Admin or Department Head only' }, { status: 403 });
    }

    const body = await request.json();
    const result = createCategorySchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation error', details: result.error.flatten().fieldErrors },
        { status: 422 }
      );
    }

    const data = result.data;
    // Admin → Active immediately, Department Head → Pending (needs admin approval)
    const status = dbRole === 'admin' ? 'Active' : 'Pending';

    const category = await prisma.assetCategory.create({
      data: {
        name: data.name,
        fieldSchema: data.field_schema || {},
        status,
      },
    });

    // If created by dept head, notify admins for approval
    if (dbRole === 'department_head') {
      const admins = await prisma.employee.findMany({
        where: { role: 'admin', status: 'Active' },
        select: { id: true },
      });
      if (admins.length > 0) {
        await prisma.notification.createMany({
          data: admins.map(admin => ({
            recipientId: admin.id,
            type: 'CATEGORY_APPROVAL',
            message: `${user.name} (Dept Head) requested a new asset category: "${data.name}". Please review in Organization → Categories.`,
          })),
        });
      }
    }

    await logActivity(user.userId, 'CREATE_CATEGORY', 'asset_category', category.id, {
      name: category.name,
      status,
    });

    const message = dbRole === 'admin'
      ? 'Category created'
      : 'Category submitted for admin approval';

    return NextResponse.json({ category, message }, { status: 201 });
  } catch (error) {
    console.error('Create category error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
