'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Service, BusinessSettings, DayOfWeek, Appointment, Professional } from '@/lib/types';
import { getSubDocuments, getSubDocument, addSubDocument } from '@/lib/firestoreService';
import { Timestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { functions as firebaseFunctions } from '@/lib/firebase';
import { generateReschedulingToken } from '@/lib/reschedulingTokenService';

const DAYS_PT: Record<number, DayOfWeek> = {
  0: 'domingo',
  1: 'segunda',
  2: 'terca',
  3: 'quarta',
  4: 'quinta',
  5: 'sexta',
  6: 'sabado',
};

type Step = 'professional' | 'service' | 'datetime' | 'form' | 'confirmed';

const parseTimeToMinutes = (value: string) => {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
};

const buildFallbackSlots = (settings: BusinessSettings | null, date: string, duration: number) => {
  const selected = new Date(`${date}T12:00:00`);
  const dayKey = DAYS_PT[selected.getDay()];
  const daySchedule = settings?.schedule?.[dayKey];

  if (!daySchedule?.enabled) {
    return [] as string[];
  }

  const step = Math.max(duration + (settings?.timeBetweenAppointments || 0), 15);
  const openMinutes = parseTimeToMinutes(daySchedule.open || '08:00');
  const closeMinutes = parseTimeToMinutes(daySchedule.close || '18:00');
  const slots: string[] = [];

  for (let current = openMinutes; current + duration <= closeMinutes; current += step) {
    const hour = Math.floor(current / 60);
    const minute = current % 60;
    slots.push(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
  }

  return slots;
};

export default function PublicBookingPage() {
  const { userId } = useParams<{ userId: string }>();

  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [availabilityWarning, setAvailabilityWarning] = useState('');

  const [step, setStep] = useState<Step>('professional');
  const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null);
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

  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      try {
        const [businessSettings, srvs, profs] = await Promise.all([
          getSubDocument<BusinessSettings>('users', userId, 'settings', 'business'),
          getSubDocuments<Service>('users', userId, 'services'),
          getSubDocuments<Professional>('users', userId, 'professionals'),
        ]);
        setSettings(businessSettings);
        setServices(srvs.filter(sv => sv.isActive));
        setProfessionals(profs.filter(p => p.isActive));
      } catch {
        setErrorMsg('Nao foi possivel carregar as informacoes do profissional.');
      } finally {
        setLoadingInitial(false);
      }
    };
    load();
  }, [userId]);

  const servicesToShow =
    selectedProfessional == null ||
    !selectedProfessional.serviceIds ||
    selectedProfessional.serviceIds.length === 0
      ? services
      : services.filter(s => s.id && selectedProfessional.serviceIds!.includes(s.id));

  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minDateStr = minDate.toISOString().split('T')[0];

  const isDayEnabled = useCallback((dateStr: string) => {
    if (!settings?.schedule) return true;
    const d = new Date(`${dateStr}T12:00:00`);
    const dayKey = DAYS_PT[d.getDay()];
    const isHoliday = settings.holidays?.includes(dateStr);
    if (isHoliday) return false;
    return settings.schedule[dayKey]?.enabled ?? true;
  }, [settings]);

  useEffect(() => {
    if (!selectedDate || !selectedService || !userId) return;
    if (!isDayEnabled(selectedDate)) {
      setAvailableSlots([]);
      setAvailabilityWarning('');
      return;
    }

    const load = async () => {
      setLoadingSlots(true);
      setSelectedTime('');
      setAvailabilityWarning('');
      try {
        const getPublicAvailability = httpsCallable<
          { userId: string; date: string; duration: number },
          { slots: string[] }
        >(firebaseFunctions, 'getPublicAvailability');

        const response = await getPublicAvailability({
          userId,
          date: selectedDate,
          duration: selectedService.duration || 60,
        });

        const slots = response.data?.slots ?? [];
        setAvailableSlots(slots);
      } catch (error) {
        console.error('Erro ao consultar disponibilidade publica:', error);
        const fallbackSlots = buildFallbackSlots(settings, selectedDate, selectedService.duration || 60);
        setAvailableSlots(fallbackSlots);
        setAvailabilityWarning(
          fallbackSlots.length > 0
            ? 'Mostrando horarios com base no expediente configurado. Se algum horario falhar, tente outro horario ou contate o estabelecimento.'
            : 'Nao foi possivel validar a disponibilidade online agora.'
        );
      } finally {
        setLoadingSlots(false);
      }
    };
    load();
  }, [selectedDate, selectedService, userId, isDayEnabled, settings]);

  const handleBooking = async (e: React.FormEvent, payNow = false) => {
    e.preventDefault();
    if (!selectedService || !selectedDate || !selectedTime || !clientName) return;
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const [h, m] = selectedTime.split(':').map(Number);
      const dateObj = new Date(`${selectedDate}T00:00:00`);
      const startTime = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), h, m, 0);
      const endTime = new Date(startTime.getTime() + (selectedService.duration || 60) * 60000);
      const reschedulingToken = generateReschedulingToken();
      const reschedulingExpiresAt = Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));

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
        reschedulingToken,
        reschedulingExpiresAt,
        ...(selectedProfessional && {
          professionalId: selectedProfessional.id,
          professionalName: selectedProfessional.name,
        }),
      });

      setConfirmedId(id);

      if (payNow) {
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
            setTimeout(() => {
              window.location.href = data.init_point;
            }, 1500);
            setStep('confirmed');
          } else {
            throw new Error('Link de pagamento nao recebido');
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
    ? new Date(`${selectedDate}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
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
          <div className="text-5xl mb-4">Pagina indisponivel</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Pagina nao encontrada</h2>
          <p className="text-gray-500">{errorMsg}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-3xl font-bold text-white">{businessName.charAt(0).toUpperCase()}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{businessName}</h1>
          <p className="text-gray-500 mt-1">Agende seu horario online</p>
        </div>

        <div className="flex items-center justify-center gap-3 mb-8">
          {(['professional', 'service', 'datetime', 'form'] as Step[]).map((currentStep, i) => {
            const labels = ['1. Profissional', '2. Servico', '3. Horario', '4. Dados'];
            const current = ['professional', 'service', 'datetime', 'form', 'confirmed'].indexOf(step);
            const isDone = current > i;
            const isActive = current === i;
            return (
              <div key={currentStep} className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${isDone ? 'bg-green-500 text-white' : isActive ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                  {isDone ? 'OK' : i + 1}
                </div>
                <span className={`text-xs font-medium hidden sm:block ${isActive ? 'text-blue-700' : 'text-gray-400'}`}>{labels[i].split('. ')[1]}</span>
                {i < 3 && <div className="w-6 h-px bg-gray-300" />}
              </div>
            );
          })}
        </div>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {step === 'professional' && (
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Quem vai te atender?</h2>
              {professionals.length === 0 ? (
                <div className="space-y-3">
                  <p className="text-gray-500 text-sm mb-4">Nenhum profissional especifico cadastrado. Voce pode agendar normalmente — o estabelecimento definira quem ira atende-lo.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedProfessional(null);
                      setStep('service');
                    }}
                    className="w-full flex items-center justify-between p-4 border-2 border-blue-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all group bg-blue-50/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                        <span className="text-gray-500 font-bold text-lg">?</span>
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-gray-800 group-hover:text-blue-700">Sem preferencia</p>
                        <p className="text-sm text-gray-500">Qualquer profissional disponivel</p>
                      </div>
                    </div>
                    <p className="text-xs text-blue-600 font-medium">Continuar</p>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {professionals.map(prof => (
                    <button
                      key={prof.id}
                      type="button"
                      onClick={() => {
                        setSelectedProfessional(prof);
                        setStep('service');
                      }}
                      className="w-full flex items-center justify-between p-4 border-2 border-gray-100 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-blue-700 font-bold text-lg">{(prof.name || ' ').charAt(0).toUpperCase()}</span>
                        </div>
                        <div className="text-left">
                          <p className="font-semibold text-gray-800 group-hover:text-blue-700">{prof.name}</p>
                          <p className="text-sm text-gray-500">{prof.specialty}</p>
                        </div>
                      </div>
                      <p className="text-xs text-blue-400 group-hover:text-blue-600">Selecionar</p>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedProfessional(null);
                      setStep('service');
                    }}
                    className="w-full flex items-center justify-between p-4 border-2 border-gray-100 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                        <span className="text-gray-500 font-bold text-lg">?</span>
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-gray-800 group-hover:text-blue-700">Sem preferencia</p>
                        <p className="text-sm text-gray-500">Qualquer profissional disponivel</p>
                      </div>
                    </div>
                    <p className="text-xs text-blue-400 group-hover:text-blue-600">Continuar</p>
                  </button>
                </div>
              )}
            </div>
          )}

          {step === 'service' && (
            <div className="p-6">
              <button type="button" onClick={() => setStep('professional')} className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-4">
                Voltar
              </button>
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Qual servico voce deseja?</h2>
              {servicesToShow.length === 0 ? (
                <p className="text-gray-400 text-center py-8">Nenhum servico disponivel no momento.</p>
              ) : (
                <div className="space-y-3">
                  {servicesToShow.map(service => (
                    <button
                      key={service.id}
                      type="button"
                      onClick={() => {
                        setSelectedService(service);
                        setStep('datetime');
                      }}
                      className="w-full flex items-center justify-between p-4 border-2 border-gray-100 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all group"
                    >
                      <div className="text-left">
                        <p className="font-semibold text-gray-800 group-hover:text-blue-700">{service.name}</p>
                        {service.description && <p className="text-sm text-gray-500 mt-0.5">{service.description}</p>}
                        <p className="text-xs text-gray-400 mt-1">{service.duration} min</p>
                      </div>
                      <div className="text-right flex-shrink-0 ml-4">
                        <p className="text-lg font-bold text-blue-600">R$ {service.price.toFixed(2)}</p>
                        <p className="text-xs text-blue-400 group-hover:text-blue-600">Selecionar</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 'datetime' && selectedService && (
            <div className="p-6">
              <button onClick={() => setStep('service')} className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-4">
                Voltar
              </button>
              <div className="bg-blue-50 rounded-xl p-3 mb-5 flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-sm">OK</span>
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
                  if (isDayEnabled(e.target.value)) {
                    setSelectedDate(e.target.value);
                  } else {
                    setSelectedDate(e.target.value);
                    setAvailableSlots([]);
                  }
                }}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 text-gray-800 mb-5"
              />

              {selectedDate && (
                <>
                  <h2 className="text-lg font-semibold text-gray-800 mb-3">
                    Horarios disponiveis - <span className="text-blue-600 capitalize">{formattedDate}</span>
                  </h2>
                  {availabilityWarning && (
                    <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                      {availabilityWarning}
                    </div>
                  )}
                  {loadingSlots ? (
                    <div className="text-center py-6 text-gray-400">Verificando disponibilidade...</div>
                  ) : availableSlots.length === 0 ? (
                    <div className="text-center py-6">
                      <p className="text-gray-500">Sem horarios disponiveis neste dia.</p>
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
                <button onClick={() => setStep('form')} className="mt-6 w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-md">
                  Continuar
                </button>
              )}
            </div>
          )}

          {step === 'form' && (
            <div className="p-6">
              <button onClick={() => setStep('datetime')} className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-4">
                Voltar
              </button>

              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-4 mb-5 text-white">
                <p className="font-bold text-lg">{selectedService?.name}</p>
                <p className="text-blue-100 capitalize">{formattedDate}</p>
                <p className="text-2xl font-bold mt-1">{selectedTime}</p>
                <p className="text-blue-200 text-sm">
                  {selectedProfessional ? selectedProfessional.name : 'A definir'} · {selectedService?.duration} min · R$ {selectedService?.price.toFixed(2)}
                </p>
              </div>

              <h2 className="text-lg font-semibold text-gray-800 mb-4">Seus dados</h2>
              <form onSubmit={handleBooking} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Seu nome *</label>
                  <input type="text" required value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Ex: Maria Silva" className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp (opcional)</label>
                  <input type="tel" value={clientPhone} onChange={e => setClientPhone(e.target.value)} placeholder="Ex: 11999999999" className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500" />
                </div>
                {errorMsg && (
                  <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{errorMsg}</p>
                )}

                <div className="space-y-3 pt-2">
                  <button type="button" disabled={isSubmitting} onClick={e => handleBooking(e, true)} className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2">
                    {isSubmitting ? 'Processando...' : 'Pagar com Mercado Pago'}
                  </button>

                  <button type="button" disabled={isSubmitting} onClick={e => handleBooking(e, false)} className="w-full py-3 bg-white text-gray-600 border-2 border-gray-100 rounded-xl font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50">
                    Reservar e pagar depois
                  </button>
                </div>
                <p className="text-[10px] text-center text-gray-400 mt-4 px-4">
                  Ao clicar em Pagar, voce sera redirecionado para o ambiente seguro do Mercado Pago.
                </p>
              </form>
            </div>
          )}

          {step === 'confirmed' && (
            <div className="p-8 text-center">
              {paymentLink ? (
                <>
                  <div className="text-7xl mb-6">Pagamento</div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Quase la!</h2>
                  <p className="text-gray-500 mb-6">Redirecionando voce para o pagamento seguro...</p>
                  <a href={paymentLink} className="inline-block py-3 px-8 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors">
                    Ir para o Pagamento agora
                  </a>
                </>
              ) : (
                <>
                  <div className="text-7xl mb-6">Confirmado</div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Agendamento Confirmado!</h2>
                  <p className="text-gray-500 mb-6">Seu horario foi reservado com sucesso.</p>

                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-left mb-6">
                    <p className="font-semibold text-green-800 mb-2">Resumo do Agendamento</p>
                    <p className="text-gray-700"><strong>Profissional:</strong> {selectedProfessional ? selectedProfessional.name : 'A definir'}</p>
                    <p className="text-gray-700"><strong>Servico:</strong> {selectedService?.name}</p>
                    <p className="text-gray-700"><strong>Data:</strong> <span className="capitalize">{formattedDate}</span></p>
                    <p className="text-gray-700"><strong>Horario:</strong> {selectedTime}</p>
                    <p className="text-gray-700"><strong>Duracao:</strong> {selectedService?.duration} min</p>
                    <p className="text-gray-700"><strong>Nome:</strong> {clientName}</p>
                  </div>

                  <p className="text-sm text-gray-400 mb-4">Codigo: <code className="text-xs bg-gray-100 px-2 py-1 rounded">{confirmedId?.slice(-8)}</code></p>

                  <button
                    onClick={() => {
                      setStep('professional');
                      setSelectedProfessional(null);
                      setSelectedService(null);
                      setSelectedDate('');
                      setSelectedTime('');
                      setClientName('');
                      setClientPhone('');
                      setConfirmedId('');
                      setPaymentLink('');
                      setAvailabilityWarning('');
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

        <p className="text-center text-xs text-gray-400 mt-6">Powered by Agenda Facil</p>
      </div>
    </div>
  );
}

