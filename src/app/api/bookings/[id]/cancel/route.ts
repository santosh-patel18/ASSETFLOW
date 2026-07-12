import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUserFromHeader } from '@/lib/auth';
import { logActivity } from '@/lib/activity-logger';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUserFromHeader(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const booking = await prisma.resourceBooking.findUnique({
      where: { id: params.id },
      include: { resource: { select: { assetTag: true, name: true } } },
    });
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }
    if (booking.status === 'Cancelled' || booking.status === 'Completed') {
      return NextResponse.json({ error: 'Booking cannot be cancelled' }, { status: 400 });
    }

    await prisma.resourceBooking.update({
      where: { id: params.id },
      data: { status: 'Cancelled' },
    });

    await logActivity(user.userId, 'CANCEL_BOOKING', 'resource_booking', params.id);

    return NextResponse.json({ message: 'Booking cancelled' });
  } catch (error) {
    console.error('Cancel booking error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
