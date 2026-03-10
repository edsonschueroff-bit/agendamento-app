'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { addDays, format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { httpsCallable } from 'firebase/functions';
import { functions as firebaseFunctions } from '@/lib/firebase';
import { isValidReschedulingToken } from '@/lib/reschedulingTokenService';

interface ReschedulingAppointment {
  id: string;
  userId: string;
  serviceId: string;
  serviceName: string;
  price: number;
  time: string;
  duration: number;
  dateIso: string | null;
}

interface ReschedulingService {
  id: string;
  name: string;
  duration: number;
  price: number;
}

interface GetReschedulingDataResponse {
  appointment: ReschedulingAppointment;
  service: ReschedulingService | null;
}

interface GetPublicAvailabilityResponse {
  slots: string[];
}

export default function ReschedulingPage() {
  const router = useRouter();
  const params = useParams();
  const token = params?.token as string;

  const [loading, setLoading] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appointment, setAppointment] = useState<ReschedulingAppointment | null>(null);
  const [service, setService] = useState<ReschedulingService | null>(null);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const upcomingDates = useMemo(
    () => Array.from({ length: 7 }).map((_, index) => addDays(new Date(), index + 1)),
    []
  );

  useEffect(() => {
    const load = async () => {
      if (!token || !isValidReschedulingToken(token)) {
        setError('Token de reagendamento invalido.');
        setLoading(false);
        return;
      }

      try {
        const getReschedulingData = httpsCallable<{ token: string }, GetReschedulingDataResponse>(
          firebaseFunctions,
          'getReschedulingData'
        );

        const response = await getReschedulingData({ token });
        setAppointment(response.data.appointment);
        setService(response.data.service);
        setSelectedDate(format(upcomingDates[0], 'yyyy-MM-dd'));
      } catch (err) {
        console.error('Erro ao carregar reagendamento:', err);
        setError('Nao foi possivel carregar os dados deste reagendamento.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [token, upcomingDates]);

  useEffect(() => {
    const loadSlots = async () => {
      if (!appointment || !selectedDate) return;

      setLoadingSlots(true);
      try {
        const getPublicAvailability = httpsCallable<
          { userId: string; date: string; duration: number; excludeAppointmentId: string },
          GetPublicAvailabilityResponse
        >(firebaseFunctions, 'getPublicAvailability');

        const response = await getPublicAvailability({
          userId: appointment.userId,
          date: selectedDate,
          duration: service?.duration || appointment.duration || 60,
          excludeAppointmentId: appointment.id,
        });

        const slots = response.data?.slots ?? [];
        setAvailableSlots(slots);
        setSelectedTime((current) => (slots.includes(current) ? current : slots[0] || ''));
      } catch (err) {
        console.error('Erro ao buscar horarios:', err);
        setAvailableSlots([]);
        setSelectedTime('');
      } finally {
        setLoadingSlots(false);
      }
    };

    loadSlots();
  }, [appointment, selectedDate, service]);

  const handleReschedule = async () => {
    if (!token || !selectedDate || !selectedTime) {
      setError('Selecione uma data e horario validos.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const rescheduleWithToken = httpsCallable<
        { token: string; date: string; time: string },
        { success: boolean }
      >(firebaseFunctions, 'rescheduleWithToken');

      await rescheduleWithToken({
        token,
        date: selectedDate,
        time: selectedTime,
      });

      const newDate = parseISO(`${selectedDate}T${selectedTime}:00`);
      router.push(
        `/agendar/confirmacao-reagendamento?data=${encodeURIComponent(
          format(newDate, 'dd/MM/yyyy HH:mm')
        )}`
      );
    } catch (err) {
      console.error('Erro ao confirmar reagendamento:', err);
      setError('Nao foi possivel reagendar. Verifique a disponibilidade e tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const currentDate = appointment?.dateIso ? parseISO(appointment.dateIso) : null;
  const nextDate =
    selectedDate && selectedTime ? parseISO(`${selectedDate}T${selectedTime}:00`) : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-slate-600">Carregando reagendamento...</p>
        </div>
      </div>
    );
  }

  if (error || !appointment) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-red-600 text-5xl mb-4">!</div>
          <h1 className="text-2xl font-bold text-slate-900 mb-4">Erro no reagendamento</h1>
          <p className="text-slate-600 mb-6">{error || 'Dados nao encontrados.'}</p>
          <button
            onClick={() => router.push('/')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition"
          >
            Voltar ao inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
            <h1 className="text-3xl font-bold mb-2">Reagendar servico</h1>
            <p className="text-blue-100">Escolha uma nova data e horario</p>
          </div>

          <div className="p-6 border-b border-slate-200 bg-slate-50">
            <h2 className="text-sm font-semibold text-slate-600 uppercase mb-4">
              Agendamento atual
            </h2>
            <div className="space-y-2">
              <p className="text-slate-900">
                <span className="font-semibold">Servico:</span> {appointment.serviceName}
              </p>
              <p className="text-slate-900">
                <span className="font-semibold">Data:</span>{' '}
                {currentDate ? format(currentDate, 'dd/MM/yyyy', { locale: ptBR }) : '--'}
              </p>
              <p className="text-slate-900">
                <span className="font-semibold">Horario:</span> {appointment.time || '--:--'}
              </p>
              <p className="text-slate-900">
                <span className="font-semibold">Valor:</span> R$ {appointment.price.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-3">
                Escolha uma data
              </label>
              <div className="grid grid-cols-7 gap-2">
                {upcomingDates.map((date) => {
                  const dateStr = format(date, 'yyyy-MM-dd');
                  return (
                    <button
                      key={dateStr}
                      onClick={() => setSelectedDate(dateStr)}
                      className={`py-2 px-1 rounded-lg text-center text-sm font-semibold transition ${
                        selectedDate === dateStr
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
                      }`}
                    >
                      <div className="text-xs uppercase">{format(date, 'EEE', { locale: ptBR })}</div>
                      <div>{format(date, 'dd')}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-3">
                Escolha um horario
              </label>

              {loadingSlots ? (
                <p className="text-sm text-slate-500">Consultando disponibilidade...</p>
              ) : availableSlots.length === 0 ? (
                <p className="text-sm text-slate-500">Sem horarios disponiveis para esta data.</p>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {availableSlots.map((time) => (
                    <button
                      key={time}
                      onClick={() => setSelectedTime(time)}
                      className={`py-2 px-3 rounded-lg text-sm font-semibold transition ${
                        selectedTime === time
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
                      }`}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {nextDate && !Number.isNaN(nextDate.getTime()) && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-slate-900 mb-2">
                  <span className="font-semibold">Novo agendamento:</span>
                </p>
                <p className="text-slate-900 font-semibold">
                  {format(nextDate, 'dd/MM/yyyy HH:mm')}
                </p>
              </div>
            )}

            <div className="flex gap-4 pt-4">
              <button
                onClick={() => router.back()}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-900 font-semibold py-2 px-4 rounded-lg transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleReschedule}
                disabled={submitting || !selectedTime}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2 px-4 rounded-lg transition"
              >
                {submitting ? 'Reagendando...' : 'Confirmar novo horario'}
              </button>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 text-center text-sm text-slate-600">
          <p>Este link expira em 30 dias.</p>
        </div>
      </div>
    </div>
  );
}
