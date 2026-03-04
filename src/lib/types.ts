import { Timestamp } from 'firebase/firestore';

// Tipos de usuário
export interface User {
  id: string;
  email: string;
  name?: string;
  photoURL?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Tipos de cliente
export interface Client {
  id?: string;
  name: string;
  email: string;
  phone: string;
  address?: string;
  notes?: string;
  userId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Tipos de serviço
export interface Service {
  id?: string;
  name: string;
  description?: string;
  price: number;
  duration: number; // em minutos
  isActive: boolean;
  category: string;
  userId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Tipos de agendamento
export interface Appointment {
  id?: string;
  clientId: string;
  clientName: string;
  serviceId: string;
  serviceName: string;
  servicePrice: number;
  date: Timestamp; // startDate/time
  endTime?: Timestamp;
  duration?: number; // em minutos
  status: 'agendado' | 'concluido' | 'cancelado';
  notes?: string;
  userId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Tipos de equipe
export interface Team {
  id?: string;
  name: string;
  description?: string;
  ownerId: string;
  members: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Tipos de membro da equipe
export interface TeamMember {
  id?: string;
  userId: string;
  teamId: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: Timestamp;
  permissions: string[];
}

// Tipos de notificação
export interface Notification {
  id?: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  read: boolean;
  relatedId?: string;
  relatedType?: 'appointment' | 'team' | 'user';
  createdAt: Timestamp;
}

// Tipos de configurações do usuário
export interface UserSettings {
  id?: string;
  userId: string;
  theme: 'light' | 'dark' | 'system';
  language: 'pt-BR' | 'en-US';
  timezone: string;
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  privacy: {
    profileVisibility: 'public' | 'private' | 'team';
    calendarVisibility: 'public' | 'private' | 'team';
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Tipos de resposta da API
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Tipos de filtros
export interface AppointmentFilters {
  startDate?: Date;
  endDate?: Date;
  status?: Appointment['status'];
  userId?: string;
  teamId?: string;
}

// Tipos de paginação
export interface PaginationParams {
  page: number;
  limit: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

// Tipos de estatísticas
export interface AppointmentStats {
  total: number;
  pending: number;
  confirmed: number;
  cancelled: number;
  completed: number;
  thisWeek: number;
  thisMonth: number;
}

// Tipos de Configurações do Negócio (Horários de Funcionamento)
export type DayOfWeek = 'segunda' | 'terca' | 'quarta' | 'quinta' | 'sexta' | 'sabado' | 'domingo';

export interface DaySchedule {
  enabled: boolean;
  open: string;  // "HH:MM"
  close: string; // "HH:MM"
}

export interface BusinessSettings {
  id?: string;
  userId: string;
  businessName?: string;
  phone?: string;
  schedule: Record<DayOfWeek, DaySchedule>;
  updatedAt?: Timestamp;
}

// Tipos de Despesa
export interface Expense {
  id?: string;
  description: string;
  category: 'Aluguel' | 'Materiais' | 'Marketing' | 'Utilidades' | 'Outros';
  amount: number;
  date: Timestamp;
  userId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}