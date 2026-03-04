'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/components/providers/AuthProvider';
import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout';
import { Client } from '@/lib/types';
import { getSubDocuments, addSubDocument, updateSubDocument, deleteSubDocument, getDocuments } from '@/lib/firestoreService';
import { Appointment } from '@/lib/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';

export default function ClientesPage() {
  const { user, loading, isAuthenticated } = useAuthContext();
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientHistory, setClientHistory] = useState<Appointment[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    notes: '',
  });

  // Helper function to convert various date formats to Date object
  const getDateObject = (dateValue: any): Date => {
    if (dateValue instanceof Date) {
      return dateValue;
    }
    if (typeof dateValue === 'string') {
      return new Date(dateValue);
    }
    if (dateValue?.toDate && typeof dateValue.toDate === 'function') {
      return dateValue.toDate();
    }
    return new Date();
  };

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [loading, isAuthenticated, router]);

  const loadClients = useCallback(async () => {
    if (!user?.uid) return;
    setIsLoading(true);
    try {
      const clientsData = await getSubDocuments<Client>('users', user.uid, 'clients');
      setClients(clientsData);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    if (isAuthenticated && user?.uid) {
      loadClients();
    }
  }, [isAuthenticated, user?.uid, loadClients]);

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone.includes(searchTerm)
  );

  const openModal = (client?: Client) => {
    if (client) {
      setEditingClient(client);
      setFormData({
        name: client.name,
        email: client.email,
        phone: client.phone,
        address: client.address || '',
        notes: client.notes || '',
      });
    } else {
      setEditingClient(null);
      setFormData({ name: '', email: '', phone: '', address: '', notes: '' });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingClient(null);
  };

  const openHistoryModal = async (client: Client) => {
    setSelectedClient(client);
    setIsHistoryModalOpen(true);
    setIsLoadingHistory(true);
    try {
      const appointments = await getSubDocuments<Appointment>('users', user!.uid, 'appointments', [
        { field: 'clientId', operator: '==', value: client.id }
      ], 'date', 'desc');
      setClientHistory(appointments);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const closeHistoryModal = () => {
    setIsHistoryModalOpen(false);
    setSelectedClient(null);
    setClientHistory([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const clientData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        notes: formData.notes,
        userId: user!.uid,
      };

      if (editingClient) {
        await updateSubDocument('users', user!.uid, 'clients', editingClient.id!, clientData);
      } else {
        await addSubDocument('users', user!.uid, 'clients', clientData);
      }

      closeModal();
      loadClients();
      setMessage({
        type: 'success',
        text: editingClient ? 'Cliente atualizado com sucesso!' : 'Cliente criado com sucesso!',
      });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Erro ao salvar cliente:', error);
      setMessage({ type: 'error', text: 'Erro ao salvar cliente. Tente novamente.' });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (clientId: string) => {
    if (!confirm('Tem certeza que deseja excluir este cliente?')) return;

    try {
      await deleteSubDocument('users', user!.uid, 'clients', clientId);
      loadClients();
      setMessage({ type: 'success', text: 'Cliente excluído com sucesso!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Erro ao excluir cliente:', error);
      setMessage({ type: 'error', text: 'Erro ao excluir cliente.' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl">Carregando...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <AuthenticatedLayout>
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Clientes</h1>
              <p className="text-gray-600">Gerencie sua base de clientes</p>
            </div>
            <button
              onClick={() => openModal()}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Novo Cliente
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Mensagens */}
          {message && (
            <div className={`mb-4 p-4 rounded-md ${message.type === 'success'
              ? 'bg-green-100 border border-green-400 text-green-700'
              : 'bg-red-100 border border-red-400 text-red-700'
              }`}>
              {message.text}
            </div>
          )}

          {/* Busca */}
          <div className="mb-6">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Buscar por nome, email ou telefone..."
              />
            </div>
          </div>

          {/* Lista de Clientes */}
          <div className="bg-white shadow rounded-lg">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-500">Carregando clientes...</p>
              </div>
            ) : filteredClients.length > 0 ? (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Cliente
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Contato
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Endereço
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {filteredClients.map((client) => (
                        <tr key={client.id} className="hover:bg-blue-50/30 transition-colors group">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white shadow-sm">
                                <span className="text-sm font-bold">
                                  {client.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                                </span>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{client.name}</div>
                                {client.address && <div className="text-xs text-gray-400 truncate max-w-[150px]">{client.address}</div>}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 font-medium">{client.phone}</div>
                            {client.email && <div className="text-xs text-gray-500">{client.email}</div>}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500 italic max-w-xs truncate">
                            {client.notes || 'Sem observações'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end space-x-3">
                              <button
                                onClick={() => openHistoryModal(client)}
                                className="text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1 rounded-md transition-colors"
                              >
                                Histórico
                              </button>
                              <button
                                onClick={() => openModal(client)}
                                className="text-gray-600 hover:text-gray-900"
                              >
                                Editar
                              </button>
                              <button
                                onClick={() => handleDelete(client.id!)}
                                className="text-red-500 hover:text-red-700 opacity-50 group-hover:opacity-100 transition-opacity"
                              >
                                Excluir
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden divide-y divide-gray-100">
                  {filteredClients.map((client) => (
                    <div key={client.id} className="p-5 hover:bg-gray-50">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold mr-3">
                            {client.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-900">{client.name}</h3>
                            <p className="text-xs text-gray-500">{client.phone}</p>
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                        {client.notes || 'Sem observações.'}
                      </p>
                      <div className="flex space-x-3">
                        <button
                          onClick={() => openHistoryModal(client)}
                          className="flex-1 bg-blue-50 text-blue-600 py-2 rounded-lg text-sm font-bold active:scale-95 transition-all"
                        >
                          Histórico
                        </button>
                        <button
                          onClick={() => openModal(client)}
                          className="flex-1 bg-gray-50 text-gray-600 py-2 rounded-lg text-sm font-bold active:scale-95 transition-all"
                        >
                          Editar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  {searchTerm ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm ? 'Tente ajustar os termos de busca.' : 'Comece cadastrando seu primeiro cliente.'}
                </p>
                {!searchTerm && (
                  <div className="mt-6">
                    <button
                      onClick={() => openModal()}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      Novo Cliente
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Estatísticas */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total de Clientes</dt>
                      <dd className="text-lg font-medium text-gray-900">{clients.length}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modal de Histórico do Cliente */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4" onClick={closeHistoryModal}>
          <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-3xl shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Header Modal Histórico */}
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <div className="flex items-center">
                <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white mr-4 shadow-lg shadow-blue-200">
                  <span className="text-xl font-bold">{selectedClient?.name.charAt(0).toUpperCase()}</span>
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-gray-900">{selectedClient?.name}</h3>
                  <p className="text-sm text-gray-500">{selectedClient?.phone}</p>
                </div>
              </div>
              <button onClick={closeHistoryModal} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content Modal Histórico */}
            <div className="flex-1 overflow-y-auto p-6">
              {isLoadingHistory ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                  <p className="mt-4 text-gray-500 font-medium italic">Buscando histórico...</p>
                </div>
              ) : clientHistory.length > 0 ? (
                <div className="space-y-6">
                  {clientHistory.map((apt) => {
                    const aptDate = getDateObject(apt.date);
                    return (
                      <div key={apt.id} className="relative pl-8 border-l-2 border-blue-100">
                        <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-blue-600 border-4 border-white shadow-sm"></div>
                        <div className="bg-gray-50 rounded-2xl p-5 hover:shadow-md transition-shadow border border-gray-100">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-xs font-bold text-blue-600 uppercase bg-blue-50 px-2 py-1 rounded">
                              {format(aptDate, "dd 'de' MMMM", { locale: ptBR })}
                            </span>
                            <span className="text-xs font-medium text-gray-400">Às {format(aptDate, "HH:mm")}</span>
                          </div>
                          <h4 className="font-bold text-gray-900 mb-1">{apt.serviceName}</h4>
                          <div className="flex items-center text-sm text-gray-600">
                            <span className="font-bold mr-2 text-green-600">R$ {apt.servicePrice.toFixed(2)}</span>
                            <span className="mx-2">•</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ${apt.status === 'concluido' ? 'bg-green-100 text-green-700' :
                              apt.status === 'cancelado' ? 'bg-red-100 text-red-700' :
                                'bg-blue-100 text-blue-700'
                              }`}>
                              {apt.status}
                            </span>
                          </div>
                          {apt.notes && (
                            <div className="mt-3 text-sm text-gray-500 bg-white p-3 rounded-xl border border-dashed border-gray-200 italic">
                              &quot; {apt.notes} &quot;
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div className="text-center pt-4">
                    <p className="text-xs text-gray-400 italic font-medium">Fim do histórico registrado</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-20 bg-gray-50 rounded-3xl">
                  <p className="text-gray-400 font-medium italic mb-2">Sem histórico encontrado.</p>
                  <p className="text-xs text-gray-400 max-w-[200px] mx-auto">Este cliente ainda não possui agendamentos registrados no sistema.</p>
                </div>
              )}
            </div>

            {/* Footer Modal Histórico */}
            <div className="p-6 border-t border-gray-100 flex justify-between items-center bg-gray-50">
              <div>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Resumo</p>
                <p className="text-sm font-bold text-gray-900">{clientHistory.length} Agendamentos • Total R$ {clientHistory.reduce((sum, a) => sum + (a.status !== 'cancelado' ? a.servicePrice : 0), 0).toFixed(2)}</p>
              </div>
              <button onClick={closeHistoryModal} className="bg-gray-900 text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-black transition-all active:scale-95">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Criar/Editar Cliente */}
      {isModalOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4"
          onClick={closeModal}
        >
          <div
            className="relative mx-auto p-8 border-none w-full max-w-md shadow-2xl rounded-3xl bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black text-gray-900">
                {editingClient ? 'Editar Cliente' : 'Novo Cliente'}
              </h3>
              <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-100 bg-gray-50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-medium text-gray-900"
                  placeholder="Nome do cliente"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Telefone *</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-100 bg-gray-50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-medium text-gray-900"
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-100 bg-gray-50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-medium text-gray-900"
                    placeholder="email@exemplo.com"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Endereço</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-100 bg-gray-50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-medium text-gray-900"
                  placeholder="Rua, Número, Bairro..."
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Notas Internas</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-100 bg-gray-50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-medium text-gray-900"
                  placeholder="Informações importantes: alergias, preferências, etc..."
                />
              </div>
              <div className="flex space-x-3 pt-6">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-3 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 disabled:opacity-50 transition-all active:scale-95 shadow-lg shadow-blue-200"
                >
                  {isSubmitting ? 'Salvando...' : 'Salvar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AuthenticatedLayout>
  );
}