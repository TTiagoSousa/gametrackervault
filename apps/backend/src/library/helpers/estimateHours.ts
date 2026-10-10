import { Game, LibraryStatus } from 'src/generated/prisma/client/client';

export interface HoursEstimate {
  hours: number | null;
  // true when the hours are the IGDB average and not the ones the user entered
  estimated: boolean;
}

/**
 * The hours of a game on the shelf: the ones the user entered or, if they
 * didn't and finished it, the IGDB players' average for that kind of finish
 * (main story, with extras, 100%). In progress, paused, dropped or
 * not yet played there is no way to estimate — no hours.
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
