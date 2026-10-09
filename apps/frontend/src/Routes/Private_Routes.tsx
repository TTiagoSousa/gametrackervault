import { Route, Routes } from 'react-router-dom';
import * as Private_Page from '../Imports/privatePages';
import Admin_Check from '../Authentication/Admin_Check';

const Private_Routes = () => {
  return (
    <Routes>
      <Route index element={ <Private_Page.Home /> } />
      <Route path='Vault' element={ <Private_Page.Home /> } />
      <Route path='Vault/Search' element={ <Private_Page.Search /> } />
      <Route path='Vault/Game/:id' element={ <Private_Page.Game /> } />
      <Route path='Vault/Stats' element={ <Private_Page.Stats /> } />
      <Route path='Vault/Assistant' element={ <Private_Page.Assistant /> } />
      <Route path='Vault/Help' element={ <Private_Page.Help /> } />
      <Route path='Vault/Settings' element={ <Private_Page.Settings /> } />
      <Route path='Vault/Admin' element={ <Admin_Check><Private_Page.Admin /></Admin_Check> } />
      <Route path='Vault/Admin/Versions' element={ <Admin_Check><Private_Page.Versions /></Admin_Check> } />
    </Routes>
  );
};

export default Private_Routes;
