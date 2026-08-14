
export type UnitId = string;
export type ProfessionalId = string;
export type PatientId = string;

export type UserRole = 'admin' | 'secretary' | 'professional' | 'super_admin' | 'manager' | 'financial';

// Novas chaves de permissão
export type PermissionKey =
  | 'view_dashboard'
  | 'view_secretary_dashboard'
  | 'view_manager_dashboard'
  | 'view_financial_dashboard'
  | 'view_schedule'
  | 'manage_patients'
  | 'manage_team'
  | 'manage_units'
  | 'access_professional_portal'
  | 'view_financials'
  | 'manage_plans'
  | 'edit_settings';

export type RolePermissions = Record<UserRole, PermissionKey[]>;

export const DEFAULT_ROLE_PERMISSIONS: RolePermissions = {
  super_admin: [
    'view_dashboard',
    'view_secretary_dashboard',
    'view_manager_dashboard',
    'view_financial_dashboard',
    'view_schedule',
    'manage_patients',
    'manage_team',
    'manage_units',
    'view_financials',
    'manage_plans',
    'edit_settings',
    'access_professional_portal'
  ],
  admin: [
    'view_dashboard',
    'view_schedule',
    'manage_patients',
    'manage_team',
    'manage_units',
    'view_financials',
    'manage_plans',
    'edit_settings'
  ],
  manager: [
    'view_manager_dashboard',
    'view_schedule',
    'manage_patients',
    'manage_team',
    'manage_units',
    'manage_plans'
  ],
  financial: [
    'view_financial_dashboard',
    'view_financials'
  ],
  secretary: [
    'view_secretary_dashboard',
    'view_schedule',
    'manage_patients',
    'manage_plans'
  ],
  professional: [
    'access_professional_portal'
  ]
};

export const getUserEffectivePermissions = (user?: { role: UserRole; customPermissions?: PermissionKey[] } | null): PermissionKey[] => {
  if (!user || !user.role) return [];
  if (Array.isArray(user.customPermissions) && user.customPermissions.length > 0) {
    return user.customPermissions;
  }
  return DEFAULT_ROLE_PERMISSIONS[user.role] || [];
};

export interface PermissionModuleGroup {
  id: string;
  title: string;
  description: string;
  iconName: string;
  permissions: { key: PermissionKey; label: string; description: string }[];
}

export const PERMISSION_MODULES: PermissionModuleGroup[] = [
  {
    id: 'dashboards',
    title: 'Dashboards & Visões Específicas',
    description: 'Permissões de acesso aos dashboards customizados da clínica',
    iconName: 'LayoutDashboard',
    permissions: [
      { key: 'view_dashboard', label: 'Dashboard Executivo (Administrador)', description: 'Visão global da clínica, métricas e comunicados executivos' },
      { key: 'view_manager_dashboard', label: 'Dashboard do Gerente Operacional', description: 'Taxa de ocupação da unidade, retenção de pacientes e produtividade' },
      { key: 'view_financial_dashboard', label: 'Dashboard do Financeiro', description: 'Gráficos de fluxo de caixa, inadimplência e repasses' },
      { key: 'view_secretary_dashboard', label: 'Dashboard da Secretária (Recepção)', description: 'Fila de atendimento do dia, recepção e check-in rápido' },
      { key: 'access_professional_portal', label: 'Portal / Dashboard do Profissional', description: 'Agenda clínica pessoal, prontuários e comissões' }
    ]
  },
  {
    id: 'operation',
    title: 'Operação & Atendimento Geral',
    description: 'Acessos às ferramentas do dia a dia da recepção e clínica',
    iconName: 'Calendar',
    permissions: [
      { key: 'view_schedule', label: 'Acessar Agenda Geral', description: 'Visualizar e gerenciar agendamentos de toda a equipe' },
      { key: 'manage_patients', label: 'Gerenciar Pacientes', description: 'Cadastrar, editar e visualizar prontuários e fotos' },
      { key: 'manage_plans', label: 'Gerenciar Serviços e Planos', description: 'Cadastrar e editar pacotes de planos, sessões e especialidades' }
    ]
  },
  {
    id: 'management',
    title: 'Gestão & Administração',
    description: 'Controle de equipe, filiais, finanças e configurações',
    iconName: 'Briefcase',
    permissions: [
      { key: 'manage_team', label: 'Gerenciar Equipe', description: 'Cadastrar e editar colaboradores e fisioterapeutas' },
      { key: 'manage_units', label: 'Configurar Unidades', description: 'Criar filiais, horários de funcionamento e feriados' },
      { key: 'view_financials', label: 'Ver Financeiro Geral', description: 'Demonstrativo completo de receitas, despesas e lançamentos' },
      { key: 'edit_settings', label: 'Editar Configurações do Sistema', description: 'Regras de acesso e cadastros gerais do sistema' }
    ]
  }
];

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

// ...
export interface Professional {
  id: ProfessionalId;
  name: string;
  crf: string;
  specialty: string;
  hourlyRate: number;
  unitIds: UnitId[];
  color: string; // For calendar visualization
  avatarUrl?: string; // Foto do perfil do profissional
  email?: string; // Email do profissional para vínculo de conta
}

export interface Plan {
  name: string;
  totalSessions: number;
  remainingSessions: number;
  expiresAt: string;
  totalPaid?: number;
  paymentStatus?: 'pending' | 'paid' | 'cancelled';
  paymentDate?: string;
  paymentMethod?: string;
}

export interface Patient {
  id: PatientId;
  name: string;
  unitId: UnitId;
  phone: string;
  status: 'Active' | 'Inactive';
  plan: Plan;
  photoUrl?: string; // Novo campo para foto
  facialDescriptor?: string; // Biometria facial / descriptor
  lastVisit?: string;
  // Campos detalhados do prontuário
  cpf?: string;
  birthDate?: string;
  cep?: string;
  street?: string;
  number?: string;
  bairro?: string;
  complement?: string;
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
  duration?: number; // Duration in minutes (default: 30)
  type: string; // e.g., "Fisioterapia", "Hidroterapia"
  status: SessionStatus;
  notes?: string;
  signed?: boolean; // Novo campo para controle de assinatura
  signatureUrl?: string; // URL da assinatura ou foto
  isOutsidePlan?: boolean; // Sessão avulsa
  price?: number; // Preço da sessão avulsa
}

// --- Avisos e Comunicação ---
export interface Announcement {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'urgent';
  date: string;
  targetRole: 'all' | 'professional' | 'secretary' | 'individual';
  targetProfessionalId?: string;
}

// --- Usuários do Sistema (Para Permissões) ---
export interface SystemUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  unitId?: UnitId;
  avatarUrl?: string;
  customPermissions?: PermissionKey[]; // Permissões específicas que sobrescrevem a role
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  type?: 'info' | 'warning' | 'urgent' | 'session';
  createdAt?: string;
}

export type AuditCategory = 'agenda' | 'plans' | 'patients' | 'financial' | 'users' | 'system';

export interface AuditLogItem {
  id: string;
  userName: string;
  userRole: UserRole | string;
  category: AuditCategory;
  action: string;
  details: string;
  ipAddress?: string;
  createdAt: string;
}
