import { LibraryStatus } from 'src/generated/prisma/client/client';
import { PrismaLibraryRepository } from '../repositories/prisma/prisma-library-repository';
import { mapEntry } from './mapEntry';

/**
 * A user's whole shelf (newest first) and how many games
 * there are in each status — Home uses both.
 */
export async function listLibrary(
  userId: string,
  repository: PrismaLibraryRepository,
) {
  const entries = await repository.listEntries(userId);
  const counts = Object.fromEntries(
    Object.values(LibraryStatus).map((status) => [status, 0]),
  ) as Record<LibraryStatus, number>;
  for (const entry of entries) counts[entry.status] += 1;
  return { items: entries.map(mapEntry), counts, total: entries.length };
}
