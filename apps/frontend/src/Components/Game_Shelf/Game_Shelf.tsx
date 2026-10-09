import { Link } from 'react-router-dom';
import type { GameRef } from '../../Hooks/Games/detailTypes';
import './Game_Shelf.scss';

interface Game_Shelf_Props {
  title: string;
  games: GameRef[];
}

/**
 * Uma prateleira de caixas: o título e as capas lado a lado, a rolar na
 * horizontal. Cada capa abre a página desse jogo. Não desenha nada sem jogos.
 */
const Game_Shelf = ({ title, games }: Game_Shelf_Props) => {
  if (!games.length) return null;

  return (
    <section className='Game_Shelf'>
      <h2 className='Game_Shelf_Title'>
        {title}
        <span className='Game_Shelf_Count'>{games.length}</span>
      </h2>
      <div className='Game_Shelf_Row'>
        {games.map((game) => (
          <Link key={game.id} to={`/Vault/Game/${game.id}`} className='Game_Shelf_Item'>
            <span className='Game_Shelf_Case'>
              {game.coverUrl ? <img src={game.coverUrl} alt='' loading='lazy' /> : <span className='Game_Shelf_NoCover'>{game.name}</span>}
            </span>
            <span className='Game_Shelf_Name'>{game.name}</span>
            {game.year && <span className='Game_Shelf_Year'>{game.year}</span>}
          </Link>
        ))}
      </div>
    </section>
  );
};

export default Game_Shelf;
