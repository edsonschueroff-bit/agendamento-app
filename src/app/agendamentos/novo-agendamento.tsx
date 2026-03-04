'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { createAppointmentFirestore } from '@/modules/agenda/agendaService';

export default function NovoAgendamentoPage() {
  const [formData, setFormData] = useState({
    clientId: '',
    serviceId: '',
    date: '',
    time: '',
  });

  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Garantir que date e time estejam presentes
      if (!formData.date || !formData.time) {
        setMessage('Preencha data e hora');
        return;
      }

      const response = await createAppointmentFirestore(formData);
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
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Novo Agendamento</h1>
      {message && <p className="mb-4">{message}</p>}
      <form onSubmit={handleSubmit} className="space-y-3 max-w-md">
        <label className="block">
          Cliente ID:
          <input
            className="mt-1 block w-full border p-2 rounded"
            type="text"
            value={formData.clientId}
            onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
          />
        </label>
        <label className="block">
          Serviço ID:
          <input
            className="mt-1 block w-full border p-2 rounded"
            type="text"
            value={formData.serviceId}
            onChange={(e) => setFormData({ ...formData, serviceId: e.target.value })}
          />
        </label>
        <label className="block">
          Data:
          <input
            className="mt-1 block w-full border p-2 rounded"
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          />
        </label>
        <label className="block">
          Hora:
          <input
            className="mt-1 block w-full border p-2 rounded"
            type="time"
            value={formData.time}
            onChange={(e) => setFormData({ ...formData, time: e.target.value })}
          />
        </label>
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
          Criar Agendamento
        </button>
      </form>
    </div>
  );
}
