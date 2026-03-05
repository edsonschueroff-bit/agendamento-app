'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Service, BusinessSettings, DayOfWeek, Appointment } from '@/lib/types';
import { getSubDocuments, getSubDocument, addSubDocument, updateSubDocument } from '@/lib/firestoreService';
import { Timestamp } from 'firebase/firestore';
import { generateReschedulingToken, generateReschedulingLink } from '@/lib/reschedulingTokenService';

const DAYS_PT: Record<number, DayOfWeek> = {
    0: 'domingo', 1: 'segunda', 2: 'terca', 3: 'quarta',
    4: 'quinta', 5: 'sexta', 6: 'sabado',
};

type Step = 'service' | 'datetime' | 'form' | 'confirmed';

export default function PublicBookingPage() {
    const { userId } = useParams<{ userId: string }>();

    const [settings, setSettings] = useState<BusinessSettings | null>(null);
    const [services, setServices] = useState<Service[]>([]);
    const [loadingInitial, setLoadingInitial] = useState(true);
    const [errorMsg, setErrorMsg] = useState('');

    // Step state
    const [step, setStep] = useState<Step>('service');
    const [selectedService, setSelectedService] = useState<Service | null>(null);
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedTime, setSelectedTime] = useState('');
    const [availableSlots, setAvailableSlots] = useState<string[]>([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [clientName, setClientName] = useState('');
    const [clientPhone, setClientPhone] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [confirmedId, setConfirmedId] = useState('');
    const [paymentLink, setPaymentLink] = useState('');

    // Load business info
    useEffect(() => {
        if (!userId) return;
        const load = async () => {
            try {
                const [s, srvs] = await Promise.all([
                    getSubDocument<BusinessSettings>('users', userId, 'settings', 'business'),
                    getSubDocuments<Service>('users', userId, 'services'),
                ]);
                setSettings(s);
                setServices(srvs.filter(sv => sv.isActive));
            } catch {
                setErrorMsg('Não foi possível carregar as informações do profissional.');
            } finally {
                setLoadingInitial(false);
            }
        };
        load();
    }, [userId]);

    // Compute min date and disabled days based on schedule
    const minDate = new Date();
    minDate.setDate(minDate.getDate() + 1);
    const minDateStr = minDate.toISOString().split('T')[0];

    const isDayEnabled = useCallback((dateStr: string) => {
        if (!settings?.schedule) return true;
        const d = new Date(dateStr + 'T12:00:00');
        const dayKey = DAYS_PT[d.getDay()];
        return settings.schedule[dayKey]?.enabled ?? true;
    }, [settings]);

    // Load available slots when date changes
    useEffect(() => {
        if (!selectedDate || !selectedService || !userId) return;
        if (!isDayEnabled(selectedDate)) { setAvailableSlots([]); return; }

        const load = async () => {
            setLoadingSlots(true);
            setSelectedTime('');
            try {
                const dateObj = new Date(selectedDate + 'T00:00:00');
                const startOfDay = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
                const endOfDay = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), 23, 59, 59);

                const appts = await getSubDocuments<Appointment>('users', userId, 'appointments', [
                    { field: 'date', operator: '>=', value: Timestamp.fromDate(startOfDay) },
                    { field: 'date', operator: '<=', value: Timestamp.fromDate(endOfDay) },
                ]);

                const dayKey = DAYS_PT[startOfDay.getDay()];
                const daySchedule = settings?.schedule?.[dayKey];
                const openStr = daySchedule?.open || '08:00';
                const closeStr = daySchedule?.close || '18:00';

                const [openH, openM] = openStr.split(':').map(Number);
                const [closeH, closeM] = closeStr.split(':').map(Number);
                const openMin = openH * 60 + openM;
                const closeMin = closeH * 60 + closeM;
                const duration = selectedService.duration || 60;

                const slots: string[] = [];
                for (let m = openMin; m + duration <= closeMin; m += duration) {
                    const hh = String(Math.floor(m / 60)).padStart(2, '0');
                    const mm = String(m % 60).padStart(2, '0');
                    const slotStart = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), Math.floor(m / 60), m % 60);
                    const slotEnd = new Date(slotStart.getTime() + duration * 60000);

                    const busy = appts.some(a => {
                        if (a.status === 'cancelado') return false;
                        const aStart = a.date.toDate();
                        const aEnd = a.endTime ? a.endTime.toDate() : new Date(aStart.getTime() + 60 * 60000);
                        return slotStart < aEnd && slotEnd > aStart;
                    });

                    if (!busy) slots.push(`${hh}:${mm}`);
                }
                setAvailableSlots(slots);
            } catch {
                setAvailableSlots([]);
            } finally {
                setLoadingSlots(false);
            }
        };
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedDate, selectedService, userId]);

    const handleBooking = async (e: React.FormEvent, payNow = false) => {
        e.preventDefault();
        if (!selectedService || !selectedDate || !selectedTime || !clientName) return;
        setIsSubmitting(true);
        setErrorMsg('');
        try {
            const [h, m] = selectedTime.split(':').map(Number);
            const dateObj = new Date(selectedDate + 'T00:00:00');
            const startTime = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), h, m, 0);
            const endTime = new Date(startTime.getTime() + (selectedService.duration || 60) * 60000);

            const id = await addSubDocument<Appointment>('users', userId, 'appointments', {
                userId,
                clientId: 'public',
                clientName,
                clientPhone,
                serviceId: selectedService.id!,
                serviceName: selectedService.name,
                servicePrice: selectedService.price,
                price: selectedService.price,
                date: Timestamp.fromDate(startTime),
                time: selectedTime,
                endTime: Timestamp.fromDate(endTime),
                duration: selectedService.duration,
                status: 'agendado',
                notes: payNow ? '(Solicitou pagamento online)' : '',
            });

            // Gera token de reagendamento
            const reschedulingToken = generateReschedulingToken(id, userId, 'public');
            const reschedulingLink = generateReschedulingLink(reschedulingToken);

            // Atualiza agendamento com token
            await updateSubDocument(
              'users',
              userId,
              'appointments',
              id,
              {
                reschedulingToken,
                reschedulingExpiresAt: Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
              }
            );

            setConfirmedId(id);

            if (payNow) {
                // Criar preferência no Mercado Pago
                const response = await fetch('/api/mercadopago/preference', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        title: selectedService.name,
                        unit_price: selectedService.price,
                        quantity: 1,
                        external_reference: id,
                    }),
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.init_point) {
                        setPaymentLink(data.init_point);
                        // Pequeno delay para o usuário ver que confirmou antes de ir pro MP
                        setTimeout(() => {
                            window.location.href = data.init_point;
                        }, 1500);
                        setStep('confirmed');
                    } else {
                        throw new Error('Link de pagamento não recebido');
                    }
                } else {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error || 'Erro ao gerar link de pagamento');
                }
            } else {
                setStep('confirmed');
            }
        } catch (err: unknown) {
            console.error(err);
            const message = err instanceof Error ? err.message : 'Erro ao criar agendamento. Tente novamente.';
            setErrorMsg(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const businessName = settings?.businessName || 'Profissional';
    const formattedDate = selectedDate
        ? new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
        : '';

    if (loadingInitial) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Carregando...</p>
                </div>
            </div>
        );
    }

    if (errorMsg && services.length === 0) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
                <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md">
                    <div className="text-5xl mb-4">😕</div>
                    <h2 className="text-xl font-bold text-gray-800 mb-2">Página não encontrada</h2>
                    <p className="text-gray-500">{errorMsg}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
            <div className="max-w-lg mx-auto">

                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <span className="text-3xl font-bold text-white">{businessName.charAt(0).toUpperCase()}</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">{businessName}</h1>
                    <p className="text-gray-500 mt-1">Agende seu horário online ✨</p>
                </div>

                {/* Step Indicator */}
                <div className="flex items-center justify-center gap-3 mb-8">
                    {(['service', 'datetime', 'form'] as Step[]).map((s, i) => {
                        const labels = ['1. Serviço', '2. Horário', '3. Dados'];
                        const current = ['service', 'datetime', 'form', 'confirmed'].indexOf(step);
                        const isDone = current > i;
                        const isActive = current === i;
                        return (
                            <div key={s} className="flex items-center gap-2">
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${isDone ? 'bg-green-500 text-white' : isActive ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                                    {isDone ? '✓' : i + 1}
                                </div>
                                <span className={`text-xs font-medium hidden sm:block ${isActive ? 'text-blue-700' : 'text-gray-400'}`}>{labels[i].split('. ')[1]}</span>
                                {i < 2 && <div className="w-6 h-px bg-gray-300" />}
                            </div>
                        );
                    })}
                </div>

                <div className="bg-white rounded-2xl shadow-xl overflow-hidden">

                    {/* ── STEP 1: Escolher Serviço ── */}
                    {step === 'service' && (
                        <div className="p-6">
                            <h2 className="text-lg font-semibold text-gray-800 mb-4">Qual serviço você deseja?</h2>
                            {services.length === 0 ? (
                                <p className="text-gray-400 text-center py-8">Nenhum serviço disponível no momento.</p>
                            ) : (
                                <div className="space-y-3">
                                    {services.map(sv => (
                                        <button
                                            key={sv.id}
                                            onClick={() => { setSelectedService(sv); setStep('datetime'); }}
                                            className="w-full flex items-center justify-between p-4 border-2 border-gray-100 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all group"
                                        >
                                            <div className="text-left">
                                                <p className="font-semibold text-gray-800 group-hover:text-blue-700">{sv.name}</p>
                                                {sv.description && <p className="text-sm text-gray-500 mt-0.5">{sv.description}</p>}
                                                <p className="text-xs text-gray-400 mt-1">⏱ {sv.duration} min</p>
                                            </div>
                                            <div className="text-right flex-shrink-0 ml-4">
                                                <p className="text-lg font-bold text-blue-600">R$ {sv.price.toFixed(2)}</p>
                                                <p className="text-xs text-blue-400 group-hover:text-blue-600">Selecionar →</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── STEP 2: Escolher Data e Horário ── */}
                    {step === 'datetime' && selectedService && (
                        <div className="p-6">
                            <button onClick={() => setStep('service')} className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-4">
                                ← Voltar
                            </button>
                            <div className="bg-blue-50 rounded-xl p-3 mb-5 flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <span className="text-white font-bold text-sm">✓</span>
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-800">{selectedService.name}</p>
                                    <p className="text-sm text-gray-500">R$ {selectedService.price.toFixed(2)} · {selectedService.duration} min</p>
                                </div>
                            </div>

                            <h2 className="text-lg font-semibold text-gray-800 mb-4">Escolha a data</h2>
                            <input
                                type="date"
                                min={minDateStr}
                                value={selectedDate}
                                onChange={e => {
                                    if (isDayEnabled(e.target.value)) setSelectedDate(e.target.value);
                                    else { setSelectedDate(e.target.value); setAvailableSlots([]); }
                                }}
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 text-gray-800 mb-5"
                            />

                            {selectedDate && (
                                <>
                                    <h2 className="text-lg font-semibold text-gray-800 mb-3">
                                        Horários disponíveis — <span className="text-blue-600 capitalize">{formattedDate}</span>
                                    </h2>
                                    {loadingSlots ? (
                                        <div className="text-center py-6 text-gray-400">Verificando disponibilidade...</div>
                                    ) : availableSlots.length === 0 ? (
                                        <div className="text-center py-6">
                                            <p className="text-gray-500">😔 Sem horários disponíveis neste dia.</p>
                                            <p className="text-sm text-gray-400 mt-1">Tente outro dia.</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                            {availableSlots.map(slot => (
                                                <button
                                                    key={slot}
                                                    onClick={() => setSelectedTime(slot)}
                                                    className={`py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${selectedTime === slot ? 'bg-blue-600 border-blue-600 text-white shadow-md scale-105' : 'border-gray-200 text-gray-700 hover:border-blue-400 hover:bg-blue-50'}`}
                                                >
                                                    {slot}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}

                            {selectedTime && (
                                <button
                                    onClick={() => setStep('form')}
                                    className="mt-6 w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-md"
                                >
                                    Continuar →
                                </button>
                            )}
                        </div>
                    )}

                    {/* ── STEP 3: Dados do Cliente ── */}
                    {step === 'form' && (
                        <div className="p-6">
                            <button onClick={() => setStep('datetime')} className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-4">
                                ← Voltar
                            </button>

                            {/* Resumo */}
                            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-4 mb-5 text-white">
                                <p className="font-bold text-lg">{selectedService?.name}</p>
                                <p className="text-blue-100 capitalize">{formattedDate}</p>
                                <p className="text-2xl font-bold mt-1">{selectedTime}</p>
                                <p className="text-blue-200 text-sm">{selectedService?.duration} min · R$ {selectedService?.price.toFixed(2)}</p>
                            </div>

                            <h2 className="text-lg font-semibold text-gray-800 mb-4">Seus dados</h2>
                            <form onSubmit={handleBooking} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Seu nome *</label>
                                    <input
                                        type="text"
                                        required
                                        value={clientName}
                                        onChange={e => setClientName(e.target.value)}
                                        placeholder="Ex: Maria Silva"
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp (opcional)</label>
                                    <input
                                        type="tel"
                                        value={clientPhone}
                                        onChange={e => setClientPhone(e.target.value)}
                                        placeholder="Ex: 11999999999"
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                                {errorMsg && (
                                    <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{errorMsg}</p>
                                )}

                                <div className="space-y-3 pt-2">
                                    <button
                                        type="button"
                                        disabled={isSubmitting}
                                        onClick={(e) => handleBooking(e, true)}
                                        className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {isSubmitting ? 'Processando...' : (
                                            <>
                                                💳 Pagar com Mercado Pago
                                            </>
                                        )}
                                    </button>

                                    <button
                                        type="button"
                                        disabled={isSubmitting}
                                        onClick={(e) => handleBooking(e, false)}
                                        className="w-full py-3 bg-white text-gray-600 border-2 border-gray-100 rounded-xl font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
                                    >
                                        Reservar e pagar depois
                                    </button>
                                </div>
                                <p className="text-[10px] text-center text-gray-400 mt-4 px-4">
                                    Ao clicar em Pagar, você será redirecionado para o ambiente seguro do Mercado Pago.
                                </p>
                            </form>
                        </div>
                    )}

                    {/* ── STEP 4: Confirmado ── */}
                    {step === 'confirmed' && (
                        <div className="p-8 text-center">
                            {paymentLink ? (
                                <>
                                    <div className="text-7xl mb-6">🚀</div>
                                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Quase lá!</h2>
                                    <p className="text-gray-500 mb-6">Redirecionando você para o pagamento seguro...</p>
                                    <a
                                        href={paymentLink}
                                        className="inline-block py-3 px-8 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
                                    >
                                        Ir para o Pagamento agora
                                    </a>
                                </>
                            ) : (
                                <>
                                    <div className="text-7xl mb-6 animate-bounce">🎉</div>
                                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Agendamento Confirmado!</h2>
                                    <p className="text-gray-500 mb-6">Seu horário foi reservado com sucesso.</p>

                                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-left mb-6">
                                        <p className="font-semibold text-green-800 mb-2">📅 Resumo do Agendamento</p>
                                        <p className="text-gray-700"><strong>Serviço:</strong> {selectedService?.name}</p>
                                        <p className="text-gray-700"><strong>Data:</strong> <span className="capitalize">{formattedDate}</span></p>
                                        <p className="text-gray-700"><strong>Horário:</strong> {selectedTime}</p>
                                        <p className="text-gray-700"><strong>Duração:</strong> {selectedService?.duration} min</p>
                                        <p className="text-gray-700"><strong>Nome:</strong> {clientName}</p>
                                    </div>

                                    <p className="text-sm text-gray-400 mb-4">Código: <code className="text-xs bg-gray-100 px-2 py-1 rounded">{confirmedId?.slice(-8)}</code></p>

                                    <button
                                        onClick={() => {
                                            setStep('service');
                                            setSelectedService(null);
                                            setSelectedDate('');
                                            setSelectedTime('');
                                            setClientName('');
                                            setClientPhone('');
                                            setConfirmedId('');
                                            setPaymentLink('');
                                        }}
                                        className="w-full py-3 border-2 border-gray-200 text-gray-600 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                                    >
                                        Fazer outro agendamento
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>

                <p className="text-center text-xs text-gray-400 mt-6">Powered by Agenda Fácil</p>
            </div>
        </div>
    );
}
