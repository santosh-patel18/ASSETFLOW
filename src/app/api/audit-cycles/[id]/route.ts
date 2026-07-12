import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUserFromHeader } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUserFromHeader(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const cycle = await prisma.auditCycle.findUnique({
      where: { id: params.id },
      include: {
        scopeDepartment: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } },
        auditors: { include: { auditor: { select: { id: true, name: true } } } },
        items: {
          include: {
            asset: { select: { id: true, name: true, assetTag: true, status: true, location: true } },
            marker: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!cycle) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({ cycle });
  } catch (error) {
    console.error('Get audit cycle error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
