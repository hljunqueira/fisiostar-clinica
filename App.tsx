
import React, { useState, useEffect } from 'react';
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
  Stethoscope
} from 'lucide-react';
import Dashboard from './components/Dashboard';
import Schedule from './components/Schedule';
import Patients from './components/Patients';
import Professionals from './components/Professionals';
import Units from './components/Units';
import Settings from './components/Settings';
import ProfessionalPortal from './components/ProfessionalPortal';
import Login from './components/Login';
import { UNITS, ANNOUNCEMENTS } from './constants';
import { UnitId, UserRole, RolePermissions, PermissionKey, Announcement } from './types';

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
    { icon: <Stethoscope className="w-5 h-5" />, label: 'Minha Área', path: '/meu-portal', permission: 'access_professional_portal' },
    { icon: <Calendar className="w-5 h-5" />, label: 'Agenda Geral', path: '/agenda', permission: 'view_schedule' },
    { icon: <Users className="w-5 h-5" />, label: 'Pacientes', path: '/pacientes', permission: 'manage_patients' },
    { icon: <Briefcase className="w-5 h-5" />, label: 'Equipe & Folha', path: '/profissionais', permission: 'manage_team' },
    { icon: <Building2 className="w-5 h-5" />, label: 'Unidades', path: '/unidades', permission: 'manage_units' },
  ];

  // Filter links based on the current user's role permissions
  const userPermissions = permissions[userRole];
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
            {permissions[userRole].includes('edit_settings') && (
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
                <div className={`text-xs font-semibold uppercase tracking-wider py-1 px-2 rounded w-fit ${
                    userRole === 'admin' ? 'bg-purple-100 text-purple-700' : 
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
    setCurrentUnit: (id: UnitId) => void;
    userRole: UserRole;
    onLogout: () => void;
    permissions: RolePermissions;
}

const Layout: React.FC<LayoutProps> = ({ children, currentUnit, setCurrentUnit, userRole, onLogout, permissions }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isUnitMenuOpen, setIsUnitMenuOpen] = useState(false);
  const location = useLocation();

  const selectedUnit = UNITS.find(u => u.id === currentUnit);

  // Mock User Name based on Role
  const getUserName = () => {
      if(userRole === 'professional') return "Dra. Ana Silva";
      if(userRole === 'secretary') return "Julia Atendimento";
      return "Mariana Costa";
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex font-sans">
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
        currentPath={location.pathname} 
        userRole={userRole} 
        onLogout={onLogout}
        permissions={permissions}
      />
      
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-8 sticky top-0 z-30 shadow-sm/50">
           <div className="flex items-center gap-4">
             <button className="md:hidden text-gray-500 hover:text-gray-900" onClick={() => setSidebarOpen(true)}>
                <Menu className="w-6 h-6" />
             </button>
             {/* Unit Selector */}
             <div className="relative">
                <button 
                    onClick={() => setIsUnitMenuOpen(!isUnitMenuOpen)}
                    className="flex items-center gap-2 text-sm font-semibold text-gray-800 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors max-w-xs"
                >
                    <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
                    <span className="truncate">{selectedUnit?.name}</span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isUnitMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {isUnitMenuOpen && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsUnitMenuOpen(false)}></div>
                        <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-100 animate-fade-in z-50">
                            <div className="p-1">
                                {UNITS.map(unit => (
                                    <button 
                                        key={unit.id}
                                        onClick={() => {
                                            setCurrentUnit(unit.id);
                                            setIsUnitMenuOpen(false);
                                        }}
                                        className={`w-full text-left px-3 py-2.5 text-sm rounded-md flex items-center gap-2 mb-1 last:mb-0 ${unit.id === currentUnit ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'}`}
                                    >
                                        <span className="truncate font-medium">{unit.name}</span>
                                        {unit.id === currentUnit && <Check className="w-4 h-4 ml-auto shrink-0" />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </>
                )}
             </div>
           </div>

           <div className="flex items-center gap-4">
               {/* User Profile Mock */}
               <div className="flex items-center gap-3">
                   <div className="text-right hidden sm:block">
                       <p className="text-sm font-medium text-gray-900">{getUserName()}</p>
                       <p className="text-xs text-gray-500 capitalize">{userRole === 'professional' ? 'Fisioterapeuta' : userRole}</p>
                   </div>
                   <div className={`h-9 w-9 rounded-full flex items-center justify-center font-bold border ${
                        userRole === 'admin' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 
                        userRole === 'professional' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                        'bg-orange-100 text-orange-700 border-orange-200'
                   }`}>
                       {getUserName().split(' ').map(n => n[0]).join('').substring(0,2)}
                   </div>
               </div>
           </div>
        </header>

        {/* Content */}
        <div className="flex-1 p-4 md:p-8 overflow-y-auto">
            <div className="max-w-7xl mx-auto">
                 {children}
            </div>
        </div>
      </main>
    </div>
  );
};

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUnit, setCurrentUnit] = useState<UnitId>(UNITS[0].id);
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>('admin');
  const [rolePermissions, setRolePermissions] = useState<RolePermissions>(DEFAULT_PERMISSIONS);
  const [announcements, setAnnouncements] = useState<Announcement[]>(ANNOUNCEMENTS);

  // Hardcoded ID for demo when role is professional
  const demoProfessionalId = 'p1'; 

  const handleLogin = (role: UserRole) => {
    setCurrentUserRole(role);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUserRole('admin'); // Reset to default
  };

  // Helper to check permission for routing
  const hasPermission = (permission: PermissionKey) => {
      // In a real app, we would check the user's custom permissions here too.
      return rolePermissions[currentUserRole].includes(permission);
  };

  const handleAddAnnouncement = (newAnnouncement: Announcement) => {
    setAnnouncements(prev => [newAnnouncement, ...prev]);
  };

  const handleDeleteAnnouncement = (id: string) => {
    setAnnouncements(prev => prev.filter(a => a.id !== id));
  };

  return (
    <Router>
      {!isAuthenticated ? (
         <Routes>
            <Route path="*" element={<Login onLogin={handleLogin} />} />
         </Routes>
      ) : (
        <Layout 
            currentUnit={currentUnit} 
            setCurrentUnit={setCurrentUnit} 
            userRole={currentUserRole} 
            onLogout={handleLogout}
            permissions={rolePermissions}
        >
            <Routes>
            <Route path="/" element={
                hasPermission('view_dashboard')
                ? <Dashboard 
                    currentUnit={currentUnit} 
                    announcements={announcements} 
                    onAddAnnouncement={handleAddAnnouncement} 
                    onDeleteAnnouncement={handleDeleteAnnouncement} 
                  />
                : <Navigate to={hasPermission('access_professional_portal') ? "/meu-portal" : "/agenda"} replace />
            } />
            
            <Route path="/agenda" element={
                hasPermission('view_schedule')
                ? <Schedule currentUnit={currentUnit} /> 
                : <Navigate to="/" replace />
            } />
            
            <Route path="/pacientes" element={
                hasPermission('manage_patients')
                ? <Patients currentUnit={currentUnit} />
                : <Navigate to="/" replace />
            } />
            
            <Route path="/profissionais" element={
                hasPermission('manage_team')
                ? <Professionals currentUnit={currentUnit} /> 
                : <Navigate to="/" replace />
            } />
            
            <Route path="/unidades" element={
                hasPermission('manage_units')
                ? <Units /> 
                : <Navigate to="/" replace />
            } />
            
            <Route path="/settings" element={
                hasPermission('edit_settings') ? (
                    <Settings 
                        currentRole={currentUserRole} 
                        setCurrentRole={setCurrentUserRole}
                        rolePermissions={rolePermissions}
                        setRolePermissions={setRolePermissions}
                    />
                ) : <Navigate to="/" replace />
            } />

            <Route path="/meu-portal" element={
                hasPermission('access_professional_portal')
                ? <ProfessionalPortal 
                    currentUnit={currentUnit} 
                    professionalId={demoProfessionalId}
                    announcements={announcements} 
                  /> 
                : <Navigate to="/" replace />
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Layout>
      )}
    </Router>
  );
};

export default App;
