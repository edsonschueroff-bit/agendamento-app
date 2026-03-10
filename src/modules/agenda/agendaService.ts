import { addSubDocument, getSubDocuments, updateSubDocument, deleteSubDocument, getSubDocument } from '@/lib/firestoreService';
import { Appointment, Service, BusinessSettings, DayOfWeek } from '@/lib/types';
import { Timestamp } from 'firebase/firestore';

// Map JS getDay() (0=Sun) to DayOfWeek keys
const JS_DAY_MAP: DayOfWeek[] = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];

// Helper: Verifica se o horário está dentro do funcionamento configurado
const checkBusinessHours = async (userId: string, startTime: Date): Promise<boolean> => {
  try {
    const settings = await getSubDocument<BusinessSettings>('users', userId, 'settings', 'business');
    if (!settings?.schedule) return true; // sem configuração = sem restrição

    const dayKey = JS_DAY_MAP[startTime.getDay()];
    const daySchedule = settings.schedule[dayKey];

    if (!daySchedule?.enabled) return false; // dia fechado

    const [openH, openM] = daySchedule.open.split(':').map(Number);
    const [closeH, closeM] = daySchedule.close.split(':').map(Number);

    const startMin = startTime.getHours() * 60 + startTime.getMinutes();
    const openMin = openH * 60 + openM;
    const closeMin = closeH * 60 + closeM;

    return startMin >= openMin && startMin < closeMin;
  } catch {
    return true; // em caso de erro, não bloqueia
  }
};

// Helper: Verifica conflitos de horário
const checkConflict = async (
  userId: string,
  newStart: Date,
  newEnd: Date,
  ignoreAppointmentId?: string
) => {
  const startOfDay = new Date(newStart);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(newStart);
  endOfDay.setHours(23, 59, 59, 999);

  const dayAppointments = await getSubDocuments<Appointment>('users', userId, 'appointments', [
    { field: 'date', operator: '>=', value: Timestamp.fromDate(startOfDay) },
    { field: 'date', operator: '<=', value: Timestamp.fromDate(endOfDay) }
  ]);

  const hasConflict = dayAppointments.some(appt => {
    if (appt.id === ignoreAppointmentId) return false;
    if (appt.status === 'cancelado') return false;

    const apptStart = appt.date.toDate();
    // Se não tiver endTime, assume 60 min de duração como fallback seguro
    const apptEnd = appt.endTime ? appt.endTime.toDate() : new Date(apptStart.getTime() + 60 * 60000);

    // Lógica de sobreposição (overlap) de intervalos de tempo
    return newStart < apptEnd && newEnd > apptStart;
  });

  return hasConflict;
};

// Helper: Busca a duração do serviço
const getServiceDuration = async (userId: string, serviceId: string): Promise<number> => {
  const services = await getSubDocuments<Service>('users', userId, 'services', [
    { field: 'id', operator: '==', value: serviceId } // ou usando filter se o id for o doc id
  ]);
  // Se não encontrou pelo field 'id', pode ser pelo doc id real. 
  // Na nossa implementação, os serviços costumam ter o docId atrelado.
  // Vamos buscar todos e achar na memória se falhar a query:
  if (services.length > 0) return services[0].duration;

  const allServices = await getSubDocuments<Service>('users', userId, 'services');
  const service = allServices.find(s => s.id === serviceId);
  return service?.duration || 60; // fallback 60 min
}

export const createAppointment = async (
  userId: string,
  data: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt' | 'endTime' | 'duration'> & { duration?: number }
) => {
  try {
    const duration = data.duration || await getServiceDuration(userId, data.serviceId);

    const startTime = data.date.toDate();
    const endTime = new Date(startTime.getTime() + duration * 60000);

    const withinHours = await checkBusinessHours(userId, startTime);
    if (!withinHours) {
      return { success: false, error: 'FORA_DO_HORARIO', message: 'Este horário está fora do seu horário de atendimento configurado.' };
    }

    const hasConflict = await checkConflict(userId, startTime, endTime);
    if (hasConflict) {
      return { success: false, error: 'CONFLITO_DE_HORARIO', message: 'Já existe um agendamento para este horário.' };
    }

    const appointmentData: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'> = {
      ...data,
      duration,
      endTime: Timestamp.fromDate(endTime),
    };

    const id = await addSubDocument<Appointment>('users', userId, 'appointments', appointmentData);
    return { success: true, id };
  } catch (error) {
    console.error('Erro ao criar agendamento:', error);
    return { success: false, error };
  }
};

export const listAppointments = async (userId: string) => {
  try {
    const appointments = await getSubDocuments<Appointment>(
      'users', userId, 'appointments',
      undefined, 'date', 'asc'
    );
    return { success: true, appointments };
  } catch (error) {
    console.error('Erro ao listar agendamentos:', error);
    return { success: false, error };
  }
};

export const editAppointment = async (
  userId: string,
  appointmentId: string,
  data: Partial<Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>>
) => {
  try {
    // Se estiver atualizando a data ou o serviço, precisa recalcular endTime e checar conflito
    let updateData = { ...data };

    if (data.date || data.serviceId) {
      // Para editar com segurança, precisamos saber o appointment atual
      const allAppts = await getSubDocuments<Appointment>('users', userId, 'appointments');
      const currentAppt = allAppts.find(a => a.id === appointmentId);

      if (currentAppt) {
        const newDate = data.date || currentAppt.date;
        const newServiceId = data.serviceId || currentAppt.serviceId;
        const duration = data.duration || await getServiceDuration(userId, newServiceId);

        const startTime = newDate.toDate();
        const endTime = new Date(startTime.getTime() + duration * 60000);

        const withinHours = await checkBusinessHours(userId, startTime);
        if (!withinHours) {
          return { success: false, error: 'FORA_DO_HORARIO', message: 'Este horario esta fora do seu horario de atendimento configurado.' };
        }

        const hasConflict = await checkConflict(userId, startTime, endTime, appointmentId);
        if (hasConflict) {
          return { success: false, error: 'CONFLITO_DE_HORARIO', message: 'Já existe um agendamento para este horário.' };
        }

        updateData = {
          ...updateData,
          duration,
          endTime: Timestamp.fromDate(endTime),
        };
      }
    }

    await updateSubDocument('users', userId, 'appointments', appointmentId, updateData);
    return { success: true };
  } catch (error) {
    console.error('Erro ao atualizar agendamento:', error);
    return { success: false, error };
  }
};

export const removeAppointment = async (userId: string, appointmentId: string) => {
  try {
    await deleteSubDocument('users', userId, 'appointments', appointmentId);
    return { success: true };
  } catch (error) {
    console.error('Erro ao remover agendamento:', error);
    return { success: false, error };
  }
};



