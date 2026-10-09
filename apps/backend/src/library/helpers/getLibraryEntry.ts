import { PrismaLibraryRepository } from '../repositories/prisma/prisma-library-repository';
import { mapEntry } from './mapEntry';

/** A entrada de um jogo na estante do utilizador, ou null se ainda não está lá. */
export async function getLibraryEntry(
  userId: string,
  gameId: number,
  repository: PrismaLibraryRepository,
) {
  const entry = await repository.findEntry(userId, gameId);
  return { entry: entry ? mapEntry(entry) : null };
}
