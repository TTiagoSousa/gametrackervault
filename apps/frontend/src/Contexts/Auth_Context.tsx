// src/Contexts/Auth_Context.tsx

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { End_Points } from '../Service/endPoints';
import http from '../Service/httpService';

export type UserRole = 'USER' | 'ADMIN';

interface AuthContextType {
  authenticated: boolean;
  setAuthenticated: React.Dispatch<React.SetStateAction<boolean>>;
  isLoading: boolean;
  username: string | null;
  role: UserRole | null;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [authenticated, setAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [username, setUsername] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);

  const refreshUser = async () => {
    setIsLoading(true);

    try {

      // Só um 401 quer dizer "sem sessão". Uma falha de rede ou um servidor a
      // reiniciar (telemóvel a acordar, atualização) tenta mais duas vezes antes de
      // mostrar o login a quem tem a sessão válida.
      const fetchUser = async (attempt: number): Promise<{ data: { username?: string; role?: UserRole } }> => {
        try {
          return await http.get(End_Points.User_Endpoint(), { withCredentials: true });
        } catch (error) {
          const status = (error as { response?: { status?: number } }).response?.status;
          if (status === 401 || attempt >= 2) throw error;
          await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)));
          return fetchUser(attempt + 1);
        }
      };
      const response = await fetchUser(0);

      const user = response.data;

      if (user) {
        setAuthenticated(true);
        setUsername(user.username ?? null);
        setRole(user.role ?? null);
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        // console.log('ℹ️ [AuthProvider] Utilizador não autenticado (401 Unauthorized).');
      } else {
        // console.error('❌ [AuthProvider] Erro na verificação de autenticação:', error);
      }

      setAuthenticated(false);
      setUsername(null);
      setRole(null);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await http.post(End_Points.Logout_Endpoint(), {}, { withCredentials: true });
    } finally {
      setAuthenticated(false);
      setUsername(null);
      setRole(null);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        authenticated,
        setAuthenticated,
        isLoading,
        username,
        role,
        refreshUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}