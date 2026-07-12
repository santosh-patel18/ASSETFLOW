import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUserFromHeader } from '@/lib/auth';
import { createBookingSchema } from '@/lib/validations/bookings';
import { logActivity } from '@/lib/activity-logger';
import { notify } from '@/lib/notifier';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUserFromHeader(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const resourceId = searchParams.get('resource_id');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const status = searchParams.get('status');

    const where: Record<string, unknown> = {};
    if (resourceId) where.resourceId = resourceId;
    if (status) where.status = status;
    if (from || to) {
      where.startTime = {};
      if (from) (where.startTime as Record<string, unknown>).gte = new Date(from);
      if (to) (where.startTime as Record<string, unknown>).lte = new Date(to);
    }

    const bookings = await prisma.resourceBooking.findMany({
      where,
      include: {
        resource: { select: { id: true, name: true, assetTag: true, location: true } },
        booker: { select: { id: true, name: true, email: true } },
        department: { select: { id: true, name: true } },
      },
      orderBy: { startTime: 'asc' },
    });

    return NextResponse.json({ bookings });
  } catch (error) {
    console.error('Get bookings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUserFromHeader(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const result = createBookingSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation error', details: result.error.flatten().fieldErrors },
        { status: 422 }
      );
    }

    const data = result.data;

    // Verify the resource exists and is bookable
    const resource = await prisma.asset.findUnique({ where: { id: data.resource_id } });
    if (!resource) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
    }
    if (!resource.isBookable) {
      return NextResponse.json({ error: 'This asset is not bookable' }, { status: 400 });
    }

    try {
      const booking = await prisma.resourceBooking.create({
        data: {
          resourceId: data.resource_id,
          bookedBy: user.userId,
          departmentId: data.department_id || null,
          startTime: new Date(data.start_time),
          endTime: new Date(data.end_time),
          status: 'Upcoming',
        },
        include: {
          resource: { select: { id: true, name: true, assetTag: true } },
        },
      });

      await logActivity(user.userId, 'CREATE_BOOKING', 'resource_booking', booking.id, {
        resource_id: data.resource_id,
        start_time: data.start_time,
        end_time: data.end_time,
      });

      await notify(
        user.userId,
        'BOOKING_CONFIRMED',
        `Your booking for ${booking.resource.name} (${booking.resource.assetTag}) has been confirmed.`
      );

      return NextResponse.json({ booking }, { status: 201 });
    } catch (dbError: unknown) {
      // Catch PostgreSQL 23P01 exclusion violation — overlap detected
      const err = dbError as { code?: string; meta?: { message?: string } };
      if (err.code === 'P2010' || (err.meta?.message && err.meta.message.includes('23P01'))) {
        // Find the conflicting booking to return in the error
        const conflicting = await prisma.resourceBooking.findFirst({
          where: {
            resourceId: data.resource_id,
            status: { not: 'Cancelled' },
            startTime: { lt: new Date(data.end_time) },
            endTime: { gt: new Date(data.start_time) },
          },
          select: { id: true, startTime: true, endTime: true, booker: { select: { name: true } } },
        });

        return NextResponse.json(
          {
            error: 'overlap',
            message: 'This time slot conflicts with an existing booking',
            conflicting_booking: conflicting,
          },
          { status: 409 }
        );
      }

      // Re-check for raw database error code
      const rawErr = dbError as { message?: string };
      if (rawErr.message && rawErr.message.includes('no_overlapping_bookings')) {
        const conflicting = await prisma.resourceBooking.findFirst({
          where: {
            resourceId: data.resource_id,
            status: { not: 'Cancelled' },
            startTime: { lt: new Date(data.end_time) },
            endTime: { gt: new Date(data.start_time) },
          },
          select: { id: true, startTime: true, endTime: true, booker: { select: { name: true } } },
        });

        return NextResponse.json(
          {
            error: 'overlap',
            message: 'This time slot conflicts with an existing booking',
            conflicting_booking: conflicting,
          },
          { status: 409 }
        );
      }

      throw dbError;
    }
  } catch (error) {
    console.error('Create booking error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
