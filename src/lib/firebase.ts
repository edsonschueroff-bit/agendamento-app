import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getMessaging, isSupported } from 'firebase/messaging';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

// ConfiguraÃ§Ã£o do Firebase â€” requer variÃ¡veis de ambiente
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'demo-key',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'demo-project.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'demo-project',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'demo-project.appspot.com',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '000000000000',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:000000000000:web:abcdef1234567890',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const useEmulator = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true';
const functionsRegion = process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_REGION || 'us-central1';

// Validar variÃ¡veis obrigatÃ³rias apenas se NÃƒO estiver usando o emulador
if (!useEmulator) {
  const requiredVars = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_APP_ID',
  ] as const;

  const missingVars = requiredVars.filter((key) => !process.env[key]);

  if (missingVars.length > 0) {
    console.warn(
      `âš ï¸ Firebase: variÃ¡veis de ambiente obrigatÃ³rias nÃ£o configuradas: ${missingVars.join(', ')}.\n` +
      `Isso nÃ£o Ã© um problema se estiver rodando com Emuladores locais.`
    );
  }
}

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app, functionsRegion);

// Initialize Messaging (sÃ³ no lado do cliente e se suportado)
export const messaging = typeof window !== 'undefined'
  ? async () => {
    const supported = await isSupported();
    return supported ? getMessaging(app) : null;
  }
  : null;

// Conectar aos emuladores se a flag estiver ativada
if (useEmulator) {
  // Evitar reconexÃ£o acidental no hot-reload do Next.js
  const g = globalThis as typeof globalThis & { _firebaseEmulatorsConnected?: boolean };
  if (!g._firebaseEmulatorsConnected) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
    connectFunctionsEmulator(functions, '127.0.0.1', 5001);
    g._firebaseEmulatorsConnected = true;
    console.log('Firebase conectado aos Emuladores Locais.');
  }
}

export default app; 


