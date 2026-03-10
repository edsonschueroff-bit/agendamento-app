'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/components/providers/AuthProvider';

interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
  requiredUserType?: 'dono' | 'profissional';
}

export default function ProtectedRoute({
  children,
  redirectTo = '/login',
  requiredUserType,
}: ProtectedRouteProps) {
  const { loading, isAuthenticated, userType } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        router.push(redirectTo);
      } else if (requiredUserType && userType !== requiredUserType) {
        const fallbackUrl = userType === 'profissional' ? '/profissional/dashboard' : '/dashboard';
        router.push(fallbackUrl);
      }
    }
  }, [loading, isAuthenticated, userType, router, redirectTo, requiredUserType]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl">Carregando...</div>
      </div>
    );
  }

  if (!isAuthenticated || (requiredUserType && userType !== requiredUserType)) {
    return null;
  }

  return <>{children}</>;
}
