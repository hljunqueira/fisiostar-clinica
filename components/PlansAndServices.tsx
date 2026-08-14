import React, { useState, useEffect } from 'react';
import { Tag, Plus, X, Edit3, Trash2, Save, CreditCard } from 'lucide-react';
import { PlanTemplate, Specialty } from '../src/types';
import { planTemplatesApi, specialtiesApi, auditLogsApi } from '../src/services/api';
import { toast } from 'react-hot-toast';
import { ConfirmModal } from './ConfirmModal';

const PlansAndServices: React.FC = () => {
    const [plans, setPlans] = useState<PlanTemplate[]>([]);
    const [specialties, setSpecialties] = useState<Specialty[]>([]);
    const [loading, setLoading] = useState(true);

    const [newSpecialtyName, setNewSpecialtyName] = useState('');
    const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState<Partial<PlanTemplate>>({});
    const [savingPlan, setSavingPlan] = useState(false);

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
        loadData();
    }, []);

    async function loadData() {
        try {
            setLoading(true);
            const [plansData, specsData] = await Promise.all([
                planTemplatesApi.getAll(),
                specialtiesApi.getAll()
            ]);
            setPlans(plansData);
            setSpecialties(specsData);
        } catch (error) {
            console.error('Error loading plans and specialties:', error);
            toast.error('Erro ao carregar serviços e planos');
        } finally {
            setLoading(false);
        }
    }

    const handleAddSpecialty = async () => {
        if (!newSpecialtyName.trim()) return;
        try {
            const newSpec = await specialtiesApi.create(newSpecialtyName.trim());
            setSpecialties([...specialties, newSpec]);
            setNewSpecialtyName('');
            toast.success('Especialidade adicionada');

            await auditLogsApi.logAction({
                userName: 'Colaborador',
                userRole: 'secretary',
                category: 'plans',
                action: 'Especialidade Adicionada',
                details: `Cadastrou a especialidade ${newSpec.name}.`
            });
        } catch (error) {
            console.error('Error adding specialty:', error);
            toast.error('Erro ao adicionar especialidade');
        }
    };

    const handleDeleteSpecialty = (id: string) => {
        const spec = specialties.find(s => s.id === id);
        setConfirmModal({
            isOpen: true,
            title: 'Remover Especialidade',
            description: 'Tem certeza que deseja remover esta especialidade?',
            onConfirm: async () => {
                try {
                    await specialtiesApi.delete(id);
                    setSpecialties(specialties.filter(s => s.id !== id));
                    toast.success('Especialidade removida');

                    await auditLogsApi.logAction({
                        userName: 'Colaborador',
                        userRole: 'secretary',
                        category: 'plans',
                        action: 'Especialidade Excluída',
                        details: `Excluiu a especialidade ${spec?.name || id}.`
                    });
                } catch (error) {
                    console.error('Error deleting specialty:', error);
                    toast.error('Erro ao remover especialidade');
                }
            }
        });
    };

    const handleOpenPlanModal = (plan?: PlanTemplate) => {
        if (plan) {
            setEditingPlan(plan);
        } else {
            setEditingPlan({
                name: '',
                sessions: 10,
                price: 0,
                description: '',
                active: true,
                specialtyId: specialties[0]?.id || ''
            });
        }
        setIsPlanModalOpen(true);
    };

    const handleSavePlan = async (e: React.FormEvent) => {
        e.preventDefault();
        setSavingPlan(true);

        try {
            if (editingPlan.id) {
                const updated = await planTemplatesApi.update(editingPlan.id, editingPlan);
                setPlans(plans.map(p => p.id === updated.id ? updated : p));
                toast.success('Plano atualizado');

                await auditLogsApi.logAction({
                    userName: 'Colaborador',
                    userRole: 'secretary',
                    category: 'plans',
                    action: 'Plano Editado',
                    details: `Atualizou as configurações do plano ${updated.name}.`
                });
            } else {
                if (!editingPlan.name || !editingPlan.sessions || editingPlan.price === undefined) {
                    setSavingPlan(false);
                    return;
                }

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

                await auditLogsApi.logAction({
                    userName: 'Colaborador',
                    userRole: 'secretary',
                    category: 'plans',
                    action: 'Novo Plano Criado',
                    details: `Cadastrou o plano ${newPlan.name} com ${newPlan.sessions} sessões por R$ ${newPlan.price.toFixed(2)}.`
                });
            }
            setIsPlanModalOpen(false);
        } catch (error) {
            console.error(error);
            toast.error('Erro ao salvar plano');
        } finally {
            setSavingPlan(false);
        }
    };

    const handleDeletePlan = (id: string) => {
        const plan = plans.find(p => p.id === id);
        setConfirmModal({
            isOpen: true,
            title: 'Remover Plano',
            description: 'Tem certeza que deseja remover este plano? Esta ação não pode ser desfeita.',
            onConfirm: async () => {
                try {
                    await planTemplatesApi.delete(id);
                    setPlans(plans.filter(p => p.id !== id));
                    toast.success('Plano removido');

                    await auditLogsApi.logAction({
                        userName: 'Colaborador',
                        userRole: 'secretary',
                        category: 'plans',
                        action: 'Plano Excluído',
                        details: `Excluiu o pacote de plano ${plan?.name || id}.`
                    });
                } catch (error) {
                    console.error('Error deleting plan:', error);
                    toast.error('Erro ao remover plano');
                }
            }
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                        <CreditCard className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Serviços e Planos</h1>
                        <p className="text-sm text-gray-500 mt-0.5">Gerencie os pacotes de atendimento e especialidades oferecidas na clínica.</p>
                    </div>
                </div>

                <button
                    onClick={() => handleOpenPlanModal()}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer self-start sm:self-auto"
                >
                    <Plus className="w-4 h-4" /> Novo Plano
                </button>
            </div>

            {/* Grid Content */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Left Side: Specialties */}
                <div className="xl:col-span-1 space-y-4">
                    <div className="bg-white rounded-2xl p-6 border border-gray-200/80 shadow-sm">
                        <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2 text-base">
                            <Tag className="w-5 h-5 text-blue-600" />
                            Especialidades
                        </h3>
                        <p className="text-xs text-gray-500 mb-4">Cadastre as áreas de atuação clínica (Ex: Traumato-Ortopedia, Pilates, RPG).</p>

                        <div className="flex gap-2 mb-4">
                            <input
                                type="text"
                                className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium bg-white text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Nova especialidade..."
                                value={newSpecialtyName}
                                onChange={(e) => setNewSpecialtyName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddSpecialty()}
                            />
                            <button
                                onClick={handleAddSpecialty}
                                disabled={!newSpecialtyName.trim()}
                                className="bg-blue-600 text-white px-3 py-2 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors cursor-pointer"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                            {specialties.map(spec => (
                                <div key={spec.id} className="flex justify-between items-center bg-gray-50/70 p-3 rounded-xl border border-gray-100 shadow-2xs group hover:bg-white hover:border-gray-200 transition-all">
                                    <span className="text-xs font-semibold text-gray-800">{spec.name}</span>
                                    <button
                                        onClick={() => handleDeleteSpecialty(spec.id)}
                                        className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                        title="Excluir especialidade"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                            {specialties.length === 0 && (
                                <p className="text-xs text-gray-400 text-center py-4">Nenhuma especialidade cadastrada.</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Side: Plans Cards */}
                <div className="xl:col-span-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {plans.map(plan => {
                            const planSpec = specialties.find(s => s.id === plan.specialtyId)?.name;
                            return (
                                <div key={plan.id} className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group relative flex flex-col justify-between">
                                    <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-xs p-1 rounded-lg border border-gray-100 shadow-xs">
                                        <button onClick={() => handleOpenPlanModal(plan)} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Editar plano">
                                            <Edit3 className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleDeletePlan(plan.id)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Excluir plano">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <div>
                                        {planSpec && (
                                            <span className="text-[10px] uppercase font-bold text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-full mb-2 inline-block">
                                                {planSpec}
                                            </span>
                                        )}
                                        <h4 className="font-bold text-gray-900 text-base">{plan.name}</h4>
                                        <p className="text-xs text-gray-500 mt-1 line-clamp-2 min-h-[32px]">{plan.description || 'Sem descrição cadastrada.'}</p>
                                    </div>

                                    <div className="flex items-center justify-between border-t border-gray-100 pt-3 mt-4">
                                        <div>
                                            <p className="text-[10px] text-gray-400 uppercase font-bold">Sessões</p>
                                            <p className="font-bold text-sm text-gray-800">{plan.sessions} sessões</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] text-gray-400 uppercase font-bold">Valor do Pacote</p>
                                            <p className="font-bold text-lg text-emerald-600">R$ {plan.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {plans.length === 0 && (
                            <div className="col-span-2 bg-white rounded-2xl p-12 text-center border border-gray-200/80">
                                <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                <p className="text-sm font-bold text-gray-700">Nenhum plano cadastrado</p>
                                <p className="text-xs text-gray-400 mt-1 mb-4">Clique no botão abaixo para criar o primeiro plano de atendimento.</p>
                                <button
                                    onClick={() => handleOpenPlanModal()}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow-sm"
                                >
                                    <Plus className="w-4 h-4" /> Criar Primeiro Plano
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal for Plan Editing / Creating */}
            {isPlanModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity" onClick={() => setIsPlanModalOpen(false)} />

                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl relative z-10 animate-fade-in flex flex-col max-h-[90vh] overflow-hidden">
                        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/50">
                            <h3 className="font-bold text-gray-900 text-lg">
                                {editingPlan.id ? 'Editar Plano de Atendimento' : 'Novo Plano de Atendimento'}
                            </h3>
                            <button
                                onClick={() => setIsPlanModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSavePlan} className="overflow-y-auto p-6 space-y-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Nome do Plano</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-xs font-medium text-gray-900 placeholder:text-gray-400"
                                        placeholder="Ex: Reabilitação Completa - 10 Sessões"
                                        value={editingPlan.name || ''}
                                        onChange={e => setEditingPlan({ ...editingPlan, name: e.target.value })}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Especialidade</label>
                                        <select
                                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-xs font-medium text-gray-900"
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
                                            id="planActivePage"
                                            checked={editingPlan.active !== false}
                                            onChange={e => setEditingPlan({ ...editingPlan, active: e.target.checked })}
                                            className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                                        />
                                        <label htmlFor="planActivePage" className="text-xs font-semibold text-gray-700 cursor-pointer">Plano Ativo para Venda</label>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Nº de Sessões</label>
                                        <input
                                            type="number"
                                            min="1"
                                            required
                                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-xs font-medium text-gray-900"
                                            value={editingPlan.sessions || ''}
                                            onChange={e => setEditingPlan({ ...editingPlan, sessions: parseInt(e.target.value) || 0 })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Preço Total (R$)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            required
                                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-xs font-medium text-gray-900"
                                            value={editingPlan.price || ''}
                                            onChange={e => setEditingPlan({ ...editingPlan, price: parseFloat(e.target.value) || 0 })}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Descrição</label>
                                    <textarea
                                        rows={3}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-xs font-medium text-gray-900 placeholder:text-gray-400"
                                        placeholder="Descreva o tratamento inclusivo no pacote..."
                                        value={editingPlan.description || ''}
                                        onChange={e => setEditingPlan({ ...editingPlan, description: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setIsPlanModalOpen(false)}
                                    className="px-4 py-2 border border-gray-200 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-50 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingPlan}
                                    className="px-5 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 shadow-sm transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                                >
                                    {savingPlan ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Salvando...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4" />
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

export default PlansAndServices;
