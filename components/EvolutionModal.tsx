import React, { useState, useEffect } from 'react';
import { X, Activity, HeartPulse, Save, User, Calendar, Clock, Stethoscope, Sparkles, Check, CheckCircle2, AlertTriangle, Building2, History, ChevronRight, Lock } from 'lucide-react';
import { PatientEvolution, Patient, Professional, Session, Unit, UnitId } from '../types';
import { evolutionsApi, patientsApi, professionalsApi, sessionsApi, unitsApi } from '../src/services/api';
import toast from 'react-hot-toast';

interface EvolutionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave?: (evolution: PatientEvolution) => void;
    patientId?: string;
    sessionId?: string;
    existingEvolution?: PatientEvolution | null;
    currentUnit?: UnitId;
}

const COMMON_CONDUCT_SHORTCUTS = [
    'Cinesioterapia Motora',
    'Liberação Miofascial',
    'Eletroterapia / TENS (20 min)',
    'Termoterapia / Crioterapia',
    'Alongamento Muscular Global',
    'Treino Funcional / Propriocepção',
    'Fortalecimento Isométrico de CORE',
    'Mobilização Articular Grau III',
    'Exercícios de Pilates nos Aparelhos',
    'Hidrocinesioterapia / Descompressão',
    'Treino de Marcha e Equilíbrio',
    'Drenagem Linfática / Descongestivo'
];

const PAIN_LEVELS = [
    { value: 0, label: 'Sem dor', color: 'bg-emerald-500 text-white', emoji: '😊' },
    { value: 1, label: 'Muito leve', color: 'bg-emerald-400 text-white', emoji: '🙂' },
    { value: 2, label: 'Leve', color: 'bg-green-500 text-white', emoji: '🙂' },
    { value: 3, label: 'Leve/Mod.', color: 'bg-lime-500 text-white', emoji: '😐' },
    { value: 4, label: 'Moderada', color: 'bg-yellow-500 text-white', emoji: '😐' },
    { value: 5, label: 'Desconforto', color: 'bg-amber-500 text-white', emoji: '🙁' },
    { value: 6, label: 'Intensa', color: 'bg-orange-500 text-white', emoji: '😣' },
    { value: 7, label: 'Muito Intensa', color: 'bg-orange-600 text-white', emoji: '😫' },
    { value: 8, label: 'Severa', color: 'bg-red-500 text-white', emoji: '😭' },
    { value: 9, label: 'Muito Severa', color: 'bg-red-600 text-white', emoji: '😱' },
    { value: 10, label: 'Insuportável', color: 'bg-red-700 text-white', emoji: '🤯' }
];

export const EvolutionModal: React.FC<EvolutionModalProps> = ({
    isOpen,
    onClose,
    onSave,
    patientId: initialPatientId,
    sessionId: initialSessionId,
    existingEvolution,
    currentUnit
}) => {
    // Form state
    const now = new Date();
    const [selectedPatientId, setSelectedPatientId] = useState<string>(existingEvolution?.patientId || initialPatientId || '');
    const [selectedSessionId, setSelectedSessionId] = useState<string>(existingEvolution?.sessionId || initialSessionId || '');
    const [selectedProfessionalId, setSelectedProfessionalId] = useState<string>(existingEvolution?.professionalId || '');
    const [selectedUnitId, setSelectedUnitId] = useState<string>(existingEvolution?.unitId || (currentUnit && currentUnit !== 'ALL' ? currentUnit : ''));
    const [date, setDate] = useState<string>(existingEvolution?.date || now.toISOString().split('T')[0]);
    const [time, setTime] = useState<string>(existingEvolution?.time || `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
    const [painLevel, setPainLevel] = useState<number>(existingEvolution?.painLevel !== undefined ? existingEvolution.painLevel : 3);
    const [conduct, setConduct] = useState<string>(existingEvolution?.conduct || '');
    const [patientResponse, setPatientResponse] = useState<string>(existingEvolution?.patientResponse || '');
    const [nextSteps, setNextSteps] = useState<string>(existingEvolution?.nextSteps || '');
    const [editReason, setEditReason] = useState<string>('');

    // Lists
    const [patients, setPatients] = useState<Patient[]>([]);
    const [professionals, setProfessionals] = useState<Professional[]>([]);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [units, setUnits] = useState<Unit[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const isEditing = !!existingEvolution?.id;

    useEffect(() => {
        if (!isOpen) return;

        async function loadData() {
            setLoading(true);
            try {
                const [pats, profs, sessList, unitsList] = await Promise.all([
                    patientsApi.getAll(),
                    professionalsApi.getAll(),
                    sessionsApi.getAll(),
                    unitsApi.getAll()
                ]);

                setPatients(pats);
                setProfessionals(profs);
                setSessions(sessList);
                setUnits(unitsList);

                if (!selectedUnitId && unitsList.length > 0) {
                    setSelectedUnitId(unitsList[0].id);
                }
            } catch (error) {
                console.error('Erro ao carregar dados da evolução:', error);
                toast.error('Erro ao carregar dados');
            } finally {
                setLoading(false);
            }
        }

        loadData();
    }, [isOpen]);

    if (!isOpen) return null;

    // Filter sessions for selected patient
    const patientSessions = sessions.filter(s => s.patientId === selectedPatientId);

    const handleAddShortcut = (shortcut: string) => {
        setConduct(prev => {
            if (!prev) return shortcut;
            if (prev.includes(shortcut)) return prev;
            return `${prev}\n• ${shortcut}`;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedPatientId) {
            toast.error('Por favor, selecione o paciente.');
            return;
        }

        if (!conduct.trim()) {
            toast.error('Informe a Conduta / Procedimentos realizados na sessão.');
            return;
        }

        if (isEditing && !editReason.trim()) {
            toast.error('Informe a justificativa para alteração do prontuário.');
            return;
        }

        try {
            setSaving(true);
            const evolutionData: Omit<PatientEvolution, 'id' | 'createdAt' | 'updatedAt'> = {
                patientId: selectedPatientId,
                sessionId: selectedSessionId || undefined,
                professionalId: selectedProfessionalId || undefined,
                unitId: selectedUnitId || undefined,
                date: date,
                time: time,
                painLevel: painLevel,
                conduct: conduct.trim(),
                patientResponse: patientResponse.trim() || undefined,
                nextSteps: nextSteps.trim() || undefined
            };

            let savedEvolution: PatientEvolution;

            if (isEditing && existingEvolution?.id) {
                savedEvolution = await evolutionsApi.update(existingEvolution.id, evolutionData, editReason.trim());
                toast.success('Evolução clínica atualizada no prontuário!');
            } else {
                savedEvolution = await evolutionsApi.create(evolutionData);
                toast.success('Evolução clínica registrada com sucesso!');
            }

            if (onSave) onSave(savedEvolution);
            onClose();
        } catch (error: any) {
            console.error('Erro ao salvar evolução:', error);
            toast.error(error.message || 'Erro ao registrar evolução clínica.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl relative z-10 overflow-hidden animate-fade-in border border-gray-100 flex flex-col max-h-[92vh]">
                {/* Header */}
                <div className="bg-gradient-to-r from-teal-700 via-emerald-700 to-teal-800 p-5 text-white flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-white/15 rounded-xl backdrop-blur-sm">
                            <Activity className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                {isEditing ? 'Editar Evolução de Atendimento' : 'Nova Evolução Clínica (SOAPE)'}
                            </h2>
                            <p className="text-xs text-teal-100">Prontuário diário de sessão e procedimentos realizados</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white/80 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form Content */}
                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-5">
                    {/* Linha 1: Paciente, Data e Hora */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                        <div className="sm:col-span-2">
                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                                Paciente <span className="text-red-500">*</span>
                            </label>
                            <select
                                required
                                value={selectedPatientId}
                                onChange={(e) => setSelectedPatientId(e.target.value)}
                                className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition-all cursor-pointer"
                            >
                                <option value="">Selecione o paciente...</option>
                                {patients.map(p => (
                                    <option key={p.id} value={p.id}>{p.name} {p.cpf ? `(${p.cpf})` : ''}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                                Data <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                required
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                                Horário <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="time"
                                required
                                value={time}
                                onChange={(e) => setTime(e.target.value)}
                                className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                            />
                        </div>
                    </div>

                    {/* Linha 2: Profissional, Unidade e Sessão Vinculada */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                                Fisioterapeuta Responsável
                            </label>
                            <select
                                value={selectedProfessionalId}
                                onChange={(e) => setSelectedProfessionalId(e.target.value)}
                                className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition-all cursor-pointer"
                            >
                                <option value="">Selecione o profissional...</option>
                                {professionals.map(p => (
                                    <option key={p.id} value={p.id}>{p.name} ({p.specialty})</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                                Unidade
                            </label>
                            <select
                                value={selectedUnitId}
                                onChange={(e) => setSelectedUnitId(e.target.value)}
                                className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition-all cursor-pointer"
                            >
                                {units.map(u => (
                                    <option key={u.id} value={u.id}>{u.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                                Vincular ao Agendamento
                            </label>
                            <select
                                value={selectedSessionId}
                                onChange={(e) => setSelectedSessionId(e.target.value)}
                                className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition-all cursor-pointer"
                            >
                                <option value="">Atendimento Avulso / Nenhum</option>
                                {patientSessions.map(s => (
                                    <option key={s.id} value={s.id}>{s.date} às {s.time} - {s.type} ({s.status})</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Escala de Dor EVA (0-10) da Sessão */}
                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200/80">
                        <div className="flex justify-between items-center mb-2.5">
                            <div>
                                <label className="text-xs font-bold text-gray-900 flex items-center gap-1.5 uppercase tracking-wider">
                                    <HeartPulse className="w-3.5 h-3.5 text-red-500" />
                                    Nível de Dor Atual (EVA: 0 a 10)
                                </label>
                                <p className="text-xs text-gray-500">Dor relatada pelo paciente nesta sessão</p>
                            </div>
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-white rounded-lg shadow-xs border border-gray-200">
                                <span className="text-lg">{PAIN_LEVELS[painLevel].emoji}</span>
                                <span className="text-xs font-bold text-gray-800">EVA {painLevel} - {PAIN_LEVELS[painLevel].label}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-11 gap-1 sm:gap-1.5">
                            {PAIN_LEVELS.map((item) => (
                                <button
                                    key={item.value}
                                    type="button"
                                    onClick={() => setPainLevel(item.value)}
                                    className={`py-2 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer ${
                                        painLevel === item.value
                                            ? `${item.color} shadow-md scale-105 ring-2 ring-teal-600 ring-offset-1 font-bold`
                                            : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                                    }`}
                                >
                                    <span className="text-xs sm:text-sm font-extrabold">{item.value}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Relato do Paciente (Subjetivo) */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                            Relato do Paciente (Subjetivo)
                        </label>
                        <input
                            type="text"
                            placeholder="Ex: Refere melhora de 50% na dor lombar matinal; relata leve desconforto após subir escadas."
                            value={patientResponse}
                            onChange={(e) => setPatientResponse(e.target.value)}
                            className="w-full px-3 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                        />
                    </div>

                    {/* Conduta Realizada (Objetivo) com Atalhos Rápidos */}
                    <div>
                        <div className="flex justify-between items-center mb-1.5">
                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                                Conduta / Procedimentos Realizados (Objetivo) <span className="text-red-500">*</span>
                            </label>
                            <span className="text-[11px] text-teal-700 font-semibold flex items-center gap-1">
                                <Sparkles className="w-3 h-3" /> Clique nos atalhos para inserir
                            </span>
                        </div>

                        {/* Atalhos / Chips */}
                        <div className="flex flex-wrap gap-1.5 mb-2.5">
                            {COMMON_CONDUCT_SHORTCUTS.map((shortcut) => (
                                <button
                                    key={shortcut}
                                    type="button"
                                    onClick={() => handleAddShortcut(shortcut)}
                                    className="px-2.5 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200/60 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer"
                                >
                                    + {shortcut}
                                </button>
                            ))}
                        </div>

                        <textarea
                            required
                            rows={4}
                            placeholder="Descreva detalhadamente a conduta realizada, séries, repetições, recursos aplicados e resposta clínica..."
                            value={conduct}
                            onChange={(e) => setConduct(e.target.value)}
                            className="w-full p-3 bg-gray-50/50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition-all font-mono text-xs leading-relaxed"
                        />
                    </div>

                    {/* Orientações Domiciliares & Próxima Sessão (Plano) */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                            Orientações para Casa & Plano para Próxima Sessão
                        </label>
                        <input
                            type="text"
                            placeholder="Ex: Orientado repouso postural e gelo local 15 min; progressão de carga na próxima sessão."
                            value={nextSteps}
                            onChange={(e) => setNextSteps(e.target.value)}
                            className="w-full px-3 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                        />
                    </div>

                    {/* Justificativa de Edição (Se estiver editando) */}
                    {isEditing && (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
                            <label className="block text-xs font-bold text-amber-900 uppercase tracking-wider">
                                Justificativa da Alteração (Trilha de Auditoria) <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                placeholder="Motivo da correção na evolução clínica..."
                                value={editReason}
                                onChange={(e) => setEditReason(e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-amber-500 outline-none"
                            />
                        </div>
                    )}

                    {/* Aviso de Imutabilidade 24h */}
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-600 flex items-center gap-2">
                        <Lock className="w-4 h-4 text-gray-400 shrink-0" />
                        <span>Em conformidade com as normas do CFM/COFFITO e LGPD, as evoluções clínicas são imutáveis após 24 horas da sua criação.</span>
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-3 border-t border-gray-100 flex justify-end items-center gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={saving}
                            className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 active:scale-[0.98] text-white text-sm font-bold rounded-xl shadow-md shadow-teal-600/20 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                        >
                            {saving ? (
                                <>Salvando...</>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    Salvar Evolução
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
