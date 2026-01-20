
export type UnitId = string;
export type ProfessionalId = string;
export type PatientId = string;

export type UserRole = 'admin' | 'secretary' | 'professional';

// Novas chaves de permissão
export type PermissionKey = 
  | 'view_dashboard'
  | 'view_schedule'
  | 'manage_patients'
  | 'manage_team'
  | 'manage_units'
  | 'access_professional_portal'
  | 'view_financials'
  | 'edit_settings';

export type RolePermissions = Record<UserRole, PermissionKey[]>;

export enum SessionStatus {
  SCHEDULED = 'Agendada',
  CONFIRMED = 'Confirmada',
  COMPLETED = 'Realizada',
  CANCELED = 'Cancelada',
  NOSHOW = 'Falta'
}

// --- Configuração de Horários ---
export type WeekDay = 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';

export interface DaySchedule {
  day: WeekDay;
  isOpen: boolean;
  start: string; // HH:mm
  end: string;   // HH:mm
}

export interface Holiday {
  id: string;
  date: string; // YYYY-MM-DD
  name: string;
}

export interface Unit {
  id: UnitId;
  name: string;
  city: string;
  specialties: string[];
  hasPool: boolean;
  isActive: boolean;
  operatingHours?: DaySchedule[]; // Configuração de horário
  holidays?: Holiday[]; // Feriados específicos da unidade
}

// --- Configuração de Planos e Especialidades ---

export interface Specialty {
    id: string;
    name: string;
    active: boolean;
}

export interface PlanTemplate {
  id: string;
  name: string;
  specialtyId?: string; // Vinculo com especialidade
  sessions: number;
  price: number;
  description?: string;
  active: boolean;
}

export interface Professional {
  id: ProfessionalId;
  name: string;
  crf: string;
  specialty: string;
  hourlyRate: number;
  unitIds: UnitId[];
  color: string; // For calendar visualization
}

export interface Plan {
  name: string;
  totalSessions: number;
  remainingSessions: number;
  expiresAt: string;
}

export interface Patient {
  id: PatientId;
  name: string;
  unitId: UnitId;
  phone: string;
  status: 'Active' | 'Inactive';
  plan: Plan;
  photoUrl?: string; // Novo campo para foto
  lastVisit?: string;
  // Campos detalhados do prontuário
  cpf?: string;
  birthDate?: string;
  address?: string;
  city?: string;
}

export interface Session {
  id: string;
  patientId: PatientId;
  professionalId: ProfessionalId;
  unitId: UnitId;
  date: string; // ISO String
  time: string; // HH:mm
  type: string; // e.g., "Fisioterapia", "Hidroterapia"
  status: SessionStatus;
  notes?: string;
  signed?: boolean; // Novo campo para controle de assinatura
}

// --- Avisos e Comunicação ---
export interface Announcement {
    id: string;
    title: string;
    message: string;
    type: 'info' | 'warning' | 'urgent';
    date: string;
    targetRole: 'all' | 'professional' | 'secretary';
}

// --- Usuários do Sistema (Para Permissões) ---
export interface SystemUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  customPermissions?: PermissionKey[]; // Permissões específicas que sobrescrevem a role
}
