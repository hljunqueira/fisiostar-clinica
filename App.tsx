
import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { HashRouter as Router, Routes, Route, NavLink, useLocation, useNavigate, Navigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  Users,
  Briefcase,
  Settings as SettingsIcon,
  Building2,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Check,
  Stethoscope,
  DollarSign,
  Megaphone,
  User,
  Key,
  PanelLeftClose,
  PanelLeftOpen,
  CreditCard,
  Search,
  Plus,
  Activity,
  DoorClosed,
  MessageSquare
} from 'lucide-react';
import { UserProfileModal } from './components/UserProfileModal';
import { EvaluationModal } from './components/EvaluationModal';
import { EvolutionModal } from './components/EvolutionModal';
import AppointmentModal from './components/AppointmentModal';
import { NotificationBell } from './components/Notifications/NotificationBell';

// Lazy Load Components
const Dashboard = React.lazy(() => import('./components/Dashboard'));
const SecretaryDashboard = React.lazy(() => import('./components/SecretaryDashboard'));
const Schedule = React.lazy(() => import('./components/Schedule'));
const Patients = React.lazy(() => import('./components/Patients'));
const Professionals = React.lazy(() => import('./components/Professionals'));
const Units = React.lazy(() => import('./components/Units'));
const Settings = React.lazy(() => import('./components/Settings'));
const SuperAdminDashboard = React.lazy(() => import('./components/SuperAdminDashboard').then(m => ({ default: m.SuperAdminDashboard })));
const ManagerDashboard = React.lazy(() => import('./components/ManagerDashboard').then(m => ({ default: m.ManagerDashboard })));
const ProfessionalPortal = React.lazy(() => import('./components/ProfessionalPortal'));
const Financial = React.lazy(() => import('./components/Financial'));
const PlansAndServices = React.lazy(() => import('./components/PlansAndServices'));
const AnnouncementsView = React.lazy(() => import('./components/AnnouncementsView'));
const RoomBookingView = React.lazy(() => import('./components/Rooms/RoomBookingView').then(m => ({ default: m.RoomBookingView })));
const InternalChat = React.lazy(() => import('./components/Chat/InternalChat').then(m => ({ default: m.InternalChat })));
const TotemCheckIn = React.lazy(() => import('./components/Totem/TotemCheckIn').then(m => ({ default: m.TotemCheckIn })));
const Login = React.lazy(() => import('./components/Login'));
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { Toaster, toast } from 'react-hot-toast';
import { NotificationsPopover } from './components/NotificationsPopover';

import { UnitId, UserRole, RolePermissions, PermissionKey, Announcement, Unit, Notification, Professional, DEFAULT_ROLE_PERMISSIONS, getUserEffectivePermissions } from './src/types';
import { unitsApi, announcementsApi, notificationsApi, professionalsApi, sessionsApi } from './src/services/api';

const DEFAULT_PERMISSIONS = DEFAULT_ROLE_PERMISSIONS;

// --- Sidebar Component ---
const Sidebar = ({
  isOpen,
  onClose,
  userRole,
  onLogout,
  permissions,
  isCollapsed,
  onToggleCollapse
}: {
  isOpen: boolean,
  onClose: () => void,
  currentPath: string,
  userRole: UserRole,
  onLogout: () => void,
  permissions: RolePermissions,
  isCollapsed: boolean,
  onToggleCollapse: () => void
}) => {

  // Link definitions mapped to specific permissions instead of roles
  const allLinks: { icon: React.ReactNode, label: string, path: string, permission: PermissionKey }[] = [
    { icon: <LayoutDashboard className="w-5 h-5" />, label: 'Dashboard', path: '/', permission: 'view_dashboard' },
    // Professional Portal sub-links
    { icon: <LayoutDashboard className="w-5 h-5" />, label: 'Visão Geral', path: '/meu-portal', permission: 'access_professional_portal' },
    { icon: <Calendar className="w-5 h-5" />, label: 'Minha Agenda', path: '/meu-portal/agenda', permission: 'access_professional_portal' },
    { icon: <DollarSign className="w-5 h-5" />, label: 'Financeiro', path: '/meu-portal/financeiro', permission: 'access_professional_portal' },
    // Admin/Secretary/Manager/Financial links
    { icon: <Calendar className="w-5 h-5" />, label: 'Agenda Geral', path: '/agenda', permission: 'view_schedule' },
    { icon: <DoorClosed className="w-5 h-5" />, label: 'Reserva de Salas', path: '/reserva-salas', permission: 'view_rooms' },
    { icon: <Users className="w-5 h-5" />, label: 'Pacientes', path: '/pacientes', permission: 'manage_patients' },
    { icon: <Briefcase className="w-5 h-5" />, label: 'Equipe', path: '/profissionais', permission: 'manage_team' },
    { icon: <CreditCard className="w-5 h-5" />, label: 'Serviços e Planos', path: '/servicos-planos', permission: 'manage_plans' },
    { icon: <DollarSign className="w-5 h-5" />, label: 'Financeiro Geral', path: '/financeiro', permission: 'view_financials' },
    { icon: <MessageSquare className="w-5 h-5" />, label: 'Chat Interno', path: '/chat', permission: 'access_internal_chat' },
  ];

  // Filter links based on the current user's role permissions
  const userPermissions = permissions[userRole] || [];
  const dashboardPermissions: PermissionKey[] = [
    'view_dashboard',
    'view_secretary_dashboard',
    'view_manager_dashboard',
    'view_financial_dashboard',
    'access_professional_portal'
  ];

  const allowedLinks = allLinks.filter(link => {
    if (link.path === '/') {
      return userPermissions.some(p => dashboardPermissions.includes(p));
    }
    return userPermissions.includes(link.permission);
  });

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
      )}

      <aside className={`fixed md:sticky top-0 left-0 h-screen ${isCollapsed ? 'w-16' : 'w-56'} bg-surface border-r border-gray-200 shadow-nav z-50 transition-all duration-300 cubic-bezier(0.4, 0, 0.2, 1) ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} flex flex-col`}>
        {/* Logo Header */}
        <div className={`h-16 flex items-center border-b border-gray-100 ${isCollapsed ? 'justify-center px-2' : 'px-3 justify-between'}`}>
          <div className="flex items-center justify-center flex-1">
            <img
              src="/logo.png"
              alt="FisioStar"
              className={isCollapsed ? "w-10 h-10 object-contain" : "h-12 max-w-[150px] object-contain mx-auto"}
            />
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Collapse/Expand Minimizer Button */}
            <button
              onClick={onToggleCollapse}
              className="hidden md:flex p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title={isCollapsed ? "Expandir Menu Lateral" : "Recolher Menu Lateral"}
            >
              {isCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </button>
            <button className="md:hidden text-gray-400 hover:text-gray-600" onClick={onClose}>
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className={`flex-1 ${isCollapsed ? 'px-2 py-4' : 'px-3 py-4'} space-y-1 overflow-y-auto custom-scrollbar`}>
          {!isCollapsed && (
            <p className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Menu Principal</p>
          )}
          {allowedLinks.map(link => (
            <NavLink
              key={link.path}
              to={link.path}
              title={isCollapsed ? link.label : undefined}
              onClick={() => window.innerWidth < 768 && onClose()}
              className={({ isActive }) =>
                `group flex items-center ${isCollapsed ? 'justify-center py-2.5 px-0' : 'gap-3 px-3 py-2.5'} rounded-lg text-xs font-medium transition-all duration-200 border-l-[3px] ${isActive
                  ? 'bg-primary/5 text-primary border-primary shadow-sm'
                  : 'text-secondary border-transparent hover:bg-gray-50 hover:text-gray-900'}`
              }
            >
              {link.icon}
              {!isCollapsed && <span className="truncate">{link.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className={`p-2.5 border-t border-gray-100 bg-gray-50/50 ${isCollapsed ? 'flex flex-col items-center gap-1' : ''}`}>
          {(permissions[userRole] || []).includes('edit_settings') && (
            <NavLink
              to="/settings"
              title={isCollapsed ? "Configurações" : undefined}
              onClick={() => window.innerWidth < 768 && onClose()}
              className={({ isActive }) =>
                `flex items-center ${isCollapsed ? 'justify-center py-2 px-0 w-full' : 'gap-3 px-3 py-2'} text-xs font-medium cursor-pointer rounded-lg transition-colors border-l-[3px] ${isActive
                  ? 'bg-white text-primary border-primary shadow-sm'
                  : 'text-secondary border-transparent hover:bg-white hover:text-gray-900 hover:shadow-sm'}`
              }
            >
              <SettingsIcon className="w-4 h-4" />
              {!isCollapsed && <span>Configurações</span>}
            </NavLink>
          )}
          <div
            onClick={onLogout}
            title={isCollapsed ? "Sair do Sistema" : undefined}
            className={`flex items-center ${isCollapsed ? 'justify-center py-2 px-0 w-full' : 'gap-3 px-3 py-2'} text-xs font-medium text-secondary hover:text-danger hover:bg-danger/5 cursor-pointer rounded-lg transition-all`}
          >
            <LogOut className="w-4 h-4" />
            {!isCollapsed && <span>Sair do Sistema</span>}
          </div>

          {/* User Role Badge Display */}
          {!isCollapsed && (
            <div className="mt-2 px-1">
              <div className={`text-[9px] font-bold uppercase tracking-wider py-1 px-2.5 rounded-full w-fit ${
                userRole === 'admin' || userRole === 'super_admin' ? 'bg-purple-100 text-purple-700' :
                userRole === 'professional' ? 'bg-blue-100 text-blue-700' :
                userRole === 'manager' ? 'bg-indigo-100 text-indigo-700' :
                userRole === 'financial' ? 'bg-emerald-100 text-emerald-700' :
                'bg-orange-100 text-orange-700'
              }`}>
                {userRole === 'professional' ? 'Profissional' :
                 userRole === 'manager' ? 'Gerente Operacional' :
                 userRole === 'financial' ? 'Financeiro' :
                 userRole === 'admin' ? 'Administrador' :
                 userRole === 'super_admin' ? 'Super Admin' :
                 'Secretária'}
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      <p className="text-gray-600">Carregando...</p>
    </div>
  </div>
);

// --- Layout Component ---
interface LayoutProps {
  children: React.ReactNode;
  currentUnit: UnitId;
  setCurrentUnit: (unit: UnitId) => void;
  userRole: UserRole;
  userName: string;
  userAvatarUrl?: string;
  currentUserId?: string;
  onOpenProfileModal?: () => void;
  onLogout: () => void;
  permissions: RolePermissions;
  units: Unit[];
  notifications: Notification[];
  onMarkNotificationAsRead: (id: string) => void;
  onClearNotifications: () => void;
  darkMode: boolean;
  setDarkMode: (value: boolean) => void;
}

const Layout: React.FC<LayoutProps> = ({
  children,
  currentUnit,
  setCurrentUnit,
  userRole,
  userName,
  userAvatarUrl,
  currentUserId,
  onOpenProfileModal,
  onLogout,
  permissions,
  units,
  notifications,
  onMarkNotificationAsRead,
  onClearNotifications,
  darkMode,
  setDarkMode
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => localStorage.getItem('sidebar_collapsed') === 'true');
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isUnitMenuOpen, setIsUnitMenuOpen] = useState(false);
  const [isEvaluationModalOpen, setIsEvaluationModalOpen] = useState(false);
  const [isEvolutionModalOpen, setIsEvolutionModalOpen] = useState(false);
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const navigate = useNavigate();

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('sidebar_collapsed', String(next));
      return next;
    });
  };

  const selectedUnit = currentUnit === 'ALL'
    ? { id: 'ALL', name: 'Todas as Unidades', city: 'Visão Geral', isActive: true, specialties: [], hasPool: false } as Unit
    : units.find(u => u.id === currentUnit) || units[0] || { id: '', name: 'Carregando...', city: '', specialties: [], hasPool: false, isActive: false };
  const { pathname } = useLocation();

  const handleGlobalSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (globalSearch.trim()) {
      navigate(`/patients?search=${encodeURIComponent(globalSearch.trim())}`);
    }
  };

  return (
    <div className="min-h-screen bg-background flex font-sans antialiased text-secondary">
      {/* Sidebar Navigation */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        currentPath={pathname}
        userRole={userRole}
        onLogout={onLogout}
        permissions={permissions}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapse}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 bg-surface border-b border-gray-200/80 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40 backdrop-blur-md bg-white/90 gap-3">
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
            >
              <Menu className="w-6 h-6" />
            </button>

            {/* Selector de Unidade */}
            <div className="relative">
              <button
                onClick={() => setIsUnitMenuOpen(!isUnitMenuOpen)}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors focus:outline-none cursor-pointer"
              >
                <div className="p-1 bg-white rounded-lg border border-gray-200 text-gray-500">
                  <Building2 className="w-3.5 h-3.5" />
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-[9px] uppercase font-bold text-gray-400 tracking-wider">Unidade Atual</p>
                  <p className="text-xs font-bold text-gray-800 flex items-center gap-1">
                    {selectedUnit.name}
                    <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${isUnitMenuOpen ? 'rotate-180 text-primary' : ''}`} />
                  </p>
                </div>
              </button>

              {/* Transparent backdrop overlay to close dropdown on click outside */}
              {isUnitMenuOpen && (
                <div
                  className="fixed inset-0 z-[55]"
                  onClick={() => setIsUnitMenuOpen(false)}
                />
              )}

              {/* Dropdown de Seleção de Unidade */}
              {isUnitMenuOpen && (
                <div className="absolute left-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-gray-200/80 py-2 z-[60] animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-4 py-2 border-b border-gray-100 bg-gray-50/50 rounded-t-2xl">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Alternar Unidade</p>
                  </div>
                  <div className="p-1">
                    <button
                      onClick={() => {
                        setCurrentUnit('ALL');
                        setIsUnitMenuOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 rounded-lg flex items-center justify-between transition-colors ${currentUnit === 'ALL' ? 'bg-primary/5 text-primary font-bold' : 'text-gray-700'}`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-2 h-2 rounded-full ring-2 ring-white shadow-sm ${currentUnit === 'ALL' ? 'bg-primary' : 'bg-gray-300'}`} />
                        <div>
                          <p className={`font-semibold text-xs sm:text-sm ${currentUnit === 'ALL' ? 'text-primary' : 'text-gray-700'}`}>
                            Todas as Unidades
                          </p>
                          <p className="text-[10px] text-gray-500">Visão Geral da Rede</p>
                        </div>
                      </div>
                      {currentUnit === 'ALL' && <Check className="w-4 h-4 text-primary" />}
                    </button>
                    {units.map(unit => (
                      <button
                        key={unit.id}
                        onClick={() => {
                          setCurrentUnit(unit.id);
                          setIsUnitMenuOpen(false);
                        }}
                        className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 rounded-lg flex items-center justify-between transition-colors ${currentUnit === unit.id ? 'bg-primary/5 text-primary font-bold' : 'text-gray-700'}`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`w-2 h-2 rounded-full ring-2 ring-white shadow-sm ${unit.active ? 'bg-success' : 'bg-gray-300'}`} />
                          <div>
                            <p className={`font-semibold text-xs sm:text-sm ${currentUnit === unit.id ? 'text-primary' : 'text-gray-700'}`}>
                              {unit.name}
                            </p>
                            <p className="text-[10px] text-gray-500">{unit.city}</p>
                          </div>
                        </div>
                        {currentUnit === unit.id && <Check className="w-4 h-4 text-primary" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Central Actions & Quick Search */}
          <div className="flex items-center gap-2 flex-1 justify-center max-w-2xl px-2">
            {/* Global Search */}
            <form onSubmit={handleGlobalSearch} className="hidden lg:flex items-center relative w-full max-w-md">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Pesquisar paciente por nome ou CPF..."
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-gray-100/80 hover:bg-gray-100 focus:bg-white border border-gray-200/80 rounded-xl text-xs text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all shadow-2xs"
              />
            </form>
          </div>

          {/* Central de Notificações com Persistência & Realtime */}
          <NotificationBell userId={currentUserId} />

          {/* User Profile Dropdown */}
          <div className="relative shrink-0">
            <button
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="flex items-center gap-3 hover:opacity-90 transition-opacity focus:outline-none cursor-pointer"
            >
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-gray-900 leading-none mb-1 flex items-center gap-1.5 justify-end">
                  {userName}
                  <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${isProfileMenuOpen ? 'rotate-180 text-primary' : ''}`} />
                </p>
                <div className="flex items-center gap-1.5 justify-end text-xs text-gray-500 font-medium">
                  <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                  {userRole === 'admin' ? 'Administrador' : userRole === 'secretary' ? 'Recepção' : userRole === 'professional' ? 'Profissional' : userRole === 'super_admin' ? 'Super Admin' : 'Colaborador'}
                </div>
              </div>
              {userAvatarUrl ? (
                <img
                  src={userAvatarUrl}
                  alt={userName}
                  className="w-10 h-10 rounded-full object-cover shadow-md ring-2 ring-white border border-gray-200"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-primary-hover flex items-center justify-center text-white font-bold text-sm shadow-md shadow-primary/20 ring-2 ring-white">
                  {userName.charAt(0)}
                </div>
              )}
            </button>

            {/* Transparent backdrop overlay to close dropdown on click outside */}
            {isProfileMenuOpen && (
              <div
                className="fixed inset-0 z-[55]"
                onClick={() => setIsProfileMenuOpen(false)}
              />
            )}

            {/* Profile Dropdown Menu */}
            {isProfileMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-gray-200/80 py-2 z-[60] animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-4 py-2 border-b border-gray-100 bg-gray-50/50 rounded-t-2xl">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Minha Conta</p>
                  <p className="text-xs font-bold text-gray-800 truncate">{userName}</p>
                </div>
                <div className="p-1">
                  <button
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      onOpenProfileModal();
                    }}
                    className="w-full px-3 py-2 text-left text-xs sm:text-sm hover:bg-gray-50 rounded-lg flex items-center gap-2.5 text-gray-700 font-semibold transition-colors"
                  >
                    <User className="w-4 h-4 text-primary" /> Editar Perfil & Foto
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Global Modals */}
        {isEvaluationModalOpen && (
          <EvaluationModal
            isOpen={isEvaluationModalOpen}
            onClose={() => setIsEvaluationModalOpen(false)}
            currentUnit={currentUnit}
          />
        )}

        {isEvolutionModalOpen && (
          <EvolutionModal
            isOpen={isEvolutionModalOpen}
            onClose={() => setIsEvolutionModalOpen(false)}
            currentUnit={currentUnit}
          />
        )}

        {isAppointmentModalOpen && (
          <AppointmentModal
            isOpen={isAppointmentModalOpen}
            onClose={() => setIsAppointmentModalOpen(false)}
            onSave={async (newSession) => {
              try {
                await sessionsApi.create(newSession);
                toast.success('Agendamento criado com sucesso!');
              } catch (err: any) {
                toast.error(err.message || 'Erro ao agendar.');
              }
            }}
            currentUnit={currentUnit}
          />
        )}

        {/* Main Content */}
        <main className="p-2 lg:p-3 w-full max-w-full flex-1 flex flex-col min-h-0">
          {children}
        </main>
      </div>
    </div>
  );
};

// App Content (needs auth context)
const AppContent: React.FC = () => {
  const { user, systemUser, role, assignedUnit, loading: authLoading, signOut } = useAuth();
  const [currentUnit, setCurrentUnit] = useState<UnitId>('');
  const [units, setUnits] = useState<Unit[]>([]);
  const [unitsLoading, setUnitsLoading] = useState(true);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [currentProfessional, setCurrentProfessional] = useState<Professional | null>(null);

  useEffect(() => {
    if (role === 'professional' && systemUser?.name) {
      professionalsApi.getAll().then(profs => {
        const found = profs.find(p => p.name.trim().toLowerCase() === systemUser.name.trim().toLowerCase());
        if (found) setCurrentProfessional(found);
      }).catch(err => console.error('Error fetching professional details:', err));
    }
  }, [role, systemUser?.name]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Load Notifications
  useEffect(() => {
    if (!systemUser?.id) return;

    loadNotifications();
    // Poll every minute
    const interval = setInterval(loadNotifications, 60000);
    return () => clearInterval(interval);
  }, [systemUser?.id]);

  const loadNotifications = async () => {
    if (!systemUser?.id) return;
    try {
      const data = await notificationsApi.getMy(systemUser.id);
      setNotifications(data);
    } catch (error) {
      console.error('Error loading notifications', error);
    }
  };

  const handleMarkNotificationAsRead = async (id: string) => {
    try {
      // Optimistic updatet
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      await notificationsApi.markAsRead(id);
    } catch (error) {
      console.error('Error marking notification as read', error);
    }
  };

  const handleClearNotifications = async () => {
    if (!systemUser?.id) return;
    try {
      setNotifications(prev => prev.map(n => ({ ...n, read: true }))); // Optimistic clear visual
      await notificationsApi.clearAll(systemUser.id);
      loadNotifications(); // Reload to be sure
    } catch (error) {
      console.error('Error clearing notifications', error);
    }
  };

  // Compute effective permissions using useMemo to avoid re-renders
  const rolePermissions = useMemo<RolePermissions>(() => {
    if (!systemUser || !role) {
      return DEFAULT_PERMISSIONS;
    }

    const effective = getUserEffectivePermissions(systemUser);

    return {
      ...DEFAULT_PERMISSIONS,
      [role]: effective
    };
  }, [systemUser, role]);

  // Load units
  useEffect(() => {
    async function loadUnits() {
      try {
        const data = await unitsApi.getAll();
        setUnits(data);

        // For Admin or Super Admin, default to 'ALL' (Todas as Unidades)
        if (role === 'admin' || role === 'super_admin') {
          setCurrentUnit('ALL');
        } else if (assignedUnit) {
          const exists = data.some(u => u.id === assignedUnit);
          setCurrentUnit(exists ? assignedUnit : (data[0]?.id || ''));
        } else if (data.length > 0) {
          setCurrentUnit(data[0].id);
        }

      } catch (error) {
        console.error('Error loading units:', error);
        toast.error('Erro ao carregar unidades');
      } finally {
        setUnitsLoading(false);
      }
    }
    loadUnits();
  }, [assignedUnit, role]);

  // Load announcements
  useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    try {
      const data = await announcementsApi.getAll();
      setAnnouncements(data);
    } catch (error) {
      console.error('Error loading announcements:', error);
    }
  };

  // Professional ID is now auto-detected in ProfessionalPortal by matching systemUser.name

  const handleLogout = async () => {
    await signOut();
  };

  // Helper to check permission for routing
  const hasPermission = (permission: PermissionKey) => {
    if (!role) return false;
    const perms = rolePermissions[role] || [];
    return perms.includes(permission);
  };

  const handleAddAnnouncement = async (announcement: Announcement) => {
    try {
      await announcementsApi.create({
        title: announcement.title,
        message: announcement.message,
        type: announcement.type,
        date: announcement.date,
        targetRole: announcement.targetRole
      });
      await loadAnnouncements();
      toast.success('Aviso adicionado com sucesso!');
    } catch (error) {
      console.error('Error saving announcement:', error);
      toast.error('Erro ao salvar aviso');
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    try {
      await announcementsApi.delete(id);
      setAnnouncements(prev => prev.filter(a => a.id !== id));
      toast.success('Aviso removido!');
    } catch (error) {
      console.error('Error deleting announcement:', error);
      toast.error('Erro ao remover aviso');
    }
  };

  if (authLoading || unitsLoading) {
    return <LoadingFallback />;
  }

  // Modo Totem / Tablet para Check-in Biométrico e Facial
  const currentPath = window.location.hash || window.location.pathname;
  if (currentPath.includes('totem') || currentPath.includes('checkin')) {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <TotemCheckIn />
      </Suspense>
    );
  }

  if (!user || !systemUser || !role) {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <Login />
      </Suspense>
    );
  }

  // Determine the default route based on user permissions
  const getDefaultRoute = () => {
    if (hasPermission('view_dashboard')) return '/';
    if (hasPermission('access_professional_portal')) return '/meu-portal';
    if (hasPermission('view_schedule')) return '/agenda';
    if (hasPermission('manage_patients')) return '/pacientes';
    return '/'; // Fallback - will show dashboard anyway
  };

  return (
    <Layout
      currentUnit={currentUnit}
      setCurrentUnit={setCurrentUnit}
      userRole={role}
      userName={systemUser.name}
      userAvatarUrl={systemUser.avatarUrl}
      currentUserId={systemUser.id}
      onOpenProfileModal={() => setIsProfileModalOpen(true)}
      onLogout={handleLogout}
      permissions={rolePermissions}
      units={units}
      notifications={notifications}
      onMarkNotificationAsRead={handleMarkNotificationAsRead}
      onClearNotifications={handleClearNotifications}
      darkMode={darkMode}
      setDarkMode={setDarkMode}
    >
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/" element={
            role === 'super_admin'
              ? <SuperAdminDashboard />
              : hasPermission('view_manager_dashboard') || role === 'manager'
                ? <ManagerDashboard currentUnit={currentUnit} />
                : hasPermission('view_financial_dashboard') || role === 'financial'
                  ? <Financial currentUnit={currentUnit} currentUserId={systemUser?.id || ''} />
                  : hasPermission('view_secretary_dashboard') || role === 'secretary'
                    ? <SecretaryDashboard currentUnit={currentUnit} announcements={announcements} />
                    : <Dashboard
                      currentUnit={currentUnit}
                      announcements={announcements}
                      onAddAnnouncement={handleAddAnnouncement}
                      onDeleteAnnouncement={handleDeleteAnnouncement}
                      canManageAnnouncements={role === 'admin' || role === 'super_admin'}
                    />
          } />

          <Route path="/agenda" element={
            <Schedule currentUnit={currentUnit} />
          } />

          <Route path="/reserva-salas" element={
            hasPermission('view_rooms') || hasPermission('book_rooms')
              ? <RoomBookingView currentUnit={currentUnit} userRole={role} currentProfessionalId={systemUser?.id} />
              : <Navigate to={getDefaultRoute()} replace />
          } />

          <Route path="/chat" element={
            hasPermission('access_internal_chat')
              ? <InternalChat currentUnit={currentUnit} currentUser={systemUser} />
              : <Navigate to={getDefaultRoute()} replace />
          } />

          <Route path="/pacientes" element={
            <Patients currentUnit={currentUnit} />
          } />

          <Route path="/profissionais" element={
            hasPermission('manage_team')
              ? <Professionals currentUnit={currentUnit} />
              : <Navigate to={getDefaultRoute()} replace />
          } />

          <Route path="/unidades" element={
            hasPermission('manage_units')
              ? <Units />
              : <Navigate to={getDefaultRoute()} replace />
          } />

          <Route path="/servicos-planos" element={
            hasPermission('manage_plans')
              ? <PlansAndServices />
              : <Navigate to={getDefaultRoute()} replace />
          } />

          <Route path="/financeiro" element={
            hasPermission('view_financials')
              ? <Financial currentUnit={currentUnit} currentUserId={systemUser?.id || ''} />
              : <Navigate to={getDefaultRoute()} replace />
          } />

          <Route path="/settings" element={
            hasPermission('edit_settings') ? (
              <Settings
                currentRole={role}
                setCurrentRole={() => { }}
                rolePermissions={rolePermissions}
                setRolePermissions={() => { }}
                currentUserName={systemUser?.name || 'Administrador'}
              />
            ) : <Navigate to={getDefaultRoute()} replace />
          } />

          <Route path="/meu-portal" element={
            hasPermission('access_professional_portal')
              ? <ProfessionalPortal
                currentUnit={currentUnit}
                announcements={announcements}
                defaultTab="overview"
              />
              : <Navigate to={getDefaultRoute()} replace />
          } />
          <Route path="/meu-portal/agenda" element={
            hasPermission('access_professional_portal')
              ? <ProfessionalPortal
                currentUnit={currentUnit}
                announcements={announcements}
                defaultTab="schedule"
              />
              : <Navigate to={getDefaultRoute()} replace />
          } />
          <Route path="/meu-portal/financeiro" element={
            hasPermission('access_professional_portal')
              ? <ProfessionalPortal
                currentUnit={currentUnit}
                announcements={announcements}
                defaultTab="financial"
              />
              : <Navigate to={getDefaultRoute()} replace />
          } />
          <Route path="/meu-portal/comunicados" element={
            hasPermission('access_professional_portal')
              ? <ProfessionalPortal
                currentUnit={currentUnit}
                announcements={announcements}
                defaultTab="announcements"
              />
              : <Navigate to={getDefaultRoute()} replace />
          } />
          <Route path="/comunicados" element={
            <AnnouncementsView
              announcements={announcements}
              onAddAnnouncement={handleAddAnnouncement}
              onDeleteAnnouncement={handleDeleteAnnouncement}
              userRole={role}
              currentProfessionalId={systemUser?.id}
            />
          } />
          <Route path="/totem" element={<TotemCheckIn />} />
          <Route path="/checkin" element={<TotemCheckIn />} />
          <Route path="*" element={<Navigate to={getDefaultRoute()} replace />} />
        </Routes>
      </Suspense>

      {/* User Profile Modal */}
      {isProfileModalOpen && systemUser && (
        <UserProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          systemUser={systemUser}
          professional={currentProfessional}
          onProfileUpdated={() => window.location.reload()}
        />
      )}
    </Layout >
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#10B981',
                secondary: '#fff',
              },
            },
            error: {
              duration: 4000,
              iconTheme: {
                primary: '#EF4444',
                secondary: '#fff',
              },
            },
          }}
        />
        <AppContent />
      </AuthProvider>
    </Router>
  );
};

export default App;
