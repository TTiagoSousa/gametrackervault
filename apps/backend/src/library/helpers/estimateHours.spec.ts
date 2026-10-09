import { LibraryStatus } from 'src/generated/prisma/client/client';
import { estimateHours } from './estimateHours';

const game = { ttbMain: 20, ttbExtras: 40, ttbCompletionist: 80 };

describe('estimateHours', () => {
  it('usa as horas escritas pelo utilizador, mesmo com média', () => {
    expect(
      estimateHours(
        { status: LibraryStatus.FINISHED_MAIN, hoursPlayed: 12 },
        game,
      ),
    ).toEqual({ hours: 12, estimated: false });
  });

  it('conta 0 horas escritas como horas escritas', () => {
    expect(
      estimateHours({ status: LibraryStatus.PLAYING, hoursPlayed: 0 }, game),
    ).toEqual({ hours: 0, estimated: false });
  });

  it('usa a média de cada tipo de fim quando não há horas', () => {
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

  it('recua para a média mais próxima quando falta a do tipo de fim', () => {
    const partial = { ttbMain: 20, ttbExtras: null, ttbCompletionist: null };
    expect(
      estimateHours(
        { status: LibraryStatus.COMPLETED_100, hoursPlayed: null },
        partial,
      ),
    ).toEqual({ hours: 20, estimated: true });
  });

  it('não estima jogos a meio, em pausa, por jogar ou abandonados', () => {
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

  it('fica sem horas quando o IGDB não tem média', () => {
    const none = { ttbMain: null, ttbExtras: null, ttbCompletionist: null };
    expect(
      estimateHours(
        { status: LibraryStatus.FINISHED_MAIN, hoursPlayed: null },
        none,
      ),
    ).toEqual({ hours: null, estimated: false });
  });
});
