import { getToken, onMessage, type Messaging } from 'firebase/messaging';
import { messaging as getMessagingInstance } from './firebase';

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

export const requestNotificationPermission = async () => {
  if (typeof window === 'undefined') return null;

  try {
    const isStandalone =
      ('standalone' in window.navigator &&
        (window.navigator as unknown as { standalone: boolean }).standalone) ||
      window.matchMedia('(display-mode: standalone)').matches;
    const hasNotification = 'Notification' in window;

    if (!hasNotification) {
      throw new Error('Seu navegador nao suporta notificacoes.');
    }

    if (!VAPID_KEY) {
      throw new Error('Chave VAPID nao configurada.');
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      throw new Error('Permissao negada. Ative as notificacoes no navegador.');
    }

    const getMessaging = getMessagingInstance as (() => Promise<Messaging | null>);
    const messaging = getMessaging ? await getMessaging() : null;

    if (!messaging) {
      if (/iPhone|iPad|iPod/.test(navigator.userAgent) && !isStandalone) {
        throw new Error('No iPhone, abra o app pela Tela de Inicio para ativar notificacoes.');
      }
      throw new Error('Servico de mensagens nao disponivel neste navegador.');
    }

    await navigator.serviceWorker.register('/sw.js');
    const registration = await navigator.serviceWorker.ready;

    if (!registration) {
      throw new Error('Falha ao registrar Service Worker para notificacoes.');
    }

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    if (!token) {
      throw new Error('Nao foi possivel gerar o token de notificacao.');
    }

    return token;
  } catch (error) {
    console.error('Erro ao ativar notificacoes:', error);
    throw error;
  }
};

export const onMessageListener = async () => {
  const getMessaging = getMessagingInstance as (() => Promise<Messaging | null>);
  const messaging = getMessaging ? await getMessaging() : null;
  if (!messaging) return;

  onMessage(messaging, () => undefined);
};
