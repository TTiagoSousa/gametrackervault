import { Module } from '@nestjs/common';
import { IntegrationsModule } from 'src/integrations/integrations.module';
import { GamesController } from './games.controller';
import { GamesService } from './games.service';
import { IgdbClient } from './igdb/igdb.client';

@Module({
  imports: [IntegrationsModule],
  controllers: [GamesController],
  providers: [GamesService, IgdbClient],
  // A estante usa o GamesService para guardar a cópia mínima dos jogos
  exports: [GamesService],
})
export class GamesModule {}
