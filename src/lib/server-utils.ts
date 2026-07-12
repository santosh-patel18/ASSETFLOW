import { prisma } from './db';

/**
 * Generate asset tag in AF-XXXX format (auto-increments).
 * Server-only — uses Prisma.
 */
export async function generateAssetTag(): Promise<string> {
  const lastAsset = await prisma.asset.findFirst({
    orderBy: { assetTag: 'desc' },
    select: { assetTag: true },
  });

  let nextNum = 1;
  if (lastAsset?.assetTag) {
    const match = lastAsset.assetTag.match(/AF-(\d+)/);
    if (match) {
      nextNum = parseInt(match[1], 10) + 1;
    }
  }

  return `AF-${String(nextNum).padStart(4, '0')}`;
}
