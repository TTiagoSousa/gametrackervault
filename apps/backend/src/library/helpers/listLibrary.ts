import { LibraryStatus } from 'src/generated/prisma/client/client';
import { PrismaLibraryRepository } from '../repositories/prisma/prisma-library-repository';
import { mapEntry } from './mapEntry';

/**
 * A estante inteira de um utilizador (mais recentes primeiro) e quantos jogos
 * há em cada estado — o Início usa as duas coisas.
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
