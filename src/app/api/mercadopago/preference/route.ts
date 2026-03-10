import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getPreferenceClient } from '@/lib/mercadopago';

const createPreferenceSchema = z.object({
  title: z.string().trim().min(1).max(120),
  unit_price: z.coerce.number().positive().max(1_000_000),
  quantity: z.coerce.number().int().min(1).max(20).default(1),
  external_reference: z.string().trim().min(1).max(120),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createPreferenceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Payload invalido para criacao da preferencia de pagamento' },
        { status: 400 }
      );
    }

    const { title, unit_price, quantity, external_reference } = parsed.data;
    const preferenceClient = getPreferenceClient();

    const result = await preferenceClient.create({
      body: {
        items: [
          {
            id: external_reference,
            title,
            unit_price,
            quantity,
            currency_id: 'BRL',
          },
        ],
        back_urls: {
          success: `${request.nextUrl.origin}/agendar/confirmado?id=${external_reference}`,
          failure: `${request.nextUrl.origin}/agendar/erro`,
          pending: `${request.nextUrl.origin}/agendar/pendente`,
        },
        auto_return: 'approved',
        external_reference,
      },
    });

    return NextResponse.json({
      id: result.id,
      init_point: result.init_point,
    });
  } catch (error) {
    console.error('Erro ao criar preferencia do Mercado Pago:', error);
    return NextResponse.json(
      { error: 'Erro ao processar pagamento' },
      { status: 500 }
    );
  }
}
