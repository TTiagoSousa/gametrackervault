import { Module } from '@nestjs/common';
import { IntegrationsModule } from 'src/integrations/integrations.module';
import { GamesController } from './games.controller';
import { GamesService } from './games.service';
import { IgdbClient } from './igdb/igdb.client';

@Module({
  imports: [IntegrationsModule],
  controllers: [GamesController],
  providers: [GamesService, IgdbClient],
  // The shelf uses GamesService to store the minimal copy of games
  exports: [GamesService],
})
export class GamesModule {}
