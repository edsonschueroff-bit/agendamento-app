'use client';

import { useEffect, useState } from 'react';
import { requestNotificationPermission, onMessageListener } from '@/lib/notificationService';

export default function NotificationManager() {
  const [showBanner, setShowBanner] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return;
    }

    setStatus(Notification.permission);
    setShowBanner(Notification.permission === 'default');

    onMessageListener().catch((error) => {
      console.error('Falha ao iniciar listener de notificacoes:', error);
    });
  }, []);

  const handleRequestPermission = async () => {
    try {
      const token = await requestNotificationPermission();
      if (token) {
        setStatus('granted');
        setShowBanner(false);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao ativar notificacoes.';
      setStatus(message);
    }
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-blue-600 text-white p-6 shadow-2xl rounded-xl z-[99999]">
      <div className="mb-4">
        <p className="font-bold text-lg mb-1">Ativar notificacoes</p>
        <p className="text-sm opacity-90 mb-2">
          Receba lembretes e atualizacoes dos seus agendamentos.
        </p>
        {status && <p className="text-xs opacity-80">Status atual: {status}</p>}
      </div>
      <div className="flex space-x-3">
        <button
          onClick={() => setShowBanner(false)}
          className="flex-1 px-4 py-3 text-sm font-medium border border-white/30 hover:bg-blue-700 rounded-lg transition-colors"
        >
          Agora nao
        </button>
        <button
          onClick={handleRequestPermission}
          className="flex-1 px-4 py-3 text-sm font-bold bg-white text-blue-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          Ativar
        </button>
      </div>
    </div>
  );
}
