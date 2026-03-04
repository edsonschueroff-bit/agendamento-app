'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/components/providers/AuthProvider';
import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout';
import { BusinessSettings, DayOfWeek, DaySchedule } from '@/lib/types';
import { getSubDocument, setSubDocument } from '@/lib/firestoreService';

const DAYS: { key: DayOfWeek; label: string }[] = [
    { key: 'segunda', label: 'Segunda-feira' },
    { key: 'terca', label: 'Terça-feira' },
    { key: 'quarta', label: 'Quarta-feira' },
    { key: 'quinta', label: 'Quinta-feira' },
    { key: 'sexta', label: 'Sexta-feira' },
    { key: 'sabado', label: 'Sábado' },
    { key: 'domingo', label: 'Domingo' },
];

const defaultSchedule: Record<DayOfWeek, DaySchedule> = {
    segunda: { enabled: true, open: '09:00', close: '18:00' },
    terca: { enabled: true, open: '09:00', close: '18:00' },
    quarta: { enabled: true, open: '09:00', close: '18:00' },
    quinta: { enabled: true, open: '09:00', close: '18:00' },
    sexta: { enabled: true, open: '09:00', close: '18:00' },
    sabado: { enabled: false, open: '09:00', close: '13:00' },
    domingo: { enabled: false, open: '09:00', close: '12:00' },
};

export default function ConfiguracoesPage() {
    const { loading, isAuthenticated, user } = useAuthContext();
    const router = useRouter();

    const [businessName, setBusinessName] = useState('');
    const [phone, setPhone] = useState('');
    const [schedule, setSchedule] = useState<Record<DayOfWeek, DaySchedule>>(defaultSchedule);
    const [holidays, setHolidays] = useState<string[]>([]);
    const [timeBetweenAppointments, setTimeBetweenAppointments] = useState(0);
    const [minHoursNotice, setMinHoursNotice] = useState(24);
    const [penaltyPercentage, setPenaltyPercentage] = useState(0);
    const [sendEmailReminder, setSendEmailReminder] = useState(true);
    const [reminderHoursBefore, setReminderHoursBefore] = useState(24);
    const [sendSMSReminder, setSendSMSReminder] = useState(false);
    const [notifyOnNewAppointment, setNotifyOnNewAppointment] = useState(true);
    const [activeTab, setActiveTab] = useState<'geral' | 'horarios' | 'cancelamento' | 'notificacoes'>('geral');
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [newHoliday, setNewHoliday] = useState('');

    const loadSettings = useCallback(async () => {
        if (!user?.uid) return;
        setIsLoading(true);
        try {
            const settings = await getSubDocument<BusinessSettings>('users', user.uid, 'settings', 'business');
            if (settings) {
                setBusinessName(settings.businessName || '');
                setPhone(settings.phone || '');
                setSchedule(settings.schedule || defaultSchedule);
                setHolidays(settings.holidays || []);
                setTimeBetweenAppointments(settings.timeBetweenAppointments || 0);
                setMinHoursNotice(settings.cancellationPolicy?.minHoursNotice || 24);
                setPenaltyPercentage(settings.cancellationPolicy?.penaltyPercentage || 0);
                setSendEmailReminder(settings.notifications?.sendEmailReminder ?? true);
                setReminderHoursBefore(settings.notifications?.reminderHoursBefore || 24);
                setSendSMSReminder(settings.notifications?.sendSMSReminder ?? false);
                setNotifyOnNewAppointment(settings.notifications?.notifyOnNewAppointment ?? true);
            }
        } catch (error) {
            console.error('Erro ao carregar configurações:', error);
        } finally {
            setIsLoading(false);
        }
    }, [user?.uid]);

    useEffect(() => {
        if (!loading && !isAuthenticated) router.push('/login');
    }, [loading, isAuthenticated, router]);

    useEffect(() => {
        if (isAuthenticated && user?.uid) loadSettings();
    }, [isAuthenticated, user?.uid, loadSettings]);

    const updateDay = (day: DayOfWeek, field: keyof DaySchedule, value: string | boolean) => {
        setSchedule(prev => ({
            ...prev,
            [day]: { ...prev[day], [field]: value },
        }));
    };

    const addHoliday = () => {
        if (newHoliday && !holidays.includes(newHoliday)) {
            setHolidays([...holidays, newHoliday]);
            setNewHoliday('');
        }
    };

    const removeHoliday = (date: string) => {
        setHolidays(holidays.filter(h => h !== date));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.uid) return;
        setIsSaving(true);
        try {
            const settings: BusinessSettings = {
                userId: user.uid,
                businessName,
                phone,
                schedule,
                holidays,
                timeBetweenAppointments,
                cancellationPolicy: {
                    minHoursNotice,
                    penaltyPercentage,
                },
                notifications: {
                    sendEmailReminder,
                    reminderHoursBefore,
                    sendSMSReminder,
                    notifyOnNewAppointment,
                },
            };
            await setSubDocument('users', user.uid, 'settings', 'business', settings);
            setMessage({ type: 'success', text: 'Configurações salvas com sucesso!' });
        } catch (error) {
            console.error('Erro ao salvar:', error);
            setMessage({ type: 'error', text: 'Erro ao salvar configurações.' });
        } finally {
            setIsSaving(false);
            setTimeout(() => setMessage(null), 3000);
        }
    };

    if (loading || isLoading) {
        return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;
    }

    return (
        <AuthenticatedLayout>
            <div className="p-6 max-w-4xl mx-auto">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">Configurações do Negócio</h1>
                    <p className="text-gray-600">Gerencie seus horários, políticas e notificações.</p>
                </div>

                {message && (
                    <div className={`mb-4 p-4 rounded-md ${message.type === 'success' ? 'bg-green-100 border border-green-400 text-green-700' : 'bg-red-100 border border-red-400 text-red-700'}`}>
                        {message.text}
                    </div>
                )}

                {/* Abas de Navegação */}
                <div className="mb-6 flex flex-wrap gap-2 border-b border-gray-200">
                    {[
                        { id: 'geral', label: '⚙️ Geral', icon: '⚙️' },
                        { id: 'horarios', label: '🕐 Horários', icon: '�' },
                        { id: 'cancelamento', label: '❌ Cancelamento', icon: '❌' },
                        { id: 'notificacoes', label: '🔔 Notificações', icon: '🔔' },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            type="button"
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

                {/* �🔗 Link Público de Agendamento */}
                {user?.uid && (
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg shadow p-5 mb-6 text-white">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-xl">🔗</span>
                            <h2 className="text-lg font-semibold">Seu Link de Agendamento</h2>
                        </div>
                        <p className="text-blue-100 text-sm mb-3">
                            Compartilhe este link com seus clientes. Eles poderão agendar sozinhos sem precisar criar conta!
                        </p>
                        <div className="flex items-center gap-2 bg-white/20 rounded-lg px-3 py-2">
                            <code className="text-sm text-white flex-1 truncate">
                                {typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/agendar/{user.uid}
                            </code>
                            <button
                                type="button"
                                onClick={() => {
                                    const url = `${window.location.origin}/agendar/${user.uid}`;
                                    navigator.clipboard.writeText(url);
                                    setMessage({ type: 'success', text: '✅ Link copiado! Cole no WhatsApp, Instagram ou onde preferir.' });
                                    setTimeout(() => setMessage(null), 3000);
                                }}
                                className="flex-shrink-0 bg-white text-blue-600 text-xs font-bold px-3 py-1.5 rounded-md hover:bg-blue-50 transition-colors"
                            >
                                Copiar
                            </button>
                        </div>
                        <a
                            href={`/agendar/${user.uid}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block mt-3 text-blue-100 hover:text-white text-xs underline"
                        >
                            Ver como seu cliente vê →
                        </a>
                    </div>
                )}

                <form onSubmit={handleSave} className="space-y-6">
                    {/* Aba: Geral */}
                    {activeTab === 'geral' && (
                        <div className="bg-white rounded-lg shadow p-6">
                            <h2 className="text-lg font-semibold text-gray-800 mb-4">⚙️ Informações Gerais</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Negócio</label>
                                    <input
                                        type="text"
                                        value={businessName}
                                        onChange={e => setBusinessName(e.target.value)}
                                        placeholder="Ex: Studio Edson"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Telefone / WhatsApp</label>
                                    <input
                                        type="tel"
                                        value={phone}
                                        onChange={e => setPhone(e.target.value)}
                                        placeholder="Ex: 11999999999"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Aba: Horários */}
                    {activeTab === 'horarios' && (
                        <div className="space-y-6">
                            {/* Horários de Funcionamento */}
                            <div className="bg-white rounded-lg shadow p-6">
                                <h2 className="text-lg font-semibold text-gray-800 mb-4">🕐 Horários de Atendimento</h2>
                                <p className="text-sm text-gray-500 mb-4">Ative os dias em que você atende e defina o horário de início e fim.</p>
                                <div className="space-y-3">
                                    {DAYS.map(({ key, label }) => (
                                        <div key={key} className="flex items-center gap-4 py-2 border-b border-gray-100 last:border-0">
                                            <div className="w-36 flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    id={`day-${key}`}
                                                    checked={schedule[key].enabled}
                                                    onChange={e => updateDay(key, 'enabled', e.target.checked)}
                                                    className="w-4 h-4 text-blue-600 rounded"
                                                />
                                                <label htmlFor={`day-${key}`} className={`text-sm font-medium ${schedule[key].enabled ? 'text-gray-800' : 'text-gray-400'}`}>
                                                    {label}
                                                </label>
                                            </div>
                                            {schedule[key].enabled ? (
                                                <div className="flex items-center gap-2 flex-1">
                                                    <input
                                                        type="time"
                                                        value={schedule[key].open}
                                                        onChange={e => updateDay(key, 'open', e.target.value)}
                                                        className="px-2 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                                    />
                                                    <span className="text-gray-400 text-sm">até</span>
                                                    <input
                                                        type="time"
                                                        value={schedule[key].close}
                                                        onChange={e => updateDay(key, 'close', e.target.value)}
                                                        className="px-2 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                                    />
                                                </div>
                                            ) : (
                                                <span className="text-sm text-gray-400 italic">Fechado</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Intervalo entre Agendamentos */}
                            <div className="bg-white rounded-lg shadow p-6">
                                <h2 className="text-lg font-semibold text-gray-800 mb-4">⏱️ Intervalo entre Agendamentos</h2>
                                <p className="text-sm text-gray-500 mb-4">Tempo mínimo para preparação entre atendimentos.</p>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Minutos</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="120"
                                        value={timeBetweenAppointments}
                                        onChange={e => setTimeBetweenAppointments(Math.max(0, parseInt(e.target.value) || 0))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            {/* Dias de Folga e Feriados */}
                            <div className="bg-white rounded-lg shadow p-6">
                                <h2 className="text-lg font-semibold text-gray-800 mb-4">📅 Dias de Folga e Feriados</h2>
                                <p className="text-sm text-gray-500 mb-4">Datas em que você não estará disponível.</p>
                                <div className="flex gap-2 mb-4">
                                    <input
                                        type="date"
                                        value={newHoliday}
                                        onChange={e => setNewHoliday(e.target.value)}
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <button
                                        type="button"
                                        onClick={addHoliday}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
                                    >
                                        Adicionar
                                    </button>
                                </div>
                                {holidays.length > 0 ? (
                                    <div className="space-y-2">
                                        {holidays.sort().map(date => (
                                            <div key={date} className="flex items-center justify-between bg-gray-50 p-3 rounded-md">
                                                <span className="text-sm text-gray-700">
                                                    {new Date(date).toLocaleDateString('pt-BR')}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => removeHoliday(date)}
                                                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                                                >
                                                    Remover
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-400 italic">Nenhum dia de folga configurado</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Aba: Cancelamento */}
                    {activeTab === 'cancelamento' && (
                        <div className="bg-white rounded-lg shadow p-6">
                            <h2 className="text-lg font-semibold text-gray-800 mb-4">❌ Política de Cancelamento</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Horas mínimas para cancelar
                                    </label>
                                    <p className="text-xs text-gray-500 mb-2">Tempo mínimo que o cliente precisa avisar para cancelar sem penalidade</p>
                                    <select
                                        value={minHoursNotice}
                                        onChange={e => setMinHoursNotice(parseInt(e.target.value))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="0">Sem restrição</option>
                                        <option value="1">1 hora</option>
                                        <option value="2">2 horas</option>
                                        <option value="6">6 horas</option>
                                        <option value="12">12 horas</option>
                                        <option value="24">24 horas</option>
                                        <option value="48">48 horas</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Penalidade por cancelamento tardio
                                    </label>
                                    <p className="text-xs text-gray-500 mb-2">Percentual do valor da sessão que será cobrado</p>
                                    <div className="flex gap-2 items-end">
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={penaltyPercentage}
                                            onChange={e => setPenaltyPercentage(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
                                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                        <span className="text-gray-700 font-medium">%</span>
                                    </div>
                                    {penaltyPercentage > 0 && (
                                        <p className="mt-2 text-xs bg-yellow-50 border border-yellow-200 rounded p-2 text-yellow-800">
                                            ℹ️ Clientes que cancelarem sem {minHoursNotice} horas de antecedência pagarão {penaltyPercentage}% do valor
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Aba: Notificações */}
                    {activeTab === 'notificacoes' && (
                        <div className="bg-white rounded-lg shadow p-6">
                            <h2 className="text-lg font-semibold text-gray-800 mb-4">🔔 Configurações de Notificações</h2>
                            <div className="space-y-4">
                                <div className="border-b border-gray-200 pb-4">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={sendEmailReminder}
                                            onChange={e => setSendEmailReminder(e.target.checked)}
                                            className="w-4 h-4 text-blue-600 rounded"
                                        />
                                        <span className="text-sm font-medium text-gray-700">Enviar lembretes por email</span>
                                    </label>
                                    {sendEmailReminder && (
                                        <div className="mt-3 ml-7">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Tempo de antecedência</label>
                                            <select
                                                value={reminderHoursBefore}
                                                onChange={e => setReminderHoursBefore(parseInt(e.target.value))}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            >
                                                <option value="1">1 hora antes</option>
                                                <option value="12">12 horas antes</option>
                                                <option value="24">24 horas antes</option>
                                                <option value="48">48 horas antes</option>
                                            </select>
                                        </div>
                                    )}
                                </div>

                                <div className="border-b border-gray-200 pb-4">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={sendSMSReminder}
                                            onChange={e => setSendSMSReminder(e.target.checked)}
                                            className="w-4 h-4 text-blue-600 rounded"
                                        />
                                        <span className="text-sm font-medium text-gray-700">Enviar lembretes por SMS</span>
                                    </label>
                                    <p className="ml-7 mt-1 text-xs text-gray-500">
                                        ℹ️ Requer integração com serviço de SMS (em breve)
                                    </p>
                                </div>

                                <div className="pb-4">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={notifyOnNewAppointment}
                                            onChange={e => setNotifyOnNewAppointment(e.target.checked)}
                                            className="w-4 h-4 text-blue-600 rounded"
                                        />
                                        <span className="text-sm font-medium text-gray-700">Notificar sobre novos agendamentos</span>
                                    </label>
                                    <p className="ml-7 mt-1 text-xs text-gray-500">
                                        Receba alertas quando um novo cliente agendar via seu link público
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Botão Salvar */}
                    <div className="flex justify-end gap-2">
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 font-medium"
                        >
                            {isSaving ? 'Salvando...' : 'Salvar Configurações'}
                        </button>
                    </div>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
