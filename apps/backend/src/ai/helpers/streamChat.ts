import { GamesService } from 'src/games/games.service';
import { LibraryRepository } from 'src/library/repositories/library-repository';
import { refreshGameFacts } from 'src/library/helpers/refreshGameFacts';
import {
  ApiMessage,
  ContentBlock,
  streamMessage,
} from '../anthropic/anthropic.client';
import { AiSettingsRepository } from '../repositories/ai-settings-repository';
import { ChatDto } from '../dto/ai.dto';
import { savedApiKey } from './aiSettings';
import { buildSystemPrompt } from './buildSystemPrompt';
import { GAME_TOOLS, runGameTool } from './gameTools';

// Quantas vezes seguidas o modelo pode pedir ferramentas numa só resposta
const MAX_TOOL_ROUNDS = 6;
const MAX_TOKENS = 4096;

/** O que vai para o browser, uma linha JSON de cada vez. */
export type ChatEvent =
  | { type: 'text'; text: string }
  | { type: 'tool'; name: string; query: string }
  | { type: 'error'; message: string }
  | { type: 'done' };

/**
 * Uma resposta do assistente: lê a chave e o modelo do utilizador, junta a
 * estante às instruções e fala com o Claude em streaming, correndo as
 * ferramentas do IGDB que ele pedir. Cada pedaço sai por `emit`.
 *
 * Os erros antes de começar (sem chave, chave rejeitada) propagam-se como
 * exceção; os do meio da resposta também — quem chama decide como os mostrar.
 */
export async function streamChat(args: {
  userId: string;
  username: string;
  dto: ChatDto;
  signal: AbortSignal;
  emit: (event: ChatEvent) => void;
  aiSettings: AiSettingsRepository;
  library: LibraryRepository;
  games: GamesService;
}) {
  const { apiKey, model } = await savedApiKey(args.userId, args.aiSettings);

  const entries = await args.library.listEntries(args.userId);
  await refreshGameFacts(entries, args.library, args.games);
  const system = buildSystemPrompt({
    username: args.username,
    language: args.dto.language ?? 'pt-PT',
    entries,
  });

  const messages: ApiMessage[] = args.dto.messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
    const result = await streamMessage({
      apiKey,
      model,
      system,
      messages,
      // Na última volta já não há ferramentas: o modelo tem de responder
      tools: round < MAX_TOOL_ROUNDS ? GAME_TOOLS : undefined,
      maxTokens: MAX_TOKENS,
      signal: args.signal,
      onText: (text) => args.emit({ type: 'text', text }),
    });

    const toolUses = result.content.filter(
      (b): b is Extract<ContentBlock, { type: 'tool_use' }> =>
        b.type === 'tool_use',
    );
    if (result.stopReason !== 'tool_use' || !toolUses.length) break;

    const results: ContentBlock[] = [];
    for (const use of toolUses) {
      args.emit({
        type: 'tool',
        name: use.name,
        query:
          typeof use.input.query === 'string'
            ? use.input.query
            : typeof use.input.id === 'number'
              ? String(use.input.id)
              : '',
      });
      try {
        results.push({
          type: 'tool_result',
          tool_use_id: use.id,
          content: await runGameTool(use.name, use.input, args.games),
        });
      } catch (error) {
        results.push({
          type: 'tool_result',
          tool_use_id: use.id,
          content: `Error: ${error instanceof Error ? error.message : 'tool failed'}`,
          is_error: true,
        });
      }
    }
    messages.push({ role: 'assistant', content: result.content });
    messages.push({ role: 'user', content: results });
  }

  args.emit({ type: 'done' });
}
