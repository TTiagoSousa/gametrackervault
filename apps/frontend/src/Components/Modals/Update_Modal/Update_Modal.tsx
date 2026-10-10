import './Update_Modal.scss';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSystemUpdate } from '../../../Hooks/System/useSystemUpdate';

// The steps of deploy/proxmox/update.sh, in the order they happen.
const STEPS = ['fetch', 'build', 'migrate', 'publish', 'configure', 'restart'] as const;

interface Update_Modal_Props {
  /** Version to update to. */
  version: string;
  /** Version being updated from, only for the text. */
  from: string;
  /** true when the update was already running (only follows it, doesn't request another). */
  resume?: boolean;
  onClose: () => void;
}

/**
 * Requests the update and shows progress. Doesn't close midway: the backend will
 * restart and the page should only reload once it's back on the new version.
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

  // Update finished: reload with the new frontend.
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
