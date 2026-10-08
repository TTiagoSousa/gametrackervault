import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../Contexts/Auth_Context';
import Spine, { type GameStatus } from '../../../Components/Spine/Spine';
import './Home.scss';

const STATUSES: GameStatus[] = ['playing', 'finished', 'beaten'];

// Alturas dos lugares vazios: variadas, como as caixas de uma estante real
const SLOT_HEIGHTS = [0.92, 0.8, 1, 0.86, 0.76, 0.96, 0.84, 0.9, 0.78, 0.98];

// Início: uma prateleira por estado. Ainda sem jogos — cada prateleira mostra a
// contagem a zero e os lugares vazios onde as lombadas vão entrar.
const Home = () => {
  const { t } = useTranslation('home');
  const { username } = useAuth();

  return (
    <div className='Home'>
      <header className='Home_Hero'>
        <h1>{username ? t('greeting', { name: username }) : t('title')}</h1>
        <p>{t('subtitle')}</p>
      </header>

      <div className='Home_Shelves'>
        {STATUSES.map((status) => (
          <section key={status} className={`Home_Shelf ${status}`}>
            <div className='Home_Shelf_Head'>
              <h2>
                <span className='Home_Shelf_Dot' />
                {t(`stats.${status}`)}
              </h2>
              <span className='Home_Shelf_Count'>{t('count', { count: 0 })}</span>
            </div>

            <div className='Home_Shelf_Row' aria-hidden='true'>
              {SLOT_HEIGHTS.map((height, index) => (
                <Spine key={index} empty height={height} />
              ))}
            </div>
            <div className='Home_Shelf_Board' />
          </section>
        ))}
      </div>

      <p className='Home_Note'>{t('empty.description')}</p>
    </div>
  );
};

export default Home;
