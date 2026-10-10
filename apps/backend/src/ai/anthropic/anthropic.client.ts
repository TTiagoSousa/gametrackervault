import {
  BadGatewayException,
  BadRequestException,
  HttpException,
  HttpStatus,
  ServiceUnavailableException,
} from '@nestjs/common';

// ANTHROPIC_API_URL is only for tests (a fake server); in production the official one is used
const API_URL = process.env.ANTHROPIC_API_URL || 'https://api.anthropic.com/v1';
const API_VERSION = '2023-06-01';

export interface AnthropicModel {
  id: string;
  name: string;
  createdAt: string | null;
}

// Content blocks of a message (only the ones the app uses)
export type ContentBlock =
  | { type: 'text'; text: string }
  | {
      type: 'tool_use';
      id: string;
      name: string;
      input: Record<string, unknown>;
    }
  | {
      type: 'tool_result';
      tool_use_id: string;
      content: string;
      is_error?: boolean;
    };

export interface ApiMessage {
  role: 'user' | 'assistant';
  content: string | ContentBlock[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export interface StreamResult {
  content: ContentBlock[];
  stopReason: string | null;
}

const headers = (apiKey: string) => ({
  'x-api-key': apiKey,
  'anthropic-version': API_VERSION,
  'content-type': 'application/json',
});

/** Translates an Anthropic API error into a clear response in Portuguese. */
async function toHttpError(response: Response): Promise<HttpException> {
  let message = '';
  try {
    const body = (await response.json()) as { error?: { message?: string } };
    message = body.error?.message ?? '';
  } catch {
    // empty or non-JSON body
  }
  if (response.status === 401) {
    return new BadRequestException(
      'A Anthropic rejeitou a chave da API. Confirma que a copiaste inteira e que não foi apagada.',
    );
  }
  if (response.status === 403) {
    return new BadRequestException(
      'Esta chave não tem permissão para usar este modelo.',
    );
  }
  if (response.status === 404) {
    return new BadRequestException(
      'O modelo escolhido não existe ou esta chave não tem acesso a ele. Escolhe outro em Definições → Assistente.',
    );
  }
  if (response.status === 429) {
    return new HttpException(
      'A Anthropic está a limitar os pedidos desta chave. Espera um pouco e tenta outra vez.',
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
  if (response.status === 400 && /credit/i.test(message)) {
    return new BadRequestException(
      'A conta da Anthropic não tem crédito. Carrega crédito em console.anthropic.com → Billing.',
    );
  }
  if (response.status === 529 || response.status >= 500) {
    return new ServiceUnavailableException(
      'A Anthropic está sobrecarregada ou indisponível. Tenta outra vez daqui a pouco.',
    );
  }
  return new BadGatewayException(
    `A Anthropic respondeu com erro (${response.status})${message ? `: ${message}` : ''}.`,
  );
}

/** The models the key has access to, newest first. */
export async function listModels(apiKey: string): Promise<AnthropicModel[]> {
  const response = await fetch(`${API_URL}/models?limit=100`, {
    headers: headers(apiKey),
  }).catch(() => {
    throw new ServiceUnavailableException(
      'Não foi possível contactar a Anthropic.',
    );
  });
  if (!response.ok) throw await toHttpError(response);
  const body = (await response.json()) as {
    data: { id: string; display_name?: string; created_at?: string }[];
  };
  return body.data.map((m) => ({
    id: m.id,
    name: m.display_name ?? m.id,
    createdAt: m.created_at ?? null,
  }));
}

/**
 * A streamed Claude response. Calls `onText` with each text chunk as
 * it arrives and returns, at the end, the complete blocks (text and tool
 * requests) and why it stopped.
 */
export async function streamMessage(args: {
  apiKey: string;
  model: string;
  system: string;
  messages: ApiMessage[];
  tools?: ToolDefinition[];
  maxTokens: number;
  signal: AbortSignal;
  onText: (text: string) => void;
}): Promise<StreamResult> {
  const response = await fetch(`${API_URL}/messages`, {
    method: 'POST',
    headers: headers(args.apiKey),
    body: JSON.stringify({
      model: args.model,
      max_tokens: args.maxTokens,
      system: args.system,
      messages: args.messages,
      tools: args.tools,
      stream: true,
    }),
    signal: args.signal,
  }).catch((error: unknown) => {
    if (args.signal.aborted) throw error;
    throw new ServiceUnavailableException(
      'Não foi possível contactar a Anthropic.',
    );
  });
  if (!response.ok || !response.body) throw await toHttpError(response);

  // Blocks being built, in the order (index) the API announces them
  const blocks: (ContentBlock & { json?: string })[] = [];
  let stopReason: string | null = null;

  const decoder = new TextDecoder();
  let buffer = '';
  const reader = response.body.getReader();

  const handle = (data: string) => {
    const event = JSON.parse(data) as {
      type: string;
      index?: number;
      content_block?: {
        type: string;
        id?: string;
        name?: string;
        text?: string;
      };
      delta?: {
        type?: string;
        text?: string;
        partial_json?: string;
        stop_reason?: string;
      };
      error?: { type?: string; message?: string };
    };
    switch (event.type) {
      case 'content_block_start': {
        const block = event.content_block!;
        if (block.type === 'text')
          blocks[event.index!] = { type: 'text', text: block.text ?? '' };
        else if (block.type === 'tool_use') {
          blocks[event.index!] = {
            type: 'tool_use',
            id: block.id!,
            name: block.name!,
            input: {},
            json: '',
          };
        }
        break;
      }
      case 'content_block_delta': {
        const block = blocks[event.index!];
        if (!block) break;
        if (event.delta?.type === 'text_delta' && block.type === 'text') {
          block.text += event.delta.text ?? '';
          args.onText(event.delta.text ?? '');
        } else if (
          event.delta?.type === 'input_json_delta' &&
          block.type === 'tool_use'
        ) {
          block.json += event.delta.partial_json ?? '';
        }
        break;
      }
      case 'content_block_stop': {
        const block = blocks[event.index!];
        if (block?.type === 'tool_use') {
          try {
            block.input = block.json
              ? (JSON.parse(block.json) as Record<string, unknown>)
              : {};
          } catch {
            block.input = {};
          }
          delete block.json;
        }
        break;
      }
      case 'message_delta':
        stopReason = event.delta?.stop_reason ?? stopReason;
        break;
      case 'error':
        throw new ServiceUnavailableException(
          event.error?.type === 'overloaded_error'
            ? 'A Anthropic está sobrecarregada. Tenta outra vez daqui a pouco.'
            : `A Anthropic interrompeu a resposta${event.error?.message ? `: ${event.error.message}` : ''}.`,
        );
    }
  };

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    // SSE events separated by a blank line; only the "data:" lines matter
    let split: number;
    while ((split = buffer.indexOf('\n\n')) >= 0) {
      const raw = buffer.slice(0, split);
      buffer = buffer.slice(split + 2);
      for (const line of raw.split('\n')) {
        if (line.startsWith('data:')) handle(line.slice(5).trim());
      }
    }
  }

  return { content: blocks.filter(Boolean), stopReason };
}
