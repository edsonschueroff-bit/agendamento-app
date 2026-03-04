import { getToken, onMessage, type Messaging } from 'firebase/messaging';
import { messaging as getMessagingInstance } from './firebase';

const VAPID_KEY = "BAqASsIdkJC9scfzCcCKCmFrefgCRw-bSwXVsXbZjL4Ga94YkB2tz-HQ_QC9lXal2ByDs96dDX3QF1zrN3EhK-M";

export const requestNotificationPermission = async () => {
    if (typeof window === 'undefined') return null;

    try {
        // 1. Verificar suporte básico e modo standalone no iOS
        const isStandalone = (window.navigator as any).standalone || window.matchMedia('(display-mode: standalone)').matches;
        const hasNotification = 'Notification' in window;

        if (!hasNotification) {
            throw new Error('Seu navegador não suporta notificações. No iPhone, use o Safari e "Adicionar à Tela de Início".');
        }

        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            const getMessaging = getMessagingInstance as (() => Promise<Messaging | null>);
            const messaging = getMessaging ? await getMessaging() : null;

            if (!messaging) {
                if (/iPhone|iPad|iPod/.test(navigator.userAgent) && !isStandalone) {
                    throw new Error('No iPhone, você PRECISA abrir o app pelo ícone da "Tela de Início" para ativar as notificações.');
                }
                throw new Error('Serviço de mensagens não disponível. Verifique o suporte do navegador.');
            }

            // 2. Garantir que o Service Worker está pronto
            console.log('Aguardando Service Worker ficar pronto...');
            await navigator.serviceWorker.register('/sw.js');
            const registration = await navigator.serviceWorker.ready;

            if (!registration) {
                throw new Error('Falha ao registrar o sistema de notificações (Service Worker).');
            }

            // 3. Obter o Token
            const token = await getToken(messaging, {
                vapidKey: VAPID_KEY,
                serviceWorkerRegistration: registration
            });

            if (!token) {
                throw new Error('Não foi possível gerar a chave de acesso (Token).');
            }

            console.log('Token de notificação capturado:', token);
            return token;
        } else {
            throw new Error('Permissão negada. Ative as notificações nas configurações do seu navegador.');
        }
    } catch (error) {
        console.error('Erro detalhado:', error);
        throw error; // Re-lançamos para capturar no componente UI
    }
};

export const onMessageListener = async () => {
    const getMessaging = getMessagingInstance as (() => Promise<Messaging | null>);
    const messaging = getMessaging ? await getMessaging() : null;
    if (!messaging) return;

    return new Promise((resolve) => {
        onMessage(messaging, (payload) => {
            console.log('Mensagem frontal recebida:', payload);
            resolve(payload);
        });
    });
};
