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
  | 'edit_settings'
  | 'access_internal_chat'
  | 'manage_chat_channels'
  | 'manage_rooms'
  | 'book_rooms'
  | 'view_rooms'
  | 'view_audit_logs';

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
    'access_professional_portal',
    'access_internal_chat',
    'manage_chat_channels',
    'manage_rooms',
    'book_rooms',
    'view_rooms',
    'view_audit_logs'
  ],
  admin: [
    'view_dashboard',
    'view_schedule',
    'manage_patients',
    'manage_team',
    'manage_units',
    'view_financials',
    'manage_plans',
    'edit_settings',
    'access_internal_chat',
    'manage_chat_channels',
    'manage_rooms',
    'book_rooms',
    'view_rooms',
    'view_audit_logs'
  ],
  manager: [
    'view_manager_dashboard',
    'view_schedule',
    'manage_patients',
    'manage_team',
    'manage_units',
    'manage_plans',
    'access_internal_chat',
    'manage_chat_channels',
    'book_rooms',
    'view_rooms',
    'view_audit_logs'
  ],
  financial: [
    'view_financial_dashboard',
    'view_financials',
    'access_internal_chat',
    'view_rooms'
  ],
  secretary: [
    'view_secretary_dashboard',
    'view_schedule',
    'manage_patients',
    'manage_plans',
    'access_internal_chat',
    'view_rooms'
  ],
  professional: [
    'access_professional_portal',
    'access_internal_chat',
    'book_rooms',
    'view_rooms'
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
      { key: 'view_dashboard', label: 'Dashboard Executivo (Administrador)', description: 'Visão global da clínica e métricas executivas' },
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
      { key: 'manage_plans', label: 'Gerenciar Serviços e Planos', description: 'Cadastrar e editar pacotes de planos, sessões e especialidades' },
      { key: 'book_rooms', label: 'Reservar Salas', description: 'Criar, alterar e cancelar reservas de salas para atendimentos' },
      { key: 'view_rooms', label: 'Ver Ocupação de Salas', description: 'Visualizar grade de salas sem permissão para reservar/alterar' }
    ]
  },
  {
    id: 'communication',
    title: 'Comunicação & Chat Interno',
    description: 'Permissões de chat e avisos em tempo real da equipe',
    iconName: 'MessageSquare',
    permissions: [
      { key: 'access_internal_chat', label: 'Acessar Chat Interno', description: 'Participar de canais da equipe e enviar mensagens diretas 1 a 1' },
      { key: 'manage_chat_channels', label: 'Gerenciar Canais de Chat', description: 'Criar canais oficiais da clínica e definir regras' }
    ]
  },
  {
    id: 'management',
    title: 'Gestão & Administração',
    description: 'Controle de equipe, filiais, finanças, salas e auditoria',
    iconName: 'Briefcase',
    permissions: [
      { key: 'manage_team', label: 'Gerenciar Equipe', description: 'Cadastrar e editar colaboradores e fisioterapeutas' },
      { key: 'manage_units', label: 'Configurar Unidades', description: 'Criar filiais, horários de funcionamento e feriados' },
      { key: 'manage_rooms', label: 'Configurar Salas da Clínica', description: 'Cadastrar e editar salas em Configurações' },
      { key: 'view_financials', label: 'Ver Financeiro Geral', description: 'Demonstrativo completo de receitas, despesas e lançamentos' },
      { key: 'view_audit_logs', label: 'Ver Logs de Auditoria', description: 'Visualizar histórico e trilha de auditoria da clínica' },
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

// --- Configuração de Horários da Agenda e Unidades ---
export type WeekDay = 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';

export interface DaySchedule {
  day: WeekDay;
  isOpen: boolean;
  start: string; // HH:mm
  end: string;   // HH:mm
  breakStart?: string; // HH:mm
  breakEnd?: string;   // HH:mm
}

export interface ScheduleDayConfig {
  day: WeekDay;
  label: string;
  isOpen: boolean;
  start: string; // HH:mm
  end: string;   // HH:mm
  breakStart?: string; // HH:mm
  breakEnd?: string;   // HH:mm
}

export interface ScheduleViewConfig {
  defaultView: 'week' | 'day' | 'month' | 'dayList' | 'weekList';
  defaultDuration: number; // minutos
  displayInterval: number; // minutos
  defaultColor: string;
  repeatFrequency: 'weekly' | 'biweekly' | 'monthly';
  defaultRepeatCount: number;
  showBirthdays: boolean;
  enableDragAndDrop: boolean;
  limitSlotByDuration: boolean;
  showProfessionalName: boolean;
  days: ScheduleDayConfig[];
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

// --- Convênios e Parcerias ---
export interface Agreement {
  id: string;
  name: string;
  ansCode?: string;
  cnpj?: string;
  phone?: string;
  email?: string;
  discountPercentage?: number;
  gracePeriodDays?: number;
  notes?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PlanTemplate {
  id: string;
  name: string;
  specialtyId?: string; // Vinculo com especialidade
  sessions: number;
  price: number;
  description?: string;
  active: boolean;
  autoRenew?: 'none' | 'monthly' | 'quarterly' | 'semiannual' | 'annual';
  alertDaysBefore?: number;
  financialLaunchType?: 'total' | 'per_session';
  commissionType?: 'none' | 'percentage' | 'fixed';
  commissionValue?: number;
}

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
  personType?: 'PF' | 'PJ';
  document?: string; // CPF ou CNPJ
  pixKey?: string;
  bankName?: string;
  bankAgency?: string;
  bankAccount?: string;
  roles?: string[]; // Ex: ['professional', 'secretary']
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
  photoUrl?: string; // Foto de perfil
  facialDescriptor?: string; // Biometria facial / descriptor
  lastVisit?: string;
  agreementId?: string; // Vinculo com Convênio

  // Identificação & Documentação
  isSocialName?: boolean;
  socialName?: string;
  cpf?: string;
  rg?: string;
  cns?: string;
  birthDate?: string;
  maritalStatus?: string;
  gender?: string;
  profession?: string;
  companyName?: string;
  briefDiagnosis?: string;

  // Contato & Preferências
  email?: string;
  landlinePhone?: string;
  contactPreference?: 'whatsapp' | 'email' | 'sms' | 'call';
  allowReminders?: boolean;
  reminderChannels?: {
    whatsapp?: boolean;
    email?: boolean;
    sms?: boolean;
  };

  // Convênio / Saúde
  insuranceCardNumber?: string;
  insuranceCardExpiry?: string;
  insuranceCardHolder?: string;

  // Endereço
  country?: string;
  cep?: string;
  state?: string;
  city?: string;
  street?: string;
  number?: string;
  bairro?: string;
  complement?: string;
  address?: string;

  // Responsável Legal / Pediátrico / Dependente
  hasGuardian?: boolean;
  guardianName?: string;
  guardianRelationship?: string;
  guardianCpf?: string;
  guardianPhone?: string;
  guardianEmail?: string;
  homeCareInstructions?: string;

  // Origem / Captação
  referralSource?: string;
  referralDoctor?: string;
}

export interface Session {
  id: string;
  patientId: PatientId;
  professionalId: ProfessionalId;
  unitId: UnitId;
  date: string; // ISO String
  time: string; // HH:mm
  endTime?: string; // HH:mm
  duration?: number; // Duration in minutes (default: 30)
  type: string; // e.g., "Fisioterapia", "Hidroterapia"
  status: SessionStatus;
  notes?: string;
  signed?: boolean; // Novo campo para controle de assinatura
  signatureUrl?: string; // URL da assinatura ou foto
  isOutsidePlan?: boolean; // Sessão avulsa
  price?: number; // Preço da sessão avulsa
  agreementId?: string; // Convênio da sessão
  roomId?: string; // Sala física de atendimento
  authorizationCode?: string; // Senha / Autorização / Autenticador
  isEncaixe?: boolean; // Realizar encaixe de horário
  reminderSms?: string; // Sem lembrete, 1 dia antes, 2 horas antes
  reminderWhatsapp?: string; // Sem lembrete, 1 dia antes, 2 horas antes
  repeatWeekly?: boolean;
}

// --- Mapeamento de Pontos de Dor no Corpo Humano (Body Pain Map) ---
export interface PainPoint {
  id: string;
  view: 'front' | 'back' | 'left' | 'right';
  x: number; // Porcentagem X (0 a 100)
  y: number; // Porcentagem Y (0 a 100)
  intensity: number; // Escala EVA 0 a 10
  label?: string; // Ex: Trapézio Direito, Lombar
  note?: string; // Ex: Queimação, Pontada, Tensão
}

// --- Templates Clínicos Customizados (Evolução & Avaliação) ---
export interface ClinicalTemplateSection {
  id: string;
  title: string;
  type: 'checkbox_text' | 'text' | 'textarea' | 'pain_map' | 'file_upload' | 'image_upload' | 'select';
  checked?: boolean; // Para checkbox_text
  value?: string;
  options?: string[];
  placeholder?: string;
  required?: boolean;
}

export interface ClinicalTemplate {
  id: string;
  type: 'evolution' | 'evaluation';
  category: 'standard' | 'restricted' | 'custom';
  professionalId?: string;
  title: string;
  description?: string;
  sections: ClinicalTemplateSection[];
  isSystem?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// --- Módulo Clínico: Avaliações & Anamneses ---
export interface PatientEvaluation {
  id: string;
  patientId: string;
  professionalId?: string;
  unitId?: string;
  date: string; // YYYY-MM-DD
  specialty: string;
  chiefComplaint: string; // Queixa Principal (HDA)
  historyCurrentIllness?: string; // HDA
  pastMedicalHistory?: string; // HDP / Comorbidades
  lifestyleHabits?: string; // Hábitos de vida
  painLevel?: number; // EVA 0 a 10
  physicalExamination?: string; // Exame físico / Inspeção / Goniometria
  clinicalDiagnosis?: string; // Diagnóstico Clínico / Fisioterapêutico
  treatmentGoals?: string; // Objetivos do tratamento
  treatmentPlan?: string; // Conduta proposta
  attachments?: string[]; // URLs de exames ou fotos
  images?: string[]; // Fotos comparativas posturais
  painPoints?: PainPoint[]; // Mapa anatômico de pontos de dor
  templateId?: string; // Template utilizado
  templateData?: Record<string, any>; // Dados dinâmicos preenchidos do template
  createdAt?: string;
  updatedAt?: string;
  // Campos populados
  professionalName?: string;
  unitName?: string;
  patientName?: string;
}

// --- Módulo Clínico: Evoluções Diárias (SOAPE) ---
export interface PatientEvolution {
  id: string;
  patientId: string;
  sessionId?: string;
  professionalId?: string;
  unitId?: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  painLevel?: number; // EVA 0 a 10
  conduct: string; // Conduta / Procedimentos realizados
  patientResponse?: string; // Relato subjetivo / Resposta do paciente
  nextSteps?: string; // Orientações / Próxima sessão
  painPoints?: PainPoint[]; // Mapa anatômico de pontos de dor
  templateId?: string; // Template utilizado
  templateData?: Record<string, any>; // Dados dos 10 blocos de checkbox e relatos
  isLocked?: boolean;
  createdAt?: string;
  updatedAt?: string;
  // Campos populados
  professionalName?: string;
  unitName?: string;
  patientName?: string;
}

export interface PatientEvolutionAudit {
  id: string;
  evolutionId: string;
  modifiedBy?: string;
  oldConduct?: string;
  newConduct?: string;
  reason?: string;
  changedAt: string;
}

// --- Módulo de Contratos e Termos com Assinatura ---
export type ContractTemplateType = 'service_agreement' | 'tcle' | 'image_rights' | 'custom';

export interface ContractTemplate {
  id: string;
  title: string;
  type: ContractTemplateType;
  content: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PatientContract {
  id: string;
  patientId: string;
  planId?: string;
  templateId?: string;
  title: string;
  content: string;
  status: 'pending' | 'signed' | 'cancelled';
  documentHash?: string; // Hash SHA-256
  signedAt?: string;
  signedIp?: string;
  signedUserAgent?: string;
  signatureUrl?: string;
  signerName?: string;
  signerCpf?: string;
  createdAt?: string;
  updatedAt?: string;
  // Campos populados
  patientName?: string;
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

export type NotificationType = 'chat' | 'appointment' | 'patient_arrival' | 'room_reservation' | 'contract' | 'financial' | 'system' | 'info' | 'warning' | 'urgent' | 'session';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  readAt?: string;
  type?: NotificationType;
  linkUrl?: string;
  createdAt: string;
}

export type AuditCategory = 'agenda' | 'plans' | 'patients' | 'financial' | 'users' | 'system' | 'rooms' | 'chat';

export interface AuditLogItem {
  id: string;
  userId?: string;
  userName: string;
  userRole: UserRole | string;
  category: AuditCategory;
  action: string;
  details: string | any;
  ipAddress?: string;
  createdAt: string;
}

// --- Gestão e Reserva de Salas ---
export interface Room {
  id: string;
  unitId: string;
  name: string;
  description?: string;
  capacity: number;
  color?: string;
  active: boolean;
  createdAt?: string;
}

export interface RoomReservation {
  id: string;
  roomId: string;
  unitId: string;
  professionalId: string;
  date: string;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  purpose?: string;
  status: 'confirmed' | 'canceled';
  createdAt?: string;
  // Campos populados
  roomName?: string;
  professionalName?: string;
  unitName?: string;
}

// --- Chat Interno da Equipe ---
export type ChatChannelType = 'general' | 'unit' | 'role' | 'direct';

export interface ChatChannel {
  id: string;
  name: string;
  type: ChatChannelType;
  icon?: string;
  description?: string;
  unitId?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  // Campos computados
  unreadCount?: number;
  lastMessage?: ChatMessage;
  otherUser?: SystemUser; // Para canais diretos (1 a 1)
  isFavorite?: boolean;
}

export interface ChatParticipant {
  id: string;
  channelId: string;
  userId: string;
  lastReadAt?: string;
  joinedAt?: string;
  user?: SystemUser;
}

export interface ChatMessage {
  id: string;
  channelId: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  senderAvatarUrl?: string;
  content: string;
  patientId?: string;
  attachmentUrl?: string;
  createdAt: string;
  patientName?: string;
  status?: 'sending' | 'sent' | 'error';
}
