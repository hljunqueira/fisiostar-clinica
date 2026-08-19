import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ConfirmModal } from './ConfirmModal';
import DataSeeder from './DataSeeder';
import Units from './Units';
import { UserRole, RolePermissions, PermissionKey, SystemUser, AuditLogItem, AuditCategory, getUserEffectivePermissions, PERMISSION_MODULES, Agreement } from '../src/types';
import {
    Shield, UserCog, Save,
    Layout, Users, CreditCard, Plus, Trash2, Edit3, X, Tag, FileText, ArrowLeft, ChevronRight, UploadCloud,
    RotateCcw, LayoutDashboard, Briefcase, UserCheck, Calendar, Building2, Activity, Search, Filter,
    Handshake, Phone, Mail, Percent, Check, AlertCircle, DoorClosed
} from 'lucide-react';
import { systemUsersApi, auditLogsApi, agreementsApi } from '../src/services/api';
import { toast } from 'react-hot-toast';
import { RoomsSettingsTab } from './Settings/RoomsSettingsTab';
import { AuditLogsTab } from './Settings/AuditLogsTab';
import { ScheduleSettingsTab } from './Settings/ScheduleSettingsTab';

interface SettingsProps {
    currentRole: UserRole;
    setCurrentRole: (role: UserRole) => void;
    rolePermissions?: RolePermissions;
    setRolePermissions?: (permissions: RolePermissions) => void;
    currentUserName?: string;
}

type SettingsSection = 'general' | 'users' | 'units' | 'logs' | 'agreements' | 'rooms' | 'schedule' | null;

const Settings: React.FC<SettingsProps> = ({
    currentRole,
    rolePermissions,
    setRolePermissions,
    currentUserName = 'Administrador'
}) => {
    const [searchParams] = useSearchParams();
    const tabParam = searchParams.get('tab') || searchParams.get('section');
    const [activeSection, setActiveSection] = useState<SettingsSection>(null);

    useEffect(() => {
        if (tabParam === 'logs' || tabParam === 'units' || tabParam === 'users' || tabParam === 'general' || tabParam === 'agreements' || tabParam === 'rooms' || tabParam === 'schedule') {
            setActiveSection(tabParam as SettingsSection);
        }
    }, [tabParam]);

    // --- Local State for Settings Management ---
    const [users, setUsers] = useState<SystemUser[]>([]);
    const [agreements, setAgreements] = useState<Agreement[]>([]);
    const [isAgreementModalOpen, setIsAgreementModalOpen] = useState(false);
    const [agreementFormData, setAgreementFormData] = useState<Partial<Agreement>>({
        name: '',
        cnpj: '',
        phone: '',
        email: '',
        discountPercentage: 0,
        notes: '',
        isActive: true
    });
    const [savingAgreement, setSavingAgreement] = useState(false);

    const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
    const [auditFilterCategory, setAuditFilterCategory] = useState<string>('all');
    const [auditSearchQuery, setAuditSearchQuery] = useState<string>('');
    const [loading, setLoading] = useState(false);

    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const selectedUser = selectedUserId ? users.find(u => u.id === selectedUserId) : null;

    // User Modal State (Reused for Create and Edit)
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [userFormData, setUserFormData] = useState<{ id?: string; name: string; email: string; role: UserRole }>({
        name: '',
        email: '',
        role: 'secretary'
    });
    const [savingUser, setSavingUser] = useState(false);

    // Confirm Modal
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        description: string;
        onConfirm: () => void;
    }>({
        isOpen: false,
        title: '',
        description: '',
        onConfirm: () => { }
    });

    const closeConfirmModal = () => setConfirmModal(prev => ({ ...prev, isOpen: false }));

    useEffect(() => {
        async function loadData() {
            if (!activeSection) return;

            try {
                setLoading(true);
                if (activeSection === 'users') {
                    const usersData = await systemUsersApi.getAll();
                    // Never show super admin in users list
                    setUsers(usersData.filter(u => u.role !== 'super_admin'));
                } else if (activeSection === 'logs') {
                    const logsData = await auditLogsApi.getAll();
                    setAuditLogs(logsData);
                } else if (activeSection === 'agreements') {
                    const agreementsData = await agreementsApi.getAll();
                    setAgreements(agreementsData);
                }
            } catch (error) {
                console.error('Error loading settings data:', error);
                toast.error('Erro ao carregar dados');
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, [activeSection]);

    // User Role Change (Promover / Alterar Função)
    const handleRoleChange = async (userId: string, newRole: UserRole) => {
        const user = users.find(u => u.id === userId);
        if (!user || user.role === newRole) return;

        setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole, customPermissions: [] } : u));

        try {
            await systemUsersApi.update(userId, { role: newRole });
            await systemUsersApi.updatePermissions(userId, []);

            const roleLabels: Record<UserRole, string> = {
                admin: 'Administrador',
                manager: 'Gerente Operacional',
                financial: 'Financeiro',
                secretary: 'Secretária',
                professional: 'Profissional',
                super_admin: 'Super Admin'
            };
            toast.success(`Função alterada para ${roleLabels[newRole] || newRole}`);

            // Audit Log
            await auditLogsApi.logAction({
                userName: currentUserName,
                userRole: currentRole,
                category: 'users',
                action: 'Função Alterada',
                details: `Alterou a função do colaborador ${user.name} para ${roleLabels[newRole] || newRole}.`
            });
        } catch (error) {
            console.error('Error changing role:', error);
            toast.error('Erro ao alterar função do usuário');
        }
    };

    // Toggle specific permission
    const handleToggleUserPermission = async (userId: string, permissionKey: PermissionKey) => {
        const user = users.find(u => u.id === userId);
        if (!user) return;

        const effectivePermissions = getUserEffectivePermissions(user);
        let updatedPermissions: PermissionKey[];

        if (effectivePermissions.includes(permissionKey)) {
            updatedPermissions = effectivePermissions.filter(p => p !== permissionKey);
        } else {
            updatedPermissions = [...effectivePermissions, permissionKey];
        }

        setUsers(prev => prev.map(u => u.id === userId ? { ...u, customPermissions: updatedPermissions } : u));

        try {
            await systemUsersApi.updatePermissions(userId, updatedPermissions);
            toast.success('Permissões atualizadas');

            // Audit Log
            await auditLogsApi.logAction({
                userName: currentUserName,
                userRole: currentRole,
                category: 'users',
                action: 'Permissões Customizadas Alteradas',
                details: `Atualizou as permissões do usuário ${user.name}.`
            });
        } catch (error) {
            console.error('Error updating permissions:', error);
            toast.error('Erro ao salvar permissões');
        }
    };

    // Reset Permissions to Defaults
    const handleResetPermissions = async (userId: string) => {
        const user = users.find(u => u.id === userId);
        if (!user) return;

        setUsers(prev => prev.map(u => u.id === userId ? { ...u, customPermissions: [] } : u));

        try {
            await systemUsersApi.updatePermissions(userId, []);
            toast.success('Permissões restauradas para o padrão do cargo');

            // Audit Log
            await auditLogsApi.logAction({
                userName: currentUserName,
                userRole: currentRole,
                category: 'users',
                action: 'Permissões Restauradas',
                details: `Restaurou permissões padrão do cargo para ${user.name}.`
            });
        } catch (error) {
            console.error('Error resetting permissions:', error);
            toast.error('Erro ao restaurar permissões');
        }
    };

    // Open Modal for Create or Edit User
    const handleOpenUserModal = (user?: SystemUser) => {
        if (user) {
            setUserFormData({
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            });
        } else {
            setUserFormData({
                name: '',
                email: '',
                role: 'secretary'
            });
        }
        setIsUserModalOpen(true);
    };

    // Save User (Create or Update)
    const handleSaveUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userFormData.name.trim() || !userFormData.email.trim()) return;

        setSavingUser(true);
        try {
            if (userFormData.id) {
                // Update User
                const updated = await systemUsersApi.update(userFormData.id, {
                    name: userFormData.name.trim(),
                    email: userFormData.email.trim(),
                    role: userFormData.role
                });

                setUsers(prev => prev.map(u => u.id === updated.id ? { ...u, ...updated } : u));
                toast.success('Colaborador atualizado com sucesso');

                // Audit Log
                await auditLogsApi.logAction({
                    userName: currentUserName,
                    userRole: currentRole,
                    category: 'users',
                    action: 'Colaborador Editado',
                    details: `Atualizou os dados de ${updated.name} (${updated.email}).`
                });
            } else {
                // Create User
                const created = await systemUsersApi.create({
                    name: userFormData.name.trim(),
                    email: userFormData.email.trim(),
                    role: userFormData.role
                });

                setUsers(prev => [...prev, created]);
                setSelectedUserId(created.id);
                toast.success('Colaborador cadastrado com sucesso');

                // Audit Log
                await auditLogsApi.logAction({
                    userName: currentUserName,
                    userRole: currentRole,
                    category: 'users',
                    action: 'Novo Colaborador Criado',
                    details: `Cadastrou o colaborador ${created.name} (${created.email}) no perfil ${created.role}.`
                });
            }
            setIsUserModalOpen(false);
        } catch (error) {
            console.error('Error saving user:', error);
            toast.error('Erro ao salvar colaborador');
        } finally {
            setSavingUser(false);
        }
    };

    // Delete User
    const handleDeleteUser = (userId: string) => {
        const user = users.find(u => u.id === userId);
        if (!user) return;

        setConfirmModal({
            isOpen: true,
            title: 'Excluir Usuário',
            description: `Tem certeza que deseja remover ${user.name}? Esta ação não pode ser desfeita.`,
            onConfirm: async () => {
                try {
                    await systemUsersApi.delete(userId);
                    setUsers(prev => prev.filter(u => u.id !== userId));
                    if (selectedUserId === userId) setSelectedUserId(null);
                    toast.success('Usuário removido');

                    // Audit Log
                    await auditLogsApi.logAction({
                        userName: currentUserName,
                        userRole: currentRole,
                        category: 'users',
                        action: 'Usuário Excluído',
                        details: `Removeu o cadastro do colaborador ${user.name} (${user.email}).`
                    });
                } catch (error) {
                    console.error('Error deleting user:', error);
                    toast.error('Erro ao excluir usuário');
                }
            }
        });
    };

    // Agreement Handlers
    const handleOpenAgreementModal = (agreement?: Agreement) => {
        if (agreement) {
            setAgreementFormData(agreement);
        } else {
            setAgreementFormData({
                name: '',
                cnpj: '',
                phone: '',
                email: '',
                discountPercentage: 0,
                notes: '',
                isActive: true
            });
        }
        setIsAgreementModalOpen(true);
    };

    const handleSaveAgreement = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!agreementFormData.name?.trim()) return;

        setSavingAgreement(true);
        try {
            if (agreementFormData.id) {
                const updated = await agreementsApi.update(agreementFormData.id, agreementFormData);
                setAgreements(prev => prev.map(a => a.id === updated.id ? updated : a));
                toast.success('Convênio atualizado com sucesso');

                await auditLogsApi.logAction({
                    userName: currentUserName,
                    userRole: currentRole,
                    category: 'system',
                    action: 'Convênio Atualizado',
                    details: `Atualizou os dados do convênio ${updated.name}.`
                });
            } else {
                const created = await agreementsApi.create(agreementFormData as any);
                setAgreements(prev => [...prev, created]);
                toast.success('Convênio cadastrado com sucesso');

                await auditLogsApi.logAction({
                    userName: currentUserName,
                    userRole: currentRole,
                    category: 'system',
                    action: 'Novo Convênio Cadastrado',
                    details: `Cadastrou o convênio ${created.name} (${created.discountPercentage || 0}% de desconto).`
                });
            }
            setIsAgreementModalOpen(false);
        } catch (error) {
            console.error('Error saving agreement:', error);
            toast.error('Erro ao salvar convênio');
        } finally {
            setSavingAgreement(false);
        }
    };

    const handleToggleAgreementActive = async (agreement: Agreement) => {
        try {
            const updated = await agreementsApi.update(agreement.id, { isActive: !agreement.isActive });
            setAgreements(prev => prev.map(a => a.id === updated.id ? updated : a));
            toast.success(`Convênio ${updated.isActive ? 'ativado' : 'desativado'}`);
        } catch (error) {
            console.error('Error toggling agreement status:', error);
            toast.error('Erro ao alterar status');
        }
    };

    const handleDeleteAgreement = (agreement: Agreement) => {
        setConfirmModal({
            isOpen: true,
            title: 'Excluir Convênio',
            description: `Deseja remover o convênio "${agreement.name}"?`,
            onConfirm: async () => {
                try {
                    await agreementsApi.delete(agreement.id);
                    setAgreements(prev => prev.filter(a => a.id !== agreement.id));
                    toast.success('Convênio excluído com sucesso');
                } catch (error) {
                    console.error('Error deleting agreement:', error);
                    toast.error('Erro ao excluir convênio');
                }
            }
        });
    };

    // Filtered Audit Logs
    const filteredAuditLogs = auditLogs.filter(log => {
        // Never display super admin
        if (log.userRole === 'super_admin' || log.userName.toLowerCase().includes('super admin')) {
            return false;
        }

        const matchesCategory = auditFilterCategory === 'all' || log.category === auditFilterCategory;
        const query = auditSearchQuery.toLowerCase();
        const matchesQuery = !query ||
            log.userName.toLowerCase().includes(query) ||
            log.action.toLowerCase().includes(query) ||
            log.details.toLowerCase().includes(query);

        return matchesCategory && matchesQuery;
    });

    const categoryBadges: Record<AuditCategory, { label: string; color: string }> = {
        agenda: { label: 'Agenda Geral', color: 'bg-blue-50 text-blue-700 border-blue-200' },
        plans: { label: 'Serviços e Planos', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
        patients: { label: 'Pacientes', color: 'bg-purple-50 text-purple-700 border-purple-200' },
        financial: { label: 'Financeiro', color: 'bg-amber-50 text-amber-700 border-amber-200' },
        users: { label: 'Usuários e Permissões', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
        rooms: { label: 'Salas & Reservas', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
        chat: { label: 'Chat Interno', color: 'bg-teal-50 text-teal-700 border-teal-200' },
        system: { label: 'Sistema', color: 'bg-gray-50 text-gray-700 border-gray-200' }
    };

    const isAdmin = currentRole === 'admin' || currentRole === 'superadmin';

    const renderMenu = () => (
        <div className="max-w-5xl mx-auto animate-fade-in">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Ajustes</h1>
                <p className="text-gray-500">
                    {isAdmin ? 'Selecione uma categoria para configurar a clínica.' : 'Configurações disponíveis para o seu perfil.'}
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Configurações da Agenda (Disponível para Admin e Secretária) */}
                <button
                    onClick={() => setActiveSection('schedule')}
                    className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all text-left group cursor-pointer"
                >
                    <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 mb-4 group-hover:scale-110 transition-transform">
                        <Calendar className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-1">Configurações da Agenda</h3>
                    <p className="text-xs text-gray-500">Visualização padrão, duração, repetições e horários de expediente/intervalo.</p>
                    <div className="mt-4 flex items-center text-emerald-600 text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                        Configurar <ChevronRight className="w-4 h-4 ml-1" />
                    </div>
                </button>

                {/* Seções exclusivas para Administradores */}
                {isAdmin && (
                    <>
                        <button
                            onClick={() => setActiveSection('users')}
                            className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm hover:shadow-md hover:border-purple-300 transition-all text-left group cursor-pointer"
                        >
                            <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 mb-4 group-hover:scale-110 transition-transform">
                                <Users className="w-6 h-6" />
                            </div>
                            <h3 className="font-bold text-gray-900 mb-1">Usuários e Permissões</h3>
                            <p className="text-xs text-gray-500">Gerencie acesso, RBAC e permissões individuais.</p>
                            <div className="mt-4 flex items-center text-purple-600 text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                                Configurar <ChevronRight className="w-4 h-4 ml-1" />
                            </div>
                        </button>

                        <button
                            onClick={() => setActiveSection('units')}
                            className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm hover:shadow-md hover:border-amber-300 transition-all text-left group cursor-pointer"
                        >
                            <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 mb-4 group-hover:scale-110 transition-transform">
                                <Building2 className="w-6 h-6" />
                            </div>
                            <h3 className="font-bold text-gray-900 mb-1">Filiais e Unidades</h3>
                            <p className="text-xs text-gray-500">Gestão de unidades físicas, horários e feriados.</p>
                            <div className="mt-4 flex items-center text-amber-600 text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                                Configurar <ChevronRight className="w-4 h-4 ml-1" />
                            </div>
                        </button>

                        <button
                            onClick={() => setActiveSection('rooms')}
                            className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm hover:shadow-md hover:border-blue-300 transition-all text-left group cursor-pointer"
                        >
                            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 mb-4 group-hover:scale-110 transition-transform">
                                <DoorClosed className="w-6 h-6" />
                            </div>
                            <h3 className="font-bold text-gray-900 mb-1">Salas de Atendimento</h3>
                            <p className="text-xs text-gray-500">Cadastre salas, estúdios de pilates e consultórios.</p>
                            <div className="mt-4 flex items-center text-blue-600 text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                                Configurar <ChevronRight className="w-4 h-4 ml-1" />
                            </div>
                        </button>

                        <button
                            onClick={() => setActiveSection('agreements')}
                            className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm hover:shadow-md hover:border-teal-300 transition-all text-left group cursor-pointer"
                        >
                            <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center text-teal-600 mb-4 group-hover:scale-110 transition-transform">
                                <Handshake className="w-6 h-6" />
                            </div>
                            <h3 className="font-bold text-gray-900 mb-1">Convênios & Parcerias</h3>
                            <p className="text-xs text-gray-500">Gestão de planos de saúde, corporativos e tabelas de desconto.</p>
                            <div className="mt-4 flex items-center text-teal-600 text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                                Gerenciar <ChevronRight className="w-4 h-4 ml-1" />
                            </div>
                        </button>

                        <button
                            onClick={() => setActiveSection('logs')}
                            className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all text-left group cursor-pointer"
                        >
                            <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 mb-4 group-hover:scale-110 transition-transform">
                                <Activity className="w-6 h-6" />
                            </div>
                            <h3 className="font-bold text-gray-900 mb-1">Logs de Auditoria & Sistema</h3>
                            <p className="text-xs text-gray-500">Histórico de alterações em agenda, planos, pacientes, financeiro e usuários.</p>
                            <div className="mt-4 flex items-center text-emerald-600 text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                                Visualizar Logs <ChevronRight className="w-4 h-4 ml-1" />
                            </div>
                        </button>
                    </>
                )}
            </div>
        </div>
    );

    return (
        <div className="h-full pb-10">

            {/* If no section active, show menu */}
            {!activeSection && renderMenu()}

            {/* If section active, show full screen view */}
            {activeSection && (
                <div className="flex flex-col h-full animate-fade-in bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
                    {/* Header of View */}
                    <div className="flex items-center gap-4 p-6 border-b border-gray-100 bg-gray-50/30">
                        <button
                            onClick={() => setActiveSection(null)}
                            className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500 hover:text-gray-900 cursor-pointer"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                {activeSection === 'general' && <><Layout className="w-5 h-5 text-gray-400" /> Configurações Gerais</>}
                                {activeSection === 'users' && <><Users className="w-5 h-5 text-gray-400" /> Usuários e Permissões</>}
                                {activeSection === 'units' && <><Building2 className="w-5 h-5 text-gray-400" /> Filiais e Unidades</>}
                                {activeSection === 'schedule' && <><Calendar className="w-5 h-5 text-emerald-600" /> Configurações de Visualização de Agenda</>}
                                {activeSection === 'rooms' && <><DoorClosed className="w-5 h-5 text-blue-600" /> Salas de Atendimento</>}
                                {activeSection === 'agreements' && <><Handshake className="w-5 h-5 text-teal-600" /> Convênios & Parcerias</>}
                                {activeSection === 'logs' && <><Activity className="w-5 h-5 text-gray-400" /> Logs de Auditoria & Sistema</>}
                            </h2>
                        </div>
                    </div>

                    {/* Content of View */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {!isAdmin && activeSection !== 'schedule' ? (
                            <div className="max-w-md mx-auto my-12 p-8 bg-amber-50 rounded-2xl border border-amber-200 text-center space-y-4 animate-fade-in">
                                <AlertCircle className="w-12 h-12 text-amber-600 mx-auto" />
                                <div>
                                    <h3 className="font-bold text-amber-900 text-base">Acesso Restrito</h3>
                                    <p className="text-xs text-amber-700 mt-1">
                                        Esta seção de configurações está disponível exclusivamente para administradores do sistema.
                                    </p>
                                </div>
                                <button
                                    onClick={() => setActiveSection('schedule')}
                                    className="px-5 py-2.5 bg-amber-600 text-white font-bold rounded-xl text-xs hover:bg-amber-700 transition-all cursor-pointer shadow-xs"
                                >
                                    Ir para Configurações da Agenda
                                </button>
                            </div>
                        ) : (
                            <>
                                {/* --- VIEW: GENERAL --- */}
                                {activeSection === 'general' && (
                                    <div className="max-w-2xl mx-auto space-y-6">
                                        <div>
                                            <h3 className="font-bold text-gray-900 mb-2">Dados da Clínica</h3>
                                            <p className="text-sm text-gray-500">Configurações globais e identificação oficial da clínica.</p>
                                        </div>
                                        <div className="p-6 bg-gray-50 rounded-2xl border border-gray-200 text-sm text-gray-600">
                                            FisioStar Clínica de Fisioterapia & Reabilitação • Sistema Oficial v1.0.0
                                        </div>
                                    </div>
                                )}

                        {/* --- VIEW: USERS & PERMISSIONS --- */}
                        {activeSection === 'users' && (
                            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                                {/* Left Side: User List */}
                                <div className="xl:col-span-1 space-y-4">
                                    <div className="flex justify-between items-center bg-gray-50/70 p-3 rounded-2xl border border-gray-100">
                                        <div>
                                            <h3 className="font-bold text-gray-900 text-xs uppercase tracking-wider">Colaboradores</h3>
                                            <p className="text-[11px] text-gray-500">{users.length} usuários ativos no sistema</p>
                                        </div>
                                        <button
                                            onClick={() => handleOpenUserModal()}
                                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                                        >
                                            <Plus className="w-3.5 h-3.5" /> Novo
                                        </button>
                                    </div>

                                    <div className="space-y-2 max-h-[600px] overflow-y-auto custom-scrollbar">
                                        {users.map(user => {
                                            const isSelected = selectedUserId === user.id;
                                            return (
                                                <div
                                                    key={user.id}
                                                    onClick={() => setSelectedUserId(user.id)}
                                                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${isSelected
                                                        ? 'bg-blue-50/80 border-blue-300 shadow-sm'
                                                        : 'bg-white border-gray-200/80 hover:bg-gray-50'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                                                            {user.name.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-bold text-gray-900">{user.name}</p>
                                                            <p className="text-[11px] text-gray-500">{user.email}</p>
                                                        </div>
                                                    </div>

                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                                                        user.role === 'manager' ? 'bg-indigo-100 text-indigo-700' :
                                                            user.role === 'financial' ? 'bg-emerald-100 text-emerald-700' :
                                                                user.role === 'professional' ? 'bg-blue-100 text-blue-700' :
                                                                    'bg-orange-100 text-orange-700'
                                                        }`}>
                                                        {user.role === 'professional' ? 'Profissional' :
                                                            user.role === 'manager' ? 'Gerente' :
                                                                user.role === 'financial' ? 'Financeiro' :
                                                                    user.role === 'admin' ? 'Admin' :
                                                                        'Secretária'}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Right Side: Permissions & Role Editing */}
                                <div className="xl:col-span-2">
                                    {selectedUser ? (
                                        <div className="space-y-6">
                                            {/* Header Info */}
                                            <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-700 font-bold text-base flex items-center justify-center border border-gray-200">
                                                        {selectedUser.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-gray-900 text-base">{selectedUser.name}</h3>
                                                        <p className="text-xs text-gray-500">{selectedUser.email}</p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider hidden sm:block">Função / Cargo:</label>
                                                    <select
                                                        value={selectedUser.role}
                                                        onChange={e => handleRoleChange(selectedUser.id, e.target.value as UserRole)}
                                                        className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-800 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer hover:border-gray-300 transition-all"
                                                    >
                                                        <option value="secretary">🟣 Secretária / Recepção</option>
                                                        <option value="manager">📈 Gerente Operacional</option>
                                                        <option value="financial">💰 Financeiro / Contabilidade</option>
                                                        <option value="admin">🔵 Administrador</option>
                                                        <option value="professional">🟢 Profissional / Fisioterapeuta</option>
                                                    </select>

                                                    <button
                                                        onClick={() => handleOpenUserModal(selectedUser)}
                                                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all cursor-pointer"
                                                        title="Editar cadastro do colaborador"
                                                    >
                                                        <Edit3 className="w-4 h-4" />
                                                    </button>

                                                    <button
                                                        onClick={() => handleDeleteUser(selectedUser.id)}
                                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                                                        title="Excluir usuário"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <div className="flex justify-between items-center bg-blue-50/50 p-3 rounded-2xl border border-blue-100/80">
                                                    <div>
                                                        <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider">Permissões de Acesso do Usuário</h4>
                                                        <p className="text-[11px] text-blue-700/80 mt-0.5">As opções pré-marcadas são herdadas do cargo atual. Marque ou desmarque para personalizar.</p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleResetPermissions(selectedUser.id)}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-blue-200 text-blue-700 hover:bg-blue-600 hover:text-white rounded-xl text-xs font-bold shadow-sm transition-all shrink-0 cursor-pointer"
                                                        title="Restaurar permissões para os padrões oficiais do cargo"
                                                    >
                                                        <RotateCcw className="w-3.5 h-3.5" />
                                                        Restaurar Padrões
                                                    </button>
                                                </div>

                                                <div className="space-y-4">
                                                    {PERMISSION_MODULES.map(module => {
                                                        const IconComponent = module.id === 'dashboards' ? LayoutDashboard : module.id === 'operation' ? Calendar : Briefcase;
                                                        const userPermissions = getUserEffectivePermissions(selectedUser);

                                                        const roleAllowedPermissionsMap: Record<UserRole, PermissionKey[]> = {
                                                            professional: [
                                                                'access_professional_portal',
                                                                'view_schedule',
                                                                'manage_patients'
                                                            ],
                                                            secretary: [
                                                                'view_secretary_dashboard',
                                                                'view_schedule',
                                                                'manage_patients',
                                                                'manage_plans'
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
                                                            admin: [
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
                                                                'edit_settings'
                                                            ],
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
                                                            ]
                                                        };

                                                        const allowedForRole = roleAllowedPermissionsMap[selectedUser.role] || [];
                                                        const filteredPermissions = module.permissions.filter(p => allowedForRole.includes(p.key));

                                                        if (filteredPermissions.length === 0) return null;

                                                        return (
                                                            <div key={module.id} className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
                                                                <div className="px-4 py-2.5 bg-gray-50/70 border-b border-gray-100 flex items-center justify-between">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="p-1 bg-blue-50 text-blue-600 rounded-md">
                                                                            <IconComponent className="w-4 h-4" />
                                                                        </div>
                                                                        <div>
                                                                            <h5 className="text-xs font-bold text-gray-900">{module.title}</h5>
                                                                            <p className="text-[10px] text-gray-500">{module.description}</p>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="divide-y divide-gray-100">
                                                                    {filteredPermissions.map(perm => {
                                                                        const isChecked = userPermissions.includes(perm.key);
                                                                        return (
                                                                            <label key={perm.key} className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50/80 transition-colors">
                                                                                <div>
                                                                                    <p className="text-xs font-semibold text-gray-800">{perm.label}</p>
                                                                                    <p className="text-[11px] text-gray-500 mt-0.5">{perm.description}</p>
                                                                                </div>
                                                                                <input
                                                                                    type="checkbox"
                                                                                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer shrink-0"
                                                                                    checked={isChecked}
                                                                                    onChange={() => handleToggleUserPermission(selectedUser.id, perm.key)}
                                                                                />
                                                                            </label>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center text-gray-400 py-16 bg-white rounded-2xl border border-gray-200/80">
                                            <UserCog className="w-12 h-12 mb-3 opacity-20" />
                                            <p className="text-sm font-semibold">Selecione um usuário à esquerda para visualizar e editar permissões.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* --- VIEW: UNITS --- */}
                        {activeSection === 'units' && (
                            <Units />
                        )}

                        {/* --- VIEW: SCHEDULE CONFIG --- */}
                        {activeSection === 'schedule' && (
                            <ScheduleSettingsTab currentRole={currentRole} />
                        )}

                        {/* --- VIEW: ROOMS --- */}
                        {activeSection === 'rooms' && (
                            <RoomsSettingsTab />
                        )}

                        {/* --- VIEW: AUDIT LOGS --- */}
                        {activeSection === 'logs' && (
                            <AuditLogsTab />
                        )}

                        {/* --- VIEW: AGREEMENTS & CONVÊNIOS --- */}
                        {activeSection === 'agreements' && (
                            <div className="space-y-6 animate-fade-in">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-teal-50/60 p-4 rounded-2xl border border-teal-100">
                                    <div>
                                        <h3 className="font-bold text-teal-950 text-sm">Operadoras de Saúde & Convênios Parceiros</h3>
                                        <p className="text-xs text-teal-700">Configure planos de saúde aceitos, porcentagens de desconto e contatos.</p>
                                    </div>
                                    <button
                                        onClick={() => handleOpenAgreementModal()}
                                        className="bg-teal-700 hover:bg-teal-800 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer"
                                    >
                                        <Plus className="w-4 h-4" /> Novo Convênio
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {agreements.map(agreement => (
                                        <div key={agreement.id} className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs space-y-3 flex flex-col justify-between">
                                            <div>
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className="p-2 bg-teal-50 text-teal-700 rounded-xl">
                                                            <Handshake className="w-5 h-5" />
                                                        </div>
                                                        <div>
                                                            <h4 className="font-bold text-gray-900 text-sm">{agreement.name}</h4>
                                                            {agreement.cnpj && (
                                                                <p className="text-[11px] text-gray-400 font-mono">CNPJ: {agreement.cnpj}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${agreement.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-500'
                                                        }`}>
                                                        {agreement.isActive ? 'Ativo' : 'Inativo'}
                                                    </span>
                                                </div>

                                                <div className="space-y-1 text-xs text-gray-600 bg-gray-50/60 p-3 rounded-xl">
                                                    {agreement.discountPercentage !== undefined && agreement.discountPercentage > 0 && (
                                                        <p className="flex items-center gap-1.5 font-bold text-teal-800">
                                                            <Percent className="w-3.5 h-3.5 text-teal-600" />
                                                            Desconto Negociado: {agreement.discountPercentage}%
                                                        </p>
                                                    )}
                                                    {agreement.phone && (
                                                        <p className="flex items-center gap-1.5 text-gray-500">
                                                            <Phone className="w-3.5 h-3.5 text-gray-400" />
                                                            {agreement.phone}
                                                        </p>
                                                    )}
                                                    {agreement.email && (
                                                        <p className="flex items-center gap-1.5 text-gray-500">
                                                            <Mail className="w-3.5 h-3.5 text-gray-400" />
                                                            {agreement.email}
                                                        </p>
                                                    )}
                                                    {agreement.notes && (
                                                        <p className="text-[11px] text-gray-400 mt-1 italic">
                                                            "{agreement.notes}"
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                                                <button
                                                    onClick={() => handleToggleAgreementActive(agreement)}
                                                    className={`text-xs font-bold cursor-pointer ${agreement.isActive ? 'text-amber-600 hover:text-amber-700' : 'text-emerald-600 hover:text-emerald-700'}`}
                                                >
                                                    {agreement.isActive ? 'Desativar' : 'Ativar'}
                                                </button>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => handleOpenAgreementModal(agreement)}
                                                        className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-gray-100 cursor-pointer"
                                                        title="Editar convênio"
                                                    >
                                                        <Edit3 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteAgreement(agreement)}
                                                        className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-100 cursor-pointer"
                                                        title="Excluir convênio"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {agreements.length === 0 && (
                                        <div className="col-span-full p-12 bg-white rounded-2xl border border-gray-200 text-center text-gray-400 text-xs">
                                            <Handshake className="w-10 h-10 mx-auto mb-2 opacity-20" />
                                            Nenhum convênio cadastrado no momento. Clique em "+ Novo Convênio" para adicionar.
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Modal User (Create and Edit) */}
            {isUserModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity" onClick={() => setIsUserModalOpen(false)} />

                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative z-10 animate-fade-in overflow-hidden">
                        <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50/50">
                            <div>
                                <h3 className="font-bold text-gray-900 text-base">{userFormData.id ? 'Editar Colaborador' : 'Novo Colaborador'}</h3>
                                <p className="text-xs text-gray-500">{userFormData.id ? 'Atualize as credenciais e função' : 'Cadastre um novo usuário no sistema'}</p>
                            </div>
                            <button onClick={() => setIsUserModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg cursor-pointer">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveUser} className="p-5 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Nome Completo</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Ex: Dra. Ana Souza"
                                    value={userFormData.name}
                                    onChange={e => setUserFormData({ ...userFormData, name: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">E-mail de Acesso</label>
                                <input
                                    type="email"
                                    required
                                    className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="ana@fisiostar.com"
                                    value={userFormData.email}
                                    onChange={e => setUserFormData({ ...userFormData, email: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Função Padrão</label>
                                <select
                                    className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                                    value={userFormData.role}
                                    onChange={e => setUserFormData({ ...userFormData, role: e.target.value as UserRole })}
                                >
                                    <option value="secretary">🟣 Secretária / Recepção</option>
                                    <option value="manager">📈 Gerente Operacional</option>
                                    <option value="financial">💰 Financeiro / Contabilidade</option>
                                    <option value="admin">🔵 Administrador</option>
                                    <option value="professional">🟢 Profissional / Fisioterapeuta</option>
                                </select>
                            </div>

                            <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setIsUserModalOpen(false)}
                                    className="px-4 py-2 border border-gray-200 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-50 cursor-pointer"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingUser}
                                    className="px-5 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 shadow-sm flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                                >
                                    {savingUser ? 'Salvando...' : (userFormData.id ? 'Atualizar Colaborador' : 'Salvar Colaborador')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Convênio (Create and Edit) */}
            {isAgreementModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity" onClick={() => setIsAgreementModalOpen(false)} />

                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative z-10 animate-fade-in overflow-hidden">
                        <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50/50">
                            <div>
                                <h3 className="font-bold text-gray-900 text-base">{agreementFormData.id ? 'Editar Convênio' : 'Novo Convênio'}</h3>
                                <p className="text-xs text-gray-500">Cadastre dados da operadora de saúde e porcentagem de desconto</p>
                            </div>
                            <button onClick={() => setIsAgreementModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg cursor-pointer">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveAgreement} className="p-5 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Nome do Convênio / Plano *</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-teal-500"
                                    placeholder="Ex: Unimed, Bradesco Saúde, Amil"
                                    value={agreementFormData.name || ''}
                                    onChange={e => setAgreementFormData({ ...agreementFormData, name: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">CNPJ</label>
                                    <input
                                        type="text"
                                        className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-teal-500"
                                        placeholder="00.000.000/0001-00"
                                        value={agreementFormData.cnpj || ''}
                                        onChange={e => setAgreementFormData({ ...agreementFormData, cnpj: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Desconto (%)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-teal-500"
                                        placeholder="Ex: 20"
                                        value={agreementFormData.discountPercentage || 0}
                                        onChange={e => setAgreementFormData({ ...agreementFormData, discountPercentage: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Telefone</label>
                                    <input
                                        type="text"
                                        className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-teal-500"
                                        placeholder="(11) 99999-9999"
                                        value={agreementFormData.phone || ''}
                                        onChange={e => setAgreementFormData({ ...agreementFormData, phone: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">E-mail</label>
                                    <input
                                        type="email"
                                        className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-teal-500"
                                        placeholder="contato@convenio.com"
                                        value={agreementFormData.email || ''}
                                        onChange={e => setAgreementFormData({ ...agreementFormData, email: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Observações / Regras</label>
                                <textarea
                                    rows={2}
                                    className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                                    placeholder="Ex: Exige guia autorizada impressa..."
                                    value={agreementFormData.notes || ''}
                                    onChange={e => setAgreementFormData({ ...agreementFormData, notes: e.target.value })}
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setIsAgreementModalOpen(false)}
                                    className="px-4 py-2 border border-gray-200 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-50 cursor-pointer"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingAgreement}
                                    className="px-5 py-2 bg-teal-700 text-white rounded-xl text-xs font-bold hover:bg-teal-800 shadow-xs flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                                >
                                    {savingAgreement ? 'Salvando...' : (agreementFormData.id ? 'Atualizar Convênio' : 'Salvar Convênio')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Confirm Modal */}
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={closeConfirmModal}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                description={confirmModal.description}
                confirmLabel="Remover"
                variant="danger"
            />
        </div>
    );
};

export default Settings;
