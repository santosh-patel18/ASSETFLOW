import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUserFromHeader } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUserFromHeader(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    if (type === 'csv') {
      // Generate CSV of all assets
      const assets = await prisma.asset.findMany({
        include: {
          category: { select: { name: true } },
          department: { select: { name: true } },
        },
      });

      const header = 'Asset Tag,Name,Category,Status,Serial Number,Location,Department,Condition,Acquisition Date,Acquisition Cost\n';
      const rows = assets.map(a =>
        `"${a.assetTag}","${a.name}","${a.category.name}","${a.status}","${a.serialNumber || ''}","${a.location || ''}","${a.department?.name || ''}","${a.condition || ''}","${a.acquisitionDate || ''}","${a.acquisitionCost || ''}"`
      ).join('\n');

      return new Response(header + rows, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="assetflow_export_${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    return NextResponse.json({ error: 'Specify type=csv' }, { status: 400 });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
