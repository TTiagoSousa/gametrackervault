import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import * as Intermediate_Pages from '../Imports/intermediaryPages';
import { useAuth } from '../Contexts/Auth_Context';

interface GuestCheckProps {
  children: ReactNode;
}

const Guest_Check = ({ children }: GuestCheckProps) => {
  const { authenticated, isLoading } = useAuth();

  if (isLoading) {
    return <Intermediate_Pages.Loading_Page />;
  }

  return authenticated ? <Navigate to="/Vault" replace /> : <>{children}</>;
};

export default Guest_Check;
