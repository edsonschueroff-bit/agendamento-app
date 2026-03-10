interface PaymentStatusPageProps {
  searchParams?: Promise<{
    id?: string;
  }>;
}

export default async function PagamentoConfirmadoPage({
  searchParams,
}: PaymentStatusPageProps) {
  const params = (await searchParams) ?? {};
  const paymentId = params.id?.trim();

  return (
    <main className="min-h-screen bg-green-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="text-5xl mb-4">Pagamento aprovado</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Tudo certo com seu agendamento</h1>
        <p className="text-gray-600 mb-4">
          Recebemos a confirmacao do pagamento e o horario segue reservado.
        </p>
        {paymentId ? (
          <p className="text-sm text-gray-500">
            Codigo da reserva: <span className="font-mono">{paymentId}</span>
          </p>
        ) : null}
      </div>
    </main>
  );
}
