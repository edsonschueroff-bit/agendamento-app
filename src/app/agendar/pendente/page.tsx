export default function PagamentoPendentePage() {
  return (
    <main className="min-h-screen bg-amber-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="text-5xl mb-4">Pagamento pendente</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Seu pagamento ainda esta em analise</h1>
        <p className="text-gray-600">
          Assim que o provedor confirmar a cobranca, o agendamento continuara confirmado normalmente.
        </p>
      </div>
    </main>
  );
}
