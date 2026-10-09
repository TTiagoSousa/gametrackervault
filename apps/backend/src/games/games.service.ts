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

  // Carrega as listas de filtros logo ao arrancar, para a primeira pessoa a abrir
  // a pesquisa não esperar pelo IGDB. Sem credenciais (ou sem rede) não faz mal:
  // tenta-se outra vez no primeiro pedido.
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

  // Usado pela estante para guardar a cópia mínima do jogo
  summary(id: number) {
    return getGameSummary(id, this.igdb);
  }

  // Géneros e tempos médios de vários jogos, para as estatísticas
  facts(ids: number[]) {
    return getGameFacts(ids, this.igdb);
  }

  // Um jogo bem avaliado ao calhas, fora dos que o utilizador já tem
  random(exclude: number[]) {
    return getRandomGame(exclude, this.igdb);
  }
}
