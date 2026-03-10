'use client';

export const dynamic = 'force-dynamic';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/components/providers/AuthProvider';

export default function Home() {
  const { loading, isAuthenticated, userType } = useAuthContext();
  const router = useRouter();
  const redirectTarget = !isAuthenticated
    ? '/login'
    : userType === 'profissional'
      ? '/profissional/dashboard'
      : '/dashboard';

  useEffect(() => {
    if (!loading && (!isAuthenticated || userType)) {
      router.replace(redirectTarget);
    }
  }, [loading, redirectTarget, router, isAuthenticated, userType]);

  if (loading || (isAuthenticated && !userType)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="text-center">
        <p className="text-gray-700 mb-3">Redirecionando...</p>
        <Link className="text-blue-600 hover:text-blue-700 font-medium" href={redirectTarget}>
          Clique aqui se nao redirecionar automaticamente
        </Link>
      </div>
    </div>
  );
}
