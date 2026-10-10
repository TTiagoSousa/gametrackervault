import type { CSSProperties } from 'react';
import './Spine.scss';

export type GameStatus = 'playing' | 'finished' | 'beaten';

interface Spine_Props {
  /** Box color (1–6, --spine-N tokens). Ignored for an empty slot. */
  tone?: number;
  /** Title printed upright on the spine. */
  title?: string;
  /** Game status: colors the label at the top of the spine. */
  status?: GameStatus;
  /** Empty slot on the shelf — dashed, no color or title. */
  empty?: boolean;
  /** Relative height (0.7–1): real boxes aren't all the same size. */
  height?: number;
}

// Spine of a game box seen on the shelf. It's the app's visual motif: the
// login shelf, the Home shelves and, later, the library.
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
