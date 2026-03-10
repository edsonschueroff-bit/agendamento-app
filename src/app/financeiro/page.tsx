'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/components/providers/AuthProvider';
import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout';
import { Appointment, Expense } from '@/lib/types';
import { getSubDocuments, addSubDocument, deleteSubDocument } from '@/lib/firestoreService';
import { format, startOfMonth, startOfWeek, startOfYear, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { serverTimestamp, Timestamp } from 'firebase/firestore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

interface FinancialStats {
  totalRevenue: number;
  monthlyRevenue: number;
  totalExpenses: number;
  monthlyExpenses: number;
  netProfit: number;
  totalAppointments: number;
  completedAppointments: number;
}

interface PaymentEntry {
  id: string;
  clientName: string;
  serviceName: string;
  amount: number;
  date: Date;
  status: 'agendado' | 'confirmado' | 'concluido' | 'cancelado';
}

type PeriodFilter = 'hoje' | 'semana' | 'mes' | 'ano' | 'customizado';

export default function FinanceiroPage() {
  const { user, loading, isAuthenticated } = useAuthContext();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'receitas' | 'despesas' | 'visao-geral'>('visao-geral');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('mes');
  const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });
  const [financialStats, setFinancialStats] = useState<FinancialStats>({
    totalRevenue: 0,
    monthlyRevenue: 0,
    totalExpenses: 0,
    monthlyExpenses: 0,
    netProfit: 0,
    totalAppointments: 0,
    completedAppointments: 0,
  });
  const [payments, setPayments] = useState<PaymentEntry[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [chartData, setChartData] = useState<Array<{ name: string; receitas: number; despesas: number; lucro: number }>>([]);

  // Estado para nova despesa
  const [newExpense, setNewExpense] = useState({
    description: '',
    amount: '',
    category: 'outro' as Expense['category'],
    date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [loading, isAuthenticated, router]);

  const getPeriodDateRange = useCallback(() => {
    const now = new Date();
    let start: Date;
    let end = endOfDay(now);

    switch (periodFilter) {
      case 'hoje':
        start = new Date(now);
        start.setHours(0, 0, 0, 0);
        break;
      case 'semana':
        start = startOfWeek(now, { weekStartsOn: 1 });
        break;
      case 'mes':
        start = startOfMonth(now);
        break;
      case 'ano':
        start = startOfYear(now);
        break;
      case 'customizado':
        if (!customDateRange.start || !customDateRange.end) {
          start = startOfMonth(now);
        } else {
          start = new Date(customDateRange.start);
          end = endOfDay(new Date(customDateRange.end));
        }
        break;
      default:
        start = startOfMonth(now);
    }
    return { start, end };
  }, [periodFilter, customDateRange]);

  const getChartLabel = useCallback(() => {
    switch (periodFilter) {
      case 'hoje':
        return 'Hoje';
      case 'semana':
        return 'Semana';
      case 'mes':
        return 'Mes';
      case 'ano':
        return 'Ano';
      case 'customizado':
        return 'Periodo';
      default:
        return 'Periodo';
    }
  }, [periodFilter]);

  const loadFinancialData = useCallback(async () => {
    if (!user?.uid) return;
    setIsLoading(true);

    try {
      const { start, end } = getPeriodDateRange();
      // Carregar Agendamentos
      const appointments = await getSubDocuments<Appointment>(
        'users', user.uid, 'appointments',
        undefined, 'date', 'desc'
      );

      // Carregar Despesas
      const expensesData = await getSubDocuments<Expense>(
        'users', user.uid, 'expenses',
        undefined, 'date', 'desc'
      );

      const periodAppointments = appointments.filter((appointment) => {
        const date = appointment.date?.toDate?.();
        return Boolean(date && date >= start && date <= end);
      });
      const periodCompletedAppointments = periodAppointments.filter((appointment) => appointment.status === 'concluido');
      const periodExpenses = expensesData.filter((expense) => {
        const date = expense.date?.toDate?.();
        return Boolean(date && date >= start && date <= end);
      });

      const periodRevenue = periodCompletedAppointments.reduce((sum, appointment) => sum + (appointment.servicePrice || 0), 0);
      const periodExpensesTotal = periodExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
      const periodNetProfit = periodRevenue - periodExpensesTotal;

      setFinancialStats({
        totalRevenue: periodRevenue,
        monthlyRevenue: periodRevenue,
        totalExpenses: periodExpensesTotal,
        monthlyExpenses: periodExpensesTotal,
        netProfit: periodNetProfit,
        totalAppointments: periodAppointments.length,
        completedAppointments: periodCompletedAppointments.length,
      });
      setChartData([
        {
          name: getChartLabel(),
          receitas: periodRevenue,
          despesas: periodExpensesTotal,
          lucro: periodNetProfit,
        },
      ]);

      const paymentEntries: PaymentEntry[] = periodCompletedAppointments.slice(0, 50).map(apt => ({
        id: apt.id || '',
        clientName: apt.clientName || 'Cliente',
        serviceName: apt.serviceName || 'Serviço',
        amount: apt.servicePrice || 0,
        date: apt.date?.toDate?.() || new Date(),
        status: apt.status,
      }));

      setPayments(paymentEntries);
      setExpenses(periodExpenses);
    } catch (error) {
      console.error('Erro ao carregar dados financeiros:', error);
      setChartData([
        {
          name: getChartLabel(),
          receitas: 0,
          despesas: 0,
          lucro: 0,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid, getPeriodDateRange, getChartLabel]);

  useEffect(() => {
    if (isAuthenticated && user?.uid) {
      loadFinancialData();
    }
  }, [isAuthenticated, user?.uid, loadFinancialData, periodFilter, customDateRange]);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) return;

    try {
      const expenseData: Omit<Expense, 'id'> = {
        description: newExpense.description,
        amount: parseFloat(newExpense.amount),
        category: newExpense.category,
        date: Timestamp.fromDate(new Date(newExpense.date)),
        userId: user.uid,
        createdAt: serverTimestamp() as Timestamp,
        updatedAt: serverTimestamp() as Timestamp,
      };

      await addSubDocument('users', user.uid, 'expenses', expenseData);
      setIsExpenseModalOpen(false);
      setNewExpense({
        description: '',
        amount: '',
        category: 'outro',
        date: new Date().toISOString().split('T')[0],
      });
      loadFinancialData();
    } catch (error) {
      console.error('Erro ao adicionar despesa:', error);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!user?.uid || !confirm('Tem certeza que deseja excluir esta despesa?')) return;
    try {
      await deleteSubDocument('users', user.uid, 'expenses', id);
      loadFinancialData();
    } catch (error) {
      console.error('Erro ao excluir despesa:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'concluido': return 'bg-green-100 text-green-800';
      case 'agendado': return 'bg-blue-100 text-blue-800';
      case 'cancelado': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'concluido': return 'Concluído';
      case 'agendado': return 'Agendado';
      case 'cancelado': return 'Cancelado';
      default: return 'Desconhecido';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl font-bold text-gray-400 animate-pulse">Carregando dados...</div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <AuthenticatedLayout>
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-30 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center py-6 gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Gestão Financeira</h1>
              <p className="text-gray-500 font-medium font-outfit">Controle completo de caixa e lucratividade</p>
            </div>
            <div className="flex bg-gray-100 p-1 rounded-xl w-full md:w-auto">
              {['visao-geral', 'receitas', 'despesas'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-sm font-bold capitalize transition-all duration-200 ${activeTab === tab ? 'bg-white text-blue-600 shadow-sm scale-105' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                    }`}
                >
                  {tab.replace('-', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Filtros de Período */}
          <div className="pb-6 flex flex-wrap gap-2">
            {(['hoje', 'semana', 'mes', 'ano', 'customizado'] as PeriodFilter[]).map((period) => (
              <button
                key={period}
                onClick={() => setPeriodFilter(period)}
                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all ${
                  periodFilter === period
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {period === 'hoje' && 'Hoje'}
                {period === 'semana' && 'Esta Semana'}
                {period === 'mes' && 'Este Mês'}
                {period === 'ano' && 'Este Ano'}
                {period === 'customizado' && 'Personalizado'}
              </button>
            ))}
          </div>

          {/* Filtro de Data Customizado */}
          {periodFilter === 'customizado' && (
            <div className="pb-6 flex gap-2 flex-wrap">
              <input
                type="date"
                value={customDateRange.start}
                onChange={(e) => setCustomDateRange({ ...customDateRange, start: e.target.value })}
                className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm font-medium"
              />
              <span className="text-gray-400 font-bold">até</span>
              <input
                type="date"
                value={customDateRange.end}
                onChange={(e) => setCustomDateRange({ ...customDateRange, end: e.target.value })}
                className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm font-medium"
              />
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-gradient-to-br from-green-50 to-white p-6 rounded-3xl border border-green-100 shadow-sm">
            <p className="text-sm font-bold text-gray-500 mb-1">Faturamento Bruto</p>
            <h2 className="text-3xl font-black text-gray-900">
              R$ {financialStats.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h2>
            <p className="text-xs text-green-600 mt-2 font-bold uppercase tracking-wider">Período Selecionado</p>
          </div>

          <div className="bg-gradient-to-br from-red-50 to-white p-6 rounded-3xl border border-red-100 shadow-sm">
            <p className="text-sm font-bold text-gray-500 mb-1">Gastos do Período</p>
            <h2 className="text-3xl font-black text-gray-900">
              R$ {financialStats.totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h2>
            <p className="text-xs text-red-600 mt-2 font-bold uppercase tracking-wider">Período Selecionado</p>
          </div>

          <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-6 rounded-3xl shadow-lg border border-blue-500">
            <p className="text-sm font-bold text-blue-100/80 mb-1">Lucro Real (Líquido)</p>
            <h2 className="text-3xl font-black text-white">
              R$ {financialStats.netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h2>
            <div className="mt-3 w-full bg-blue-400/30 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-white h-full"
                style={{ width: `${Math.max(0, Math.min(100, (financialStats.netProfit / (financialStats.totalRevenue || 1)) * 100))}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'visao-geral' && (
          <div className="space-y-8">
            {/* Gráfico de Comparação */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
              <h3 className="text-xl font-black text-gray-900 mb-6">Comparação: Receitas vs Despesas</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" stroke="#888" style={{ fontSize: '12px', fontWeight: 600 }} />
                  <YAxis stroke="#888" style={{ fontSize: '12px', fontWeight: 600 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #ccc',
                      borderRadius: '8px',
                      padding: '8px',
                    }}
                    formatter={(value) => `R$ ${Number(value).toFixed(2)}`}
                  />
                  <Legend />
                  <Bar dataKey="receitas" fill="#22c55e" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="despesas" fill="#ef4444" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                <h3 className="text-xl font-black text-gray-900 mb-6">Resumo do Período</h3>
                <div className="space-y-6">
                  {[
                    { label: 'Receitas no período', value: financialStats.monthlyRevenue, color: 'text-green-600' },
                    { label: 'Despesas no período', value: financialStats.monthlyExpenses, color: 'text-red-600' },
                    { label: 'Lucro Líquido', value: financialStats.netProfit, color: 'text-blue-600' }
                  ].map((item, i) => (
                    <div key={i} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl">
                      <span className="font-bold text-gray-500 text-sm uppercase tracking-wide">{item.label}</span>
                      <span className={`text-xl font-black ${item.color}`}>
                        R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-8 rounded-3xl shadow-xl text-white">
                <h3 className="text-xl font-extrabold mb-4">Insights de Performance</h3>
                <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                  Sua margem de lucro atual é de <span className="text-blue-400 font-black">{((financialStats.netProfit / (financialStats.monthlyRevenue || 1)) * 100).toFixed(1)}%</span>.
                  Mantenha suas despesas abaixo de 30% do faturamento para uma saúde financeira premium.
                </p>
                <div className="bg-white/10 p-4 rounded-2xl border border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
                    <span className="text-xs font-bold uppercase">Status da Empresa: Saudável</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'receitas' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                <h3 className="font-black text-gray-900">Histórico de Recebimentos</h3>
                <span className="text-xs font-bold text-gray-500 bg-white px-3 py-1 rounded-full shadow-sm">
                  Mostrando últimos {payments.length} recebimentos concluídos
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50/50 hidden sm:table-header-group">
                    <tr>
                      {['Cliente', 'Serviço', 'Valor', 'Data', 'Status'].map(h => (
                        <th key={h} className="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase tracking-widest">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 block sm:table-row-group">
                    {payments.length === 0 ? (
                      <tr className="block sm:table-row">
                        <td colSpan={5} className="block sm:table-cell p-6 text-center text-gray-400 font-medium">Nenhum recebimento registrado.</td>
                      </tr>
                    ) : (
                      payments.map((p) => (
                        <tr key={p.id} className="block sm:table-row border-b sm:border-b mb-4 sm:mb-0 hover:bg-blue-50/30 transition-colors group rounded-lg sm:rounded-none bg-white sm:bg-transparent">
                          <td className="block sm:table-cell px-6 py-4 before:content-['Cliente:'] before:font-bold before:text-gray-500 before:mr-2 before:block sm:before:hidden text-sm font-bold text-gray-900">{p.clientName}</td>
                          <td className="block sm:table-cell px-6 py-4 before:content-['Serviço:'] before:font-bold before:text-gray-500 before:mr-2 before:block sm:before:hidden text-sm text-gray-500">{p.serviceName}</td>
                          <td className="block sm:table-cell px-6 py-4 before:content-['Valor:'] before:font-bold before:text-gray-500 before:mr-2 before:block sm:before:hidden text-sm font-black text-blue-600">R$ {p.amount.toFixed(2)}</td>
                          <td className="block sm:table-cell px-6 py-4 before:content-['Data:'] before:font-bold before:text-gray-500 before:mr-2 before:block sm:before:hidden text-sm text-gray-500">{p.date.toLocaleDateString('pt-BR')}</td>
                          <td className="block sm:table-cell px-6 py-4 before:content-['Status:'] before:font-bold before:text-gray-500 before:mr-2 before:block sm:before:hidden">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter inline-block ${getStatusColor(p.status)}`}>
                              {getStatusText(p.status)}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'despesas' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-4">
              <h3 className="text-xl font-black text-gray-900">Controle de Gastos</h3>
              <button
                onClick={() => setIsExpenseModalOpen(true)}
                className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-2xl text-sm font-bold shadow-lg shadow-red-100 transition-all active:scale-95 flex items-center gap-2"
              >
                <span>+ Adicionar Despesa</span>
              </button>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50/50 hidden sm:table-header-group">
                    <tr>
                      {['Descrição', 'Categoria', 'Valor', 'Data', 'Ações'].map(h => (
                        <th key={h} className="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase tracking-widest">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 block sm:table-row-group">
                    {expenses.length === 0 ? (
                      <tr className="block sm:table-row">
                        <td colSpan={5} className="block sm:table-cell p-12 text-center text-gray-400 font-medium">Nenhuma despesa registrada.</td>
                      </tr>
                    ) : (
                      expenses.map((e) => (
                        <tr key={e.id} className="block sm:table-row border-b sm:border-b mb-4 sm:mb-0 hover:bg-red-50/30 transition-colors group rounded-lg sm:rounded-none bg-white sm:bg-transparent">
                          <td className="block sm:table-cell px-6 py-4 before:content-['Descrição:'] before:font-bold before:text-gray-500 before:mr-2 before:block sm:before:hidden text-sm font-bold text-gray-900">{e.description}</td>
                          <td className="block sm:table-cell px-6 py-4 before:content-['Categoria:'] before:font-bold before:text-gray-500 before:mr-2 before:block sm:before:hidden">
                            <span className="px-3 py-1 bg-gray-100 rounded-full text-xs font-bold text-gray-600">{e.category}</span>
                          </td>
                          <td className="block sm:table-cell px-6 py-4 before:content-['Valor:'] before:font-bold before:text-gray-500 before:mr-2 before:block sm:before:hidden text-sm font-black text-red-600">R$ {e.amount.toFixed(2)}</td>
                          <td className="block sm:table-cell px-6 py-4 before:content-['Data:'] before:font-bold before:text-gray-500 before:mr-2 before:block sm:before:hidden text-sm text-gray-500">
                            {e.date?.toDate ? e.date.toDate().toLocaleDateString('pt-BR') : 'Data inválida'}
                          </td>
                          <td className="block sm:table-cell px-6 py-4 before:content-['Ações:'] before:font-bold before:text-gray-500 before:mr-2 before:block sm:before:hidden">
                            <button
                              onClick={() => handleDeleteExpense(e.id!)}
                              className="text-gray-300 hover:text-red-600 p-2 transition-colors inline-block"
                              title="Excluir despesa"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Expense Modal */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-xl font-black text-gray-900">Nova Despesa</h3>
              <button onClick={() => setIsExpenseModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-2">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleAddExpense} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Descrição</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Aluguel, Produtos de Cabelo..."
                  className="w-full px-4 py-3 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-red-500/20 text-sm font-bold transition-all"
                  value={newExpense.description}
                  onChange={e => setNewExpense({ ...newExpense, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    className="w-full px-4 py-3 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-red-500/20 text-sm font-bold transition-all"
                    value={newExpense.amount}
                    onChange={e => setNewExpense({ ...newExpense, amount: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Categoria</label>
                  <select
                    className="w-full px-4 py-3 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-red-500/20 text-sm font-bold transition-all appearance-none"
                    value={newExpense.category}
                    onChange={e => setNewExpense({ ...newExpense, category: e.target.value as any })}
                  >
                    {['aluguel', 'material', 'salário', 'outro'].map(c => (
                      <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Data</label>
                <input
                  type="date"
                  required
                  className="w-full px-4 py-3 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-red-500/20 text-sm font-bold transition-all"
                  value={newExpense.date}
                  onChange={e => setNewExpense({ ...newExpense, date: e.target.value })}
                />
              </div>
              <button
                type="submit"
                className="w-full bg-gray-900 hover:bg-black text-white py-4 rounded-2xl font-black text-sm transition-all active:scale-[0.98] shadow-xl shadow-gray-200 mt-4"
              >
                Salvar Despesa
              </button>
            </form>
          </div>
        </div>
      )}
    </AuthenticatedLayout>
  );
}
