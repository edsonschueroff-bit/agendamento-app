'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/components/providers/AuthProvider';
import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout';
import { Appointment, Client, Service, Professional } from '@/lib/types';
import { deleteAppointmentWithTransaction, getSubDocuments } from '@/lib/firestoreService';
import { Timestamp } from 'firebase/firestore';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { createAppointment, editAppointment } from '@/modules/agenda/agendaService';

const locales = {
  'pt-BR': ptBR,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

export default function AgendamentosPage() {
  const { loading, isAuthenticated, user } = useAuthContext();
  const router = useRouter();

  // Estados para dados
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);

  // Estados para filtros e view
  const [filterDate, setFilterDate] = useState('');
  const [filterClient, setFilterClient] = useState('');
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

  // Estados para modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);

  // Estados para formulário
  const [formData, setFormData] = useState({
    clientId: '',
    serviceId: '',
    professionalId: '',
    date: '',
    time: '',
    status: 'agendado' as 'agendado' | 'confirmado' | 'concluido' | 'cancelado',
    notes: ''
  });

  // Estados de loading
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadData = useCallback(async () => {
    if (!user?.uid) return;

    setIsLoading(true);
    try {
      const [clientsData, servicesData, appointmentsData, professionalsData] = await Promise.all([
        getSubDocuments<Client>('users', user.uid, 'clients'),
        getSubDocuments<Service>('users', user.uid, 'services'),
        getSubDocuments<Appointment>('users', user.uid, 'appointments'),
        getSubDocuments<Professional>('users', user.uid, 'professionals'),
      ]);

      setClients(clientsData);
      setServices(servicesData);
      setAppointments(appointmentsData);
      setProfessionals(professionalsData.filter(p => p.isActive));
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [loading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated && user?.uid) {
      loadData();
    }
  }, [isAuthenticated, user?.uid, loadData]);

  const formatDateForInput = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const filteredAppointments = appointments.filter(appointment => {
    const matchesDate = !filterDate ||
      formatDateForInput(
        appointment.date instanceof Date
          ? appointment.date
          : typeof appointment.date === 'string'
            ? new Date(appointment.date)
            : appointment.date.toDate()
      ) === filterDate;
    const matchesClient = !filterClient || appointment.clientId === filterClient;
    return matchesDate && matchesClient;
  });

  // Helper function to convert various date formats to Date object
  const getDateObject = (dateValue: Date | string | { toDate?: () => Date } | null | undefined): Date => {
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

  const calendarEvents = filteredAppointments.map(appt => {
    const start = getDateObject(appt.date);
    const end = appt.endTime ? getDateObject(appt.endTime) : new Date(start.getTime() + (appt.duration || 60) * 60000);
    
    // Truncate title to fit better in calendar
    const clientNameShort = appt.clientName.length > 20 ? appt.clientName.substring(0, 20) + '...' : appt.clientName;
    const serviceNameShort = appt.serviceName.length > 15 ? appt.serviceName.substring(0, 15) + '...' : appt.serviceName;
    
    return {
      id: appt.id,
      title: `${clientNameShort} - ${serviceNameShort}`,
      start,
      end,
      resource: appt,
      desc: `${appt.clientName} - ${appt.serviceName}` // Full text for tooltip
    };
  });

  const openModal = (appointment?: Appointment) => {
    if (appointment) {
      setEditingAppointment(appointment);
      const date = getDateObject(appointment.date);
      setFormData({
        clientId: appointment.clientId,
        serviceId: appointment.serviceId,
        professionalId: appointment.professionalId ?? '',
        date: formatDateForInput(date),
        time: date.toTimeString().slice(0, 5),
        status: appointment.status,
        notes: appointment.notes || ''
      });
    } else {
      setEditingAppointment(null);
      setFormData({
        clientId: '',
        serviceId: '',
        professionalId: '',
        date: '',
        time: '',
        status: 'agendado',
        notes: ''
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingAppointment(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const selectedClient = clients.find(c => c.id === formData.clientId);
      const selectedService = services.find(s => s.id === formData.serviceId);

      if (!selectedClient || !selectedService) {
        console.error('Cliente ou servico nao encontrado:', { clientId: formData.clientId, serviceId: formData.serviceId });
        throw new Error('Cliente ou servico nao encontrado');
      }

      const dateTime = new Date(`${formData.date}T${formData.time}`);
      const selectedProfessional = formData.professionalId
        ? professionals.find(p => p.id === formData.professionalId)
        : null;
      const appointmentData = {
        clientId: formData.clientId,
        clientName: selectedClient.name,
        clientPhone: selectedClient.phone || '',
        serviceId: formData.serviceId,
        serviceName: selectedService.name,
        servicePrice: selectedService.price,
        price: selectedService.price,
        date: Timestamp.fromDate(dateTime),
        time: formData.time,
        duration: selectedService.duration,
        status: formData.status,
        notes: formData.notes,
        userId: user!.uid,
        ...(selectedProfessional && {
          professionalId: selectedProfessional.id,
          professionalName: selectedProfessional.name,
        }),
      };

      if (editingAppointment) {
        const result = await editAppointment(user!.uid, editingAppointment.id!, appointmentData);
        if (!result.success) {
          const errMsg = typeof result.error === 'string' ? result.error : 'ERRO_AO_ATUALIZAR';
          const isConflict = errMsg === 'CONFLITO_DE_HORARIO';
          const isOutOfHours = errMsg === 'FORA_DO_HORARIO';
          const text = isConflict
            ? 'Ja existe um agendamento para este horario. Escolha outro horario.'
            : isOutOfHours
              ? 'Este horario esta fora do seu horario de atendimento. Ajuste em Configuracoes.'
              : 'Erro ao atualizar agendamento. Verifique os dados e tente novamente.';

          setMessage({ type: 'error', text });
          setTimeout(() => setMessage(null), 5000);
          return;
        }
      } else {
        const result = await createAppointment(user!.uid, appointmentData);
        if (!result.success) {
          const errMsg = typeof result.error === 'string' ? result.error : 'ERRO_AO_CRIAR';
          const isConflict = errMsg === 'CONFLITO_DE_HORARIO';
          const isOutOfHours = errMsg === 'FORA_DO_HORARIO';
          const text = isConflict
            ? 'Ja existe um agendamento para este horario. Escolha outro horario.'
            : isOutOfHours
              ? 'Este horario esta fora do seu horario de atendimento. Ajuste em Configuracoes.'
              : 'Erro ao criar agendamento. Verifique os dados e tente novamente.';

          setMessage({ type: 'error', text });
          setTimeout(() => setMessage(null), 5000);
          return;
        }
      }

      closeModal();
      loadData();
      setMessage({ type: 'success', text: editingAppointment ? 'Agendamento atualizado com sucesso!' : 'Agendamento criado com sucesso!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      const isConflict = errMsg === 'CONFLITO_DE_HORARIO';
      const isOutOfHours = errMsg === 'FORA_DO_HORARIO';

      if (!isConflict && !isOutOfHours) {
        console.error('Erro ao salvar agendamento:', error);
      }

      const text = isConflict
        ? 'Ja existe um agendamento para este horario. Escolha outro horario.'
        : isOutOfHours
          ? 'Este horario esta fora do seu horario de atendimento. Ajuste em Configuracoes.'
          : 'Erro ao salvar agendamento. Verifique os dados e tente novamente.';
      setMessage({ type: 'error', text });
      setTimeout(() => setMessage(null), 5000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (appointmentId: string) => {
    if (!confirm('Tem certeza que deseja excluir este agendamento?')) {
      return;
    }

    try {
      await deleteAppointmentWithTransaction(user!.uid, appointmentId);

      loadData();
      setMessage({ type: 'success', text: 'Agendamento excluído com sucesso!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Erro ao excluir agendamento:', error);
      setMessage({ type: 'error', text: 'Erro ao excluir agendamento' });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'agendado': return 'bg-blue-100 text-blue-800';
      case 'concluido': return 'bg-green-100 text-green-800';
      case 'cancelado': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDateTime = (dateValue: Date | string | { toDate?: () => Date } | null | undefined) => {
    const date = getDateObject(dateValue);
    return {
      date: date.toLocaleDateString('pt-BR'),
      time: date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    };
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;
  }

  return (
    <AuthenticatedLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Agendamentos</h1>
          <p className="text-gray-600">Gerencie seus agendamentos</p>
        </div>

        {/* Mensagens */}
        {message && (
          <div className={`mb-4 p-4 rounded-md ${message.type === 'success'
            ? 'bg-green-100 border border-green-400 text-green-700'
            : 'bg-red-100 border border-red-400 text-red-700'
            }`}>
            {message.text}
          </div>
        )}

        {/* Filtros */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filtrar por Data
              </label>
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filtrar por Cliente
              </label>
              <select
                value={filterClient}
                onChange={(e) => setFilterClient(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos os clientes</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end space-x-2">
              <button
                onClick={() => {
                  setFilterDate('');
                  setFilterClient('');
                }}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 hidden md:block"
              >
                Limpar
              </button>
              <button
                onClick={() => openModal()}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Novo Agendamento
              </button>
            </div>
          </div>

          <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100">
            <div className="text-sm text-gray-600">
              {filteredAppointments.length} agendamento{filteredAppointments.length !== 1 ? 's' : ''} encontrado{filteredAppointments.length !== 1 ? 's' : ''}
            </div>

            <div className="flex space-x-2">
              <button
                onClick={() => setViewMode('calendar')}
                className={`px-3 py-1 text-sm font-medium rounded-md ${viewMode === 'calendar' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Calendário
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1 text-sm font-medium rounded-md ${viewMode === 'list' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Lista
              </button>
            </div>
          </div>
        </div>

        {/* Lista de Agendamentos */}
        <div className="bg-white rounded-lg shadow">
          {/* Custom Calendar Styles */}
          <style>{`
            .rbc-event {
              padding: 1px 2px !important;
              font-size: 12px !important;
              line-height: 1.4 !important;
              height: auto !important;
              min-height: 20px !important;
              max-height: 22px !important;
              overflow: hidden !important;
            }
            .rbc-event-label {
              display: none !important;
              height: 0 !important;
            }
            .rbc-event-content {
              padding: 0px !important;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              margin: 0 !important;
              line-height: 1.4 !important;
            }
            .rbc-addons-dnd-resizable > * {
              display: none !important;
            }
            .rbc-day-slot .rbc-events {
              flex-direction: column;
            }
            .rbc-event:hover {
              opacity: 0.85;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              z-index: 10;
            }
            .rbc-toolbar {
              padding: 12px !important;
              margin-bottom: 12px !important;
              flex-wrap: wrap;
            }
            .rbc-toolbar button {
              padding: 4px 8px !important;
              font-size: 12px !important;
              margin: 2px !important;
            }
            .rbc-month-view {
              border: 1px solid #e5e7eb;
            }
            .rbc-month-row {
              min-height: 60px;
            }
            .rbc-date-cell {
              padding: 2px !important;
            }
          `}</style>
          
          {isLoading ? (
            <div className="p-6 text-center">Carregando agendamentos...</div>
          ) : viewMode === 'calendar' ? (
            <div className="p-4 h-[600px]">
              <Calendar
                localizer={localizer}
                events={calendarEvents}
                startAccessor="start"
                endAccessor="end"
                style={{ height: '100%' }}
                messages={{
                  next: "Próximo",
                  previous: "Anterior",
                  today: "Hoje",
                  month: "Mês",
                  week: "Semana",
                  day: "Dia",
                  agenda: "Agenda",
                  noEventsInRange: "Nenhum agendamento neste período"
                }}
                onSelectEvent={(event: { resource?: unknown }) => openModal(event.resource as Appointment)}
                eventPropGetter={(event: { resource?: unknown }) => {
                  const appointment = event.resource as Appointment;
                  const status = appointment?.status;
                  let backgroundColor = '#3b82f6'; // blue-500 (agendado)
                  if (status === 'concluido') backgroundColor = '#22c55e'; // green-500
                  if (status === 'cancelado') backgroundColor = '#ef4444'; // red-500

                  return { style: { backgroundColor } };
                }}
              />
            </div>
          ) : filteredAppointments.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              Nenhum agendamento encontrado
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cliente
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Serviço
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Data e Hora
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Preço
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredAppointments.map((appointment) => {
                      const { date, time } = formatDateTime(appointment.date);
                      return (
                        <tr key={appointment.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {appointment.clientName}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {appointment.serviceName}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{date}</div>
                            <div className="text-sm text-gray-500">{time}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(appointment.status)}`}>
                              {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            R$ {appointment.servicePrice.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end space-x-2">
                              <button
                                onClick={() => {
                                  const { date, time } = formatDateTime(appointment.date);
                                  const msg = encodeURIComponent(`Olá ${appointment.clientName}! Lembrando do seu agendamento: ${appointment.serviceName} no dia ${date} às ${time}. Qualquer dúvida, entre em contato. Obrigado! 😊`);
                                  window.open(`https://wa.me/?text=${msg}`, '_blank');
                                }}
                                className="text-green-600 hover:text-green-900 text-xs"
                                title="Enviar lembrete via WhatsApp"
                              >
                                📲 Lembrete
                              </button>
                              <button
                                onClick={() => openModal(appointment)}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                Editar
                              </button>
                              <button
                                onClick={() => handleDelete(appointment.id!)}
                                className="text-red-600 hover:text-red-900"
                              >
                                Excluir
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden">
                {filteredAppointments.map((appointment) => {
                  const { date, time } = formatDateTime(appointment.date);
                  return (
                    <div key={appointment.id} className="p-4 border-b border-gray-200">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-medium text-gray-900">{appointment.clientName}</h3>
                          <p className="text-sm text-gray-600">{appointment.serviceName}</p>
                        </div>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(appointment.status)}`}>
                          {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 mb-2">
                        <p>{date} às {time}</p>
                        <p>R$ {appointment.servicePrice.toFixed(2)}</p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => openModal(appointment)}
                          className="text-blue-600 hover:text-blue-900 text-sm"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(appointment.id!)}
                          className="text-red-600 hover:text-red-900 text-sm"
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Modal */}
        {isModalOpen && (
          <div
            className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50"
            onClick={closeModal}
          >
            <div
              className="relative top-10 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mt-3">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    {editingAppointment ? 'Editar Agendamento' : 'Novo Agendamento'}
                  </h3>
                  <button
                    onClick={closeModal}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <form onSubmit={handleSubmit}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Cliente *
                      </label>
                      <select
                        required
                        value={formData.clientId}
                        onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Selecione um cliente</option>
                        {clients.map((client) => (
                          <option key={client.id} value={client.id}>
                            {client.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Serviço *
                      </label>
                      <select
                        required
                        value={formData.serviceId}
                        onChange={(e) => setFormData({ ...formData, serviceId: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Selecione um serviço</option>
                        {services.map((service) => (
                          <option key={service.id} value={service.id}>
                            {service.name} - R$ {service.price.toFixed(2)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Profissional
                      </label>
                      <select
                        value={formData.professionalId}
                        onChange={(e) => setFormData({ ...formData, professionalId: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Nenhum</option>
                        {professionals.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.specialty})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Data *
                        </label>
                        <input
                          type="date"
                          required
                          value={formData.date}
                          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Hora *
                        </label>
                        <input
                          type="time"
                          required
                          value={formData.time}
                          onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Status *
                      </label>
                      <select
                        required
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as 'agendado' | 'confirmado' | 'concluido' | 'cancelado' })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="agendado">Agendado</option>
                        <option value="concluido">Concluído</option>
                        <option value="cancelado">Cancelado</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Observações
                      </label>
                      <textarea
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Observações sobre o agendamento..."
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center mt-6">
                    {/* Botão de Lembrete WhatsApp — visível ao editar */}
                    {editingAppointment && (
                      <button
                        type="button"
                        onClick={() => {
                          const { date, time } = formatDateTime(editingAppointment.date);
                          const msg = encodeURIComponent(`Olá ${editingAppointment.clientName}! Lembrando do seu agendamento: ${editingAppointment.serviceName} no dia ${date} às ${time}. Qualquer dúvida, entre em contato. Obrigado! 😊`);
                          window.open(`https://wa.me/?text=${msg}`, '_blank');
                        }}
                        className="flex items-center gap-1 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 text-sm font-medium"
                      >
                        📲 Enviar Lembrete (WhatsApp)
                      </button>
                    )}
                    {!editingAppointment && <div />}
                    <div className="flex space-x-3">
                      <button
                        type="button"
                        onClick={closeModal}
                        className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                      >
                        {isSubmitting ? 'Salvando...' : 'Salvar'}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  );
}



