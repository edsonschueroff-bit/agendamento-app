import { getToken, onMessage, type Messaging } from 'firebase/messaging';
import { messaging as getMessagingInstance } from './firebase';

const VAPID_KEY = "BAqASsIdkJC9scfzCcCKCmFrefgCRw-bSwXVsXbZjL4Ga94YkB2tz-HQ_QC9lXal2ByDs96dDX3QF1zrN3EhK-M";

export const requestNotificationPermission = async () => {
    if (typeof window === 'undefined') return null;

    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            const getMessaging = getMessagingInstance as (() => Promise<Messaging | null>);
            const messaging = getMessaging ? await getMessaging() : null;
            if (!messaging) return null;

            // Garantir que o Service Worker está registrado e pronto
            const registration = await navigator.serviceWorker.register('/sw.js');
            console.log('Service Worker registrado:', registration);

            const token = await getToken(messaging, {
                vapidKey: VAPID_KEY,
                serviceWorkerRegistration: registration
            });

            console.log('Token de notificação capturado:', token);
            // Aqui salvaremos o token no Firestore futuramente
            return token;
        }
    } catch (error) {
        console.error('Erro ao solicitar permissão de notificação:', error);
    }
    return null;
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
