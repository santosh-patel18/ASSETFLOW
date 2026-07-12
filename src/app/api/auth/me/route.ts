import { NextResponse } from 'next/server';
import { getCurrentUserFromHeader } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUserFromHeader(request);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const employee = await prisma.employee.findUnique({
      where: { id: user.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        departmentId: true,
        department: { select: { id: true, name: true } },
      },
    });

    if (!employee || employee.status !== 'Active') {
      return NextResponse.json({ error: 'Account not found or inactive' }, { status: 401 });
    }

    return NextResponse.json({ user: employee });
  } catch (error) {
    console.error('Auth me error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
