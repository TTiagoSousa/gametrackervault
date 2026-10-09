import { Game, LibraryStatus } from 'src/generated/prisma/client/client';

export interface HoursEstimate {
  hours: number | null;
  // true quando as horas são a média do IGDB e não as que o utilizador escreveu
  estimated: boolean;
}

/**
 * As horas de um jogo na estante: as que o utilizador escreveu ou, se não as
 * escreveu e o acabou, a média dos jogadores do IGDB para esse tipo de fim
 * (história principal, com secundárias, 100%). A meio, em pausa, abandonado ou
 * por jogar não há como estimar — fica sem horas.
 */
export function estimateHours(
  entry: { status: LibraryStatus; hoursPlayed: number | null },
  game: Pick<Game, 'ttbMain' | 'ttbExtras' | 'ttbCompletionist'>,
): HoursEstimate {
  if (entry.hoursPlayed != null)
    return { hours: entry.hoursPlayed, estimated: false };

  const average =
    entry.status === LibraryStatus.FINISHED_MAIN
      ? game.ttbMain
      : entry.status === LibraryStatus.FINISHED_EXTRAS
        ? (game.ttbExtras ?? game.ttbMain)
        : entry.status === LibraryStatus.COMPLETED_100
          ? (game.ttbCompletionist ?? game.ttbExtras ?? game.ttbMain)
          : null;

  return average != null
    ? { hours: average, estimated: true }
    : { hours: null, estimated: false };
}
