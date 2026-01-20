
import { Unit, Professional, Patient, Session, SessionStatus, SystemUser, PlanTemplate, DaySchedule, Specialty, Announcement } from './types';

// Helper for default hours
const DEFAULT_HOURS: DaySchedule[] = [
  { day: 'monday', isOpen: true, start: '08:00', end: '18:00' },
  { day: 'tuesday', isOpen: true, start: '08:00', end: '18:00' },
  { day: 'wednesday', isOpen: true, start: '08:00', end: '18:00' },
  { day: 'thursday', isOpen: true, start: '08:00', end: '18:00' },
  { day: 'friday', isOpen: true, start: '08:00', end: '18:00' },
  { day: 'saturday', isOpen: true, start: '08:00', end: '12:00' },
  { day: 'sunday', isOpen: false, start: '00:00', end: '00:00' },
];

export const SPECIALTIES: Specialty[] = [
    { id: 'spec1', name: 'Traumato-Ortopedia', active: true },
    { id: 'spec2', name: 'Hidroterapia', active: true },
    { id: 'spec3', name: 'Pilates', active: true },
    { id: 'spec4', name: 'Neurológica', active: true },
    { id: 'spec5', name: 'Geriátrica', active: true },
];

export const UNITS: Unit[] = [
  {
    id: 'u1',
    name: 'FisioStar - Araranguá | Matriz',
    city: 'Araranguá',
    specialties: ['Traumato', 'Hidroterapia', 'Pilates'],
    hasPool: true,
    isActive: true,
    operatingHours: DEFAULT_HOURS,
    holidays: [
        { id: 'h1', date: '2024-05-01', name: 'Dia do Trabalhador' }
    ]
  },
  {
    id: 'u2',
    name: 'FisioStar - Arroio | Filial',
    city: 'Arroio do Silva',
    specialties: ['Traumato', 'Geriátrica'],
    hasPool: false,
    isActive: true,
    operatingHours: DEFAULT_HOURS,
    holidays: []
  }
];

export const SYSTEM_USERS: SystemUser[] = [
    {
        id: 'u_admin',
        name: 'Mariana Costa',
        email: 'admin@fisiostar.com',
        role: 'admin',
        avatarUrl: undefined,
        customPermissions: [] // Uses default role perms
    },
    {
        id: 'u_sec1',
        name: 'Julia Atendimento',
        email: 'julia@fisiostar.com',
        role: 'secretary',
        customPermissions: [] 
    },
    {
        id: 'u_prof1',
        name: 'Dra. Ana Silva',
        email: 'ana.silva@fisiostar.com',
        role: 'professional',
        customPermissions: []
    }
];

export const PLAN_TEMPLATES: PlanTemplate[] = [
    {
        id: 'pt1',
        name: 'Reabilitação Intensiva',
        specialtyId: 'spec1',
        sessions: 10,
        price: 850.00,
        description: 'Pacote focado em recuperação pós-operatória.',
        active: true
    },
    {
        id: 'pt2',
        name: 'Pilates Mensal (2x)',
        specialtyId: 'spec3',
        sessions: 8,
        price: 320.00,
        description: 'Manutenção e fortalecimento.',
        active: true
    },
    {
        id: 'pt3',
        name: 'Hidroterapia Avulsa',
        specialtyId: 'spec2',
        sessions: 1,
        price: 95.00,
        description: 'Sessão única na piscina térmica.',
        active: true
    }
];

export const PROFESSIONALS: Professional[] = [
  {
    id: 'p1',
    name: 'Dra. Ana Silva',
    crf: '12345-F',
    specialty: 'Traumato-Ortopedia',
    hourlyRate: 80.0,
    unitIds: ['u1', 'u2'],
    color: '#2563EB'
  },
  {
    id: 'p2',
    name: 'Dr. Carlos Souza',
    crf: '67890-F',
    specialty: 'Hidroterapia',
    hourlyRate: 95.0,
    unitIds: ['u1'],
    color: '#10B981'
  },
  {
    id: 'p3',
    name: 'Dra. Beatriz Lima',
    crf: '54321-F',
    specialty: 'Pilates',
    hourlyRate: 85.0,
    unitIds: ['u1'],
    color: '#F97316'
  }
];

export const PATIENTS: Patient[] = [
  {
    id: 'pat1',
    name: 'Roberto Mendes',
    unitId: 'u1',
    phone: '(48) 99999-1111',
    cpf: '000.111.222-33',
    birthDate: '1985-04-12',
    address: 'Av. Sete de Setembro, 100',
    city: 'Araranguá',
    status: 'Active',
    photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    plan: {
      name: 'Reabilitação Intensiva',
      totalSessions: 10,
      remainingSessions: 4,
      expiresAt: '2024-06-30'
    },
    lastVisit: '2024-05-18'
  },
  {
    id: 'pat2',
    name: 'Fernanda Oliveira',
    unitId: 'u1',
    phone: '(48) 99999-2222',
    cpf: '999.888.777-66',
    birthDate: '1992-08-25',
    address: 'Rua das Flores, 50',
    city: 'Araranguá',
    status: 'Active',
    photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    plan: {
      name: 'Pilates Mensal',
      totalSessions: 8,
      remainingSessions: 7,
      expiresAt: '2024-06-15'
    },
    lastVisit: '2024-05-20'
  },
  {
    id: 'pat3',
    name: 'João da Silva',
    unitId: 'u2',
    phone: '(48) 98888-3333',
    cpf: '111.222.333-44',
    birthDate: '1978-01-10',
    address: 'Av. Beira Mar, 500',
    city: 'Arroio do Silva',
    status: 'Inactive',
    plan: {
      name: 'Pós-Cirúrgico',
      totalSessions: 5,
      remainingSessions: 0,
      expiresAt: '2024-04-10'
    },
    lastVisit: '2024-04-09'
  }
];

export const SESSIONS: Session[] = [
  {
    id: 's1',
    patientId: 'pat1',
    professionalId: 'p2',
    unitId: 'u1',
    date: new Date().toISOString().split('T')[0],
    time: '09:00',
    type: 'Hidroterapia',
    status: SessionStatus.CONFIRMED,
    signed: true
  },
  {
    id: 's2',
    patientId: 'pat2',
    professionalId: 'p3',
    unitId: 'u1',
    date: new Date().toISOString().split('T')[0],
    time: '10:00',
    type: 'Pilates',
    status: SessionStatus.SCHEDULED,
    signed: false
  },
  {
    id: 's3',
    patientId: 'pat1',
    professionalId: 'p1',
    unitId: 'u1',
    date: new Date().toISOString().split('T')[0],
    time: '14:00',
    type: 'Traumato',
    status: SessionStatus.COMPLETED,
    signed: false // Pendente de assinatura
  },
  {
    id: 's4',
    patientId: 'pat3',
    professionalId: 'p1',
    unitId: 'u2',
    date: new Date().toISOString().split('T')[0],
    time: '15:30',
    type: 'Avaliação',
    status: SessionStatus.NOSHOW,
    signed: false
  }
];

export const ANNOUNCEMENTS: Announcement[] = [
    {
        id: 'a1',
        title: 'Reunião de Equipe',
        message: 'Sexta-feira (24/05) às 13:00 na sala de reuniões principal. Pauta: Novos protocolos de atendimento.',
        type: 'info',
        date: '2024-05-20',
        targetRole: 'all'
    },
    {
        id: 'a2',
        title: 'Manutenção Piscina',
        message: 'A piscina da unidade Matriz estará fechada para manutenção no dia 25/05.',
        type: 'warning',
        date: '2024-05-21',
        targetRole: 'all'
    },
    {
        id: 'a3',
        title: 'Evoluções Pendentes',
        message: 'Favor regularizar todas as evoluções de pacientes até o final do dia.',
        type: 'urgent',
        date: '2024-05-22',
        targetRole: 'professional'
    }
];
