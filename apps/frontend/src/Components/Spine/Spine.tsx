import type { CSSProperties } from 'react';
import './Spine.scss';

export type GameStatus = 'playing' | 'finished' | 'beaten';

interface Spine_Props {
  /** Cor da caixa (1–6, tokens --spine-N). Ignorada quando é um lugar vazio. */
  tone?: number;
  /** Título impresso ao alto na lombada. */
  title?: string;
  /** Estado do jogo: pinta a etiqueta no topo da lombada. */
  status?: GameStatus;
  /** Lugar vazio na prateleira — tracejado, sem cor nem título. */
  empty?: boolean;
  /** Altura relativa (0.7–1): as caixas reais não têm todas o mesmo tamanho. */
  height?: number;
}

// Lombada de uma caixa de jogo vista na estante. É o motivo visual da app: a
// estante do login, as prateleiras do Início e, mais tarde, a biblioteca.
const Spine = ({ tone = 1, title, status, empty = false, height = 1 }: Spine_Props) => {
  const style = {
    '--spine-color': `var(--spine-${tone})`,
    '--spine-height': `${Math.round(height * 100)}%`,
  } as CSSProperties;

  if (empty) {
    return <span className='Spine empty' style={style} aria-hidden='true' />;
  }

  return (
    <span className={`Spine${tone === 2 ? ' light-ink' : ''}`} style={style}>
      {status && <span className={`Spine_Status ${status}`} />}
      {title && <span className='Spine_Title'>{title}</span>}
    </span>
  );
};

export default Spine;
