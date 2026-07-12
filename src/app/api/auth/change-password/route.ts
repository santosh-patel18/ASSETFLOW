import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUserFromHeader, verifyRoleFromDB } from '@/lib/auth';
import bcrypt from 'bcryptjs';

/**
 * Password policy:
 *  - Minimum 8 characters
 *  - At least 1 uppercase letter
 *  - At least 1 number
 *  - At least 1 special symbol from ONLY: . @ &
 *  - No other special characters allowed
 *  - Can only change once per week
 *  - Does NOT notify admin
 */

const ALLOWED_CHARS_REGEX = /^[a-zA-Z0-9.@&]+$/;
const HAS_UPPERCASE = /[A-Z]/;
const HAS_NUMBER = /[0-9]/;
const HAS_SPECIAL = /[.@&]/;
const MIN_LENGTH = 8;
const COOLDOWN_DAYS = 7;

function validatePasswordPolicy(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < MIN_LENGTH) {
    errors.push(`Must be at least ${MIN_LENGTH} characters`);
  }
  if (!HAS_UPPERCASE.test(password)) {
    errors.push('Must contain at least 1 uppercase letter');
  }
  if (!HAS_NUMBER.test(password)) {
    errors.push('Must contain at least 1 number');
  }
  if (!HAS_SPECIAL.test(password)) {
    errors.push('Must contain at least 1 special symbol ( . @ & )');
  }
  if (!ALLOWED_CHARS_REGEX.test(password)) {
    errors.push('Only letters, numbers, and . @ & are allowed as special characters');
  }

  return { valid: errors.length === 0, errors };
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUserFromHeader(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { current_password, new_password } = body;

    if (!current_password || !new_password) {
      return NextResponse.json(
        { error: 'Current password and new password are required' },
        { status: 400 }
      );
    }

    // 1. Fetch user from DB (get hash + last change timestamp)
    const employee = await prisma.employee.findUnique({
      where: { id: user.userId },
      select: { passwordHash: true, passwordChangedAt: true },
    });

    if (!employee) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 2. Verify current password
    const isCurrentValid = await bcrypt.compare(current_password, employee.passwordHash);
    if (!isCurrentValid) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 403 });
    }

    // 3. Check cooldown — once per week
    if (employee.passwordChangedAt) {
      const daysSinceLastChange = (Date.now() - new Date(employee.passwordChangedAt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceLastChange < COOLDOWN_DAYS) {
        const nextAllowed = new Date(employee.passwordChangedAt);
        nextAllowed.setDate(nextAllowed.getDate() + COOLDOWN_DAYS);
        return NextResponse.json(
          {
            error: 'cooldown',
            message: `You can only change your password once per week. Next change allowed on ${nextAllowed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
          },
          { status: 429 }
        );
      }
    }

    // 4. Validate new password policy
    const validation = validatePasswordPolicy(new_password);
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'weak_password', details: validation.errors },
        { status: 400 }
      );
    }

    // 5. Ensure new password is different from current
    const isSame = await bcrypt.compare(new_password, employee.passwordHash);
    if (isSame) {
      return NextResponse.json(
        { error: 'New password must be different from current password' },
        { status: 400 }
      );
    }

    // 6. Hash and update — NO admin notification, NO activity log
    const newHash = await bcrypt.hash(new_password, 12);
    await prisma.employee.update({
      where: { id: user.userId },
      data: {
        passwordHash: newHash,
        passwordChangedAt: new Date(),
      },
    });

    return NextResponse.json({
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
