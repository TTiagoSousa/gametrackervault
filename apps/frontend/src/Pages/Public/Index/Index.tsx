import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import './Index.scss';
import { useSignin } from '../../../Hooks/Auth/useSignin';
import Theme_Toggle from '../../../Components/Toggles/Theme_Toggle/Theme_Toggle';
import Spine, { type GameStatus } from '../../../Components/Spine/Spine';
import * as Icons from '../../../Imports/icons';

// The login shelf: spines of made-up games, of different heights as
// on a real shelf. Decoration only — the titles aren't translated because
// they're proper names.
const SHELF: { title: string; tone: number; status: GameStatus; height: number }[] = [
  { title: 'Ecos de Vidro', tone: 4, status: 'beaten', height: .94 },
  { title: 'Neon Harbor', tone: 1, status: 'playing', height: .82 },
  { title: 'Lâmina Lunar', tone: 6, status: 'finished', height: 1 },
  { title: 'Pixel Drift', tone: 2, status: 'finished', height: .76 },
  { title: 'Coroa de Cinza', tone: 5, status: 'beaten', height: .9 },
  { title: 'Tidebound', tone: 3, status: 'playing', height: .84 },
  { title: 'Vale das Raposas', tone: 1, status: 'finished', height: .98 },
  { title: 'Last Signal', tone: 6, status: 'beaten', height: .8 },
  { title: 'Ferro & Sal', tone: 4, status: 'finished', height: .88 },
  { title: 'Nightjar', tone: 3, status: 'beaten', height: .78 },
  { title: 'Pedra Azul', tone: 5, status: 'playing', height: .92 },
  { title: 'Rally 98', tone: 2, status: 'finished', height: .74 },
];

const STATUSES: GameStatus[] = ['playing', 'finished', 'beaten'];

const Index = () => {
  const { t } = useTranslation('auth');
  const [showPassword, setShowPassword] = useState(false);

  const {
    signInEmail,
    setSignInEmail,
    signInpassword,
    setSignInpassword,
    signin,
    loading,
  } = useSignin();

  return (
    <div className='Login'>
      <aside className='Login_Stage'>
        <div className='Login_Brand'>
          <span className='Login_Logo'><Icons.Logo color='var(--accent)' /></span>
          <span className='Login_Brand_Name'>GameTracker Vault</span>
        </div>

        <div className='Login_Pitch'>
          <h1>{t('stage.headline')}</h1>
          <p>{t('stage.text')}</p>
        </div>

        <div className='Login_Shelf' aria-hidden='true'>
          <div className='Login_Shelf_Row'>
            {SHELF.map((game) => (
              <Spine key={game.title} title={game.title} tone={game.tone} status={game.status} height={game.height} />
            ))}
          </div>
          <div className='Login_Shelf_Board' />
        </div>

        <ul className='Login_Legend'>
          {STATUSES.map((status) => (
            <li key={status}>
              <span className={`Login_Legend_Dot ${status}`} />
              {t(`stage.status.${status}`)}
            </li>
          ))}
        </ul>
      </aside>

      <section className='Login_Panel'>
        <div className='Login_Topbar'>
          <Theme_Toggle />
        </div>

        <form className='Login_Form' onSubmit={(e) => { e.preventDefault(); void signin(); }}>
          <h2>{t('login.title')}</h2>
          <p className='Login_Description'>{t('login.description')}</p>

          <label className='Login_Field' htmlFor='username'>
            <span>{t('login.username')}</span>
            <input
              id='username'
              type='text'
              autoComplete='username'
              autoFocus
              value={signInEmail}
              onChange={(e) => setSignInEmail(e.target.value)}
            />
          </label>

          <label className='Login_Field' htmlFor='password'>
            <span>{t('login.password')}</span>
            <div className='Login_Password'>
              <input
                id='password'
                type={showPassword ? 'text' : 'password'}
                autoComplete='current-password'
                value={signInpassword}
                onChange={(e) => setSignInpassword(e.target.value)}
              />
              <button
                type='button'
                className='Login_Password_Toggle'
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
                title={showPassword ? t('login.hidePassword') : t('login.showPassword')}
              >
                <Icons.Eye off={showPassword} />
              </button>
            </div>
          </label>

          <button className='Login_Submit' type='submit' disabled={loading}>
            {loading ? t('login.submitting') : t('login.submit')}
          </button>

          <p className='Login_Note'>{t('login.note')}</p>
        </form>
      </section>
    </div>
  );
};

export default Index;
