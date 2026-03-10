import { MercadoPagoConfig, Preference } from 'mercadopago';

let preferenceInstance: Preference | null = null;
let configuredToken: string | null = null;

export const getPreferenceClient = (): Preference => {
  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;

  if (!accessToken) {
    throw new Error('MERCADO_PAGO_ACCESS_TOKEN nao configurado');
  }

  if (!preferenceInstance || configuredToken !== accessToken) {
    const client = new MercadoPagoConfig({
      accessToken,
      options: { timeout: 5000 },
    });

    preferenceInstance = new Preference(client);
    configuredToken = accessToken;
  }

  return preferenceInstance;
};
