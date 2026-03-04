import { MercadoPagoConfig, Preference } from 'mercadopago';

// O Access Token deve ser configurado no .env.local
// O usuário pode obter em: https://www.mercadopago.com.br/developers/panel/app
const client = new MercadoPagoConfig({
    accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN || 'TEST-0000000000000000-000000-00000000000000000000000000000000-000000000',
    options: { timeout: 5000 }
});

export const preference = new Preference(client);
