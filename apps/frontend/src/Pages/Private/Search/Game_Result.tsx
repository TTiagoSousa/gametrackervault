import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { GameSummary } from '../../../Hooks/Games/types';

// Um resultado é a frente de uma caixa: a capa, com uma faixa de lombada à
// esquerda, e por baixo o nome, o ano e as plataformas. Abre a página do jogo.
const Game_Result = ({ game }: { game: GameSummary }) => {
  const { t } = useTranslation('search');

  return (
    <Link to={`/Vault/Game/${game.id}`} className='Game_Result'>
      <div className='Game_Result_Case'>
        {game.coverUrl ? (
          <img src={game.coverUrl} alt='' loading='lazy' />
        ) : (
          <span className='Game_Result_NoCover'>{t('noCover')}</span>
        )}
        {game.rating !== null && (
          <span className='Game_Result_Rating' title={t('rating', { value: game.rating })}>
            {game.rating}
          </span>
        )}
      </div>

      <h3 className='Game_Result_Name'>{game.name}</h3>
      <p className='Game_Result_Meta'>
        {game.year && <span>{game.year}</span>}
        {game.platforms.length > 0 && <span>{game.platforms.slice(0, 3).join(', ')}{game.platforms.length > 3 ? '…' : ''}</span>}
      </p>
    </Link>
  );
};

export default Game_Result;
