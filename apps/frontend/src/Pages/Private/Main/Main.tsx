import Top_Nav from '../../../Containers/Navigation/Top_Nav/Top_Nav';
import Bottom_Nav from '../../../Containers/Navigation/Bottom_Nav/Bottom_Nav';
import Private_Routes from '../../../Routes/Private_Routes';
import Error_Boundary from '../../../Components/Error_Boundary/Error_Boundary';
import { useLocation } from 'react-router-dom';
import './Main.scss';

// The authenticated app's frame: top bar, the page below (centered) and,
// on mobile, the navigation bar fixed at the bottom.
const Main = () => {
  const { pathname } = useLocation();

  return (
    <div className="Vault">
      <Top_Nav />

      <div className="Vault_Content">
        {/* An error in a page stays in it: the bar keeps working and changing page clears it. */}
        <Error_Boundary key={pathname}>
          <Private_Routes />
        </Error_Boundary>
      </div>

      <Bottom_Nav />
    </div>
  );
};

export default Main;
