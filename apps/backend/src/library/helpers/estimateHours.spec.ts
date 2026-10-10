import { LibraryStatus } from 'src/generated/prisma/client/client';
import { estimateHours } from './estimateHours';

const game = { ttbMain: 20, ttbExtras: 40, ttbCompletionist: 80 };

describe('estimateHours', () => {
  it('uses the hours entered by the user, even with an average', () => {
    expect(
      estimateHours(
        { status: LibraryStatus.FINISHED_MAIN, hoursPlayed: 12 },
        game,
      ),
    ).toEqual({ hours: 12, estimated: false });
  });

  it('counts 0 entered hours as entered hours', () => {
    expect(
      estimateHours({ status: LibraryStatus.PLAYING, hoursPlayed: 0 }, game),
    ).toEqual({ hours: 0, estimated: false });
  });

  it('uses the average for each finish type when there are no hours', () => {
    const at = (status: LibraryStatus) =>
      estimateHours({ status, hoursPlayed: null }, game);
    expect(at(LibraryStatus.FINISHED_MAIN)).toEqual({
      hours: 20,
      estimated: true,
    });
    expect(at(LibraryStatus.FINISHED_EXTRAS)).toEqual({
      hours: 40,
      estimated: true,
    });
    expect(at(LibraryStatus.COMPLETED_100)).toEqual({
      hours: 80,
      estimated: true,
    });
  });

  it('falls back to the closest average when the finish type one is missing', () => {
    const partial = { ttbMain: 20, ttbExtras: null, ttbCompletionist: null };
    expect(
      estimateHours(
        { status: LibraryStatus.COMPLETED_100, hoursPlayed: null },
        partial,
      ),
    ).toEqual({ hours: 20, estimated: true });
  });

  it('does not estimate in-progress, paused, unplayed or dropped games', () => {
    for (const status of [
      LibraryStatus.PLAYING,
      LibraryStatus.PAUSED,
      LibraryStatus.PLAN_TO_PLAY,
      LibraryStatus.DROPPED,
    ]) {
      expect(estimateHours({ status, hoursPlayed: null }, game)).toEqual({
        hours: null,
        estimated: false,
      });
    }
  });

  it('has no hours when IGDB has no average', () => {
    const none = { ttbMain: null, ttbExtras: null, ttbCompletionist: null };
    expect(
      estimateHours(
        { status: LibraryStatus.FINISHED_MAIN, hoursPlayed: null },
        none,
      ),
    ).toEqual({ hours: null, estimated: false });
  });
});
