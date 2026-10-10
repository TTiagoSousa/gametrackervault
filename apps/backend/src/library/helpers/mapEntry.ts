import { EntryWithGame } from '../repositories/library-repository';

const coverUrl = (imageId: string) =>
  `https://images.igdb.com/igdb/image/upload/t_cover_big/${imageId}.jpg`;

// Day-only dates (DATE column) → "YYYY-MM-DD"
const day = (date: Date | null) =>
  date ? date.toISOString().slice(0, 10) : null;

/** Shelf entry in the app format, with the game already summarised. */
export function mapEntry(entry: EntryWithGame) {
  return {
    gameId: entry.gameId,
    status: entry.status,
    hoursPlayed: entry.hoursPlayed,
    startedAt: day(entry.startedAt),
    finishedAt: day(entry.finishedAt),
    rating: entry.rating,
    notes: entry.notes,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
    game: {
      id: entry.game.igdbId,
      name: entry.game.name,
      coverUrl: entry.game.coverImageId
        ? coverUrl(entry.game.coverImageId)
        : null,
      year: entry.game.releaseYear,
      platforms: entry.game.platforms,
    },
  };
}

export type LibraryEntryView = ReturnType<typeof mapEntry>;
