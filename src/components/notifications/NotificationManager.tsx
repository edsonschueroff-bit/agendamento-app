'use client';

import { useEffect, useState } from 'react';
import { requestNotificationPermission, onMessageListener } from '@/lib/notificationService';

export default function NotificationManager() {
    const [showBanner, setShowBanner] = useState(false);

    useEffect(() => {
        // Verificar se já temos permissão
        console.log('Verificando suporte a notificações...');
        if (typeof window !== 'undefined' && 'Notification' in window) {
            console.log('Permissão atual:', Notification.permission);
            if (Notification.permission === 'default') {
                console.log('Exibindo banner de notificações');
                setShowBanner(true);
            }
        } else {
            console.log('Navegador não suporta notificações');
        }

        // Ouvinte para mensagens em primeiro plano
        onMessageListener().then((payload: any) => {
            console.log('Notificação recebida em primeiro plano:', payload);
            // Aqui você poderia mostrar um toast personalizado
        });
    }, []);

    const handleRequestPermission = async () => {
        const token = await requestNotificationPermission();
        if (token) {
            setShowBanner(false);
            // No futuro, salvaremos este token no Firestore vinculado ao usuário
        }
    };

    if (!showBanner) return null;

    return (
        <div className="bg-blue-600 text-white p-4 flex justify-between items-center shadow-lg rounded-lg mb-6">
            <div className="flex items-center">
                <span className="text-2xl mr-3">🔔</span>
                <div>
                    <p className="font-bold">Ativar Notificações?</p>
                    <p className="text-sm">Receba alertas instantâneos de novos agendamentos no seu celular.</p>
                </div>
            </div>
            <div className="flex space-x-2">
                <button
                    onClick={() => setShowBanner(false)}
                    className="px-4 py-2 text-sm font-medium hover:bg-blue-700 rounded transition-colors"
                >
                    Agora não
                </button>
                <button
                    onClick={handleRequestPermission}
                    className="px-4 py-2 text-sm font-bold bg-white text-blue-600 hover:bg-gray-100 rounded shadow transition-colors"
                >
                    Ativar Agora
                </button>
            </div>
        </div>
    );
}
