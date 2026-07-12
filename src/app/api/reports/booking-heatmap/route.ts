import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUserFromHeader } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUserFromHeader(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Get bookings from last 30 days, grouped by hour of day and day of week
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const bookings = await prisma.resourceBooking.findMany({
      where: {
        startTime: { gte: thirtyDaysAgo },
        status: { not: 'Cancelled' },
      },
      select: { startTime: true, endTime: true, resourceId: true },
    });

    // Build heatmap data: hour (0-23) x day (0-6)
    const heatmap: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
    for (const b of bookings) {
      const start = new Date(b.startTime);
      const day = start.getDay();
      const hour = start.getHours();
      heatmap[day][hour]++;
    }

    // Peak hours
    const hourCounts = Array(24).fill(0);
    for (const b of bookings) {
      const hour = new Date(b.startTime).getHours();
      hourCounts[hour]++;
    }

    return NextResponse.json({ heatmap, hourCounts, totalBookings: bookings.length });
  } catch (error) {
    console.error('Booking heatmap report error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
