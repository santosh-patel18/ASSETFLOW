import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyPassword, generateToken, setTokenCookie } from '@/lib/auth';
import { loginSchema } from '@/lib/validations/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const result = loginSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation error', details: result.error.flatten().fieldErrors },
        { status: 422 }
      );
    }

    const { email, password } = result.data;

    const employee = await prisma.employee.findUnique({ where: { email } });
    if (!employee) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    if (employee.status === 'Pending') {
      return NextResponse.json(
        { error: 'Your registration is still pending admin approval. Please wait for your credentials.' },
        { status: 401 }
      );
    }

    if (employee.status !== 'Active') {
      return NextResponse.json(
        { error: 'Account is inactive. Please contact your admin.' },
        { status: 401 }
      );
    }

    const validPassword = await verifyPassword(password, employee.passwordHash);
    if (!validPassword) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const token = generateToken({
      userId: employee.id,
      email: employee.email,
      role: employee.role,
      name: employee.name,
    });

    const response = NextResponse.json({
      token,
      role: employee.role,
      user_id: employee.id,
      name: employee.name,
    });
    response.headers.set('Set-Cookie', setTokenCookie(token));
    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
