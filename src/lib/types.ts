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
  city?: string;
  zipCode?: string;
  notes?: string;
  userId: string;
  totalSpent: number;
  totalAppointments: number;
  lastAppointment?: Timestamp; // SEMPRE Timestamp, nunca string
  joinedAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Histórico de cliente (subcollection)
export interface ClientHistory {
  id?: string;
  date: Timestamp; // SEMPRE Timestamp
  service: string;
  price: number;
  status: string;
  createdAt: Timestamp;
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
  clientPhone: string;
  serviceId: string;
  serviceName: string;
  servicePrice: number;
  price: number;
  date: Timestamp; // SEMPRE Timestamp, NUNCA string
  time: string; // HH:MM separado
  endTime?: Timestamp;
  duration?: number; // em minutos
  status: 'agendado' | 'confirmado' | 'concluido' | 'cancelado';
  notes?: string;
  userId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  // Campos para reagendamento
  reschedulingToken?: string; // Token JWT para reagendamento público
  reschedulingExpiresAt?: Timestamp; // Token expira após 30 dias
}

// Tipo para token de reagendamento decodificado
export interface ReschedulingTokenPayload {
  appointmentId: string;
  userId: string;
  clientId: string;
  iat: number;
  exp: number;
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
  // Dias de folga e feriados (mantém em string YYYY-MM-DD para facilitar UI)
  holidays?: string[]; // Array de datas em formato YYYY-MM-DD
  timeBetweenAppointments?: number; // em minutos (padrão 0)
  // Regras de cancelamento
  cancellationPolicy?: {
    minHoursNotice: number; // Horas mínimas para cancelar (padrão 24)
    penaltyPercentage: number; // Percentual de penalidade (0-100)
  };
  // Configurações de notificações
  notifications?: {
    sendEmailReminder: boolean;
    reminderHoursBefore: number; // 24, 12, 1
    sendSMSReminder: boolean;
    notifyOnNewAppointment: boolean;
  };
  publicUrl?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// Tipos de Despesa
export interface Expense {
  id?: string;
  description: string;
  amount: number;
  category: 'material' | 'aluguel' | 'salário' | 'outro';
  date: Timestamp; // SEMPRE Timestamp, NUNCA string
  paymentMethod?: 'dinheiro' | 'débito' | 'crédito' | 'PIX';
  userId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Tipos para Análises Avançadas
export interface ServiceAnalytics {
  serviceId: string;
  serviceName: string;
  totalAppointments: number;
  totalRevenue: number;
  averagePrice: number;
  trend: number; // percentual de crescimento
  ranking: number; // posição no ranking
}

export interface ClientAnalytics {
  clientId: string;
  clientName: string;
  totalAppointments: number;
  totalSpent: number;
  averageTicket: number;
  lastAppointment: Timestamp;
  status: 'regular' | 'occasional' | 'dormant';
  potential: 'high' | 'medium' | 'low';
  churnRisk: boolean;
}

export interface RevenueAnalytics {
  period: string; // formato "MMM yyyy" ou outro customizado
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  appointmentCount: number;
  averageTicket: number;
  trend: number; // percentual comparado com período anterior
}

export interface ForecastData {
  date: string; // YYYY-MM-DD
  predictedRevenue: number;
  confidence: number; // 0-100
  basedOnAppointments: number;
}

export interface DashboardAnalytics {
  period: string;
  revenue: RevenueAnalytics;
  topServices: ServiceAnalytics[];
  topClients: ClientAnalytics[];
  forecast: ForecastData[];
  healthScore: number; // 0-100
  insights: string[];
}

/**
 * HELPER: Converte qualquer tipo de data para Timestamp
 * Aceita: Date, string YYYY-MM-DD, Timestamp ou null/undefined
 * Retorna: Timestamp ou null
 */
export const ensureTimestamp = (dateValue: any): Timestamp | null => {
  if (!dateValue) return null;
  if (dateValue instanceof Timestamp) return dateValue;
  if (dateValue instanceof Date) return Timestamp.fromDate(dateValue);
  if (typeof dateValue === 'string') {
    try {
      return Timestamp.fromDate(new Date(dateValue));
    } catch {
      console.error('Invalid date string:', dateValue);
      return null;
    }
  }
  return null;
};

/**
 * HELPER: Converte Timestamp para Date para comparações
 */
export const timestampToDate = (ts: Timestamp | null | undefined): Date | null => {
  if (!ts) return null;
  if (ts instanceof Timestamp) return ts.toDate();
  return null;
};