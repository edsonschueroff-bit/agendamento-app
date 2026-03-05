import { ReschedulingTokenPayload } from './types';

/**
 * Gera um token JWT para reagendamento
 * Token é válido por 30 dias
 * NOTA: Em produção, use uma biblioteca JWT como 'jsonwebtoken'
 * Esta é uma implementação simplificada para demo
 */
export const generateReschedulingToken = (
  appointmentId: string,
  userId: string,
  clientId: string
): string => {
  const payload: ReschedulingTokenPayload = {
    appointmentId,
    userId,
    clientId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 dias
  };

  // Base64 encode do payload (simplificado)
  // Em produção, usar biblioteca JWT
  try {
    return btoa(JSON.stringify(payload));
  } catch (error) {
    console.error('Erro ao gerar token:', error);
    throw new Error('Falha ao gerar token de reagendamento');
  }
};

/**
 * Decodifica e valida o token de reagendamento
 * Retorna null se inválido ou expirado
 */
export const validateReschedulingToken = (
  token: string
): ReschedulingTokenPayload | null => {
  try {
    const payload: ReschedulingTokenPayload = JSON.parse(atob(token));

    // Verifica se está expirado
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      console.error('Token expirado');
      return null;
    }

    // Valida campos obrigatórios
    if (!payload.appointmentId || !payload.userId || !payload.clientId) {
      console.error('Token inválido: faltam campos');
      return null;
    }

    return payload;
  } catch (error) {
    console.error('Erro ao validar token:', error);
    return null;
  }
};

/**
 * Gera link público para reagendamento
 * Exemplo: https://agenda-facil.com/agendar/reagendar/TOKEN
 */
export const generateReschedulingLink = (
  token: string,
  baseUrl: string = process.env.NEXT_PUBLIC_APP_URL || 'https://agenda-facil.com'
): string => {
  return `${baseUrl}/agendar/reagendar/${token}`;
};
