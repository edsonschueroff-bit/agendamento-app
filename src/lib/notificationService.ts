import { getToken, onMessage, Messaging } from 'firebase/messaging';
import { messaging as getMessagingInstance } from './firebase';

const VAPID_KEY = "SUA_VAPID_KEY_AQUI"; // Será substituída quando o usuário fornecer

export const requestNotificationPermission = async () => {
    if (typeof window === 'undefined') return null;

    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            const messaging = await (getMessagingInstance as any)();
            if (!messaging) return null;

            const token = await getToken(messaging, {
                vapidKey: VAPID_KEY
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
    const messaging = await (getMessagingInstance as any)();
    if (!messaging) return;

    return new Promise((resolve) => {
        onMessage(messaging, (payload) => {
            console.log('Mensagem frontal recebida:', payload);
            resolve(payload);
        });
    });
};
