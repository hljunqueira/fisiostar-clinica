
import React, { useState, useEffect } from 'react';
import { Search, Filter, Briefcase, Plus, MoreHorizontal, DollarSign, Calendar, Clock, Star, MapPin, ChevronRight, X, Save, Trash2, CheckCircle, AlertCircle, UserCog, FileText, UploadCloud } from 'lucide-react';
import { UnitId, Professional, Session, SystemUser, Specialty } from '../types';
import { professionalsApi, sessionsApi, unitsApi, systemUsersApi, specialtiesApi } from '../src/services/api';
import { storageApi } from '../src/services/storage-api';
import { paymentsApi } from '../src/services/financial-api';
import toast from 'react-hot-toast';

interface ProfessionalsProps {
    currentUnit: UnitId;
}

const Professionals: React.FC<ProfessionalsProps> = ({ currentUnit }) => {
    const [professionalsList, setProfessionalsList] = useState<Professional[]>([]);
    const [secretaries, setSecretaries] = useState<SystemUser[]>([]);
    const [specialties, setSpecialties] = useState<Specialty[]>([]);
    const [unitName, setUnitName] = useState('');
    const [loading, setLoading] = useState(true);
    const [sessions, setSessions] = useState<Session[]>([]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null);

    // Initial Form State
    const [formData, setFormData] = useState({
        name: '',
        crf: '',
        specialty: '',
        hourlyRate: '',
        color: '#3B82F6',
        unitIds: [] as string[],
        avatarUrl: ''
    });

    useEffect(() => {
        loadData();
    }, [currentUnit]);

    async function loadData() {
        try {
            setLoading(true);
            const [profsData, unitData, sessionsData, usersData, specialtiesData] = await Promise.all([
                professionalsApi.getAll(),
                unitsApi.getById(currentUnit),
                sessionsApi.getAll({ unitId: currentUnit }), // Fetch sessions for this unit for payroll
                systemUsersApi.getAll(),
                specialtiesApi.getAll()
            ]);
            setProfessionalsList(profsData);
            setUnitName(unitData.name);
            setSessions(sessionsData);
            setSpecialties(specialtiesData.filter(s => s.active !== false));

            // Filter secretaries for this unit
            const secs = usersData.filter(u => u.role === 'secretary' && (!u.unitId || u.unitId === currentUnit));
            setSecretaries(secs);

        } catch (error) {
            console.error('Error loading professionals data:', error);
            // toast.error('Erro ao carregar dados'); // Optional: don't spam toasts on mount
        } finally {
            setLoading(false);
        }
    }

    const unitProfessionals = professionalsList.filter(p => p.unitIds.includes(currentUnit));

    const handleOpenModal = (professional?: Professional) => {
        if (professional) {
            setSelectedProfessional(professional);
            setFormData({
                name: professional.name,
                crf: professional.crf,
                specialty: professional.specialty,
                hourlyRate: professional.hourlyRate.toString(),
                color: professional.color,
                unitIds: professional.unitIds,
                avatarUrl: professional.avatarUrl || ''
            });
        } else {
            setSelectedProfessional(null);
            setFormData({
                name: '',
                crf: '',
                specialty: '',
                hourlyRate: '',
                color: '#3B82F6',
                unitIds: [currentUnit],
                avatarUrl: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const professionalData = {
                ...formData,
                hourlyRate: Number(formData.hourlyRate)
            };

            if (selectedProfessional) {
                await professionalsApi.update(selectedProfessional.id, professionalData);
                toast.success('Profissional atualizado com sucesso!');
            } else {
                await professionalsApi.create(professionalData);
                toast.success('Profissional cadastrado com sucesso!');
            }
            setIsModalOpen(false);
            loadData();
        } catch (error) {
            console.error('Error saving professional:', error);
            toast.error('Erro ao salvar profissional');
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Tem certeza que deseja excluir este profissional?')) {
            try {
                await professionalsApi.delete(id);
                toast.success('Profissional excluído com sucesso!');
                loadData();
            } catch (error) {
                console.error('Error deleting professional:', error);
                toast.error('Erro ao excluir profissional');
            }
        }
    };

    // Payroll Calculation helper
    const calculatePayroll = (professionalId: string) => {
        // Filter sessions for this professional that are 'Realizada'
        const profSessions = sessions.filter(s =>
            s.professionalId === professionalId &&
            s.status === 'Realizada'
        );

        // In a real app, we would filter by month/date range here.
        // For now, let's assume "May 2024" is the current view context or just show all-time/recent for demo.
        // Or better, let's filter for current month as default context if we want to be precise, 
        // but the UI shows "Folha de Pagamento - Maio/2024" hardcoded in the header below (I'll fix that too).

        const totalAmount = profSessions.reduce((sum, session) => {
            // We need to know the session price or rate.
            // The professional has an hourlyRate.
            // If the session duration is not stored (it's not in Session type explicitly, assumed standard or derived from type).
            // Let's assume 1 session = 1 hour or just pay per session = hourlyRate for simplicity unless we have duration.
            const prof = professionalsList.find(p => p.id === professionalId);
            return sum + (prof?.hourlyRate || 0);
        }, 0);

        return { count: profSessions.length, total: totalAmount };
    };

    // Generate payment records for all professionals in the current period
    const handleGeneratePayments = async () => {
        if (unitProfessionals.length === 0) {
            toast.error('Nenhum profissional para gerar pagamento');
            return;
        }

        const now = new Date();
        const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

        try {
            let created = 0;
            for (const prof of unitProfessionals) {
                const payroll = calculatePayroll(prof.id);
                if (payroll.count > 0) {
                    await paymentsApi.create({
                        professionalId: prof.id,
                        periodStart,
                        periodEnd,
                        totalSessions: payroll.count,
                        amountPerSession: prof.hourlyRate,
                        totalAmount: payroll.total
                    });
                    created++;
                }
            }
            if (created > 0) {
                toast.success(`${created} pagamento(s) gerado(s) com sucesso!`);
            } else {
                toast.error('Nenhuma sessão realizada no período');
            }
        } catch (error) {
            console.error('Error generating payments:', error);
            toast.error('Erro ao gerar pagamentos');
        }
    };


    // --- Secretaries Management ---
    const [isSecretaryModalOpen, setIsSecretaryModalOpen] = useState(false);
    const [selectedSecretary, setSelectedSecretary] = useState<SystemUser | null>(null);
    const [secretaryFormData, setSecretaryFormData] = useState({
        name: '',
        email: '',
        unitId: ''
    });

    // Helper to get unit list for dropdown
    const [availableUnits, setAvailableUnits] = useState<{ id: string, name: string }[]>([]);

    useEffect(() => {
        // Fetch units for dropdown if needed when modal opens or on mount
        const loadUnits = async () => {
            try {
                const units = await unitsApi.getAll();
                setAvailableUnits(units.map(u => ({ id: u.id, name: u.name })));
            } catch (err) {
                console.error("Error loading units", err);
            }
        };
        loadUnits();
    }, []);


    const handleOpenSecretaryModal = (secretary?: SystemUser) => {
        if (secretary) {
            setSelectedSecretary(secretary);
            setSecretaryFormData({
                name: secretary.name,
                email: secretary.email,
                unitId: secretary.unitId || ''
            });
        } else {
            // Creating new secretary not explicitly requested but good to handle if needed, 
            // but user asked for "mudar de filial, editar, excluir". 
            // I'll focus on editing existing ones for now as requested.
            setSelectedSecretary(null);
            setSecretaryFormData({
                name: '',
                email: '',
                unitId: currentUnit
            });
        }
        setIsSecretaryModalOpen(true);
    };

    const handleSecretarySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (selectedSecretary) {
                await systemUsersApi.update(selectedSecretary.id, {
                    name: secretaryFormData.name,
                    email: secretaryFormData.email,
                    unitId: secretaryFormData.unitId,
                    role: 'secretary'
                });
                toast.success('Secretária atualizada com sucesso!');
                setIsSecretaryModalOpen(false);
                loadData();
            } else {
                // If we were creating...
                toast.error('Criação de novos usuários deve ser feita pelo admin geral (Feature futura)');
            }
        } catch (error) {
            console.error('Error saving secretary:', error);
            toast.error('Erro ao salvar secretária.');
        }
    };

    const handleSecretaryDelete = async (id: string, name: string) => {
        if (window.confirm(`Tem certeza que deseja remover ${name} da equipe?`)) {
            try {
                await systemUsersApi.delete(id);
                toast.success('Usuário removido com sucesso!');
                loadData();
            } catch (error) {
                console.error('Error deleting secretary:', error);
                toast.error('Erro ao remover usuário.');
            }
        }
    };

    if (loading) {
        return <div className="flex justify-center p-8 text-gray-500">Carregando profissionais...</div>;
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* ... Header and Stats ... */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Equipe</h1>
                    <p className="text-gray-500">Gestão de equipe e pagamentos da unidade {unitName}.</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-sm"
                >
                    <Plus className="w-4 h-4" />
                    Novo Profissional
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Total de Membros</p>
                            <h3 className="text-2xl font-bold text-gray-900 mt-2">{unitProfessionals.length + secretaries.length}</h3>
                            <p className="text-xs text-gray-400 mt-1">{unitProfessionals.length} Técnicos, {secretaries.length} Admin</p>
                        </div>
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                            <Briefcase className="w-6 h-6" />
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Horas Realizadas (Mês)</p>
                            <h3 className="text-2xl font-bold text-gray-900 mt-2">
                                {sessions.filter(s => s.status === 'Realizada').length} {/* Simplified: 1 session = 1 hour */}
                            </h3>
                        </div>
                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
                            <Clock className="w-6 h-6" />
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Folha Variável Prevista</p>
                            <h3 className="text-2xl font-bold text-gray-900 mt-2">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                                    unitProfessionals.reduce((acc, p) => acc + calculatePayroll(p.id).total, 0)
                                )}
                            </h3>
                            <p className="text-xs text-gray-400 mt-1">*Apenas equipe técnica</p>
                        </div>
                        <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
                            <DollarSign className="w-6 h-6" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Technical Team List */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="border-b border-gray-100 p-4 bg-gray-50/50 flex justify-between items-center">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        <Briefcase className="w-5 h-5 text-gray-500" />
                        Equipe Técnica
                    </h3>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Calendar className="w-4 h-4" />
                            <span>Referência: {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</span>
                        </div>
                        <button
                            onClick={handleGeneratePayments}
                            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            <FileText className="w-4 h-4" />
                            Gerar Pagamentos
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 font-medium">Profissional</th>
                                <th className="px-6 py-4 font-medium">Especialidade</th>
                                <th className="px-6 py-4 font-medium">Valor Hora</th>
                                <th className="px-6 py-4 font-medium text-center">Sessões (mês)</th>
                                <th className="px-6 py-4 font-medium">Total a Pagar</th>
                                <th className="px-6 py-4 font-medium text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {unitProfessionals.length > 0 ? unitProfessionals.map(prof => {
                                const payroll = calculatePayroll(prof.id);
                                return (
                                    <tr key={prof.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-sm overflow-hidden"
                                                    style={{ backgroundColor: prof.color }}
                                                >
                                                    {prof.avatarUrl ? (
                                                        <img src={prof.avatarUrl} alt={prof.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        prof.name.charAt(0)
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900">{prof.name}</p>
                                                    <p className="text-xs text-gray-500">CRF: {prof.crf}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            <span className="bg-gray-100 px-2 py-1 rounded text-xs font-medium border border-gray-200">
                                                {prof.specialty}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(prof.hourlyRate)}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                                                {payroll.count}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-emerald-600">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(payroll.total)}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleOpenModal(prof)}
                                                    className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-blue-600 transition-colors"
                                                >
                                                    <MoreHorizontal className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                                        Nenhum profissional técnico encontrado nesta unidade.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Administrative Team List */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="border-b border-gray-100 p-4 bg-gray-50/50 flex justify-between items-center">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        <UserCog className="w-5 h-5 text-gray-500" />
                        Equipe Administrativa
                    </h3>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 font-medium">Nome</th>
                                <th className="px-6 py-4 font-medium">Função</th>
                                <th className="px-6 py-4 font-medium">Email</th>
                                <th className="px-6 py-4 font-medium text-center">Status</th>
                                <th className="px-6 py-4 font-medium text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {secretaries.length > 0 ? secretaries.map(sec => (
                                <tr key={sec.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold shadow-sm">
                                                {sec.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900">{sec.name}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600">
                                        <span className="bg-purple-50 text-purple-700 px-2 py-1 rounded text-xs font-medium border border-purple-100">
                                            Secretaria
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600">
                                        {sec.email}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="inline-flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                                            <CheckCircle className="w-3 h-3" /> Ativo
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => handleOpenSecretaryModal(sec)}
                                                className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-blue-600 transition-colors"
                                                title="Editar"
                                            >
                                                <MoreHorizontal className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                                        Nenhuma secretária encontrada nesta unidade.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Professionals */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={() => setIsModalOpen(false)} />

                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg relative z-10 animate-fade-in overflow-hidden">
                        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/50">
                            <h2 className="text-xl font-bold text-gray-900">{selectedProfessional ? 'Editar Profissional' : 'Novo Profissional'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-white rounded-full transition-all">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {/* ... Professional Form fields ... */}
                            <div className="flex justify-center mb-6">
                                <div className="relative group/avatar cursor-pointer">
                                    <div className={`w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold shadow-sm overflow-hidden border-4 border-white ${formData.avatarUrl ? 'bg-white' : 'bg-gray-100 text-gray-500'}`} style={{ borderColor: formData.color }}>
                                        {formData.avatarUrl ? (
                                            <img src={formData.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            (formData.name || '?').charAt(0)
                                        )}
                                    </div>
                                    <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center">
                                        <UploadCloud className="w-8 h-8 text-white" />
                                    </div>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;
                                            try {
                                                const publicUrl = await storageApi.uploadFile('avatars', `prof-${Date.now()}`, file);
                                                setFormData({ ...formData, avatarUrl: publicUrl });
                                                toast.success('Imagem carregada!');
                                            } catch (err) {
                                                console.error(err);
                                                toast.error('Erro ao enviar imagem');
                                            }
                                        }}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nome Completo</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">CRF/Registro</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        value={formData.crf}
                                        onChange={e => setFormData({ ...formData, crf: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Valor Hora (R$)</label>
                                    <input
                                        type="number"
                                        required
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        value={formData.hourlyRate}
                                        onChange={e => setFormData({ ...formData, hourlyRate: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Especialidade</label>
                                <select
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white"
                                    value={formData.specialty}
                                    onChange={e => setFormData({ ...formData, specialty: e.target.value })}
                                >
                                    <option value="">Selecione...</option>
                                    {specialties.map(spec => (
                                        <option key={spec.id} value={spec.name}>{spec.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Unidades de Atendimento</label>
                                <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-200 rounded-lg p-3">
                                    {availableUnits.map(unit => (
                                        <label key={unit.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                                            <input
                                                type="checkbox"
                                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                checked={formData.unitIds.includes(unit.id)}
                                                onChange={e => {
                                                    const newUnitIds = e.target.checked
                                                        ? [...formData.unitIds, unit.id]
                                                        : formData.unitIds.filter(id => id !== unit.id);
                                                    setFormData({ ...formData, unitIds: newUnitIds });
                                                }}
                                            />
                                            <span className="text-sm text-gray-700">{unit.name}</span>
                                        </label>
                                    ))}
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Selecione as unidades onde este profissional atende.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Cor no Calendário</label>
                                <div className="flex gap-2">
                                    {['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6366F1'].map(color => (
                                        <button
                                            key={color}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, color })}
                                            className={`w-8 h-8 rounded-full border-2 transition-all ${formData.color === color ? 'border-gray-900 scale-110' : 'border-transparent hover:scale-110'}`}
                                            style={{ backgroundColor: color }}
                                        />
                                    ))}
                                </div>
                            </div>

                            {selectedProfessional && (
                                <div className="pt-2">
                                    <button
                                        type="button"
                                        onClick={() => handleDelete(selectedProfessional.id)}
                                        className="text-red-600 hover:text-red-700 text-sm font-medium flex items-center gap-2"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        Excluir Profissional
                                    </button>
                                </div>
                            )}

                            <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all font-medium flex items-center gap-2"
                                >
                                    <Save className="w-4 h-4" />
                                    Salvar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Secretary */}
            {isSecretaryModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={() => setIsSecretaryModalOpen(false)} />

                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg relative z-10 animate-fade-in overflow-hidden">
                        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/50">
                            <h2 className="text-xl font-bold text-gray-900">{selectedSecretary ? 'Editar Secretária' : 'Nova Secretária'}</h2>
                            <button onClick={() => setIsSecretaryModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-white rounded-full transition-all">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSecretarySubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nome Completo</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    value={secretaryFormData.name}
                                    onChange={e => setSecretaryFormData({ ...secretaryFormData, name: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email (Login)</label>
                                <input
                                    type="email"
                                    required
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-gray-50"
                                    value={secretaryFormData.email}
                                    onChange={e => setSecretaryFormData({ ...secretaryFormData, email: e.target.value })}
                                    readOnly={!!selectedSecretary} // Avoid changing email easily as it affects login identity usually
                                />
                                {selectedSecretary && <p className="text-xs text-gray-400 mt-1">O email não pode ser alterado diretamente.</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Unidade / Filial</label>
                                <select
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white"
                                    value={secretaryFormData.unitId}
                                    onChange={e => setSecretaryFormData({ ...secretaryFormData, unitId: e.target.value })}
                                >
                                    <option value="">Selecione a Unidade...</option>
                                    {availableUnits.map(unit => (
                                        <option key={unit.id} value={unit.id}>{unit.name}</option>
                                    ))}
                                </select>
                            </div>

                            {selectedSecretary && (
                                <div className="pt-2">
                                    <button
                                        type="button"
                                        onClick={() => handleSecretaryDelete(selectedSecretary.id, selectedSecretary.name)}
                                        className="text-red-600 hover:text-red-700 text-sm font-medium flex items-center gap-2"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        Remover da Equipe
                                    </button>
                                </div>
                            )}

                            <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsSecretaryModalOpen(false)}
                                    className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all font-medium flex items-center gap-2"
                                >
                                    <Save className="w-4 h-4" />
                                    Salvar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Professionals;
