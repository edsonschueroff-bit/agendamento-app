export default function PagamentoErroPage() {
  return (
    <main className="min-h-screen bg-red-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="text-5xl mb-4">Pagamento nao concluido</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Nao foi possivel finalizar o pagamento</h1>
        <p className="text-gray-600">
          Se quiser, tente novamente pelo link recebido ou entre em contato com o estabelecimento.
        </p>
      </div>
    </main>
  );
}
