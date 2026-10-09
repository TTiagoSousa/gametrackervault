import { GamesService } from 'src/games/games.service';
import {
  EntryWithGame,
  LibraryRepository,
} from '../repositories/library-repository';

// Os tempos médios do IGDB mudam devagar: uma vez por semana chega
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Garante que os jogos destas entradas têm géneros e tempos médios do IGDB,
 * indo buscar (em lote) os que nunca foram lidos ou já têm mais de uma semana.
 * Atualiza as entradas em memória e a tabela Game. Se o IGDB falhar, as contas
 * fazem-se com o que já havia — devolve false para a página o poder dizer.
 */
export async function refreshGameFacts(
  entries: EntryWithGame[],
  repository: LibraryRepository,
  games: GamesService,
): Promise<boolean> {
  const limit = Date.now() - MAX_AGE_MS;
  const stale = [
    ...new Set(
      entries
        .filter(
          (e) =>
            !e.game.factsCheckedAt || e.game.factsCheckedAt.getTime() < limit,
        )
        .map((e) => e.gameId),
    ),
  ];
  if (!stale.length) return true;

  try {
    const facts = await games.facts(stale);
    for (const [igdbId, fact] of facts) {
      await repository.saveGameFacts(igdbId, fact);
    }
    for (const entry of entries) {
      const fact = facts.get(entry.gameId);
      if (fact) Object.assign(entry.game, fact, { factsCheckedAt: new Date() });
    }
    return true;
  } catch {
    return false;
  }
}
