import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * Public endpoint — returns active department names + IDs for signup forms.
 * No auth required. Only returns minimal data (id, name).
 */
export async function GET() {
  try {
    const departments = await prisma.department.findMany({
      where: { status: 'Active' },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json({ departments });
  } catch (error) {
    console.error('Public departments error:', error);
    return NextResponse.json({ departments: [] });
  }
}
