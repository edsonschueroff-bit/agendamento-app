'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useAuthContext } from '@/components/providers/AuthProvider';
import { createAppointment } from '@/modules/agenda/agendaService';

export default function NovoAgendamentoPage() {
  const { user } = useAuthContext();
  const [formData, setFormData] = useState({
    clientId: '',
    clientName: '',
    serviceId: '',
    serviceName: '',
    servicePrice: 0,
    date: '',
    time: '',
    status: 'agendado' as const,
    notes: '',
  });

  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) return;

    try {
      const { date, time, ...rest } = formData;
      const dateTime = new Date(`${date}T${time}`);
      const { Timestamp } = await import('firebase/firestore');

      const response = await createAppointment(user.uid, {
        ...rest,
        date: Timestamp.fromDate(dateTime),
        userId: user.uid,
      });

      if (response.success) {
        setMessage('Agendamento criado com sucesso!');
      } else {
        setMessage('Erro ao criar agendamento.');
      }
    } catch (error) {
      console.error('Erro ao criar agendamento:', error);
      setMessage('Erro ao criar agendamento.');
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Novo Agendamento</h1>
      {message && <p className="mb-4 p-3 bg-blue-50 rounded text-blue-800">{message}</p>}
      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cliente ID:</label>
          <input
            type="text"
            value={formData.clientId}
            onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Serviço ID:</label>
          <input
            type="text"
            value={formData.serviceId}
            onChange={(e) => setFormData({ ...formData, serviceId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Data:</label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Hora:</label>
          <input
            type="time"
            value={formData.time}
            onChange={(e) => setFormData({ ...formData, time: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Criar Agendamento
        </button>
      </form>
    </div>
  );
}
