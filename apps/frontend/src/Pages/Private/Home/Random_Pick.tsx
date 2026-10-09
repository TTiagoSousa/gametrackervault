import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDiscover } from '../../../Hooks/Games/useDiscover';
import type { LibraryEntry } from '../../../Hooks/Games/detailTypes';
import * as Icon from '../../../Imports/icons';

// Um elemento ao calhas (fora do componente: o sorteio é de quem carrega no botão)
const pickOne = <T,>(list: T[]): T => list[Math.floor(Math.random() * list.length)];

interface Picked {
  id: number;
  name: string;
  coverUrl: string | null;
  // De onde veio: da lista do utilizador ou do catálogo do IGDB
  source: 'list' | 'discover';
  detail: string | null;
}

/**
 * "Não sabes o que jogar?": tira um jogo ao calhas da lista (para jogar e em
 * pausa) ou descobre um novo no IGDB (bem avaliado e fora da estante). O
 * resultado aparece num espaço de altura fixa.
 */
const Random_Pick = ({ entries }: { entries: LibraryEntry[] }) => {
  const { t } = useTranslation('home');
  const { t: tl } = useTranslation('library');
  const { discover, loading, error } = useDiscover();
  const [picked, setPicked] = useState<Picked | null>(null);
  const [emptyList, setEmptyList] = useState(false);

  const candidates = entries.filter((e) => e.status === 'PLAN_TO_PLAY' || e.status === 'PAUSED');

  const fromList = () => {
    setEmptyList(candidates.length === 0);
    if (!candidates.length) {
      setPicked(null);
      return;
    }
    // Evita repetir o mesmo jogo duas vezes seguidas, se houver por onde escolher
    const pool = candidates.length > 1 && picked ? candidates.filter((e) => e.gameId !== picked.id) : candidates;
    const entry = pickOne(pool);
    setPicked({
      id: entry.gameId,
      name: entry.game.name,
      coverUrl: entry.game.coverUrl,
      source: 'list',
      detail: tl(`status.${entry.status}`),
    });
  };

  const fromCatalog = async () => {
    setEmptyList(false);
    const game = await discover();
    if (game) {
      setPicked({
        id: game.id,
        name: game.name,
        coverUrl: game.coverUrl,
        source: 'discover',
        detail: [game.year, game.genres.slice(0, 2).join(', '), game.rating !== null ? t('random.rating', { rating: game.rating }) : null]
          .filter(Boolean)
          .join(' — '),
      });
    }
  };

  return (
    <section className='Random_Pick'>
      <div className='Random_Pick_Text'>
        <h2>{t('random.title')}</h2>
        <p>{t('random.description')}</p>
        <div className='Random_Pick_Actions'>
          <button type='button' className='Random_Pick_Button' onClick={fromList}>
            <Icon.Dice />
            {t('random.fromList', { count: candidates.length })}
          </button>
          <button type='button' className='Random_Pick_Button ghost' onClick={() => void fromCatalog()} disabled={loading}>
            <Icon.Sparkle />
            {loading ? t('random.searching') : t('random.discover')}
          </button>
        </div>
      </div>

      {/* O resultado: sempre o mesmo espaço, com ou sem jogo */}
      <div className='Random_Pick_Result' aria-live='polite'>
        {picked ? (
          <Link to={`/Vault/Game/${picked.id}`} className='Random_Pick_Game'>
            <span className='Random_Pick_Cover'>
              {picked.coverUrl ? <img src={picked.coverUrl} alt='' /> : <span>{picked.name}</span>}
            </span>
            <span className='Random_Pick_Info'>
              <span className='Random_Pick_Source'>{t(`random.source.${picked.source}`)}</span>
              <span className='Random_Pick_Name'>{picked.name}</span>
              {picked.detail && <span className='Random_Pick_Detail'>{picked.detail}</span>}
              <span className='Random_Pick_Open'>{t('random.open')}</span>
            </span>
          </Link>
        ) : (
          <p className='Random_Pick_Placeholder'>
            {error ?? (emptyList ? t('random.emptyList') : t('random.placeholder'))}
          </p>
        )}
      </div>
    </section>
  );
};

export default Random_Pick;
