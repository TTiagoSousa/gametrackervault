import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { GamesService } from './games.service';
import { SearchGamesDto } from './dto/search-games.dto';

// Catálogo de jogos (IGDB) — pesquisa, opções de filtro e a ficha de um jogo.
// Só para quem tem sessão.
@Controller('games')
@UseGuards(JwtAuthGuard)
export class GamesController {
  constructor(private readonly gamesService: GamesService) {}

  @Get('search')
  search(@Query() dto: SearchGamesDto) {
    return this.gamesService.search(dto);
  }

  @Get('filters')
  filters() {
    return this.gamesService.filters();
  }

  // Depois das rotas fixas, para "search" e "filters" não serem lidos como id
  @Get(':id')
  detail(@Param('id', ParseIntPipe) id: number) {
    return this.gamesService.detail(id);
  }
}
