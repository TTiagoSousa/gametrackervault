import { NotFoundException } from '@nestjs/common';
import { PrismaLibraryRepository } from '../repositories/prisma/prisma-library-repository';

/** Removes a game from the user's shelf. */
export async function removeLibraryEntry(
  userId: string,
  gameId: number,
  repository: PrismaLibraryRepository,
) {
  const removed = await repository.removeEntry(userId, gameId);
  if (!removed) {
    throw new NotFoundException('Este jogo não está na tua estante.');
  }
  return { entry: null };
}
