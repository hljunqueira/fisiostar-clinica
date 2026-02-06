
import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { HashRouter as Router, Routes, Route, NavLink, useLocation, Navigate } from 'react-router-dom';
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
  Moon,
  Sun
} from 'lucide-react';
// Lazy Load Components
const Dashboard = React.lazy(() => import('./components/Dashboard'));
const SecretaryDashboard = React.lazy(() => import('./components/SecretaryDashboard'));
const Schedule = React.lazy(() => import('./components/Schedule'));
const Patients = React.lazy(() => import('./components/Patients'));
const Professionals = React.lazy(() => import('./components/Professionals'));
const Units = React.lazy(() => import('./components/Units'));
const Settings = React.lazy(() => import('./components/Settings'));
const ProfessionalPortal = React.lazy(() => import('./components/ProfessionalPortal'));
const Financial = React.lazy(() => import('./components/Financial'));
const Login = React.lazy(() => import('./components/Login'));
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { Toaster, toast } from 'react-hot-toast';
import { NotificationsPopover } from './components/NotificationsPopover';

import { UnitId, UserRole, RolePermissions, PermissionKey, Announcement, Unit, Notification } from './types';
import { unitsApi, announcementsApi, notificationsApi } from './src/services/api';

// Default permissions configuration
const DEFAULT_PERMISSIONS: RolePermissions = {
  admin: [
    'view_dashboard',
    'view_schedule',
    'manage_patients',
    'manage_team',
    'manage_units',
    'view_financials',
    'edit_settings'
  ],
  secretary: [
    'view_dashboard',
    'view_schedule',
    'manage_patients'
  ],
  professional: [
    'access_professional_portal'
  ]
};

// --- Sidebar Component ---
const Sidebar = ({
  isOpen,
  onClose,
  userRole,
  onLogout,
  permissions
}: {
  isOpen: boolean,
  onClose: () => void,
  currentPath: string,
  userRole: UserRole,
  onLogout: () => void,
  permissions: RolePermissions
}) => {

  // Link definitions mapped to specific permissions instead of roles
  const allLinks: { icon: React.ReactNode, label: string, path: string, permission: PermissionKey }[] = [
    { icon: <LayoutDashboard className="w-5 h-5" />, label: 'Dashboard', path: '/', permission: 'view_dashboard' },
    // Professional Portal sub-links
    { icon: <LayoutDashboard className="w-5 h-5" />, label: 'Visão Geral', path: '/meu-portal', permission: 'access_professional_portal' },
    { icon: <Calendar className="w-5 h-5" />, label: 'Minha Agenda', path: '/meu-portal/agenda', permission: 'access_professional_portal' },
    { icon: <DollarSign className="w-5 h-5" />, label: 'Financeiro', path: '/meu-portal/financeiro', permission: 'access_professional_portal' },
    // Admin/Secretary links
    { icon: <Calendar className="w-5 h-5" />, label: 'Agenda Geral', path: '/agenda', permission: 'view_schedule' },
    { icon: <Users className="w-5 h-5" />, label: 'Pacientes', path: '/pacientes', permission: 'manage_patients' },
    { icon: <Briefcase className="w-5 h-5" />, label: 'Equipe & Folha', path: '/profissionais', permission: 'manage_team' },
    { icon: <Building2 className="w-5 h-5" />, label: 'Unidades', path: '/unidades', permission: 'manage_units' },
    { icon: <DollarSign className="w-5 h-5" />, label: 'Financeiro Geral', path: '/financeiro', permission: 'view_financials' },
  ];

  // Filter links based on the current user's role permissions
  const userPermissions = permissions[userRole] || [];
  const allowedLinks = allLinks.filter(link => userPermissions.includes(link.permission));

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
      )}

      <aside className={`fixed md:sticky top-0 left-0 h-screen w-64 bg-surface border-r border-gray-200 shadow-nav z-50 transition-transform duration-300 cubic-bezier(0.4, 0, 0.2, 1) ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} flex flex-col`}>
        {/* Logo */}
        <div className="h-20 flex items-center px-6 border-b border-gray-100">
          <div className="flex items-center gap-3 text-primary font-bold text-xl tracking-tight">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white shadow-lg shadow-primary/30">
              F
            </div>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary-hover">FisioStar</span>
          </div>
          <button className="ml-auto md:hidden text-gray-400 hover:text-gray-600" onClick={onClose}>
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto custom-scrollbar">
          <p className="px-4 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Menu Principal</p>
          {allowedLinks.map(link => (
            <NavLink
              key={link.path}
              to={link.path}
              onClick={() => window.innerWidth < 768 && onClose()}
              className={({ isActive }) =>
                `group flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 border-l-[3px] ${isActive
                  ? 'bg-primary/5 text-primary border-primary shadow-sm'
                  : 'text-secondary border-transparent hover:bg-gray-50 hover:text-gray-900'}`
              }
            >
              {link.icon}
              {link.label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/50">
          {(permissions[userRole] || []).includes('edit_settings') && (
            <NavLink
              to="/settings"
              onClick={() => window.innerWidth < 768 && onClose()}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 text-sm font-medium cursor-pointer rounded-lg transition-colors border-l-[3px] ${isActive
                  ? 'bg-white text-primary border-primary shadow-sm'
                  : 'text-secondary border-transparent hover:bg-white hover:text-gray-900 hover:shadow-sm'}`
              }
            >
              <SettingsIcon className="w-5 h-5" />
              <span>Configurações</span>
            </NavLink>
          )}
          <div
            onClick={onLogout}
            className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-secondary hover:text-danger hover:bg-danger/5 cursor-pointer rounded-lg mt-1 transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span>Sair do Sistema</span>
          </div>

          {/* User Role Badge Display */}
          <div className="mt-4 px-2">
            <div className={`text-[10px] font-bold uppercase tracking-wider py-1.5 px-3 rounded-full w-fit ${userRole === 'admin' ? 'bg-purple-100 text-purple-700' :
              userRole === 'professional' ? 'bg-blue-100 text-blue-700' :
                'bg-orange-100 text-orange-700'
              }`}>
              {userRole === 'professional' ? 'Profissional' : userRole === 'admin' ? 'Administrador' : 'Secretaria'}
            </div>
          </div>
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
  const selectedUnit = units.find(u => u.id === currentUnit) || units[0] || { id: '', name: 'Carregando...', city: '', active: false };
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        currentPath={pathname}
        userRole={userRole}
        onLogout={onLogout}
        permissions={permissions}
      />

      <div className="flex-1 flex flex-col min-h-screen transition-all duration-200">
        {/* Mobile Header */}
        <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between md:hidden shadow-sm z-30">
          <div className="flex items-center gap-2 text-primary font-bold text-lg">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white text-sm">
              F
            </div>
            <span>FisioStar</span>
          </div>
          <button onClick={() => setSidebarOpen(true)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
            <Menu className="w-6 h-6" />
          </button>
        </div>

        {/* Desktop Header & Content Area */}
        <div className="flex-1 overflow-x-hidden">
          {/* Top Bar - Unit Selector & User Profile */}
          <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 px-8 py-4 flex flex-col sm:flex-row gap-4 justify-between items-center sticky top-0 z-20">

            {/* Unit Selector */}
            <div className="relative group w-full sm:w-auto">
              <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 rounded-xl border border-gray-200 hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer">
                <div className={`p-2 rounded-lg ${selectedUnit.active ? 'bg-primary/10 text-primary' : 'bg-gray-200 text-gray-500'}`}>
                  <Building2 className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-[160px]">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Unidade Atual</p>
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-gray-900 text-sm truncate">{selectedUnit.name}</p>
                    <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-primary transition-colors" />
                  </div>
                </div>
              </div>

              {/* Dropdown */}
              <div className="absolute top-full left-0 w-full sm:w-80 bg-white rounded-xl shadow-xl border border-gray-100 mt-2 p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-30 transform origin-top scale-95 group-hover:scale-100">
                <p className="px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Selecione uma Unidade</p>
                {units.map(unit => (
                  <button
                    key={unit.id}
                    onClick={() => setCurrentUnit(unit.id)}
                    className={`w-full text-left px-3 py-3 rounded-lg flex items-center justify-between group/item transition-all ${currentUnit === unit.id ? 'bg-primary/5' : 'hover:bg-gray-50'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ring-2 ring-white shadow-sm ${unit.active ? 'bg-success' : 'bg-gray-300'}`} />
                      <div>
                        <p className={`font-semibold text-sm ${currentUnit === unit.id ? 'text-primary' : 'text-gray-700'}`}>
                          {unit.name}
                        </p>
                        <p className="text-xs text-gray-500">{unit.city}</p>
                      </div>
                    </div>
                    {currentUnit === unit.id && <Check className="w-4 h-4 text-primary" />}
                  </button>
                ))}
              </div>
            </div>

            {/* User Profile */}
            <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-200 dark:hover:text-white transition-colors"
                title={darkMode ? "Modo Claro" : "Modo Escuro"}
              >
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <NotificationsPopover
                notifications={notifications}
                onMarkAsRead={onMarkNotificationAsRead}
                onClearAll={onClearNotifications}
              />
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-gray-900 leading-none mb-1">{userName}</p>
                <div className="flex items-center gap-1.5 justify-end text-xs text-gray-500">
                  <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                  Online
                </div>
              </div>
              <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-primary to-primary-hover flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-primary/20 ring-2 ring-white">
                {userName.charAt(0)}
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="p-8 max-w-[1600px] mx-auto">
            {children}
          </main>
        </div>
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

    // Only use customPermissions if it exists AND has at least one permission
    // Otherwise, fall back to role defaults to avoid empty permission sets
    if (Array.isArray(systemUser.customPermissions) && systemUser.customPermissions.length > 0) {
      return {
        ...DEFAULT_PERMISSIONS,
        [role]: systemUser.customPermissions
      };
    }

    return DEFAULT_PERMISSIONS;
  }, [systemUser, role]);

  // Load units
  useEffect(() => {
    async function loadUnits() {
      try {
        const data = await unitsApi.getAll();
        setUnits(data);

        // Initialize current unit logic
        if (assignedUnit) {
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
  }, [assignedUnit]);

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
            role === 'secretary'
              ? <SecretaryDashboard currentUnit={currentUnit} announcements={announcements} />
              : <Dashboard
                currentUnit={currentUnit}
                announcements={announcements}
                onAddAnnouncement={handleAddAnnouncement}
                onDeleteAnnouncement={handleDeleteAnnouncement}
                canManageAnnouncements={role === 'admin'}
              />
          } />

          <Route path="/agenda" element={
            <Schedule currentUnit={currentUnit} />
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
          <Route path="*" element={<Navigate to={getDefaultRoute()} replace />} />
        </Routes>
      </Suspense>
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
