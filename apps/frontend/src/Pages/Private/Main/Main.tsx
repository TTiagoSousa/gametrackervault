import Top_Nav from '../../../Containers/Navigation/Top_Nav/Top_Nav';
import Private_Routes from '../../../Routes/Private_Routes';
import Error_Boundary from '../../../Components/Error_Boundary/Error_Boundary';
import { useLocation } from 'react-router-dom';
import './Main.scss';

// A moldura da app autenticada: barra de topo e a página por baixo, centrada.
const Main = () => {
  const { pathname } = useLocation();

  return (
    <div className="Vault">
      <Top_Nav />

      <div className="Vault_Content">
        {/* Um erro numa página fica nela: a barra continua e mudar de página limpa-o. */}
        <Error_Boundary key={pathname}>
          <Private_Routes />
        </Error_Boundary>
      </div>
    </div>
  );
};

export default Main;
