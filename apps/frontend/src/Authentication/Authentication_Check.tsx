import { useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import * as Intermediate_Pages from '../Imports/intermediaryPages';
import { useAuth } from '../Contexts/Auth_Context';

interface AuthenticationCheckProps {
  children: ReactNode;
}

const AuthenticationCheck = ({ children }: AuthenticationCheckProps) => {
  const { authenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !authenticated) {
      navigate('/');
    }
  }, [isLoading, authenticated, navigate]);

  if (isLoading) {
    return <Intermediate_Pages.Loading_Page />;
  }

  return authenticated ? <>{children}</> : null;
};

export default AuthenticationCheck;