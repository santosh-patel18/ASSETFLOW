import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { forgotPasswordSchema } from '@/lib/validations/auth';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = forgotPasswordSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation error', details: result.error.flatten().fieldErrors },
        { status: 422 }
      );
    }

    const { email } = result.data;
    const employee = await prisma.employee.findUnique({ where: { email } });

    // Always return success to prevent email enumeration
    if (!employee) {
      return NextResponse.json({ message: 'If the email exists, a reset token has been generated.' });
    }

    // Generate a reset token (valid 1 hour)
    const resetToken = jwt.sign(
      { userId: employee.id, purpose: 'password-reset' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // In production, this would be sent via email.
    // For dev/hackathon, we return it in the response.
    return NextResponse.json({
      message: 'If the email exists, a reset token has been generated.',
      // DEV ONLY: returning token directly since no email service
      reset_token: resetToken,
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
