import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { IgdbClient } from './igdb/igdb.client';
import { SearchGamesDto } from './dto/search-games.dto';
import { searchGames } from './helpers/searchGames';
import { listFilters } from './helpers/listFilters';
import { getGameDetail } from './helpers/getGameDetail';
import { getGameSummary } from './helpers/getGameSummary';
import { getGameFacts } from './helpers/getGameFacts';
import { getRandomGame } from './helpers/getRandomGame';

@Injectable()
export class GamesService implements OnApplicationBootstrap {
  constructor(private readonly igdb: IgdbClient) {}

  // Loads the filter lists on startup, so the first person to open
  // search doesn't wait for IGDB. Without credentials (or network) it's fine:
  // it's retried on the first request.
  onApplicationBootstrap() {
    listFilters(this.igdb).catch(() => undefined);
  }

  search(dto: SearchGamesDto) {
    return searchGames(dto, this.igdb);
  }

  filters() {
    return listFilters(this.igdb);
  }

  detail(id: number) {
    return getGameDetail(id, this.igdb);
  }

  // Used by the shelf to store the minimal copy of the game
  summary(id: number) {
    return getGameSummary(id, this.igdb);
  }

  // Genres and average times of several games, for the stats
  facts(ids: number[]) {
    return getGameFacts(ids, this.igdb);
  }

  // A random well-rated game, excluding the ones the user already has
  random(exclude: number[]) {
    return getRandomGame(exclude, this.igdb);
  }
}
