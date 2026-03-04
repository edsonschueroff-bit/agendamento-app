'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/components/providers/AuthProvider';
import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout';
import Link from 'next/link';
import { Appointment } from '@/lib/types';
import { getSubDocuments } from '@/lib/firestoreService';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface DashboardStats {
  todayAppointments: number;
  totalRevenue: number;
  completedAppointments: number;
  pendingAppointments: number;
  noShowAppointments: number;
}

interface TodayAppointment {
  id: string;
  clientName: string;
  service: string;
  time: string;
  status: 'agendado' | 'concluido' | 'cancelado';
  value: number;
}

import { db } from '@/lib/firebase';
import NotificationManager from '@/components/notifications/NotificationManager';

export default function DashboardPage() {
  const { user, loading, isAuthenticated } = useAuthContext();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    todayAppointments: 0,
    totalRevenue: 0,
    completedAppointments: 0,
    pendingAppointments: 0,
    noShowAppointments: 0,
  });
  const [todayAppointments, setTodayAppointments] = useState<TodayAppointment[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [monthlyRevenue, setMonthlyRevenue] = useState<{ month: string; receita: number }[]>([]);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [loading, isAuthenticated, router]);

  const loadDashboardData = useCallback(async () => {
    if (!user?.uid) return;

    setIsLoadingStats(true);
    try {
      // Buscar agendamentos reais do Firestore
      const appointments = await getSubDocuments<Appointment>(
        'users', user.uid, 'appointments',
        undefined, 'date', 'asc'
      );

      // Data de hoje (início e fim do dia)
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

      // Filtrar agendamentos de hoje
      const todayApts = appointments.filter(apt => {
        const aptDate = apt.date?.toDate?.();
        if (!aptDate) return false;
        return aptDate >= startOfDay && aptDate <= endOfDay;
      });

      // Calcular estatísticas
      const completed = todayApts.filter(a => a.status === 'concluido');
      const pending = todayApts.filter(a => a.status === 'agendado');
      const cancelled = todayApts.filter(a => a.status === 'cancelado');

      const totalRevenue = completed.reduce((sum, a) => sum + (a.servicePrice || 0), 0);

      setStats({
        todayAppointments: todayApts.length,
        totalRevenue,
        completedAppointments: completed.length,
        pendingAppointments: pending.length,
        noShowAppointments: cancelled.length,
      });

      // Formatar para exibição
      const formattedAppointments: TodayAppointment[] = todayApts.map(apt => {
        const date = apt.date?.toDate?.();
        const time = date
          ? date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
          : '--:--';

        return {
          id: apt.id || '',
          clientName: apt.clientName || 'Cliente',
          service: apt.serviceName || 'Serviço',
          time,
          status: apt.status,
          value: apt.servicePrice || 0,
        };
      });

      setTodayAppointments(formattedAppointments);

      // Calcular faturamento mensal dos últimos 6 meses
      const now = new Date();
      const MONTHS_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const monthMap: Record<string, number> = {};
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${MONTHS_PT[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`;
        monthMap[key] = 0;
      }
      appointments.filter(a => a.status === 'concluido').forEach(a => {
        const d = a.date?.toDate?.();
        if (!d) return;
        const key = `${MONTHS_PT[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`;
        if (key in monthMap) monthMap[key] += (a.servicePrice || 0);
      });
      setMonthlyRevenue(Object.entries(monthMap).map(([month, receita]) => ({ month, receita })));

    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
    } finally {
      setIsLoadingStats(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    if (isAuthenticated && user?.uid) {
      loadDashboardData();
    }
  }, [isAuthenticated, user?.uid, loadDashboardData]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'concluido':
        return 'bg-green-100 text-green-800';
      case 'agendado':
        return 'bg-blue-100 text-blue-800';
      case 'cancelado':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'concluido':
        return 'Concluído';
      case 'agendado':
        return 'Agendado';
      case 'cancelado':
        return 'Cancelado';
      default:
        return 'Pendente';
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
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600">Resumo do dia - {new Date().toLocaleDateString('pt-BR')}</p>
            </div>
            <div className="text-sm text-gray-700">
              Olá, {user?.email}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <NotificationManager />

        <div className="mb-8">
          {/* Cards de Estatísticas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Total de Agendamentos */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Agendamentos Hoje
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {isLoadingStats ? '...' : stats.todayAppointments}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            {/* Faturamento */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Faturamento Hoje
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {isLoadingStats ? '...' : `R$ ${stats.totalRevenue.toFixed(2)}`}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            {/* Concluídos */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Concluídos
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {isLoadingStats ? '...' : stats.completedAppointments}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            {/* Pendentes */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Pendentes
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {isLoadingStats ? '...' : stats.pendingAppointments}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Alertas */}
          <div className="space-y-4 mb-6">
            {stats.noShowAppointments > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                      Atenção: {stats.noShowAppointments} agendamento(s) cancelado(s) hoje
                    </h3>
                    <p className="mt-1 text-sm text-red-700">
                      Verifique se há necessidade de reagendamento ou contato.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {stats.pendingAppointments > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">
                      Pendências: {stats.pendingAppointments} agendamento(s) para hoje
                    </h3>
                    <p className="mt-1 text-sm text-yellow-700">
                      Não se esqueça de marcá-los como Concluídos ao final do dia.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Gráfico de Faturamento Mensal */}
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">📊 Faturamento Mensal (últimos 6 meses)</h3>
            {monthlyRevenue.every(d => d.receita === 0) ? (
              <p className="text-sm text-gray-400 text-center py-8">Nenhum faturamento registrado ainda. Complete agendamentos para visualizar.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthlyRevenue} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `R$${Number(v)}`} />
                  <Tooltip formatter={(v) => [`R$ ${Number(v).toFixed(2)}`, 'Faturamento']} />
                  <Bar dataKey="receita" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Próximos Agendamentos */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Agendamentos de Hoje
                </h3>
                <Link
                  href="/agendamentos"
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Ver Todos
                </Link>
              </div>

              {isLoadingStats ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-500">Carregando agendamentos...</p>
                </div>
              ) : todayAppointments.length > 0 ? (
                <div className="overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Horário
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Cliente
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Serviço
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Valor
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {todayAppointments.map((appointment) => (
                        <tr key={appointment.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {appointment.time}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {appointment.clientName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {appointment.service}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            R$ {appointment.value.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(appointment.status)}`}>
                              {getStatusText(appointment.status)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum agendamento hoje</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Comece criando um novo agendamento.
                  </p>
                  <div className="mt-6">
                    <Link
                      href="/agendamentos"
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      Novo Agendamento
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </AuthenticatedLayout>
  );
}