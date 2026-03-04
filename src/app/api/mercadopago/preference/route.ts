import { NextRequest, NextResponse } from 'next/server';
import { preference } from '@/lib/mercadopago';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { title, unit_price, quantity, external_reference } = body;

        const result = await preference.create({
            body: {
                items: [
                    {
                        id: external_reference,
                        title: title,
                        unit_price: Number(unit_price),
                        quantity: Number(quantity) || 1,
                        currency_id: 'BRL',
                    }
                ],
                back_urls: {
                    success: `${request.nextUrl.origin}/agendar/confirmado?id=${external_reference}`,
                    failure: `${request.nextUrl.origin}/agendar/erro`,
                    pending: `${request.nextUrl.origin}/agendar/pendente`,
                },
                auto_return: 'approved',
                external_reference: external_reference,
            }
        });

        return NextResponse.json({
            id: result.id,
            init_point: result.init_point
        });
    } catch (error) {
        console.error('Erro ao criar preferência do Mercado Pago:', error);
        return NextResponse.json(
            { error: 'Erro ao processar pagamento' },
            { status: 500 }
        );
    }
}
