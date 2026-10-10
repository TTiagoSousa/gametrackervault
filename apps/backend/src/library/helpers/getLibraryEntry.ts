import { PrismaLibraryRepository } from '../repositories/prisma/prisma-library-repository';
import { mapEntry } from './mapEntry';

/** A game's entry on the user's shelf, or null if it isn't there yet. */
export async function getLibraryEntry(
  userId: string,
  gameId: number,
  repository: PrismaLibraryRepository,
) {
  const entry = await repository.findEntry(userId, gameId);
  return { entry: entry ? mapEntry(entry) : null };
}
