import { Module } from '@nestjs/common';
import { GamesModule } from 'src/games/games.module';
import { LibraryModule } from 'src/library/library.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { AiSettingsRepository } from './repositories/ai-settings-repository';

@Module({
  imports: [GamesModule, LibraryModule],
  controllers: [AiController],
  providers: [AiService, AiSettingsRepository],
})
export class AiModule {}
