import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, Briefcase, Plus, MoreHorizontal, DollarSign, Calendar, Clock, Star, MapPin, ChevronRight, X, Save, Trash2, CheckCircle, AlertCircle, UserCog, FileText, UploadCloud } from 'lucide-react';
import { UnitId, Professional, Session, SystemUser, Specialty } from '../types';
import { professionalsApi, sessionsApi, unitsApi, systemUsersApi, specialtiesApi } from '../src/services/api';
import { storageApi } from '../src/services/storage-api';
import { paymentsApi } from '../src/services/financial-api';
import toast from 'react-hot-toast';
import { ConfirmModal } from './ConfirmModal';

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

    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        description: string;
        confirmLabel?: string;
        variant?: 'danger' | 'warning' | 'info';
        onConfirm: () => void;
    }>({
        isOpen: false,
        title: '',
        description: '',
        onConfirm: () => { }
    });

    // Initial Form State
    const [formData, setFormData] = useState({
        name: '',
        crf: '',
        specialty: '',
        hourlyRate: '',
        color: '#3B82F6',
        unitIds: [] as string[],
        avatarUrl: '',
        email: '',
        password: ''
    });

    useEffect(() => {
        loadData();
    }, [currentUnit]);

    async function loadData() {
        try {
            setLoading(true);
            const [profsData, unitData, sessionsData, usersData, specialtiesData] = await Promise.all([
                professionalsApi.getAll(),
                currentUnit === 'ALL' ? Promise.resolve({ name: 'Todas as Unidades', id: 'ALL' } as any) : unitsApi.getById(currentUnit),
                sessionsApi.getAll(currentUnit === 'ALL' ? {} : { unitId: currentUnit }),
                systemUsersApi.getAll(),
                specialtiesApi.getAll()
            ]);
            setProfessionalsList(profsData);
            setUnitName(unitData.name);
            setSessions(sessionsData);
            setSpecialties(specialtiesData.filter(s => s.active !== false));

            const secs = usersData.filter(u => u.role === 'secretary' && (currentUnit === 'ALL' || !u.unitId || u.unitId === currentUnit));
            setSecretaries(secs);

        } catch (error) {
            console.error('Error loading professionals data:', error);
        } finally {
            setLoading(false);
        }
    }

    const unitProfessionals = currentUnit === 'ALL' ? professionalsList : professionalsList.filter(p => p.unitIds.includes(currentUnit));

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
                avatarUrl: professional.avatarUrl || '',
                email: professional.email || '',
                password: ''
            });
        } else {
            setSelectedProfessional(null);
            setFormData({
                name: '',
                crf: '',
                specialty: '',
                hourlyRate: '',
                color: '#3B82F6',
                unitIds: [currentUnit === 'ALL' ? 'fisiostar-ararangua' : currentUnit],
                avatarUrl: '',
                email: '',
                password: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const professionalData = {
                ...formData,
                hourlyRate: parseFloat(formData.hourlyRate) || 0
            };

            if (selectedProfessional) {
                await professionalsApi.update(selectedProfessional.id, professionalData);
                toast.success('Profissional atualizado!');
            } else {
                await professionalsApi.create(professionalData);
                toast.success('Profissional cadastrado!');
            }
            setIsModalOpen(false);
            loadData();
        } catch (error) {
            console.error('Error saving professional:', error);
            toast.error('Erro ao salvar profissional');
        }
    };

    const handleDelete = (id: string) => {
        setConfirmModal({
            isOpen: true,
            title: 'Excluir Profissional',
            description: 'Tem certeza que deseja excluir este profissional da equipe? Esta ação não pode ser desfeita.',
            confirmLabel: 'Excluir Profissional',
            variant: 'danger',
            onConfirm: async () => {
                try {
                    await professionalsApi.delete(id);
                    setIsModalOpen(false);
                    toast.success('Profissional excluído com sucesso!');
                    loadData();
                } catch (error) {
                    console.error('Error deleting professional:', error);
                    toast.error('Erro ao excluir profissional');
                } finally {
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                }
            }
        });
    };

    const calculatePayroll = (professionalId: string) => {
        const profSessions = sessions.filter(s =>
            s.professionalId === professionalId &&
            s.status === 'Realizada'
        );

        const totalAmount = profSessions.reduce((sum) => {
            const prof = professionalsList.find(p => p.id === professionalId);
            return sum + (prof?.hourlyRate || 0);
        }, 0);

        return { count: profSessions.length, total: totalAmount };
    };

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
                toast.success(`${created} pagamento(s) gerado(s) com sucesso! Acesse Financeiro Geral para quitar.`);
            } else {
                toast.error('Nenhuma sessão realizada no período');
            }
        } catch (error) {
            console.error('Error generating payments:', error);
            toast.error('Erro ao gerar pagamentos');
        }
    };

    const [isSecretaryModalOpen, setIsSecretaryModalOpen] = useState(false);
    const [selectedSecretary, setSelectedSecretary] = useState<SystemUser | null>(null);
    const [secretaryFormData, setSecretaryFormData] = useState({
        name: '',
        email: '',
        unitId: '',
        password: '',
        role: 'secretary' as 'secretary' | 'admin' | 'financial'
    });
    const [availableUnits, setAvailableUnits] = useState<any[]>([]);

    useEffect(() => {
        unitsApi.getAll().then(setAvailableUnits).catch(console.error);
    }, []);

    const handleOpenSecretaryModal = (secretary?: SystemUser) => {
        if (secretary) {
            setSelectedSecretary(secretary);
            setSecretaryFormData({
                name: secretary.name,
                email: secretary.email,
                unitId: secretary.unitId || '',
                password: '',
                role: (secretary.role as any) || 'secretary'
            });
        } else {
            setSelectedSecretary(null);
            setSecretaryFormData({
                name: '',
                email: '',
                unitId: currentUnit === 'ALL' ? '' : currentUnit,
                password: '',
                role: 'secretary'
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
                    role: secretaryFormData.role as any
                });
                toast.success('Colaborador atualizado com sucesso!');
            } else {
                await systemUsersApi.create({
                    name: secretaryFormData.name,
                    email: secretaryFormData.email,
                    unitId: secretaryFormData.unitId,
                    role: secretaryFormData.role as any,
                    avatarUrl: ''
                });
                toast.success('Colaborador cadastrado com sucesso!');
            }
            setIsSecretaryModalOpen(false);
            loadData();
        } catch (error) {
            console.error('Error saving secretary:', error);
            toast.error('Erro ao salvar colaborador.');
        }
    };

    const handleSecretaryDelete = async (id: string, name: string) => {
        setConfirmModal({
            isOpen: true,
            title: 'Remover Secretária',
            description: `Tem certeza que deseja remover ${name} da equipe?`,
            confirmLabel: 'Remover Usuário',
            variant: 'danger',
            onConfirm: async () => {
                try {
                    await systemUsersApi.delete(id);
                    setIsSecretaryModalOpen(false);
                    toast.success('Usuário removido com sucesso!');
                    loadData();
                } catch (error) {
                    console.error('Error deleting secretary:', error);
                    toast.error('Erro ao remover usuário.');
                } finally {
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                }
            }
        });
    };

    const renderUnitBadge = (unitIds: string[] = []) => {
        if (!unitIds || unitIds.length === 0 || unitIds.includes('')) {
            return (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full shadow-2xs">
                    🌐 Ambas (Matriz & Filial)
                </span>
            );
        }
        if (unitIds.length > 1) {
            return (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full shadow-2xs">
                    🌐 Ambas (Matriz & Filial)
                </span>
            );
        }
        const unitId = unitIds[0];
        const foundUnit = availableUnits.find(u => u.id === unitId);
        const name = foundUnit?.name || unitId;
        if (name.toLowerCase().includes('matriz') || unitId === 'fisiostar-ararangua' || unitId.includes('440011')) {
            return (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full shadow-2xs">
                    🏬 Araranguá (Matriz)
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-0.5 rounded-full shadow-2xs">
                🏢 Arroio (Filial)
            </span>
        );
    };

    if (loading) {
        return <div className="flex justify-center p-8 text-gray-500">Carregando equipe...</div>;
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Equipe</h1>
                    <p className="text-gray-500 text-sm">Gestão de profissionais, secretárias e equipe da unidade {unitName}.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total de Membros</p>
                            <h3 className="text-2xl font-bold text-gray-900 mt-2">{unitProfessionals.length + secretaries.length}</h3>
                            <p className="text-xs text-gray-400 mt-1">{unitProfessionals.length} Técnicos, {secretaries.length} Admin/Secretaria</p>
                        </div>
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                            <Briefcase className="w-6 h-6" />
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Sessões Realizadas (Mês)</p>
                            <h3 className="text-2xl font-bold text-gray-900 mt-2">
                                {sessions.filter(s => s.status === 'Realizada').length}
                            </h3>
                            <p className="text-xs text-gray-400 mt-1">Horas totais de atendimento</p>
                        </div>
                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                            <Clock className="w-6 h-6" />
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Folha Variável Prevista</p>
                            <h3 className="text-2xl font-bold text-gray-900 mt-2">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                                    unitProfessionals.reduce((acc, p) => acc + calculatePayroll(p.id).total, 0)
                                )}
                            </h3>
                            <Link to="/financeiro" className="text-xs text-blue-600 font-bold hover:underline mt-1 inline-block">
                                Ver em Financeiro Geral →
                            </Link>
                        </div>
                        <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                            <DollarSign className="w-6 h-6" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="border-b border-gray-100 p-4 bg-gray-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2 text-sm">
                        <Briefcase className="w-4 h-4 text-blue-600" />
                        Equipe Técnica & Fisioterapeutas
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <Link
                            to="/financeiro"
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg transition-colors border border-blue-200"
                        >
                            <DollarSign className="w-3.5 h-3.5" />
                            Gerenciar Folha no Financeiro Geral
                        </Link>
                        <button
                            onClick={handleGeneratePayments}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
                        >
                            <FileText className="w-3.5 h-3.5" />
                            Gerar Pagamentos
                        </button>
                        <button
                            onClick={() => handleOpenModal()}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Novo Profissional
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 font-medium">Profissional</th>
                                <th className="px-6 py-4 font-medium">Especialidade</th>
                                <th className="px-6 py-4 font-medium">Unidade / Atendimento</th>
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
                                            {renderUnitBadge(prof.unitIds)}
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
                                    <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                                        Nenhum profissional técnico encontrado nesta unidade.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Administrative Team List */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="border-b border-gray-100 p-4 bg-gray-50/50 flex justify-between items-center">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2 text-sm">
                        <UserCog className="w-4 h-4 text-purple-600" />
                        Equipe Administrativa, Recepção & Gestão
                    </h3>
                    <button
                        onClick={() => handleOpenSecretaryModal()}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Novo Colaborador
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 font-medium">Nome</th>
                                <th className="px-6 py-4 font-medium">Função</th>
                                <th className="px-6 py-4 font-medium">Unidade</th>
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
                                            {sec.avatarUrl ? (
                                                <img src={sec.avatarUrl} alt={sec.name} className="w-10 h-10 rounded-full object-cover border border-gray-200 shadow-sm" />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold shadow-sm">
                                                    {sec.name.charAt(0)}
                                                </div>
                                            )}
                                            <div>
                                                <p className="font-medium text-gray-900">{sec.name}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600">
                                        {sec.role === 'admin' ? (
                                            <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full text-xs font-bold border border-blue-100">
                                                Gerente / Adm
                                            </span>
                                        ) : (sec.role as any) === 'financial' ? (
                                            <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full text-xs font-bold border border-emerald-100">
                                                Financeiro
                                            </span>
                                        ) : (
                                            <span className="bg-purple-50 text-purple-700 px-2.5 py-1 rounded-full text-xs font-bold border border-purple-100">
                                                Secretária
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-gray-600">
                                        {renderUnitBadge(sec.unitId ? [sec.unitId] : [])}
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
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                                        Nenhum colaborador encontrado nesta unidade.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Professional */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={() => setIsModalOpen(false)} />

                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col relative z-10 animate-fade-in overflow-hidden">
                        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-gray-50/70 shrink-0">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">{selectedProfessional ? 'Editar Profissional' : 'Novo Profissional'}</h2>
                                <p className="text-xs text-gray-500 mt-0.5">Cadastre as informações técnicas, credenciais do portal e unidades de atendimento.</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-white rounded-full transition-all">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Left Column: Avatar, Nome, Especialidade, CRF & Valor Hora */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4 p-3 bg-gray-50/80 rounded-xl border border-gray-100">
                                        <div className="relative group/avatar cursor-pointer shrink-0">
                                            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold shadow-sm overflow-hidden border-4 border-white ${formData.avatarUrl ? 'bg-white' : 'bg-blue-50 text-blue-600'}`} style={{ borderColor: formData.color }}>
                                                {formData.avatarUrl ? (
                                                    <img src={formData.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                                ) : (
                                                    (formData.name || '?').charAt(0)
                                                )}
                                            </div>
                                            <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center">
                                                <UploadCloud className="w-5 h-5 text-white" />
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
                                                        toast.success('Imagem da foto enviada com sucesso!');
                                                    } catch (err) {
                                                        console.error(err);
                                                        toast.error('Erro ao enviar imagem');
                                                    }
                                                }}
                                            />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-gray-800">Foto de Perfil</p>
                                            <p className="text-[11px] text-gray-500 mt-0.5">Clique para enviar imagem ou foto.</p>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Nome Completo *</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="Ex: Dra. Ana Silva"
                                            className="w-full px-3.5 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium transition-all"
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Especialidade Principal *</label>
                                        <select
                                            className="w-full px-3.5 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium bg-white transition-all cursor-pointer"
                                            value={formData.specialty}
                                            onChange={e => setFormData({ ...formData, specialty: e.target.value })}
                                        >
                                            <option value="">Selecione a especialidade...</option>
                                            {specialties.map(spec => (
                                                <option key={spec.id} value={spec.name}>{spec.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">CRF / Registro *</label>
                                            <input
                                                type="text"
                                                required
                                                placeholder="Ex: CREFITO 1234-F"
                                                className="w-full px-3.5 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium transition-all"
                                                value={formData.crf}
                                                onChange={e => setFormData({ ...formData, crf: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Valor Hora (R$) *</label>
                                            <input
                                                type="number"
                                                required
                                                placeholder="150"
                                                className="w-full px-3.5 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium transition-all"
                                                value={formData.hourlyRate}
                                                onChange={e => setFormData({ ...formData, hourlyRate: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column: Portal Login, Password, Calendar Color & Units */}
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Email (Login do Portal)</label>
                                        <input
                                            type="email"
                                            placeholder="Ex: profissional@fisiostar.com"
                                            className="w-full px-3.5 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium transition-all"
                                            value={formData.email}
                                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                            {selectedProfessional ? 'Nova Senha (Opcional)' : 'Senha de Acesso'}
                                        </label>
                                        <input
                                            type="password"
                                            placeholder={selectedProfessional ? 'Preencha apenas para redefinir' : 'Defina a senha (Padrão: 123456)'}
                                            className="w-full px-3.5 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium transition-all"
                                            value={formData.password}
                                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Cor no Calendário</label>
                                        <div className="flex flex-wrap gap-2 p-2 bg-gray-50 rounded-xl border border-gray-100">
                                            {['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6366F1'].map(color => (
                                                <button
                                                    key={color}
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, color })}
                                                    className={`w-7 h-7 rounded-full border-2 transition-all ${formData.color === color ? 'border-gray-900 scale-110 shadow-sm' : 'border-transparent hover:scale-105 opacity-80 hover:opacity-100'}`}
                                                    style={{ backgroundColor: color }}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Unidades de Atendimento *</label>
                                        <div className="space-y-2 border border-gray-200 rounded-xl p-3 bg-gray-50/50">
                                            {availableUnits.map(unit => (
                                                <label key={unit.id} className="flex items-center gap-2.5 cursor-pointer hover:bg-white p-2 rounded-lg border border-transparent hover:border-gray-200 transition-all">
                                                    <input
                                                        type="checkbox"
                                                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                        checked={formData.unitIds.includes(unit.id)}
                                                        onChange={e => {
                                                            const newUnitIds = e.target.checked
                                                                ? [...formData.unitIds, unit.id]
                                                                : formData.unitIds.filter(id => id !== unit.id);
                                                            setFormData({ ...formData, unitIds: newUnitIds });
                                                        }}
                                                    />
                                                    <span className="text-xs font-semibold text-gray-800">{unit.name}</span>
                                                </label>
                                            ))}
                                        </div>
                                        <p className="text-[11px] text-gray-500 mt-1">Selecione as unidades onde este profissional estará disponível na agenda.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 flex justify-between items-center border-t border-gray-100 shrink-0">
                                <div>
                                    {selectedProfessional && (
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(selectedProfessional.id)}
                                            className="text-red-600 hover:text-red-700 text-xs font-bold flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            Excluir Profissional
                                        </button>
                                    )}
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors text-xs font-bold"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-600/20 transition-all text-xs font-bold flex items-center gap-2"
                                    >
                                        <Save className="w-4 h-4" />
                                        Salvar Profissional
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Secretary / Colaborador */}
            {isSecretaryModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={() => setIsSecretaryModalOpen(false)} />

                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl relative z-10 animate-fade-in overflow-hidden">
                        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-gray-50/70">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">{selectedSecretary ? 'Editar Colaborador' : 'Novo Colaborador'}</h2>
                                <p className="text-xs text-gray-500 mt-0.5">Cadastre ou edite dados de secretárias, gerentes e equipe financeira.</p>
                            </div>
                            <button onClick={() => setIsSecretaryModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-white rounded-full transition-all">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSecretarySubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Nome Completo *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ex: Nairelle Secretaria"
                                    className="w-full px-3.5 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-sm font-medium transition-all"
                                    value={secretaryFormData.name}
                                    onChange={e => setSecretaryFormData({ ...secretaryFormData, name: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Função / Cargo *</label>
                                <select
                                    className="w-full px-3.5 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-sm font-medium bg-white transition-all cursor-pointer"
                                    value={secretaryFormData.role}
                                    onChange={e => setSecretaryFormData({ ...secretaryFormData, role: e.target.value as any })}
                                >
                                    <option value="secretary">Secretária / Recepção</option>
                                    <option value="admin">Gerente / Administração</option>
                                    <option value="financial">Financeiro / Contabilidade</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Email (Login) *</label>
                                <input
                                    type="email"
                                    required
                                    placeholder="Ex: colaborador@fisiostar.com"
                                    className="w-full px-3.5 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-sm font-medium transition-all"
                                    value={secretaryFormData.email}
                                    onChange={e => setSecretaryFormData({ ...secretaryFormData, email: e.target.value })}
                                />
                                <p className="text-[11px] text-gray-500 mt-1">Utilizado para acesso e login no sistema FisioStar.</p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                    {selectedSecretary ? 'Nova Senha (Opcional)' : 'Senha de Acesso'}
                                </label>
                                <input
                                    type="password"
                                    placeholder={selectedSecretary ? 'Preencha apenas para redefinir a senha' : 'Defina a senha de acesso (Padrão: 123456)'}
                                    className="w-full px-3.5 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-sm font-medium transition-all"
                                    value={secretaryFormData.password}
                                    onChange={e => setSecretaryFormData({ ...secretaryFormData, password: e.target.value })}
                                />
                                <p className="text-[11px] text-gray-500 mt-1">
                                    {selectedSecretary ? 'Deixe em branco se desejar manter a senha atual.' : 'Se deixar em branco, a senha inicial será 123456.'}
                                </p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Unidade de Atendimento *</label>
                                <select
                                    className="w-full px-3.5 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-sm font-medium bg-white transition-all cursor-pointer"
                                    value={secretaryFormData.unitId}
                                    onChange={e => setSecretaryFormData({ ...secretaryFormData, unitId: e.target.value })}
                                >
                                    <option value="">🌐 Ambas as Unidades (Matriz & Filial)</option>
                                    {availableUnits.map(unit => (
                                        <option key={unit.id} value={unit.id}>{unit.name}</option>
                                    ))}
                                </select>
                                <p className="text-[11px] text-gray-500 mt-1">Selecione uma unidade específica ou "Ambas as Unidades" para acesso em todas as filiais.</p>
                            </div>

                            <div className="pt-4 flex justify-between items-center border-t border-gray-100">
                                <div>
                                    {selectedSecretary && (
                                        <button
                                            type="button"
                                            onClick={() => handleSecretaryDelete(selectedSecretary.id, selectedSecretary.name)}
                                            className="text-red-600 hover:text-red-700 text-xs font-bold flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            Remover da Equipe
                                        </button>
                                    )}
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsSecretaryModalOpen(false)}
                                        className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors text-xs font-bold"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-md shadow-purple-600/20 transition-all text-xs font-bold flex items-center gap-2"
                                    >
                                        <Save className="w-4 h-4" />
                                        Salvar Colaborador
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                description={confirmModal.description}
                confirmLabel={confirmModal.confirmLabel}
                variant={confirmModal.variant}
            />
        </div>
    );
};

export default Professionals;
