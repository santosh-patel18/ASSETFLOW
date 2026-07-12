import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { resetPasswordSchema } from '@/lib/validations/auth';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = resetPasswordSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation error', details: result.error.flatten().fieldErrors },
        { status: 422 }
      );
    }

    const { token, password } = result.data;

    // Verify reset token
    let payload: { userId: string; purpose: string };
    try {
      payload = jwt.verify(token, JWT_SECRET) as { userId: string; purpose: string };
    } catch {
      return NextResponse.json({ error: 'Invalid or expired reset token' }, { status: 401 });
    }

    if (payload.purpose !== 'password-reset') {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const passwordHash = await hashPassword(password);
    await prisma.employee.update({
      where: { id: payload.userId },
      data: { passwordHash },
    });

    return NextResponse.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
