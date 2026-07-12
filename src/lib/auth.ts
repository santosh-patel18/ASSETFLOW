import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { prisma } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-me';
const BCRYPT_ROUNDS = 12;
const TOKEN_EXPIRY = '7d';
const COOKIE_NAME = 'assetflow_token';

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  name: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function getCurrentUserFromHeader(request: Request): Promise<JWTPayload | null> {
  // Try cookie first
  const cookieHeader = request.headers.get('cookie') || '';
  const tokenMatch = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  const cookieToken = tokenMatch?.[1];
  
  // Then try Authorization header
  const authHeader = request.headers.get('authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  
  const token = cookieToken || bearerToken;
  if (!token) return null;
  return verifyToken(token);
}

/**
 * Re-verify the user's role against the database.
 * JWT role is a hint only — this function is the source of truth for privileged mutations.
 */
export async function verifyRoleFromDB(userId: string): Promise<string | null> {
  const employee = await prisma.employee.findUnique({
    where: { id: userId },
    select: { role: true, status: true },
  });
  if (!employee || employee.status !== 'Active') return null;
  return employee.role;
}

/**
 * Get the department scope for a department head via recursive CTE.
 * Returns all department IDs the user has authority over (their dept + sub-depts).
 */
export async function getDepartmentScope(userId: string): Promise<string[]> {
  const employee = await prisma.employee.findUnique({
    where: { id: userId },
    select: { departmentId: true },
  });
  if (!employee?.departmentId) return [];

  const result = await prisma.$queryRaw<{ id: string }[]>`
    WITH RECURSIVE dept_tree AS (
      SELECT id, name, parent_department_id FROM departments WHERE id = ${employee.departmentId}::uuid
      UNION ALL
      SELECT d.id, d.name, d.parent_department_id
      FROM departments d JOIN dept_tree dt ON d.parent_department_id = dt.id
    )
    SELECT id FROM dept_tree
  `;
  return result.map(r => r.id);
}

export function setTokenCookie(token: string): string {
  return `${COOKIE_NAME}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}`;
}

export function clearTokenCookie(): string {
  return `${COOKIE_NAME}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`;
}

export { COOKIE_NAME };
