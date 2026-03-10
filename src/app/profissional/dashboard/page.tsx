'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthContext } from '@/components/providers/AuthProvider';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout';
import { Professional, Appointment } from '@/lib/types';
import { getSubDocuments } from '@/lib/firestoreService';

type PeriodOption = 'current_month' | 'previous_month';

function getPeriodRange(period: PeriodOption): { start: Date; end: Date } {
  const now = new Date();
  if (period === 'current_month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start, end };
  }
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  return { start, end };
}

function toDate(value: Appointment['date']): Date {
  if (value instanceof Date) return value;
  if (typeof value === 'string') return new Date(value);
  if (value && typeof (value as { toDate?: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }
  return new Date(0);
}

export default function ProfessionalDashboard() {
  const { user, isDono } = useAuthContext();

  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string>('');
  const [period, setPeriod] = useState<PeriodOption>('current_month');
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const [professionalsData, appointmentsData] = await Promise.all([
        getSubDocuments<Professional>('users', user.uid, 'professionals'),
        getSubDocuments<Appointment>('users', user.uid, 'appointments'),
      ]);
      setProfessionals(professionalsData.filter(p => p.isActive));
      setAppointments(appointmentsData);
      if (professionalsData.length > 0 && !selectedProfessionalId) {
        const first = professionalsData.find(p => p.isActive) ?? professionalsData[0];
        setSelectedProfessionalId(first.id ?? '');
      }
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid || !isDono) return;
    loadData();
  }, [user?.uid, isDono, loadData]);

  const { start, end } = getPeriodRange(period);
  const selectedProfessional = professionals.find(p => p.id === selectedProfessionalId);

  const appointmentsInPeriod = appointments.filter(apt => {
    const aptDate = toDate(apt.date);
    const inRange = aptDate >= start && aptDate <= end;
    const matchesProfessional = !selectedProfessionalId || apt.professionalId === selectedProfessionalId;
    return inRange && matchesProfessional && apt.status !== 'cancelado';
  });

  const totalAtendimentos = appointmentsInPeriod.length;
  const professionalsById = Object.fromEntries(professionals.map(p => [p.id, p]));
  const totalComissoes = appointmentsInPeriod.reduce((sum, apt) => {
    const rate = selectedProfessionalId
      ? (selectedProfessional?.commissionRate ?? 0)
      : (apt.professionalId ? (professionalsById[apt.professionalId]?.commissionRate ?? 0) : 0);
    return sum + (apt.price ?? 0) * (rate / 100);
  }, 0);

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
          <p className="text-gray-600 mb-4">Apenas o dono pode acessar esta página.</p>
          <a href="/dashboard" className="text-blue-600 hover:underline">Voltar ao dashboard</a>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute requiredUserType="dono">
      <AuthenticatedLayout>
        <div className="min-h-screen bg-gray-50">
          <div className="py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard do Profissional</h1>
              <p className="text-gray-600 mb-6">Visualize atendimentos e comissões por profissional e período.</p>

              <div className="flex flex-wrap gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Profissional</label>
                  <select
                    value={selectedProfessionalId}
                    onChange={(e) => setSelectedProfessionalId(e.target.value)}
                    className="w-full min-w-[200px] px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Todos</option>
                    {professionals.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.specialty})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Período</label>
                  <select
                    value={period}
                    onChange={(e) => setPeriod(e.target.value as PeriodOption)}
                    className="w-full min-w-[180px] px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="current_month">Este mês</option>
                    <option value="previous_month">Mês anterior</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm font-medium">Total de atendimentos no período</p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">{totalAtendimentos}</p>
                    </div>
                    <div className="bg-blue-100 p-3 rounded-lg">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm font-medium">Total em comissões no período</p>
                      <p className="text-3xl font-bold text-green-600 mt-2">R$ {totalComissoes.toFixed(2)}</p>
                      {selectedProfessional && (
                        <p className="text-xs text-gray-500 mt-1">
                          {selectedProfessional.name} — {selectedProfessional.commissionRate}%
                        </p>
                      )}
                    </div>
                    <div className="bg-green-100 p-3 rounded-lg">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Agendamentos no período</h2>
                {appointmentsInPeriod.length === 0 ? (
                  <p className="text-gray-500">Nenhum agendamento no período para o profissional selecionado.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Data / Hora</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Cliente</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Serviço</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Valor</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {appointmentsInPeriod.map((apt) => {
                          const d = toDate(apt.date);
                          return (
                            <tr key={apt.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {d.toLocaleDateString('pt-BR')} {apt.time}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">{apt.clientName}</td>
                              <td className="px-4 py-3 text-sm text-gray-600">{apt.serviceName}</td>
                              <td className="px-4 py-3 text-sm text-gray-600">R$ {(apt.price ?? 0).toFixed(2)}</td>
                              <td className="px-4 py-3">
                                <span
                                  className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                                    apt.status === 'concluido'
                                      ? 'bg-green-100 text-green-800'
                                      : apt.status === 'cancelado'
                                        ? 'bg-red-100 text-red-800'
                                        : 'bg-blue-100 text-blue-800'
                                  }`}
                                >
                                  {apt.status}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </AuthenticatedLayout>
    </ProtectedRoute>
  );
}
