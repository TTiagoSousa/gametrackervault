import { NotFoundException } from '@nestjs/common';
import { PrismaLibraryRepository } from '../repositories/prisma/prisma-library-repository';

/** Tira um jogo da estante do utilizador. */
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
