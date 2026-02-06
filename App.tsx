
import React, { useState, useEffect, useMemo } from 'react';
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
  DollarSign
} from 'lucide-react';
import Dashboard from './components/Dashboard';
import SecretaryDashboard from './components/SecretaryDashboard';
import Schedule from './components/Schedule';
import Patients from './components/Patients';
import Professionals from './components/Professionals';
import Units from './components/Units';
import Settings from './components/Settings';
import ProfessionalPortal from './components/ProfessionalPortal';
import Financial from './components/Financial';
import Login from './components/Login';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { Toaster, toast } from 'react-hot-toast';

import { UnitId, UserRole, RolePermissions, PermissionKey, Announcement, Unit } from './types';
import { unitsApi, announcementsApi } from './src/services/api';

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
          className="fixed inset-0 bg-black/20 z-40 md:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      <aside className={`fixed md:sticky top-0 left-0 h-screen w-64 bg-white border-r border-gray-200 z-50 transition-transform duration-200 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} flex flex-col`}>
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-gray-100">
          <div className="flex items-center gap-2 text-blue-700 font-bold text-xl tracking-tight">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
              F
            </div>
            <span>FisioStar</span>
          </div>
          <button className="ml-auto md:hidden text-gray-500" onClick={onClose}>
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {allowedLinks.map(link => (
            <NavLink
              key={link.path}
              to={link.path}
              onClick={() => window.innerWidth < 768 && onClose()}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`
              }
            >
              {link.icon}
              {link.label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100">
          {(permissions[userRole] || []).includes('edit_settings') && (
            <NavLink
              to="/settings"
              onClick={() => window.innerWidth < 768 && onClose()}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 text-sm font-medium cursor-pointer rounded-lg hover:bg-gray-50 mb-1 transition-colors ${isActive ? 'bg-gray-100 text-gray-900' : 'text-gray-600'}`
              }
            >
              <SettingsIcon className="w-5 h-5" />
              <span>Configurações</span>
            </NavLink>
          )}
          <div
            onClick={onLogout}
            className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 cursor-pointer rounded-lg mt-1"
          >
            <LogOut className="w-5 h-5" />
            <span>Sair</span>
          </div>

          {/* User Role Badge Display */}
          <div className="mt-4 px-3">
            <div className={`text-xs font-semibold uppercase tracking-wider py-1 px-2 rounded w-fit ${userRole === 'admin' ? 'bg-purple-100 text-purple-700' :
              userRole === 'professional' ? 'bg-blue-100 text-blue-700' :
                'bg-orange-100 text-orange-700'
              }`}>
              {userRole === 'professional' ? 'Profissional' : userRole === 'admin' ? 'Admin' : 'Secretaria'}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

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
}

const Layout: React.FC<LayoutProps> = ({
  children,
  currentUnit,
  setCurrentUnit,
  userRole,
  userName,
  onLogout,
  permissions,
  units
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const selectedUnit = units.find(u => u.id === currentUnit) || units[0] || { id: '', name: 'Carregando...', city: '', active: false };
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen bg-gray-50 flex">
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
        <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between md:hidden">
          <div className="flex items-center gap-2 text-blue-700 font-bold text-lg">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-sm">
              F
            </div>
            <span>FisioStar</span>
          </div>
          <button onClick={() => setSidebarOpen(true)} className="p-2 text-gray-600">
            <Menu className="w-6 h-6" />
          </button>
        </div>

        {/* Desktop Header & Content Area */}
        <div className="flex-1 overflow-x-hidden">
          {/* Top Bar - Unit Selector & User Profile */}
          <header className="bg-white border-b border-gray-200 px-6 py-4 flex flex-col sm:flex-row gap-4 justify-between items-center">

            {/* Unit Selector */}
            <div className="relative group w-full sm:w-auto">
              <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-xl border border-gray-200 hover:border-blue-300 transition-all cursor-pointer">
                <div className={`p-2 rounded-lg ${selectedUnit.active ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-500'}`}>
                  <Building2 className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-[140px]">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Unidade Atual</p>
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-gray-900">{selectedUnit.name}</p>
                    <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
                  </div>
                </div>
              </div>

              {/* Dropdown */}
              <div className="absolute top-full left-0 w-full sm:w-72 bg-white rounded-xl shadow-xl border border-gray-100 mt-2 p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-30 transform origin-top scale-95 group-hover:scale-100">
                <p className="px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Selecione uma Unidade</p>
                {units.map(unit => (
                  <button
                    key={unit.id}
                    onClick={() => setCurrentUnit(unit.id)}
                    className={`w-full text-left px-3 py-3 rounded-lg flex items-center justify-between group/item transition-colors ${currentUnit === unit.id ? 'bg-blue-50' : 'hover:bg-gray-50'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${unit.active ? 'bg-green-500' : 'bg-gray-300'}`} />
                      <div>
                        <p className={`font-semibold text-sm ${currentUnit === unit.id ? 'text-blue-700' : 'text-gray-700'}`}>
                          {unit.name}
                        </p>
                        <p className="text-xs text-gray-500">{unit.city}</p>
                      </div>
                    </div>
                    {currentUnit === unit.id && <Check className="w-4 h-4 text-blue-600" />}
                  </button>
                ))}
              </div>
            </div>

            {/* User Profile */}
            <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-gray-900">{userName}</p>
                <div className="flex items-center gap-1 justify-end text-xs text-gray-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  Online agora
                </div>
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-blue-400 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-200">
                {userName.charAt(0)}
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="p-6">
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user || !systemUser || !role) {
    return <Login />;
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
    >
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
    </Layout>
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
