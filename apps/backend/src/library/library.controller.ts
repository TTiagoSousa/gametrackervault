import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { JwtPayload } from 'src/auth/jwt-payload.interface';
import { LibraryService } from './library.service';
import { SaveLibraryEntryDto } from './dto/save-library-entry.dto';

type AuthRequest = Request & { user: JwtPayload };

// The signed-in user's shelf. Each user only sees and edits their own.
@Controller('library')
@UseGuards(JwtAuthGuard)
export class LibraryController {
  constructor(private readonly libraryService: LibraryService) {}

  @Get()
  list(@Req() req: AuthRequest) {
    return this.libraryService.list(req.user.id);
  }

  // Before ':gameId', otherwise "stats" would be read as an id
  @Get('stats')
  stats(@Req() req: AuthRequest) {
    return this.libraryService.stats(req.user.id);
  }

  @Get('discover')
  discover(@Req() req: AuthRequest) {
    return this.libraryService.discover(req.user.id);
  }

  @Get(':gameId')
  get(@Req() req: AuthRequest, @Param('gameId', ParseIntPipe) gameId: number) {
    return this.libraryService.get(req.user.id, gameId);
  }

  @Put(':gameId')
  save(
    @Req() req: AuthRequest,
    @Param('gameId', ParseIntPipe) gameId: number,
    @Body() dto: SaveLibraryEntryDto,
  ) {
    return this.libraryService.save(req.user.id, gameId, dto);
  }

  @Delete(':gameId')
  remove(
    @Req() req: AuthRequest,
    @Param('gameId', ParseIntPipe) gameId: number,
  ) {
    return this.libraryService.remove(req.user.id, gameId);
  }
}
