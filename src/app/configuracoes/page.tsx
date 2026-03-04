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
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const loadSettings = useCallback(async () => {
        if (!user?.uid) return;
        setIsLoading(true);
        try {
            const settings = await getSubDocument<BusinessSettings>('users', user.uid, 'settings', 'business');
            if (settings) {
                setBusinessName(settings.businessName || '');
                setPhone(settings.phone || '');
                setSchedule(settings.schedule || defaultSchedule);
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
            <div className="p-6 max-w-2xl mx-auto">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">Configurações do Negócio</h1>
                    <p className="text-gray-600">Defina seus horários de atendimento e informações do negócio.</p>
                </div>

                {message && (
                    <div className={`mb-4 p-4 rounded-md ${message.type === 'success' ? 'bg-green-100 border border-green-400 text-green-700' : 'bg-red-100 border border-red-400 text-red-700'}`}>
                        {message.text}
                    </div>
                )}

                {/* 🔗 Link Público de Agendamento */}
                {user?.uid && (
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg shadow p-5 mb-2 text-white">
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
                    {/* Informações Gerais */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-lg font-semibold text-gray-800 mb-4">Informações Gerais</h2>
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

                    {/* Horários de Funcionamento */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-lg font-semibold text-gray-800 mb-4">Horários de Atendimento</h2>
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

                    <div className="flex justify-end">
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
