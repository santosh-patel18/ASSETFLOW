import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUserFromHeader, verifyRoleFromDB } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { logActivity } from '@/lib/activity-logger';

/**
 * Admin approves a pending registration.
 * Generates a random strong password and activates the account.
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUserFromHeader(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Must be admin
    const role = await verifyRoleFromDB(user.userId);
    if (role !== 'admin' && role !== 'department_head') {
      return NextResponse.json({ error: 'Only admins and department heads can approve registrations' }, { status: 403 });
    }

    const { id } = params;

    // Find the pending employee
    const employee = await prisma.employee.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, status: true },
    });

    if (!employee) {
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 });
    }

    if (employee.status !== 'Pending') {
      return NextResponse.json({ error: 'This registration is not pending' }, { status: 400 });
    }

    // Generate random password: 10 chars with uppercase, number, and allowed special chars
    const randomPassword = generateRandomPassword();

    // Hash the password
    const passwordHash = await bcrypt.hash(randomPassword, 12);

    // Activate the account
    await prisma.employee.update({
      where: { id },
      data: {
        status: 'Active',
        passwordHash,
        passwordChangedAt: null, // Allow immediate password change
      },
    });

    // Notify the user with their credentials
    await prisma.notification.create({
      data: {
        recipientId: id,
        type: 'REGISTRATION_APPROVED',
        message: `Your registration has been approved! Your login credentials:\nEmail: ${employee.email}\nPassword: ${randomPassword}\n\nPlease change your password after first login via Settings.`,
      },
    });

    // Log activity (but password itself is NOT logged)
    await logActivity(user.userId, 'APPROVE_REGISTRATION', 'employee', id, {
      approved_name: employee.name,
      approved_email: employee.email,
    });

    return NextResponse.json({
      message: 'Registration approved',
      employee: {
        id: employee.id,
        name: employee.name,
        email: employee.email,
      },
      generated_password: randomPassword, // Show to admin so they can communicate it
    });
  } catch (error) {
    console.error('Approve registration error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Generate a random password that meets the policy:
 * - 10 characters
 * - At least 1 uppercase, 1 lowercase, 1 number, 1 special from (.@&)
 * - Only letters, numbers, and .@& allowed
 */
function generateRandomPassword(): string {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const specials = '.@&';
  const allAllowed = lowercase + uppercase + numbers + specials;

  // Guarantee at least one of each required type
  let password = '';
  password += uppercase[crypto.randomInt(uppercase.length)];
  password += lowercase[crypto.randomInt(lowercase.length)];
  password += numbers[crypto.randomInt(numbers.length)];
  password += specials[crypto.randomInt(specials.length)];

  // Fill remaining 6 chars randomly
  for (let i = 0; i < 6; i++) {
    password += allAllowed[crypto.randomInt(allAllowed.length)];
  }

  // Shuffle the password
  return password
    .split('')
    .sort(() => crypto.randomInt(3) - 1)
    .join('');
}
