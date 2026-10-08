import { useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import * as Intermediate_Pages from '../Imports/intermediaryPages';
import { useAuth } from '../Contexts/Auth_Context';

interface AdminCheckProps {
  children: ReactNode;
}

const Admin_Check = ({ children }: AdminCheckProps) => {
  const { role, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && role !== 'ADMIN') {
      navigate('/Vault');
    }
  }, [isLoading, role, navigate]);

  if (isLoading) {
    return <Intermediate_Pages.Loading_Page />;
  }

  return role === 'ADMIN' ? <>{children}</> : null;
};

export default Admin_Check;
