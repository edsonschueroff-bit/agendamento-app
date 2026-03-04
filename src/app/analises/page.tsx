'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/components/providers/AuthProvider';
import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout';
import { Appointment, Service, Client, Expense, ServiceAnalytics, ClientAnalytics, RevenueAnalytics } from '@/lib/types';
import { getSubDocuments } from '@/lib/firestoreService';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart
} from 'recharts';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';

type PeriodFilter = 'mes' | 'trimestre' | 'ano' | 'customizado';

interface ChartData {
  name: string;
  receitas: number;
  despesas: number;
  lucro: number;
}

interface TrendData {
  period: string;
  revenue: number;
  expenses: number;
}

export default function AnalisesPage() {
  const { user, loading, isAuthenticated } = useAuthContext();
  const router = useRouter();

  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('mes');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [activeTab, setActiveTab] = useState<'visao-geral' | 'servicos' | 'clientes' | 'tendencias'>('visao-geral');

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Analytics data
  const [revenueAnalytics, setRevenueAnalytics] = useState<RevenueAnalytics | null>(null);
  const [topServices, setTopServices] = useState<ServiceAnalytics[]>([]);
  const [topClients, setTopClients] = useState<ClientAnalytics[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [trendData, setTrendData] = useState<TrendData[]>([]);

  // Load data from Firestore
  const loadData = useCallback(async () => {
    if (!user?.uid) return;
    setIsLoading(true);
    try {
      const [appts, svcs, clnts, exps] = await Promise.all([
        getSubDocuments<Appointment>('users', user.uid, 'appointments'),
        getSubDocuments<Service>('users', user.uid, 'services'),
        getSubDocuments<Client>('users', user.uid, 'clients'),
        getSubDocuments<Expense>('users', user.uid, 'expenses'),
      ]);
      setAppointments(appts);
      setServices(svcs);
      setClients(clnts);
      setExpenses(exps);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid]);

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

  // Get period date range
  const getPeriodDateRange = useCallback(() => {
    const now = new Date();
    let start: Date;
    let end = endOfMonth(now);

    switch (periodFilter) {
      case 'mes':
        start = startOfMonth(now);
        break;
      case 'trimestre':
        start = subMonths(now, 3);
        break;
      case 'ano':
        start = startOfYear(now);
        end = endOfYear(now);
        break;
      case 'customizado':
        if (customStartDate && customEndDate) {
          start = new Date(customStartDate);
          end = new Date(customEndDate);
        } else {
          start = startOfMonth(now);
        }
        break;
      default:
        start = startOfMonth(now);
    }

    return { start, end };
  }, [periodFilter, customStartDate, customEndDate]);

  // Calculate analytics
  const calculateAnalytics = useCallback(() => {
    const now = new Date();
    const { start, end } = getPeriodDateRange();

    // Filter appointments by period
    const filteredAppointments = appointments.filter(apt => {
      const aptDate = apt.date instanceof Date ? apt.date : apt.date?.toDate?.();
      return aptDate && aptDate >= start && aptDate <= end && apt.status === 'concluido';
    });

    // Filter expenses by period
    const filteredExpenses = expenses.filter(exp => {
      const expDate = exp.date instanceof Date ? exp.date : exp.date?.toDate?.();
      return expDate && expDate >= start && expDate <= end;
    });

    // Revenue analytics
    const totalRevenue = filteredAppointments.reduce((sum, apt) => sum + (apt.servicePrice || 0), 0);
    const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const netProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    setRevenueAnalytics({
      period: format(start, 'MMM yyyy', { locale: ptBR }),
      totalRevenue,
      totalExpenses,
      netProfit,
      profitMargin: parseFloat(profitMargin.toFixed(2)),
      appointmentCount: filteredAppointments.length,
      averageTicket: filteredAppointments.length > 0 ? totalRevenue / filteredAppointments.length : 0,
      trend: 0,
    });

    // Top Services
    const serviceMap: Record<string, ServiceAnalytics> = {};
    filteredAppointments.forEach(apt => {
      if (!serviceMap[apt.serviceId]) {
        serviceMap[apt.serviceId] = {
          serviceId: apt.serviceId,
          serviceName: apt.serviceName,
          totalAppointments: 0,
          totalRevenue: 0,
          averagePrice: 0,
          trend: 0,
          ranking: 0,
        };
      }
      serviceMap[apt.serviceId].totalAppointments += 1;
      serviceMap[apt.serviceId].totalRevenue += apt.servicePrice || 0;
    });

    const topSvcs = Object.values(serviceMap)
      .map(s => ({
        ...s,
        averagePrice: s.totalAppointments > 0 ? s.totalRevenue / s.totalAppointments : 0,
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 5)
      .map((s, idx) => ({ ...s, ranking: idx + 1 }));

    setTopServices(topSvcs);

    // Top Clients
    const clientMap: Record<string, ClientAnalytics> = {};
    filteredAppointments.forEach(apt => {
      if (!clientMap[apt.clientId]) {
        const client = clients.find(c => c.id === apt.clientId);
        clientMap[apt.clientId] = {
          clientId: apt.clientId,
          clientName: apt.clientName,
          totalAppointments: 0,
          totalSpent: 0,
          averageTicket: 0,
          lastAppointment: apt.date,
          status: 'regular',
          potential: 'medium',
          churnRisk: false,
        };
      }
      clientMap[apt.clientId].totalAppointments += 1;
      clientMap[apt.clientId].totalSpent += apt.servicePrice || 0;
      clientMap[apt.clientId].lastAppointment = apt.date;
    });

    const topClnts = Object.values(clientMap)
      .map(c => ({
        ...c,
        averageTicket: c.totalAppointments > 0 ? c.totalSpent / c.totalAppointments : 0,
        status: (c.totalAppointments >= 5 ? 'regular' : c.totalAppointments > 1 ? 'occasional' : 'regular') as 'regular' | 'occasional' | 'dormant',
        potential: (
          c.totalSpent > totalRevenue * 0.1 ? 'high' :
          c.totalSpent > totalRevenue * 0.05 ? 'medium' : 'low'
        ) as 'high' | 'medium' | 'low',
        churnRisk: c.totalAppointments >= 2 && new Date().getTime() - getDateObject(c.lastAppointment).getTime() > 90 * 24 * 60 * 60 * 1000,
      }))
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 5);

    setTopClients(topClnts);

    // Generate chart data for daily breakdown
    const dailyData: Record<string, ChartData> = {};
    const current = new Date(start);

    while (current <= end) {
      const dateKey = format(current, 'dd/MM');
      dailyData[dateKey] = {
        name: dateKey,
        receitas: 0,
        despesas: 0,
        lucro: 0,
      };
      current.setDate(current.getDate() + 1);
    }

    filteredAppointments.forEach(apt => {
      const dateKey = format(getDateObject(apt.date), 'dd/MM');
      if (dailyData[dateKey]) {
        dailyData[dateKey].receitas += apt.servicePrice || 0;
      }
    });

    filteredExpenses.forEach(exp => {
      const dateKey = format(getDateObject(exp.date), 'dd/MM');
      if (dailyData[dateKey]) {
        dailyData[dateKey].despesas += exp.amount;
      }
    });

    Object.values(dailyData).forEach(data => {
      data.lucro = data.receitas - data.despesas;
    });

    setChartData(Object.values(dailyData).slice(-30)); // Last 30 days

    // Trend data (last 6 months)
    const trendMonths = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(now, i));
      const monthEnd = endOfMonth(monthStart);
      const monthAppts = appointments.filter(apt => {
        const aptDate = apt.date.toDate?.();
        return aptDate && aptDate >= monthStart && aptDate <= monthEnd && apt.status === 'concluido';
      });
      const monthExps = expenses.filter(exp => {
        const expDate = exp.date.toDate?.();
        return expDate && expDate >= monthStart && expDate <= monthEnd;
      });

      trendMonths.push({
        period: format(monthStart, 'MMM', { locale: ptBR }),
        revenue: monthAppts.reduce((sum, apt) => sum + (apt.servicePrice || 0), 0),
        expenses: monthExps.reduce((sum, exp) => sum + exp.amount, 0),
      });
    }
    setTrendData(trendMonths);
  }, [appointments, expenses, clients, getPeriodDateRange]);

  useEffect(() => {
    if (!loading && !isAuthenticated) router.push('/login');
  }, [loading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated && user?.uid) loadData();
  }, [isAuthenticated, user?.uid, loadData]);

  useEffect(() => {
    if (appointments.length > 0 || expenses.length > 0) {
      calculateAnalytics();
    }
  }, [appointments, expenses, periodFilter, customStartDate, customEndDate, calculateAnalytics]);

  const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];

  if (loading || isLoading) {
    return (
      <AuthenticatedLayout>
        <div className="flex items-center justify-center min-h-screen">Carregando análises...</div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">📊 Análises Avançadas</h1>
          <p className="text-gray-600">Inteligência de negócio e insights estratégicos</p>
        </div>

        {/* Period Filter */}
        <div className="mb-6 flex flex-wrap gap-2 items-center">
          <div className="flex gap-2 flex-wrap">
            {[
              { id: 'mes', label: 'Este Mês' },
              { id: 'trimestre', label: 'Últimos 3 Meses' },
              { id: 'ano', label: 'Este Ano' },
              { id: 'customizado', label: 'Personalizado' },
            ].map(period => (
              <button
                key={period.id}
                onClick={() => setPeriodFilter(period.id as any)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  periodFilter === period.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {period.label}
              </button>
            ))}
          </div>

          {periodFilter === 'customizado' && (
            <div className="flex gap-2">
              <input
                type="date"
                value={customStartDate}
                onChange={e => setCustomStartDate(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm"
              />
              <span className="text-gray-400">até</span>
              <input
                type="date"
                value={customEndDate}
                onChange={e => setCustomEndDate(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm"
              />
            </div>
          )}
        </div>

        {/* Abas */}
        <div className="mb-6 flex flex-wrap gap-2 border-b border-gray-200">
          {[
            { id: 'visao-geral', label: '👁️ Visão Geral' },
            { id: 'servicos', label: '🎯 Top Serviços' },
            { id: 'clientes', label: '👥 Top Clientes' },
            { id: 'tendencias', label: '📈 Tendências' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Visão Geral */}
        {activeTab === 'visao-geral' && revenueAnalytics && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow p-6 text-white">
                <h3 className="text-sm font-medium opacity-90 mb-2">Faturamento</h3>
                <p className="text-2xl font-bold">R$ {revenueAnalytics.totalRevenue.toFixed(2).replace('.', ',')}</p>
                <p className="text-xs opacity-75 mt-1">{revenueAnalytics.appointmentCount} agendamentos</p>
              </div>

              <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow p-6 text-white">
                <h3 className="text-sm font-medium opacity-90 mb-2">Despesas</h3>
                <p className="text-2xl font-bold">R$ {revenueAnalytics.totalExpenses.toFixed(2).replace('.', ',')}</p>
                <p className="text-xs opacity-75 mt-1">Total do período</p>
              </div>

              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow p-6 text-white">
                <h3 className="text-sm font-medium opacity-90 mb-2">Lucro Líquido</h3>
                <p className="text-2xl font-bold">R$ {revenueAnalytics.netProfit.toFixed(2).replace('.', ',')}</p>
                <p className="text-xs opacity-75 mt-1">Margem: {revenueAnalytics.profitMargin.toFixed(1)}%</p>
              </div>

              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow p-6 text-white">
                <h3 className="text-sm font-medium opacity-90 mb-2">Ticket Médio</h3>
                <p className="text-2xl font-bold">R$ {revenueAnalytics.averageTicket.toFixed(2).replace('.', ',')}</p>
                <p className="text-xs opacity-75 mt-1">Por agendamento</p>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Daily Revenue vs Expenses */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">💰 Receitas vs Despesas (Diário)</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip formatter={(value) => `R$ ${Number(value).toFixed(2)}`} />
                    <Legend />
                    <Bar dataKey="receitas" fill="#10b981" name="Receitas" />
                    <Bar dataKey="despesas" fill="#ef4444" name="Despesas" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Profit Evolution */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">📈 Evolução do Lucro</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip formatter={(value) => `R$ ${Number(value).toFixed(2)}`} />
                    <Bar dataKey="lucro" fill="#3b82f6" name="Lucro" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Health Score and Insights */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">💡 Insights Estratégicos</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded p-4">
                  <p className="text-sm text-blue-900">
                    <strong>🎯 Objetivo:</strong> Sua margem de lucro é de {revenueAnalytics.profitMargin.toFixed(1)}%. Mantenha acima de 30% para um negócio saudável.
                  </p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded p-4">
                  <p className="text-sm text-green-900">
                    <strong>✅ Sucesso:</strong> Você teve {revenueAnalytics.appointmentCount} agendamentos confirmados este período.
                  </p>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded p-4">
                  <p className="text-sm text-amber-900">
                    <strong>💰 Ticket:</strong> Seu ticket médio é R$ {revenueAnalytics.averageTicket.toFixed(2)}. Considere promoção cruzada.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Top Services */}
        {activeTab === 'servicos' && topServices.length > 0 && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Services by Revenue */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">🎯 Top 5 Serviços por Receita</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topServices} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" fontSize={12} />
                    <YAxis dataKey="serviceName" type="category" fontSize={11} width={100} />
                    <Tooltip formatter={(value) => `R$ ${Number(value).toFixed(2)}`} />
                    <Bar dataKey="totalRevenue" fill="#3b82f6" name="Receita" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Services by Volume */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">📊 Distribuição de Serviços</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={topServices}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ index }) => topServices[index]?.serviceName}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="totalAppointments"
                    >
                      {topServices.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Services Table */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">📋 Detalhes dos Serviços</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Serviço</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Agendamentos</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Receita Total</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Ticket Médio</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Ranking</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topServices.map(service => (
                      <tr key={service.serviceId} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-900 font-medium">{service.serviceName}</td>
                        <td className="px-4 py-3 text-gray-600">{service.totalAppointments}</td>
                        <td className="px-4 py-3 text-gray-600">R$ {service.totalRevenue.toFixed(2).replace('.', ',')}</td>
                        <td className="px-4 py-3 text-gray-600">R$ {service.averagePrice.toFixed(2).replace('.', ',')}</td>
                        <td className="px-4 py-3">
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                            #{service.ranking}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Top Clients */}
        {activeTab === 'clientes' && topClients.length > 0 && (
          <div className="space-y-6">
            {/* Clients Table */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">👥 Seus Melhores Clientes</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Cliente</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Agendamentos</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Total Gasto</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Ticket Médio</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Potencial</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Risco</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topClients.map(client => (
                      <tr key={client.clientId} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-900 font-medium">{client.clientName}</td>
                        <td className="px-4 py-3 text-gray-600">{client.totalAppointments}</td>
                        <td className="px-4 py-3 text-gray-600">R$ {client.totalSpent.toFixed(2).replace('.', ',')}</td>
                        <td className="px-4 py-3 text-gray-600">R$ {client.averageTicket.toFixed(2).replace('.', ',')}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            client.potential === 'high' ? 'bg-green-100 text-green-800' :
                            client.potential === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {client.potential === 'high' ? '⭐ Alto' : client.potential === 'medium' ? '💛 Médio' : '📍 Baixo'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {client.churnRisk ? (
                            <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-medium">⚠️ Risco</span>
                          ) : (
                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">✅ Seguro</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recommendations */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {topClients
                .filter(c => c.churnRisk)
                .length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-red-900 mb-2">⚠️ Clientes em Risco</h4>
                  <ul className="text-sm text-red-800 space-y-1">
                    {topClients
                      .filter(c => c.churnRisk)
                      .map(c => (
                        <li key={c.clientId}>• {c.clientName} - Sem agendamentos há mais de 90 dias</li>
                      ))}
                  </ul>
                </div>
              )}

              {topClients
                .filter(c => c.potential === 'high')
                .length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-green-900 mb-2">⭐ Alto Potencial</h4>
                  <ul className="text-sm text-green-800 space-y-1">
                    {topClients
                      .filter(c => c.potential === 'high')
                      .map(c => (
                        <li key={c.clientId}>• {c.clientName} - R$ {c.totalSpent.toFixed(2).replace('.', ',')} gasto</li>
                      ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tendências */}
        {activeTab === 'tendencias' && trendData.length > 0 && (
          <div className="space-y-6">
            {/* 6-Month Trend */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">📊 Tendência de 6 Meses</h3>
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip formatter={(value) => `R$ ${Number(value).toFixed(2)}`} />
                  <Legend />
                  <Bar dataKey="revenue" fill="#10b981" name="Receitas" />
                  <Bar dataKey="expenses" fill="#ef4444" name="Despesas" />
                  <Line type="monotone" dataKey="revenue" stroke="#059669" name="Linha Receita" strokeWidth={2} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Trend Analysis */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-3">💡 Análise de Tendências</h3>
              <ul className="space-y-2 text-sm text-blue-800">
                <li>• Período analisado: últimos 6 meses</li>
                <li>• Acompanhe as flutuações de receita e despesas</li>
                <li>• Identifique períodos de alta e baixa demanda</li>
                <li>• Use para planejar estratégia de marketing e staffing</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
