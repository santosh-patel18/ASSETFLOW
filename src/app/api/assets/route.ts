import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUserFromHeader, verifyRoleFromDB } from '@/lib/auth';
import { createAssetSchema, validateAttributesAgainstSchema } from '@/lib/validations/assets';
import { generateAssetTag } from '@/lib/server-utils';
import { logActivity } from '@/lib/activity-logger';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUserFromHeader(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const department = searchParams.get('department');
    const location = searchParams.get('location');
    const bookable = searchParams.get('bookable');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { assetTag: { contains: search, mode: 'insensitive' } },
        { serialNumber: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (category) where.categoryId = category;
    if (status) where.status = status;
    if (department) where.departmentId = department;
    if (location) where.location = { contains: location, mode: 'insensitive' };
    if (bookable === 'true') where.isBookable = true;

    const [assets, total] = await Promise.all([
      prisma.asset.findMany({
        where,
        include: {
          category: { select: { id: true, name: true } },
          department: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.asset.count({ where }),
    ]);

    return NextResponse.json({ assets, total, page, limit });
  } catch (error) {
    console.error('Get assets error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUserFromHeader(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const dbRole = await verifyRoleFromDB(user.userId);
    if (dbRole !== 'admin' && dbRole !== 'asset_manager') {
      return NextResponse.json({ error: 'Forbidden: Asset Manager or Admin only' }, { status: 403 });
    }

    const body = await request.json();
    const result = createAssetSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation error', details: result.error.flatten().fieldErrors },
        { status: 422 }
      );
    }

    const data = result.data;

    // Get category and validate attributes against field_schema
    const category = await prisma.assetCategory.findUnique({
      where: { id: data.category_id },
    });
    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }
    if (category.status === 'Inactive') {
      return NextResponse.json({ error: 'Cannot use an inactive category' }, { status: 400 });
    }

    // Validate attributes against category field_schema via Zod
    const fieldSchema = (category.fieldSchema as Record<string, { type: string; required?: boolean }>) || {};
    if (Object.keys(fieldSchema).length > 0 && data.attributes) {
      const attrValidation = validateAttributesAgainstSchema(data.attributes, fieldSchema);
      if (!attrValidation.valid) {
        return NextResponse.json(
          { error: 'Attribute validation error', details: attrValidation.errors },
          { status: 422 }
        );
      }
    }

    // Check duplicate serial number
    if (data.serial_number) {
      const existingSerial = await prisma.asset.findUnique({
        where: { serialNumber: data.serial_number },
      });
      if (existingSerial) {
        return NextResponse.json(
          { error: 'Duplicate serial number' },
          { status: 409 }
        );
      }
    }

    // Auto-generate asset tag
    const assetTag = await generateAssetTag();

    const asset = await prisma.asset.create({
      data: {
        assetTag,
        name: data.name,
        categoryId: data.category_id,
        serialNumber: data.serial_number || null,
        acquisitionDate: data.acquisition_date ? new Date(data.acquisition_date) : null,
        acquisitionCost: data.acquisition_cost || null,
        condition: data.condition || null,
        location: data.location || null,
        departmentId: data.department_id || null,
        isBookable: data.is_bookable || false,
        status: 'Available',
        attributes: data.attributes || {},
        photoUrl: data.photo_url || null,
        documentUrls: data.document_urls || [],
      },
      include: {
        category: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
      },
    });

    // Log state
    await prisma.assetStateLog.create({
      data: {
        assetId: asset.id,
        fromStatus: null,
        toStatus: 'Available',
        changedBy: user.userId,
      },
    });

    await logActivity(user.userId, 'REGISTER_ASSET', 'asset', asset.id, {
      asset_tag: asset.assetTag,
      name: asset.name,
    });

    return NextResponse.json({ asset }, { status: 201 });
  } catch (error: unknown) {
    // Catch unique constraint violation for serial number
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2002') {
      return NextResponse.json(
        { error: 'Duplicate serial number' },
        { status: 409 }
      );
    }
    console.error('Create asset error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
