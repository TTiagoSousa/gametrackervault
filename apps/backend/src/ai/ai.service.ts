import { Injectable } from '@nestjs/common';
import { GamesService } from 'src/games/games.service';
import { PrismaLibraryRepository } from 'src/library/repositories/prisma/prisma-library-repository';
import { AiSettingsRepository } from './repositories/ai-settings-repository';
import { ChatDto, SaveAiSettingsDto } from './dto/ai.dto';
import {
  getAiSettings,
  listAiModels,
  saveAiSettings,
} from './helpers/aiSettings';
import { ChatEvent, streamChat } from './helpers/streamChat';

@Injectable()
export class AiService {
  constructor(
    private readonly settings: AiSettingsRepository,
    private readonly library: PrismaLibraryRepository,
    private readonly games: GamesService,
  ) {}

  getSettings(userId: string) {
    return getAiSettings(userId, this.settings);
  }

  saveSettings(userId: string, dto: SaveAiSettingsDto) {
    return saveAiSettings(userId, dto, this.settings);
  }

  async removeSettings(userId: string) {
    await this.settings.remove(userId);
    return getAiSettings(userId, this.settings);
  }

  models(userId: string, apiKey?: string) {
    return listAiModels(userId, apiKey, this.settings);
  }

  chat(
    user: { id: string; username: string },
    dto: ChatDto,
    signal: AbortSignal,
    emit: (event: ChatEvent) => void,
  ) {
    return streamChat({
      userId: user.id,
      username: user.username,
      dto,
      signal,
      emit,
      aiSettings: this.settings,
      library: this.library,
      games: this.games,
    });
  }
}
