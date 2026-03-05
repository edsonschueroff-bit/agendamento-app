'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ConfirmacaoReagendamento() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const data = searchParams.get('data');

  useEffect(() => {
    // Redireciona para home após 5 segundos
    const timer = setTimeout(() => {
      router.push('/');
    }, 5000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        <div className="text-green-600 text-5xl mb-4">✅</div>
        <h1 className="text-3xl font-bold text-slate-900 mb-4">Reagendamento Confirmado!</h1>
        
        {data && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-slate-600 mb-1">Novo horário:</p>
            <p className="text-xl font-bold text-blue-600">{data}</p>
          </div>
        )}

        <p className="text-slate-600 mb-6">
          Seu agendamento foi reagendado com sucesso. Você receberá uma confirmação por email.
        </p>

        <button
          onClick={() => router.push('/')}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition w-full"
        >
          Voltar ao Início
        </button>

        <p className="text-xs text-slate-500 mt-4">
          Redirecionando automaticamente em 5 segundos...
        </p>
      </div>
    </div>
  );
}
