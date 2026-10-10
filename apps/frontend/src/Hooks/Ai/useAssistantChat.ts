import { useEffect, useRef, useState } from 'react';
import { BASE_URL } from '../../config/urls';
import { End_Points } from '../../Service/endPoints';
import { currentLanguage } from '../../i18n';
import i18n from '../../i18n';

export interface ChatTool {
  name: string;
  query: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  // IGDB searches the assistant made for this answer
  tools?: ChatTool[];
  error?: string;
}

type ChatEvent =
  | { type: 'text'; text: string }
  | { type: 'tool'; name: string; query: string }
  | { type: 'error'; message: string }
  | { type: 'done' };

// How many previous messages go with each question (the backend accepts up to 60)
const HISTORY = 40;

const storageKey = (username: string | null) => `assistant-chat:${username ?? 'anon'}`;

const load = (username: string | null): ChatMessage[] => {
  try {
    const raw = sessionStorage.getItem(storageKey(username));
    return raw ? (JSON.parse(raw) as ChatMessage[]) : [];
  } catch {
    return [];
  }
};

/**
 * The conversation with the assistant. Answers are streamed (one JSON line
 * per event) and appear as they arrive. The conversation is kept
 * in this tab (sessionStorage) until another one is started.
 */
export const useAssistantChat = (username: string | null) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => load(username));
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (streaming) return;
    try {
      sessionStorage.setItem(storageKey(username), JSON.stringify(messages));
    } catch {
      // without sessionStorage the conversation only lasts until reload
    }
  }, [messages, streaming, username]);

  // On leaving the page, the answer in progress is cancelled
  useEffect(() => () => abortRef.current?.abort(), []);

  // Updates the last message (the answer in progress)
  const patchLast = (patch: (message: ChatMessage) => ChatMessage) =>
    setMessages((previous) => {
      const next = [...previous];
      next[next.length - 1] = patch(next[next.length - 1]);
      return next;
    });

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || streaming) return;

    // The history sent: only messages with text and no error
    const history = [...messages, { role: 'user' as const, content: question }]
      .filter((m) => m.content.trim() && !m.error)
      .slice(-HISTORY)
      .map(({ role, content }) => ({ role, content }));

    setMessages((previous) => [...previous, { role: 'user', content: question }, { role: 'assistant', content: '' }]);
    setStreaming(true);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch(`${BASE_URL}${End_Points.Ai_Chat_Endpoint()}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, language: currentLanguage() }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        let message = i18n.t('assistant:errors.generic');
        try {
          const body = (await response.json()) as { message?: string | string[] };
          if (body.message) message = Array.isArray(body.message) ? body.message[0] : body.message;
        } catch {
          // no JSON body
        }
        patchLast((m) => ({ ...m, error: message }));
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let newline: number;
        while ((newline = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, newline).trim();
          buffer = buffer.slice(newline + 1);
          if (!line) continue;
          const event = JSON.parse(line) as ChatEvent;
          if (event.type === 'text') patchLast((m) => ({ ...m, content: m.content + event.text }));
          else if (event.type === 'tool') {
            patchLast((m) => ({ ...m, tools: [...(m.tools ?? []), { name: event.name, query: event.query }] }));
          } else if (event.type === 'error') patchLast((m) => ({ ...m, error: event.message }));
        }
      }
    } catch {
      if (controller.signal.aborted) {
        patchLast((m) => (m.content ? m : { ...m, error: i18n.t('assistant:errors.stopped') }));
      } else {
        patchLast((m) => ({ ...m, error: i18n.t('assistant:errors.network') }));
      }
    } finally {
      abortRef.current = null;
      setStreaming(false);
    }
  };

  const stop = () => abortRef.current?.abort();

  const reset = () => {
    abortRef.current?.abort();
    setMessages([]);
  };

  return { messages, streaming, send, stop, reset };
};
