'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Timestamp } from 'firebase/firestore';
import { validateReschedulingToken } from '@/lib/reschedulingTokenService';
import { getSubDocument, getSubDocuments, updateSubDocument } from '@/lib/firestoreService';
import { Appointment, Service, ReschedulingTokenPayload } from '@/lib/types';
import { format, addDays, addMinutes, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ReschedulingPage() {
  const router = useRouter();
  const params = useParams();
  const token = params?.token as string;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [service, setService] = useState<Service | null>(null);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [tokenPayload, setTokenPayload] = useState<ReschedulingTokenPayload | null>(null);

  // Validar token e carregar agendamento
  useEffect(() => {
    const validateAndLoad = async () => {
      if (!token) {
        setError('Token não fornecido. Contate o profissional.');
        setLoading(false);
        return;
      }

      try {
        // Decodifica e valida token
        const payload = validateReschedulingToken(token);
        if (!payload) {
          setError('Link de reagendamento expirou ou é inválido. Contate o profissional.');
          setLoading(false);
          return;
        }

        setTokenPayload(payload);

        // Busca agendamento original
        const apt = await getSubDocument<Appointment>(
          'users',
          payload.userId,
          'appointments',
          payload.appointmentId
        );

        if (!apt) {
          setError('Agendamento não encontrado.');
          setLoading(false);
          return;
        }

        setAppointment(apt);

        // Busca serviço
        const svc = await getSubDocument<Service>(
          'users',
          payload.userId,
          'services',
          apt.serviceId
        );

        if (svc) {
          setService(svc);
          // Gera próximos 7 dias de horários disponíveis
          generateAvailableSlots(svc.duration);
        }

        setLoading(false);
      } catch (err) {
        console.error('Erro ao validar token:', err);
        setError('Erro ao carregar dados. Tente novamente.');
        setLoading(false);
      }
    };

    validateAndLoad();
  }, [token]);

  // Gera próximos 7 dias com horários disponíveis
  const generateAvailableSlots = (duration: number) => {
    const slots: string[] = [];
    const today = new Date();

    for (let dayOffset = 1; dayOffset <= 7; dayOffset++) {
      const date = addDays(today, dayOffset);
      const dateStr = format(date, 'yyyy-MM-dd');

      // Simples: gera horários a cada 1h das 09:00 às 18:00
      for (let hour = 9; hour < 18; hour++) {
        const timeStr = `${String(hour).padStart(2, '0')}:00`;
        slots.push(`${dateStr} ${timeStr}`);
      }
    }

    setAvailableSlots(slots);
    if (slots.length > 0) {
      setSelectedDate(slots[0].split(' ')[0]);
      setSelectedTime(slots[0].split(' ')[1]);
    }
  };

  const handleReschedule = async () => {
    if (!selectedDate || !selectedTime || !appointment || !tokenPayload) {
      setError('Selecione data e horário.');
      return;
    }

    setSubmitting(true);
    try {
      const newDate = parseISO(`${selectedDate}T${selectedTime}:00`);
      const newTimestamp = Timestamp.fromDate(newDate);

      // Atualiza agendamento com nova data/hora
      await updateSubDocument(
        'users',
        tokenPayload.userId,
        'appointments',
        tokenPayload.appointmentId,
        {
          date: newTimestamp,
          time: selectedTime,
          status: 'agendado',
          updatedAt: Timestamp.now(),
        }
      );

      // Sucesso
      setSubmitting(false);
      router.push(
        `/agendar/confirmacao-reagendamento?data=${format(
          newDate,
          'dd/MM/yyyy HH:mm'
        )}`
      );
    } catch (err) {
      console.error('Erro ao reagendar:', err);
      setError('Erro ao reagendar. Tente novamente.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-slate-600">Carregando agendamento...</p>
        </div>
      </div>
    );
  }

  if (error || !appointment || !service) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-red-600 text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-slate-900 mb-4">Erro</h1>
          <p className="text-slate-600 mb-6">{error || 'Dados não encontrados.'}</p>
          <button
            onClick={() => window.location.href = '/'}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition"
          >
            Voltar ao Início
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
            <h1 className="text-3xl font-bold mb-2">Reagendar Serviço</h1>
            <p className="text-blue-100">Escolha uma nova data e horário</p>
          </div>

          {/* Detalhes do Agendamento Atual */}
          <div className="p-6 border-b border-slate-200 bg-slate-50">
            <h2 className="text-sm font-semibold text-slate-600 uppercase mb-4">
              Agendamento Atual
            </h2>
            <div className="space-y-2">
              <p className="text-slate-900">
                <span className="font-semibold">Serviço:</span> {appointment.serviceName}
              </p>
              <p className="text-slate-900">
                <span className="font-semibold">Data:</span>{' '}
                {format(appointment.date.toDate(), 'dd/MM/yyyy', { locale: ptBR })}
              </p>
              <p className="text-slate-900">
                <span className="font-semibold">Horário:</span> {appointment.time}
              </p>
              <p className="text-slate-900">
                <span className="font-semibold">Valor:</span> R$ {appointment.price.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Formulário de Reagendamento */}
          <div className="p-6 space-y-6">
            {/* Seleção de Data */}
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-3">
                Escolha uma data
              </label>
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: 7 }).map((_, i) => {
                  const date = addDays(new Date(), i + 1);
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
                      <div className="text-xs uppercase">
                        {format(date, 'EEE', { locale: ptBR })}
                      </div>
                      <div>{format(date, 'dd')}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Seleção de Horário */}
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-3">
                Escolha um horário
              </label>
              <div className="grid grid-cols-4 gap-2">
                {availableSlots
                  .filter((slot) => slot.startsWith(selectedDate))
                  .map((slot) => {
                    const time = slot.split(' ')[1];
                    return (
                      <button
                        key={slot}
                        onClick={() => setSelectedTime(time)}
                        className={`py-2 px-3 rounded-lg text-sm font-semibold transition ${
                          selectedTime === time
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
                        }`}
                      >
                        {time}
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* Resumo da Mudança */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-slate-900 mb-2">
                <span className="font-semibold">Novo agendamento:</span>
              </p>
              <p className="text-slate-900 font-semibold">
                {format(parseISO(`${selectedDate}T${selectedTime}:00`), 'dd/MM/yyyy HH:mm')}
              </p>
            </div>

            {/* Botões de Ação */}
            <div className="flex gap-4 pt-4">
              <button
                onClick={() => router.back()}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-900 font-semibold py-2 px-4 rounded-lg transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleReschedule}
                disabled={submitting}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2 px-4 rounded-lg transition"
              >
                {submitting ? 'Reagendando...' : 'Confirmar Novo Horário'}
              </button>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}
          </div>
        </div>

        {/* Nota de Segurança */}
        <div className="mt-6 text-center text-sm text-slate-600">
          <p>🔒 Este link expira em 30 dias</p>
        </div>
      </div>
    </div>
  );
}
