'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { AuthUser, logoutUser } from '@/lib/authService';

interface AuthContextType {
  user: AuthUser | null;
  userType: 'dono' | 'profissional' | null;
  loading: boolean;
  isAuthenticated: boolean;
  isDono: boolean;
  isProfessional: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const auth = useAuth();

  // Função de logout que chama o serviço e faz reload da página
  const logout = async () => {
    await logoutUser();
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider
      value={{
        ...auth,
        isDono: auth.userType === 'dono',
        isProfessional: auth.userType === 'profissional',
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};