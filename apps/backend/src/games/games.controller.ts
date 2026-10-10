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

// Game catalogue (IGDB) — search, filter options and game details.
// Signed-in users only.
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

  // After the fixed routes, so "search" and "filters" are not read as an id
  @Get(':id')
  detail(@Param('id', ParseIntPipe) id: number) {
    return this.gamesService.detail(id);
  }
}
