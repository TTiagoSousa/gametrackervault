import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { useAiSettings } from '../../Hooks/Ai/useAiSettings';
import { dateLocale } from '../../i18n';
import './Ai_Card.scss';

// Current Claude models, to pick from before loading the account's list
const SUGGESTED_MODELS = ['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5'];

type Ai_Card_Props = ReturnType<typeof useAiSettings> & {
  // On the assistant page the title is different (it's the first step)
  title?: string;
};

/**
 * This user's Anthropic key and assistant model. The key is
 * tested before being saved, is stored encrypted on the server and never returns to the
 * browser (only the last 4 characters).
 */
const Ai_Card = ({ settings, models, busy, loadModels, save, remove, title }: Ai_Card_Props) => {
  const { t } = useTranslation('assistant');
  const [apiKey, setApiKey] = useState('');
  // The model starts as the saved one; until another is picked, it stands
  const [modelDraft, setModelDraft] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const configured = Boolean(settings?.configured);
  const model = modelDraft ?? settings?.model ?? SUGGESTED_MODELS[1];
  const options = models ? models.map((m) => ({ id: m.id, label: `${m.name} (${m.id})` })) : SUGGESTED_MODELS.map((id) => ({ id, label: id }));
  // The chosen model always shows, even if it's not in the list
  if (!options.some((o) => o.id === model)) options.unshift({ id: model, label: model });

  const canSave = Boolean(settings) && model.trim().length > 0 && (configured || apiKey.trim().length > 0) && !busy;

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSave) return;
    if (await save(model, apiKey.trim() || undefined)) {
      setApiKey('');
      setModelDraft(null);
    }
  };

  return (
    <section className='Ai_Card'>
      <div className='Ai_Card_Head'>
        <div>
          <h2 className='Ai_Card_Title'>{title ?? t('settings.title')}</h2>
          <p className='Ai_Card_Description'>{t('settings.description')}</p>
        </div>
        <span className={`Ai_Card_Status${configured ? ' on' : ''}`}>
          {configured ? t('settings.connected') : t('settings.notConfigured')}
        </span>
      </div>

      <form className='Ai_Card_Form' onSubmit={(e) => void onSubmit(e)}>
        <label className='Ai_Card_Field'>
          <span>{t('settings.provider')}</span>
          <select value='ANTHROPIC' disabled>
            <option value='ANTHROPIC'>Claude (Anthropic)</option>
          </select>
        </label>

        <label className='Ai_Card_Field'>
          <span>{t('settings.apiKey')}</span>
          <input
            type='password'
            autoComplete='new-password'
            spellCheck={false}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={configured && settings?.keyHint ? t('settings.keyKept', { hint: settings.keyHint }) : 'sk-ant-…'}
          />
        </label>

        <div className='Ai_Card_Field wide'>
          <span>{t('settings.model')}</span>
          <div className='Ai_Card_Model'>
            <select value={model} onChange={(e) => setModelDraft(e.target.value)} aria-label={t('settings.model')}>
              {options.map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
            <button
              type='button'
              className='Ai_Card_Button'
              disabled={Boolean(busy) || (!configured && apiKey.trim().length < 20)}
              onClick={() => void loadModels(apiKey.trim() || undefined)}
            >
              {busy === 'models' ? t('settings.loadingModels') : t('settings.loadModels')}
            </button>
          </div>
          <p className='Ai_Card_Hint'>{models ? t('settings.modelsLoaded', { count: models.length }) : t('settings.modelHint')}</p>
        </div>

        <div className='Ai_Card_Actions'>
          <button type='submit' className='Ai_Card_Save' disabled={!canSave}>
            {busy === 'save' ? t('settings.saving') : t('settings.save')}
          </button>

          {/* Always in place: invisible with no saved key */}
          <span className={`Ai_Card_Remove${configured ? '' : ' hidden'}`} aria-hidden={!configured}>
            {confirmRemove ? (
              <>
                <button type='button' className='Ai_Card_Danger' disabled={Boolean(busy)} onClick={() => { setConfirmRemove(false); void remove(); }}>
                  {t('settings.confirmRemove')}
                </button>
                <button type='button' className='Ai_Card_Link' onClick={() => setConfirmRemove(false)}>{t('settings.cancel')}</button>
              </>
            ) : (
              <button type='button' className='Ai_Card_Link danger' disabled={Boolean(busy) || !configured} tabIndex={configured ? 0 : -1} onClick={() => setConfirmRemove(true)}>
                {t('settings.remove')}
              </button>
            )}
          </span>
        </div>
      </form>

      <p className='Ai_Card_Help'>
        {t('settings.help')} <Link to='/Vault/Help#claude'>{t('settings.helpLink')}</Link>
        {settings?.updatedAt && (
          <span className='Ai_Card_Updated'>
            {t('settings.updatedAt', { date: new Date(settings.updatedAt).toLocaleDateString(dateLocale()) })}
          </span>
        )}
      </p>
    </section>
  );
};

export default Ai_Card;
