'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChange, AuthUser } from '../authService';
import {
  doc,
  getDoc,
  DocumentData,
  DocumentReference,
  DocumentSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase';

const FIRESTORE_LOOKUP_TIMEOUT_MS = 6000;
const AUTH_INIT_TIMEOUT_MS = 10000;

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number): Promise<T | null> => {
  let timer: ReturnType<typeof setTimeout> | null = null;

  try {
    return await Promise.race<T | null>([
      promise,
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

const getDocWithTimeout = async (
  ref: DocumentReference<DocumentData>
): Promise<DocumentSnapshot<DocumentData> | null> =>
  withTimeout(getDoc(ref), FIRESTORE_LOOKUP_TIMEOUT_MS);

export const useAuth = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [userType, setUserType] = useState<'dono' | 'profissional' | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const initTimeout = setTimeout(() => {
      if (!isMounted) return;
      setLoading(false);
      setError('Tempo de inicializacao excedido. Recarregue a pagina.');
    }, AUTH_INIT_TIMEOUT_MS);

    const unsubscribe = onAuthStateChange(async (authUser) => {
      if (!isMounted) return;
      clearTimeout(initTimeout);

      setUser(authUser);
      setError(null);

      if (!authUser) {
        setUserType(null);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const ownerProfileDoc = await getDocWithTimeout(
          doc(db, 'users', authUser.uid, 'profile', 'main')
        );

        if (ownerProfileDoc?.exists()) {
          if (isMounted) setUserType('dono');
          return;
        }

        const professionalLinkDoc = await getDocWithTimeout(
          doc(db, 'professionalLinks', authUser.uid)
        );

        if (isMounted) {
          setUserType(professionalLinkDoc?.exists() ? 'profissional' : 'dono');
        }
      } catch (lookupError) {
        console.warn('Falha ao resolver tipo de usuario:', lookupError);
        if (isMounted) {
          setUserType('dono');
          setError('Nao foi possivel determinar o tipo de usuario.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(initTimeout);
      unsubscribe();
    };
  }, []);

  return {
    user,
    userType,
    loading,
    error,
    isAuthenticated: !!user,
  };
};
