import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUserFromHeader } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUserFromHeader(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const frequency = await prisma.maintenanceRequest.groupBy({
      by: ['assetId'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20,
    });

    const assetIds = frequency.map(f => f.assetId);
    const assets = await prisma.asset.findMany({
      where: { id: { in: assetIds } },
      select: { id: true, name: true, assetTag: true, category: { select: { name: true } } },
    });

    const data = frequency.map(f => ({
      ...assets.find(a => a.id === f.assetId),
      request_count: f._count.id,
    }));

    // Priority distribution
    const priorityDist = await prisma.maintenanceRequest.groupBy({
      by: ['priority'],
      _count: { id: true },
    });

    return NextResponse.json({ data, priorityDistribution: priorityDist });
  } catch (error) {
    console.error('Maintenance frequency report error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
