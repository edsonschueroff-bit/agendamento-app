'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthContext } from '@/components/providers/AuthProvider';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout';
import { Professional, Service } from '@/lib/types';
import { addSubDocument, getSubDocuments, updateSubDocument } from '@/lib/firestoreService';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const professionalSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  phone: z.string().min(1, 'Telefone é obrigatório'),
  specialty: z.string().min(1, 'Especialidade é obrigatória'),
  commissionRate: z.number().min(0, 'Mínimo 0').max(100, 'Máximo 100'),
});

type ProfessionalFormData = z.infer<typeof professionalSchema>;

export default function GerenciarProfissionais() {
  const { user, isDono } = useAuthContext();

  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<ProfessionalFormData>({
    resolver: zodResolver(professionalSchema),
    defaultValues: {
      name: '',
      phone: '',
      specialty: '',
      commissionRate: 20,
    },
  });

  const loadProfessionals = useCallback(async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const data = await getSubDocuments<Professional>('users', user.uid, 'professionals');
      setProfessionals(data);
    } catch (err) {
      console.error('Erro ao carregar profissionais:', err);
      setMessage({ type: 'error', text: 'Erro ao carregar profissionais.' });
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    if (!user || !isDono) return;
    loadProfessionals();
  }, [user, isDono, loadProfessionals]);

  useEffect(() => {
    if (!user?.uid) return;
    getSubDocuments<Service>('users', user.uid, 'services')
      .then((data) => setServices(data.filter((s) => s.isActive)))
      .catch(() => setServices([]));
  }, [user?.uid]);

  const openCreate = () => {
    setEditingId(null);
    setSelectedServiceIds([]);
    reset({ name: '', phone: '', specialty: '', commissionRate: 20 });
    setShowModal(true);
  };

  const openEdit = (prof: Professional) => {
    setEditingId(prof.id ?? null);
    setSelectedServiceIds(prof.serviceIds ?? []);
    setValue('name', prof.name);
    setValue('phone', prof.phone);
    setValue('specialty', prof.specialty);
    setValue('commissionRate', prof.commissionRate);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setSelectedServiceIds([]);
    reset({ name: '', phone: '', specialty: '', commissionRate: 20 });
  };

  const toggleServiceId = (serviceId: string) => {
    setSelectedServiceIds((prev) =>
      prev.includes(serviceId) ? prev.filter((id) => id !== serviceId) : [...prev, serviceId]
    );
  };

  const onFormSubmit = async (data: ProfessionalFormData) => {
    if (!user?.uid) return;
    setSubmitting(true);
    setMessage(null);
    try {
      if (editingId) {
        await updateSubDocument<Professional>(
          'users',
          user.uid,
          'professionals',
          editingId,
          {
            name: data.name,
            phone: data.phone,
            specialty: data.specialty,
            commissionRate: data.commissionRate,
            serviceIds: selectedServiceIds,
          }
        );
        setMessage({ type: 'success', text: 'Profissional atualizado com sucesso!' });
      } else {
        await addSubDocument<Professional>('users', user.uid, 'professionals', {
          name: data.name,
          phone: data.phone,
          specialty: data.specialty,
          commissionRate: data.commissionRate,
          isActive: true,
          serviceIds: selectedServiceIds,
        });
        setMessage({ type: 'success', text: 'Profissional criado com sucesso!' });
      }
      closeModal();
      await loadProfessionals();
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error('Erro ao salvar profissional:', err);
      setMessage({ type: 'error', text: 'Erro ao salvar. Tente novamente.' });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (prof: Professional) => {
    if (!user?.uid || !prof.id) return;
    const newActive = !prof.isActive;
    try {
      await updateSubDocument<Professional>(
        'users',
        user.uid,
        'professionals',
        prof.id,
        { isActive: newActive }
      );
      setMessage({
        type: 'success',
        text: newActive ? 'Profissional ativado.' : 'Profissional desativado.',
      });
      await loadProfessionals();
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error('Erro ao alterar status:', err);
      setMessage({ type: 'error', text: 'Erro ao alterar status.' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-gray-600">Carregando...</div>
      </div>
    );
  }

  if (!isDono) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Acesso Negado</h1>
          <p className="text-gray-600 mb-4">Apenas donos podem gerenciar profissionais.</p>
          <a href="/dashboard" className="text-blue-600 hover:underline">Voltar ao dashboard</a>
        </div>
      </div>
    );
  }

  const visibleList = showInactive
    ? professionals
    : professionals.filter(p => p.isActive);

  return (
    <ProtectedRoute requiredUserType="dono">
      <AuthenticatedLayout>
        <div className="min-h-screen bg-gray-50">
          <div className="py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Gerenciar Profissionais</h1>
                  <p className="text-gray-600 mt-2">Cadastre e gerencie profissionais do seu negócio</p>
                </div>
                <button
                  type="button"
                  onClick={openCreate}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition"
                >
                  + Novo Profissional
                </button>
              </div>

              {message && (
                <div
                  className={`mb-4 p-4 rounded-lg ${
                    message.type === 'success'
                      ? 'bg-green-100 border border-green-400 text-green-700'
                      : 'bg-red-100 border border-red-400 text-red-700'
                  }`}
                >
                  {message.text}
                </div>
              )}

              <div className="mb-4 flex items-center gap-2">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showInactive}
                    onChange={(e) => setShowInactive(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Mostrar inativos</span>
                </label>
              </div>

              <div className="bg-white rounded-lg shadow overflow-hidden">
                {visibleList.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    <p>
                      {showInactive
                        ? 'Nenhum profissional cadastrado.'
                        : 'Nenhum profissional ativo. Marque "Mostrar inativos" ou crie um novo.'}
                    </p>
                    {!showInactive && (
                      <button
                        type="button"
                        onClick={openCreate}
                        className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Criar primeiro profissional
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Nome</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Telefone</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Especialidade</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Comissão %</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {visibleList.map((prof) => (
                          <tr key={prof.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{prof.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{prof.phone}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{prof.specialty}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{prof.commissionRate}%</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  prof.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {prof.isActive ? 'Ativo' : 'Inativo'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                              <button
                                type="button"
                                onClick={() => openEdit(prof)}
                                className="text-blue-600 hover:text-blue-700 font-medium"
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                onClick={() => toggleActive(prof)}
                                className={prof.isActive ? 'text-red-600 hover:text-red-700 font-medium' : 'text-green-600 hover:text-green-700 font-medium'}
                              >
                                {prof.isActive ? 'Desativar' : 'Ativar'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
              <div className="px-6 py-4 border-b">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingId ? 'Editar Profissional' : 'Novo Profissional'}
                </h2>
              </div>
              <form onSubmit={handleSubmit(onFormSubmit)} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                  <input
                    type="text"
                    {...register('name')}
                    placeholder="João Silva"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefone *</label>
                  <input
                    type="tel"
                    {...register('phone')}
                    placeholder="(11) 99999-9999"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Especialidade *</label>
                  <input
                    type="text"
                    {...register('specialty')}
                    placeholder="Ex: Coloração, Corte, Manicure"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {errors.specialty && <p className="mt-1 text-sm text-red-600">{errors.specialty.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Comissão % *</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    {...register('commissionRate', { valueAsNumber: true })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {errors.commissionRate && <p className="mt-1 text-sm text-red-600">{errors.commissionRate.message}</p>}
                  <p className="text-xs text-gray-500 mt-1">Percentual que o profissional recebe de cada atendimento</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Serviços que realiza</label>
                  {services.length === 0 ? (
                    <p className="text-sm text-gray-500">Nenhum serviço ativo cadastrado. Cadastre serviços em Serviços.</p>
                  ) : (
                    <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-3">
                      {services.map((s) => (
                        <label key={s.id} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedServiceIds.includes(s.id ?? '')}
                            onChange={() => toggleServiceId(s.id ?? '')}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">{s.name}</span>
                          <span className="text-xs text-gray-400">R$ {s.price.toFixed(2)}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50"
                    disabled={submitting}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {submitting ? 'Salvando...' : editingId ? 'Atualizar' : 'Criar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </AuthenticatedLayout>
    </ProtectedRoute>
  );
}
