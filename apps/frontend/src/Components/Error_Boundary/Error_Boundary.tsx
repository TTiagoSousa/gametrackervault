import { Component, type ErrorInfo, type ReactNode } from 'react';
import i18n from '../../i18n';
import './Error_Boundary.scss';

interface Error_Boundary_Props {
  children: ReactNode;
}

interface Error_Boundary_State {
  error: Error | null;
}

/**
 * Without this, an error while rendering a page unmounted the whole app and the screen went
 * black. This way only the page shows the
 * error, the menu keeps working, and the caller uses `key` to clear the error when
 * changing page.
 */
class Error_Boundary extends Component<Error_Boundary_Props, Error_Boundary_State> {
  state: Error_Boundary_State = { error: null };

  static getDerivedStateFromError(error: Error): Error_Boundary_State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[GameTracker Vault] Erro ao desenhar a página', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className='Error_Boundary' role='alert'>
        <span className='Error_Boundary_title'>{i18n.t('common:errors.pageTitle')}</span>
        <span className='Error_Boundary_text'>{i18n.t('common:errors.pageText')}</span>
        <code>{error.message}</code>
        <button type='button' onClick={() => this.setState({ error: null })}>
          {i18n.t('common:errors.retry')}
        </button>
      </div>
    );
  }
}

export default Error_Boundary;
