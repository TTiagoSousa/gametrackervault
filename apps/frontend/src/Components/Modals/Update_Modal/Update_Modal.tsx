import './Update_Modal.scss';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSystemUpdate } from '../../../Hooks/System/useSystemUpdate';

// Os passos do deploy/proxmox/update.sh, pela ordem em que acontecem.
const STEPS = ['fetch', 'build', 'migrate', 'publish', 'configure', 'restart'] as const;

interface Update_Modal_Props {
  /** Versão para onde atualizar. */
  version: string;
  /** Versão de onde se parte, só para o texto. */
  from: string;
  /** true quando a atualização já estava a correr (só acompanha, não pede outra). */
  resume?: boolean;
  onClose: () => void;
}

/**
 * Pede a atualização e mostra o progresso. Não fecha a meio: o backend vai
 * reiniciar e a página só deve recarregar quando ele voltar já na versão nova.
 */
const Update_Modal = ({ version, from, resume = false, onClose }: Update_Modal_Props) => {
  const { t } = useTranslation('system');
  const { status, restarting, done, error, start, follow } = useSystemUpdate();
  const [showLog, setShowLog] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (resume) follow(version);
    else void start(version);
  }, [resume, version, follow, start]);

  // Atualização concluída: recarrega com o frontend novo.
  useEffect(() => {
    if (!done) return;
    const t = window.setTimeout(() => window.location.reload(), 2500);
    return () => window.clearTimeout(t);
  }, [done]);

  const failed = Boolean(error) || status?.state === 'failed';
  const running = !done && !failed;
  const currentStep = status?.step === 'rollback' ? 'restart' : status?.step;
  const currentIndex = STEPS.findIndex((key) => key === currentStep);

  const stepState = (index: number) => {
    if (done) return 'ok';
    if (status?.state === 'queued' || currentIndex < 0) return 'waiting';
    if (index < currentIndex) return 'ok';
    if (index === currentIndex) return failed ? 'bad' : 'live';
    return 'waiting';
  };

  let headline = t('update.headline.running', { from, to: version });
  if (status?.state === 'queued') headline = t('update.headline.queued');
  if (restarting && !done) headline = t('update.headline.restarting');
  if (done) headline = t('update.headline.done', { to: version });
  if (failed) headline = t('update.headline.failed');

  return (
    <div className='Update_Modal_Overlay'>
      <div className='Update_Modal'>
        <span className='Update_Modal_Title'>{t('update.title')}</span>
        <p className={`Update_Modal_headline${failed ? ' bad' : done ? ' ok' : ''}`}>{headline}</p>

        <ol className='Update_Modal_steps'>
          {STEPS.map((step, index) => (
            <li key={step} className={stepState(index)}>
              <i />
              <span>{t(`update.steps.${step}`)}</span>
            </li>
          ))}
        </ol>

        {failed && (
          <p className='Update_Modal_error'>
            {error || status?.message || t('update.unknownError')}
            {status?.state === 'failed' && ` ${t('update.previousStillRunning')}`}
          </p>
        )}

        {status && status.log.length > 0 && (
          <div className='Update_Modal_log'>
            <button type='button' onClick={() => setShowLog((v) => !v)}>
              {showLog ? t('update.hideLog') : t('update.showLog')}
            </button>
            {showLog && <pre>{status.log.join('\n')}</pre>}
          </div>
        )}

        <div className='Update_Modal_Actions'>
          {done ? (
            <button className='Save_Button' onClick={() => window.location.reload()}>
              {t('update.reloadNow')}
            </button>
          ) : (
            <button className='Cancel_Button' onClick={onClose} disabled={running}>
              {running ? t('update.updating') : t('common:actions.close')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Update_Modal;
