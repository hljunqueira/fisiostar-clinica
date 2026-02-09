
import React, { useState, useEffect } from 'react';
import { ConfirmModal } from './ConfirmModal';
import DataSeeder from './DataSeeder';
import { UserRole, RolePermissions, PermissionKey, SystemUser, PlanTemplate, Specialty } from '../types';
import {
    Shield, UserCog, Save,
    Layout, Users, CreditCard, Plus, Trash2, Edit3, X, Tag, FileText, ArrowLeft, ChevronRight, UploadCloud
} from 'lucide-react';
import { systemUsersApi, planTemplatesApi, specialtiesApi } from '../src/services/api';
import { storageApi } from '../src/services/storage-api';
import { toast } from 'react-hot-toast';

interface SettingsProps {
    currentRole: UserRole;
    setCurrentRole: (role: UserRole) => void;
    rolePermissions?: RolePermissions;
    setRolePermissions?: (permissions: RolePermissions) => void;
}

type SettingsSection = 'general' | 'users' | 'plans' | null;

const Settings: React.FC<SettingsProps> = ({
    currentRole,
    rolePermissions,
    setRolePermissions
}) => {
    const [activeSection, setActiveSection] = useState<SettingsSection>(null);

    // --- Local State for Settings Management ---
    const [users, setUsers] = useState<SystemUser[]>([]);
    const [plans, setPlans] = useState<PlanTemplate[]>([]);
    const [specialties, setSpecialties] = useState<Specialty[]>([]);
    const [loading, setLoading] = useState(false);

    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

    // Derived state for selected user to ensure we always show latest data (avoiding stale state)
    const selectedUser = selectedUserId ? users.find(u => u.id === selectedUserId) : null;

    useEffect(() => {
        async function loadData() {
            if (!activeSection) return;

            try {
                setLoading(true);
                if (activeSection === 'users') {
                    const usersData = await systemUsersApi.getAll();
                    setUsers(usersData);
                } else if (activeSection === 'plans') {
                    const [plansData, specialtiesData] = await Promise.all([
                        planTemplatesApi.getAll(),
                        specialtiesApi.getAll()
                    ]);
                    setPlans(plansData);
                    setSpecialties(specialtiesData);
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

    // --- Plan & Specialty Modal State ---
    const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState<Partial<PlanTemplate>>({});
    const [newSpecialtyName, setNewSpecialtyName] = useState('');
    const [savingPlan, setSavingPlan] = useState(false);

    // --- Handlers ---

    // User Permissions
    // User Permissions
    const handleToggleUserPermission = async (userId: string, permission: PermissionKey) => {
        // Find current user state
        const user = users.find(u => u.id === userId);
        if (!user) return;

        // Determine effective current permissions (Custom OR Role Default)
        // If customPermissions is an array (even empty), it overrides role defaults.
        // If it is undefined/null, we use role defaults.
        let currentEffective: PermissionKey[] = [];

        if (Array.isArray(user.customPermissions)) {
            currentEffective = [...user.customPermissions];
        } else if (rolePermissions && rolePermissions[user.role]) {
            currentEffective = [...rolePermissions[user.role]];
        }

        const hasPerm = currentEffective.includes(permission);

        let newCustom: PermissionKey[];
        if (hasPerm) {
            // Remove permission
            newCustom = currentEffective.filter(p => p !== permission);
        } else {
            // Add permission
            newCustom = [...currentEffective, permission];
        }

        // Optimistic update
        setUsers(prevUsers => prevUsers.map(u =>
            u.id === userId ? { ...u, customPermissions: newCustom } : u
        ));

        try {
            await systemUsersApi.updatePermissions(userId, newCustom);
            toast.success('Permissões atualizadas');
        } catch (error) {
            console.error('Error updating permissions:', error);
            toast.error('Erro ao salvar permissões');
            // Revert optimistic update
            setUsers(prevUsers => prevUsers.map(u =>
                u.id === userId ? { ...u, customPermissions: user.customPermissions } : u
            ));
        }
    };

    // Specialties
    const handleAddSpecialty = async () => {
        if (!newSpecialtyName.trim()) return;
        try {
            const newSpec = await specialtiesApi.create(newSpecialtyName);
            setSpecialties([...specialties, newSpec]);
            setNewSpecialtyName('');
            toast.success('Especialidade adicionada');
        } catch (error) {
            console.error('Error adding specialty:', error);
            toast.error('Erro ao adicionar especialidade');
        }
    };

    const handleOpenPlanModal = (plan?: PlanTemplate) => {
        if (plan) {
            setEditingPlan(plan);
        } else {
            setEditingPlan({ active: true, sessions: 10, price: 0 });
        }
        setIsPlanModalOpen(true);
    };

    const handleSavePlan = async (e: React.FormEvent) => {
        e.preventDefault();
        setSavingPlan(true);
        try {
            if (editingPlan.id) {
                // Update
                const updated = await planTemplatesApi.update(editingPlan.id, editingPlan);
                setPlans(plans.map(p => p.id === updated.id ? updated : p));
                toast.success('Plano atualizado');
            } else {
                // Create
                if (!editingPlan.name || !editingPlan.sessions || editingPlan.price === undefined) {
                    setSavingPlan(false);
                    return;
                }

                // Ensure mandatory fields are present for TS
                const payload = {
                    name: editingPlan.name,
                    specialtyId: editingPlan.specialtyId,
                    sessions: editingPlan.sessions,
                    price: editingPlan.price,
                    description: editingPlan.description,
                    active: editingPlan.active ?? true
                };

                const newPlan = await planTemplatesApi.create(payload);
                setPlans([...plans, newPlan]);
                toast.success('Plano criado');
            }
            setIsPlanModalOpen(false);
        } catch (error) {
            console.error(error);
            toast.error('Erro ao salvar plano');
        } finally {
            setSavingPlan(false);
        }
    };




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



    const handleDeleteSpecialty = (id: string) => {
        setConfirmModal({
            isOpen: true,
            title: 'Remover Especialidade',
            description: 'Tem certeza que deseja remover esta especialidade? Esta ação não pode ser desfeita.',
            onConfirm: async () => {
                try {
                    await specialtiesApi.delete(id);
                    setSpecialties(specialties.filter(s => s.id !== id));
                    toast.success('Especialidade removida');
                } catch (error) {
                    console.error('Error deleting specialty:', error);
                    toast.error('Erro ao remover especialidade');
                }
            }
        });
    };

    const handleDeletePlan = (id: string) => {
        setConfirmModal({
            isOpen: true,
            title: 'Remover Plano',
            description: 'Tem certeza que deseja remover este plano? Esta ação não pode ser desfeita.',
            onConfirm: async () => {
                try {
                    await planTemplatesApi.delete(id);
                    setPlans(plans.filter(p => p.id !== id));
                    toast.success('Plano removido');
                } catch (error) {
                    console.error('Error deleting plan:', error);
                    toast.error('Erro ao remover plano');
                }
            }
        });
    };

    // ... (rest of render)



    const allPermissions: { key: PermissionKey, label: string }[] = [
        { key: 'view_dashboard', label: 'Visualizar Dashboard' },
        { key: 'view_schedule', label: 'Acessar Agenda' },
        { key: 'manage_patients', label: 'Gerenciar Pacientes' },
        { key: 'manage_team', label: 'Gerenciar Equipe' },
        { key: 'manage_units', label: 'Configurar Unidades' },
        { key: 'view_financials', label: 'Ver Financeiro' },
        { key: 'edit_settings', label: 'Editar Configurações' },
    ];

    // --- Render Views ---

    const renderMenu = () => (
        <div className="max-w-4xl mx-auto animate-fade-in">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Ajustes</h1>
                <p className="text-gray-500">Selecione uma categoria para configurar.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <button
                    onClick={() => setActiveSection('general')}
                    className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all text-left group"
                >
                    <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 mb-4 group-hover:scale-110 transition-transform">
                        <Layout className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-1">Geral & Sistema</h3>
                    <p className="text-sm text-gray-500">Dados da organização, moeda e notificações.</p>
                    <div className="mt-4 flex items-center text-blue-600 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                        Configurar <ChevronRight className="w-4 h-4 ml-1" />
                    </div>
                </button>

                <button
                    onClick={() => setActiveSection('users')}
                    className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all text-left group"
                >
                    <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center text-purple-600 mb-4 group-hover:scale-110 transition-transform">
                        <Users className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-1">Usuários e Permissões</h3>
                    <p className="text-sm text-gray-500">Gerencie acesso, RBAC e permissões individuais.</p>
                    <div className="mt-4 flex items-center text-purple-600 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                        Configurar <ChevronRight className="w-4 h-4 ml-1" />
                    </div>
                </button>

                <button
                    onClick={() => setActiveSection('plans')}
                    className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all text-left group"
                >
                    <div className="w-12 h-12 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600 mb-4 group-hover:scale-110 transition-transform">
                        <CreditCard className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-1">Serviços e Planos</h3>
                    <p className="text-sm text-gray-500">Cadastro de planos de venda e especialidades.</p>
                    <div className="mt-4 flex items-center text-emerald-600 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                        Configurar <ChevronRight className="w-4 h-4 ml-1" />
                    </div>
                </button>
            </div>
        </div>
    );

    return (
        <div className="h-full pb-10">

            {/* If no section active, show menu */}
            {!activeSection && renderMenu()}

            {/* If section active, show full screen view */}
            {activeSection && (
                <div className="flex flex-col h-full animate-fade-in bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    {/* Header of View */}
                    <div className="flex items-center gap-4 p-6 border-b border-gray-100 bg-gray-50/30">
                        <button
                            onClick={() => setActiveSection(null)}
                            className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500 hover:text-gray-900"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                {activeSection === 'general' && <><Layout className="w-5 h-5 text-gray-400" /> Configurações Gerais</>}
                                {activeSection === 'users' && <><Users className="w-5 h-5 text-gray-400" /> Usuários e Permissões</>}
                                {activeSection === 'plans' && <><CreditCard className="w-5 h-5 text-gray-400" /> Serviços e Planos</>}
                            </h2>
                        </div>
                    </div>

                    {/* Content of View */}
                    <div className="flex-1 overflow-y-auto p-6">

                        {/* --- VIEW: GENERAL --- */}
                        {activeSection === 'general' && (
                            <div className="max-w-2xl mx-auto space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Organização</label>
                                    <input type="text" defaultValue="FisioStar Clínicas Integradas" className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-white text-gray-900 focus:ring-blue-500 focus:border-blue-500" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Fuso Horário</label>
                                        <select className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-white text-gray-900">
                                            <option>Brasília (GMT-3)</option>
                                            <option>Amazonas (GMT-4)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Moeda</label>
                                        <select className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-white text-gray-900">
                                            <option>BRL (R$)</option>
                                            <option>USD ($)</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="pt-4 border-t border-gray-100">
                                    <h3 className="font-semibold text-gray-900 mb-4">Notificações do Sistema</h3>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-700">Alertar sobre planos vencendo</span>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" className="sr-only peer" defaultChecked />
                                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                                <DataSeeder />
                            </div>
                        )}

                        {/* --- VIEW: USERS --- */}
                        {activeSection === 'users' && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
                                <div className="col-span-1 border border-gray-200 rounded-lg overflow-hidden h-fit">
                                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 font-medium text-gray-700">
                                        Usuários Cadastrados
                                    </div>
                                    <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
                                        {users.map(user => (
                                            <button
                                                key={user.id}
                                                onClick={() => setSelectedUserId(user.id)}
                                                className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center justify-between ${selectedUserId === user.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''}`}
                                            >
                                                <div>
                                                    <p className="font-medium text-gray-900 text-sm">{user.name}</p>
                                                    <p className="text-xs text-gray-500 capitalize">
                                                        {user.role === 'admin' ? 'Administrador' : user.role === 'professional' ? 'Profissional' : 'Secretária'}
                                                    </p>
                                                </div>
                                                <UserCog className={`w-4 h-4 ${selectedUserId === user.id ? 'text-blue-600' : 'text-gray-300'}`} />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="col-span-2 bg-gray-50 rounded-xl p-6 border border-gray-200 h-fit">
                                    {selectedUser ? (
                                        <div className="animate-fade-in">
                                            <div className="flex justify-between items-start mb-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="relative group/avatar cursor-pointer">
                                                        <div className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold shadow-sm overflow-hidden ${selectedUser.avatarUrl ? 'bg-white' : 'bg-gray-100 text-gray-500'}`}>
                                                            {selectedUser.avatarUrl ? (
                                                                <img src={selectedUser.avatarUrl} alt={selectedUser.name} className="w-full h-full object-cover" />
                                                            ) : (
                                                                selectedUser.name.charAt(0)
                                                            )}
                                                        </div>
                                                        <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center">
                                                            <UploadCloud className="w-6 h-6 text-white" />
                                                        </div>
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                                            onChange={async (e) => {
                                                                const file = e.target.files?.[0];
                                                                if (!file) return;
                                                                try {
                                                                    const publicUrl = await storageApi.uploadFile('avatars', `user-${selectedUser.id}-${Date.now()}`, file);
                                                                    await systemUsersApi.update(selectedUser.id, { avatarUrl: publicUrl });

                                                                    // Update local state
                                                                    setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, avatarUrl: publicUrl } : u));
                                                                    toast.success('Avatar atualizado!');
                                                                } catch (err) {
                                                                    console.error(err);
                                                                    toast.error('Erro ao enviar imagem');
                                                                }
                                                            }}
                                                        />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-gray-900">{selectedUser.name}</h3>
                                                        <p className="text-sm text-gray-500">{selectedUser.email}</p>
                                                    </div>
                                                </div>
                                                <span className="px-2 py-1 bg-white border border-gray-200 rounded text-xs font-semibold uppercase text-gray-600">
                                                    {selectedUser.role === 'admin' ? 'Administrador' : selectedUser.role === 'professional' ? 'Profissional' : 'Secretária'}

                                                </span>
                                            </div>
                                            <div className="space-y-1">
                                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Permissões Individuais</h4>
                                                <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
                                                    {allPermissions.map(perm => {
                                                        const isActuallyChecked = Array.isArray(selectedUser.customPermissions)
                                                            ? selectedUser.customPermissions.includes(perm.key)
                                                            : (rolePermissions ? rolePermissions[selectedUser.role].includes(perm.key) : false);

                                                        return (
                                                            <label key={perm.key} className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50">
                                                                <span className="text-sm text-gray-700">{perm.label}</span>
                                                                <input
                                                                    type="checkbox"
                                                                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                                                    checked={isActuallyChecked}
                                                                    onChange={() => handleToggleUserPermission(selectedUser.id, perm.key)}
                                                                />
                                                            </label>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center text-gray-400 py-10">
                                            <UserCog className="w-12 h-12 mb-3 opacity-20" />
                                            <p>Selecione um usuário para editar permissões.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* --- VIEW: PLANS --- */}
                        {activeSection === 'plans' && (
                            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                                <div className="xl:col-span-1 space-y-4">
                                    <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                                        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                            <Tag className="w-5 h-5 text-blue-600" />
                                            Especialidades
                                        </h3>
                                        <p className="text-sm text-gray-500 mb-4">Cadastre as áreas de atuação da clínica.</p>

                                        <div className="flex gap-2 mb-4">
                                            <input
                                                type="text"
                                                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-900 placeholder:text-gray-400"
                                                placeholder="Nova especialidade..."
                                                value={newSpecialtyName}
                                                onChange={(e) => setNewSpecialtyName(e.target.value)}
                                            />
                                            <button
                                                onClick={handleAddSpecialty}
                                                disabled={!newSpecialtyName.trim()}
                                                className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                            >
                                                <Plus className="w-5 h-5" />
                                            </button>
                                        </div>

                                        <div className="space-y-2">
                                            {specialties.map(spec => (
                                                <div key={spec.id} className="flex justify-between items-center bg-white p-3 rounded border border-gray-200 shadow-sm group">
                                                    <span className="text-sm font-medium text-gray-700">{spec.name}</span>
                                                    <button
                                                        onClick={() => handleDeleteSpecialty(spec.id)}
                                                        className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="xl:col-span-2">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="font-bold text-gray-900">Planos e Pacotes Ativos</h3>
                                        <button
                                            onClick={() => handleOpenPlanModal()}
                                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm"
                                        >
                                            <Plus className="w-4 h-4" /> Novo Plano
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {plans.map(plan => {
                                            const planSpec = specialties.find(s => s.id === plan.specialtyId)?.name;
                                            return (
                                                <div key={plan.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-all group relative">
                                                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => handleOpenPlanModal(plan)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded">
                                                            <Edit3 className="w-4 h-4" />
                                                        </button>
                                                        <button onClick={() => handleDeletePlan(plan.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>

                                                    <div className="mb-2">
                                                        {planSpec && (
                                                            <span className="text-[10px] uppercase font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full mb-2 inline-block">
                                                                {planSpec}
                                                            </span>
                                                        )}
                                                        <h4 className="font-bold text-gray-900 text-lg">{plan.name}</h4>
                                                    </div>

                                                    <p className="text-sm text-gray-500 mb-4 h-10 line-clamp-2">{plan.description}</p>

                                                    <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                                                        <div className="text-center">
                                                            <p className="text-xs text-gray-400 uppercase font-bold">Sessões</p>
                                                            <p className="font-semibold text-gray-900">{plan.sessions}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-xs text-gray-400 uppercase font-bold">Valor</p>
                                                            <p className="font-bold text-lg text-gray-900">R$ {plan.price.toFixed(2)}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* --- LARGE MODAL FOR PLAN EDITING (Only relevant when in Plans view, but rendered at root for z-index) --- */}
            {isPlanModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={() => setIsPlanModalOpen(false)} />

                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl relative z-10 animate-fade-in flex flex-col max-h-[90vh] overflow-hidden">
                        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/50">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                    <FileText className="w-6 h-6 text-blue-600" />
                                    {editingPlan.id ? 'Editar Plano' : 'Novo Plano'}
                                </h2>
                                <p className="text-sm text-gray-500 mt-1">Configure os detalhes do pacote de sessões.</p>
                            </div>
                            <button onClick={() => setIsPlanModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-white rounded-full transition-all">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSavePlan} className="overflow-y-auto p-6 space-y-6">

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nome do Plano</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white text-gray-900 placeholder:text-gray-400 shadow-sm"
                                        placeholder="Ex: Reabilitação Completa 10 Sessões"
                                        value={editingPlan.name || ''}
                                        onChange={e => setEditingPlan({ ...editingPlan, name: e.target.value })}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Especialidade</label>
                                        <select
                                            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white text-gray-900 shadow-sm"
                                            value={editingPlan.specialtyId || ''}
                                            onChange={e => setEditingPlan({ ...editingPlan, specialtyId: e.target.value })}
                                        >
                                            <option value="">Selecione...</option>
                                            {specialties.map(spec => (
                                                <option key={spec.id} value={spec.id}>{spec.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-2 pt-6">
                                        <input
                                            type="checkbox"
                                            id="planActive"
                                            checked={editingPlan.active !== false}
                                            onChange={e => setEditingPlan({ ...editingPlan, active: e.target.checked })}
                                            className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                        />
                                        <label htmlFor="planActive" className="text-sm font-medium text-gray-700">Plano Ativo para Venda</label>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Quantidade de Sessões</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                min="1"
                                                required
                                                className="w-full pl-4 pr-12 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white text-gray-900 font-medium shadow-sm"
                                                value={editingPlan.sessions}
                                                onChange={e => setEditingPlan({ ...editingPlan, sessions: parseInt(e.target.value) })}
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">un</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Valor Total (R$)</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">R$</span>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                required
                                                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white text-gray-900 font-medium shadow-sm"
                                                value={editingPlan.price}
                                                onChange={e => setEditingPlan({ ...editingPlan, price: parseFloat(e.target.value) })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Descrição / Observações</label>
                                    <textarea
                                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white text-gray-900 min-h-[100px] shadow-sm resize-none"
                                        placeholder="Detalhes sobre o que o plano cobre..."
                                        value={editingPlan.description || ''}
                                        onChange={e => setEditingPlan({ ...editingPlan, description: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setIsPlanModalOpen(false)}
                                    className="px-6 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingPlan}
                                    className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {savingPlan ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Salvando...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-5 h-5" />
                                            Salvar Plano
                                        </>
                                    )}
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
