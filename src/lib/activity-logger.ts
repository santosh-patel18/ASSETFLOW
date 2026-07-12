import { prisma } from './db';

export async function logActivity(
  actorId: string,
  action: string,
  targetType?: string,
  targetId?: string,
  metadata?: Record<string, unknown>
) {
  await prisma.activityLog.create({
    data: {
      actorId,
      action,
      targetType: targetType || null,
      targetId: targetId || null,
      metadata: metadata || null,
    },
  });
}
