const TOKEN_BYTES = 32;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{20,128}$/;

const bytesToBase64Url = (bytes: Uint8Array): string => {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  if (typeof btoa === 'function') {
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }

  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
};

export const generateReschedulingToken = (): string => {
  if (typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(TOKEN_BYTES);
    globalThis.crypto.getRandomValues(bytes);
    return bytesToBase64Url(bytes);
  }

  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 16)}`;
};

export const isValidReschedulingToken = (token: string): boolean => {
  return TOKEN_PATTERN.test(token);
};

export const generateReschedulingLink = (
  token: string,
  baseUrl: string = process.env.NEXT_PUBLIC_APP_URL || 'https://agenda-facil.com'
): string => {
  return `${baseUrl}/agendar/reagendar/${token}`;
};
