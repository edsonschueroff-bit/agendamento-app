'use client';

import { useEffect, useState } from 'react';
import { requestNotificationPermission, onMessageListener } from '@/lib/notificationService';

export default function NotificationManager() {
    const [showBanner, setShowBanner] = useState(true); // FORÇADO TRUE PARA DEBUG
    const [status, setStatus] = useState('Verificando...');

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const hasNotification = 'Notification' in window;
            const permission = hasNotification ? Notification.permission : 'não suportado';
            console.log('DEBUG NOTIFICAÇÃO:', { hasNotification, permission });
            setStatus(`Suporte: ${hasNotification ? 'Sim' : 'Não'} | Permissão: ${permission}`);

            // Ouvinte para mensagens em primeiro plano
            onMessageListener().then((payload) => {
                if (payload) {
                    console.log('Notificação recebida em primeiro plano:', payload);
                    alert('Notificação Recebida: ' + JSON.stringify(payload));
                }
            });
        }
    }, []);

    const handleRequestPermission = async () => {
        console.log('Solicitando permissão...');
        try {
            const token = await requestNotificationPermission();
            console.log('Token obtido:', token);
            if (token) {
                alert('🚀 Sucesso! Notificações ativadas com sucesso neste dispositivo.');
                setShowBanner(false);
            }
        } catch (err: unknown) {
            console.error('Erro ao solicitar:', err);
            const message = err instanceof Error ? err.message : 'Erro desconhecido ao ativar notificações.';
            alert('⚠️ ' + message);
        }
    };

    if (!showBanner) return null;

    return (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-blue-600 text-white p-6 shadow-2xl rounded-xl z-[99999] border-4 border-yellow-400 transform transition-all hover:scale-105 animate-bounce">
            <div className="flex items-start mb-4">
                <span className="text-3xl mr-4">🔔</span>
                <div>
                    <p className="font-bold text-lg mb-1">MODO DEBUG: Ativar Notificações</p>
                    <p className="text-sm opacity-90 mb-2">{status}</p>
                    <p className="text-sm">Clique no botão abaixo para testar a ativação agora.</p>
                </div>
            </div>
            <div className="flex space-x-3">
                <button
                    onClick={() => setShowBanner(false)}
                    className="flex-1 px-4 py-3 text-sm font-medium border border-white/30 hover:bg-blue-700 rounded-lg transition-colors"
                >
                    Fechar
                </button>
                <button
                    onClick={handleRequestPermission}
                    className="flex-1 px-4 py-3 text-sm font-bold bg-white text-blue-600 hover:bg-gray-100 rounded-lg shadow-lg transition-all active:scale-95"
                >
                    ATIVAR AGORA
                </button>
            </div>
        </div>
    );
}
