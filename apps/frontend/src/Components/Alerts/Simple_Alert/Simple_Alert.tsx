import React, { useEffect, useRef, useState } from 'react';
import './Simple_Alert.scss';
import { useAlert } from '../../../Contexts/Alert_Context';
import { useTranslation } from 'react-i18next';

type AlertType = 'success' | 'error' | 'warning' | 'info';

const ICONS: Record<AlertType, string> = {
  success: '✓',
  error:   '✕',
  warning: '⚠',
  info:    'ℹ',
};

// Chaves de tradução (namespace 'ui')
const LABELS: Record<AlertType, string> = {
  success: 'alert.labels.success',
  error:   'alert.labels.error',
  warning: 'alert.labels.warning',
  info:    'alert.labels.info',
};

const DURATION = 3000;

const Simple_Alert: React.FC = () => {
  const { t } = useTranslation('ui');
  const { alert, setAlert } = useAlert();
  const [visible, setVisible]   = useState(false);
  const [exiting, setExiting]   = useState(false);
  const [snapshot, setSnapshot] = useState<{ message: string; type: AlertType } | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  const dismiss = () => {
    clearTimers();
    setExiting(true);
    timers.current.push(setTimeout(() => setVisible(false), 300));
  };

  useEffect(() => {
    if (!alert.open || !alert.type) return;

    clearTimers();
    setSnapshot({ message: alert.message, type: alert.type });
    setExiting(false);
    setVisible(true);
    setAlert(prev => ({ ...prev, open: false }));

    timers.current.push(setTimeout(() => setExiting(true), DURATION - 300));
    timers.current.push(setTimeout(() => setVisible(false), DURATION));
  }, [alert.open, alert.message, alert.type, setAlert]);

  useEffect(() => () => clearTimers(), []);

  if (!visible || !snapshot) return null;

  return (
    <div className={`Simple_Alert Simple_Alert--${snapshot.type}${exiting ? ' Simple_Alert--exit' : ''}`}>
      <span className="Simple_Alert__icon">{ICONS[snapshot.type]}</span>
      <div className="Simple_Alert__body">
        <span className="Simple_Alert__label">{t(LABELS[snapshot.type])}</span>
        <span className="Simple_Alert__message">{snapshot.message}</span>
      </div>
      <button className="Simple_Alert__close" onClick={dismiss}>✕</button>
      <span className="Simple_Alert__progress" />
    </div>
  );
};

export default Simple_Alert;
