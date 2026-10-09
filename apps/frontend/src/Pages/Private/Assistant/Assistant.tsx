import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../Contexts/Auth_Context';
import { useAiSettings } from '../../../Hooks/Ai/useAiSettings';
import { useAssistantChat } from '../../../Hooks/Ai/useAssistantChat';
import Ai_Card from '../../../Components/Ai_Card/Ai_Card';
import Markdown from '../../../Components/Markdown/Markdown';
import * as Icon from '../../../Imports/icons';
import './Assistant.scss';

// Perguntas para começar (chaves em assistant:suggestions)
const SUGGESTIONS = ['next', 'similar', 'backlog', 'short', 'hidden'] as const;

/**
 * O assistente (Claude), do tamanho exato do ecrã — a página nunca rola. À
 * esquerda a conversa (cabeçalho com o modelo e "Nova conversa", mensagens com
 * scroll próprio, caixa de escrever no fundo); à direita sugestões de perguntas
 * e o que o assistente lê. Sem chave guardada, o cartão para a pôr ocupa o lugar
 * da conversa.
 */
const Assistant = () => {
  const { t } = useTranslation('assistant');
  const { username } = useAuth();
  const ai = useAiSettings();
  const { messages, streaming, send, stop, reset } = useAssistantChat(username);
  const [draft, setDraft] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  // Só segue a resposta para baixo se o utilizador já estava no fundo
  const stickRef = useRef(true);

  useEffect(() => {
    const list = listRef.current;
    if (list && stickRef.current) list.scrollTop = list.scrollHeight;
  }, [messages]);

  const onScroll = () => {
    const list = listRef.current;
    if (list) stickRef.current = list.scrollHeight - list.scrollTop - list.clientHeight < 80;
  };

  const ask = (text: string) => {
    if (!text.trim() || streaming) return;
    stickRef.current = true;
    void send(text);
    setDraft('');
    inputRef.current?.focus();
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter envia; Shift+Enter muda de linha
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      ask(draft);
    }
  };

  const configured = Boolean(ai.settings?.configured);

  return (
    <div className='Assistant'>
      <section className='Assistant_Chat'>
        <header className='Assistant_Head'>
          <span className='Assistant_Head_Icon' aria-hidden='true'><Icon.Sparkle /></span>
          <div className='Assistant_Head_Text'>
            <h1>{t('title')}</h1>
            <span>{configured ? ai.settings?.model : t('side.noKey')}</span>
          </div>
          <button type='button' className='Assistant_New' onClick={reset} disabled={!messages.length || !configured}>
            <Icon.Plus />
            {t('side.newChat')}
          </button>
        </header>

        {ai.failed && <p className='Assistant_Error'>{t('errors.settings')}</p>}

        {/* Sem chave: o cartão para a pôr, no lugar da conversa */}
        {ai.settings && !configured && (
          <div className='Assistant_Setup'>
            <Ai_Card {...ai} title={t('setup.title')} />
          </div>
        )}

        {configured && (
          <>
            <div className='Assistant_Messages' ref={listRef} onScroll={onScroll} aria-live='polite'>
              {messages.length === 0 ? (
                <div className='Assistant_Intro'>
                  <p>{t('intro')}</p>
                </div>
              ) : (
                messages.map((message, i) => (
                  <article key={i} className={`Assistant_Message ${message.role}`}>
                    <span className='Assistant_Avatar' aria-hidden='true'>
                      {message.role === 'user' ? (username ?? '?').charAt(0).toUpperCase() : <Icon.Sparkle />}
                    </span>
                    <div className='Assistant_Bubble'>
                      {message.tools && message.tools.length > 0 && (
                        <ul className='Assistant_Tools'>
                          {message.tools.map((tool, j) => (
                            <li key={j}>
                              <Icon.Search />
                              {t(`tools.${tool.name === 'get_game' ? 'get_game' : 'search_games'}`, { query: tool.query })}
                            </li>
                          ))}
                        </ul>
                      )}
                      {message.role === 'assistant' ? (
                        message.content ? <Markdown text={message.content} /> : !message.error && <p className='Assistant_Thinking'>{t('thinking')}</p>
                      ) : (
                        <p className='Assistant_User_Text'>{message.content}</p>
                      )}
                      {message.error && <p className='Assistant_Message_Error'>{message.error}</p>}
                    </div>
                  </article>
                ))
              )}
            </div>

            <form className='Assistant_Composer' onSubmit={(e) => { e.preventDefault(); ask(draft); }}>
              <textarea
                ref={inputRef}
                rows={2}
                value={draft}
                maxLength={12000}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={t('placeholder')}
                aria-label={t('placeholder')}
              />
              {streaming ? (
                <button type='button' className='Assistant_Stop' onClick={stop}>{t('stop')}</button>
              ) : (
                <button type='submit' className='Assistant_Send' disabled={!draft.trim()} aria-label={t('send')} title={t('send')}>
                  <Icon.Send />
                </button>
              )}
            </form>
          </>
        )}
      </section>

      {/* Coluna da direita: perguntas para começar e o que o assistente lê */}
      <aside className='Assistant_Side'>
        <div className='Assistant_Side_Block'>
          <h2>{t('side.suggestions')}</h2>
          <div className='Assistant_Suggestions'>
            {SUGGESTIONS.map((key) => (
              <button key={key} type='button' onClick={() => ask(t(`suggestions.${key}`))} disabled={!configured || streaming}>
                {t(`suggestions.${key}`)}
              </button>
            ))}
          </div>
        </div>

        <div className='Assistant_Side_Block'>
          <h2>{t('side.privacyTitle')}</h2>
          <p>{t('side.privacy')}</p>
          <div className='Assistant_Side_Links'>
            <Link to='/Vault/Settings#assistant'>{t('side.change')}</Link>
            <Link to='/Vault/Help#claude'>{t('side.help')}</Link>
          </div>
        </div>
      </aside>
    </div>
  );
};

export default Assistant;
