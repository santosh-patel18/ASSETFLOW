import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';

/**
 * Signup flow:
 * 1. User submits name + email + department (NO password)
 * 2. Name validated: letters and spaces only, 2-100 chars, no abuse
 * 3. Email validated: must be personal (gmail, yahoo, outlook, etc.), NOT company
 * 4. Creates employee with status='Pending' — cannot login yet
 * 5. Admin sees the pending request in Org → Pending tab
 * 6. Admin approves → random password generated → user notified
 */

// Allowed personal email domains
const PERSONAL_DOMAINS = [
  'gmail.com', 'yahoo.com', 'yahoo.in', 'outlook.com', 'hotmail.com',
  'live.com', 'icloud.com', 'aol.com', 'protonmail.com', 'proton.me',
  'mail.com', 'zoho.com', 'yandex.com', 'gmx.com', 'gmx.net',
  'rediffmail.com', 'tutanota.com', 'fastmail.com',
];

// Basic profanity / abuse word filter
const BLOCKED_WORDS = [
  'abuse', 'admin', 'fuck', 'shit', 'damn', 'ass', 'bastard',
  'bitch', 'crap', 'dick', 'hell', 'idiot', 'stupid', 'test',
  'fake', 'null', 'undefined', 'root', 'system', 'delete', 'drop',
];

const signupRequestSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be under 100 characters')
    .regex(/^[a-zA-Z\s]+$/, 'Name can only contain letters and spaces'),
  email: z
    .string()
    .email('Invalid email format')
    .max(255),
  department_id: z
    .string()
    .uuid()
    .optional()
    .nullable(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate input
    const result = signupRequestSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation error', details: result.error.flatten().fieldErrors },
        { status: 422 }
      );
    }

    const { name, email, department_id } = result.data;

    // --- Name abuse check ---
    const nameLower = name.toLowerCase().trim();
    const nameWords = nameLower.split(/\s+/);
    for (const word of nameWords) {
      if (BLOCKED_WORDS.includes(word)) {
        return NextResponse.json(
          { error: 'Name contains inappropriate content. Please use your real name.' },
          { status: 400 }
        );
      }
    }

    // Single character names (after trim)
    if (nameWords.some(w => w.length < 2)) {
      return NextResponse.json(
        { error: 'Each part of your name must be at least 2 characters' },
        { status: 400 }
      );
    }

    // --- Email domain check — must be personal, not company ---
    const emailDomain = email.split('@')[1]?.toLowerCase();
    if (!emailDomain || !PERSONAL_DOMAINS.includes(emailDomain)) {
      return NextResponse.json(
        {
          error: 'Please use a personal email address (Gmail, Yahoo, Outlook, etc.). Company emails are not allowed.',
          allowed_domains: PERSONAL_DOMAINS.slice(0, 6).join(', ') + ', etc.',
        },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existing = await prisma.employee.findUnique({ where: { email } });
    if (existing) {
      if (existing.status === 'Pending') {
        return NextResponse.json(
          { error: 'A registration request with this email is already pending approval.' },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: 'This email is already registered.' },
        { status: 409 }
      );
    }

    // Create with status='Pending' — NO password, placeholder hash
    const employee = await prisma.employee.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        passwordHash: '__PENDING_APPROVAL__', // Placeholder — cannot be used to login
        departmentId: department_id || null,
        role: 'employee',
        status: 'Pending',
      },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
      },
    });

    // Notify all admins and department heads
    const approvers = await prisma.employee.findMany({
      where: { role: { in: ['admin', 'department_head'] }, status: 'Active' },
      select: { id: true },
    });

    if (approvers.length > 0) {
      await prisma.notification.createMany({
        data: approvers.map(approver => ({
          recipientId: approver.id,
          type: 'REGISTRATION_REQUEST',
          message: `New registration request from ${name} (${email}). Please review in Organization → Pending.`,
        })),
      });
      });
    }

    return NextResponse.json(
      {
        message: 'Registration request submitted successfully! An admin will review your request. You will receive your login credentials once approved.',
        request: { id: employee.id, name: employee.name, email: employee.email },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
