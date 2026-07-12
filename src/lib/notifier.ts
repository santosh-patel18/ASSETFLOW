import { prisma } from './db';

export async function notify(
  recipientId: string,
  type: string,
  message: string
) {
  await prisma.notification.create({
    data: {
      recipientId,
      type,
      message,
    },
  });
}

export async function notifyMultiple(
  recipientIds: string[],
  type: string,
  message: string
) {
  if (recipientIds.length === 0) return;
  await prisma.notification.createMany({
    data: recipientIds.map(recipientId => ({
      recipientId,
      type,
      message,
    })),
  });
}
