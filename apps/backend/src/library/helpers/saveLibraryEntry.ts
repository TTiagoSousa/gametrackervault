import { BadRequestException } from '@nestjs/common';
import { GamesService } from 'src/games/games.service';
import { PrismaLibraryRepository } from '../repositories/prisma/prisma-library-repository';
import { SaveLibraryEntryDto } from '../dto/save-library-entry.dto';
import { mapEntry } from './mapEntry';

// A cópia do jogo (nome, capa, plataformas) é refrescada se tiver mais disto
const GAME_REFRESH_MS = 7 * 24 * 60 * 60 * 1000;

const toDate = (value?: string | null) =>
  value ? new Date(`${value}T00:00:00.000Z`) : null;

/**
 * Põe um jogo na estante ou altera a entrada que já lá está. Garante primeiro a
 * cópia mínima do jogo (tabela Game), vinda do IGDB.
 */
export async function saveLibraryEntry(
  userId: string,
  gameId: number,
  dto: SaveLibraryEntryDto,
  repository: PrismaLibraryRepository,
  games: GamesService,
) {
  const startedAt = toDate(dto.startedAt);
  const finishedAt = toDate(dto.finishedAt);
  if (startedAt && finishedAt && finishedAt < startedAt) {
    throw new BadRequestException(
      'A data em que acabaste não pode ser anterior à data em que começaste.',
    );
  }

  const cached = await repository.findGame(gameId);
  if (!cached || Date.now() - cached.updatedAt.getTime() > GAME_REFRESH_MS) {
    await repository.saveGame(await games.summary(gameId));
  }

  const entry = await repository.saveEntry(userId, gameId, {
    status: dto.status,
    hoursPlayed: dto.hoursPlayed ?? null,
    startedAt,
    finishedAt,
    rating: dto.rating ?? null,
    notes: dto.notes?.trim() ? dto.notes.trim() : null,
  });
  return { entry: mapEntry(entry) };
}
