import { Route, Routes } from 'react-router';
import './App.scss';
import * as Public_Page from './Imports/publicPages.ts';
import Authentication_Check from './Authentication/Authentication_Check.tsx';
import Guest_Check from './Authentication/Guest_Check.tsx';
import * as Private_Page from './Imports/privatePages.ts';
import Simple_Alert from './Components/Alerts/Simple_Alert/Simple_Alert.tsx';


function App() {
  return (
    <main>
      <Simple_Alert></Simple_Alert>
      <Routes>
        <Route
          index
          element={
            <Guest_Check>
              <Public_Page.Index />
            </Guest_Check>
          }
        />

        <Route
          path="/*"
          element={
            <Authentication_Check>
                <Private_Page.Main />
            </Authentication_Check>
          }
        />
      </Routes>
    </main>
  );
}

export default App;
