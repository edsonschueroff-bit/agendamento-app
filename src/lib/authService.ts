import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  UserCredential,
} from 'firebase/auth';
import { auth } from './firebase';

// Tipos para o serviço de autenticação
export type AuthUser = User;

// Função para registrar um novo usuário
export const registerUser = async (
  email: string,
  password: string
): Promise<UserCredential> => {
  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    return userCredential;
  } catch (error) {
    console.error('Erro ao registrar usuário:', error);
    throw error;
  }
};

// Função para fazer login
export const loginUser = async (
  email: string,
  password: string
): Promise<UserCredential> => {
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    return userCredential;
  } catch (error) {
    console.error('Erro ao fazer login:', error);
    throw error;
  }
};

// Função para fazer logout
export const logoutUser = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Erro ao fazer logout:', error);
    throw error;
  }
};

// Função para observar mudanças no estado de autenticação
export const onAuthStateChange = (
  callback: (user: AuthUser | null) => void
): (() => void) => {
  return onAuthStateChanged(auth, callback);
};

// Função para obter o usuário atual
export const getCurrentUser = (): AuthUser | null => {
  return auth.currentUser;
}; 