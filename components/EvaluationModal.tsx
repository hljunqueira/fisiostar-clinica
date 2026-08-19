import React, { useState, useEffect } from 'react';
import { X, FileText, Activity, Save, Printer, User, Calendar, Stethoscope, AlertCircle, Sparkles, Check, CheckCircle2, ChevronRight, Hash, HeartPulse, Building2, UploadCloud, Trash2 } from 'lucide-react';
import { PatientEvaluation, Patient, Professional, Unit, UnitId } from '../types';
import { evaluationsApi, patientsApi, professionalsApi, unitsApi } from '../src/services/api';
import toast from 'react-hot-toast';

interface EvaluationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave?: (evaluation: PatientEvaluation) => void;
    patientId?: string;
    existingEvaluation?: PatientEvaluation | null;
    currentUnit?: UnitId;
}

const SPECIALTY_OPTIONS = [
    'Fisioterapia Geral',
    'Fisioterapia Ortopédica / Traumatológica',
    'Fisioterapia Respiratória',
    'Fisioterapia Pélvica / Saúde da Mulher',
    'Pilates Clínico',
    'Hidroterapia / Fisioterapia Aquática',
    'RPG / Reeducação Postural',
    'Fisioterapia Neurológica',
    'Reabilitação Desportiva'
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

export const EvaluationModal: React.FC<EvaluationModalProps> = ({
    isOpen,
    onClose,
    onSave,
    patientId: initialPatientId,
    existingEvaluation,
    currentUnit
}) => {
    // Selection state
    const [selectedPatientId, setSelectedPatientId] = useState<string>(existingEvaluation?.patientId || initialPatientId || '');
    const [selectedProfessionalId, setSelectedProfessionalId] = useState<string>(existingEvaluation?.professionalId || '');
    const [selectedUnitId, setSelectedUnitId] = useState<string>(existingEvaluation?.unitId || (currentUnit && currentUnit !== 'ALL' ? currentUnit : ''));
    const [date, setDate] = useState<string>(existingEvaluation?.date || new Date().toISOString().split('T')[0]);
    const [specialty, setSpecialty] = useState<string>(existingEvaluation?.specialty || 'Fisioterapia Geral');

    // Clinical form state
    const [chiefComplaint, setChiefComplaint] = useState<string>(existingEvaluation?.chiefComplaint || '');
    const [historyCurrentIllness, setHistoryCurrentIllness] = useState<string>(existingEvaluation?.historyCurrentIllness || '');
    const [pastMedicalHistory, setPastMedicalHistory] = useState<string>(existingEvaluation?.pastMedicalHistory || '');
    const [lifestyleHabits, setLifestyleHabits] = useState<string>(existingEvaluation?.lifestyleHabits || '');
    const [painLevel, setPainLevel] = useState<number>(existingEvaluation?.painLevel !== undefined ? existingEvaluation.painLevel : 5);
    const [physicalExamination, setPhysicalExamination] = useState<string>(existingEvaluation?.physicalExamination || '');
    const [clinicalDiagnosis, setClinicalDiagnosis] = useState<string>(existingEvaluation?.clinicalDiagnosis || '');
    const [treatmentGoals, setTreatmentGoals] = useState<string>(existingEvaluation?.treatmentGoals || '');
    const [treatmentPlan, setTreatmentPlan] = useState<string>(existingEvaluation?.treatmentPlan || '');

    // Lists
    const [patients, setPatients] = useState<Patient[]>([]);
    const [professionals, setProfessionals] = useState<Professional[]>([]);
    const [units, setUnits] = useState<Unit[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [activeSection, setActiveSection] = useState<'anamnesis' | 'exam' | 'plan'>('anamnesis');

    useEffect(() => {
        if (!isOpen) return;

        async function loadData() {
            setLoading(true);
            try {
                const [pats, profs, unitsList] = await Promise.all([
                    patientsApi.getAll(),
                    professionalsApi.getAll(),
                    unitsApi.getAll()
                ]);

                setPatients(pats);
                setProfessionals(profs);
                setUnits(unitsList);

                if (!selectedUnitId && unitsList.length > 0) {
                    setSelectedUnitId(unitsList[0].id);
                }
            } catch (error) {
                console.error('Erro ao carregar dados do modal de avaliação:', error);
                toast.error('Erro ao carregar dados');
            } finally {
                setLoading(false);
            }
        }

        loadData();
    }, [isOpen]);

    if (!isOpen) return null;

    const selectedPatient = patients.find(p => p.id === selectedPatientId);
    const selectedProf = professionals.find(p => p.id === selectedProfessionalId);
    const selectedUnitObj = units.find(u => u.id === selectedUnitId);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedPatientId) {
            toast.error('Por favor, selecione o paciente.');
            return;
        }

        if (!chiefComplaint.trim()) {
            toast.error('Informe a Queixa Principal do paciente.');
            return;
        }

        try {
            setSaving(true);
            const evalData: Omit<PatientEvaluation, 'id' | 'createdAt' | 'updatedAt'> = {
                patientId: selectedPatientId,
                professionalId: selectedProfessionalId || undefined,
                unitId: selectedUnitId || undefined,
                date: date,
                specialty: specialty,
                chiefComplaint: chiefComplaint.trim(),
                historyCurrentIllness: historyCurrentIllness.trim() || undefined,
                pastMedicalHistory: pastMedicalHistory.trim() || undefined,
                lifestyleHabits: lifestyleHabits.trim() || undefined,
                painLevel: painLevel,
                physicalExamination: physicalExamination.trim() || undefined,
                clinicalDiagnosis: clinicalDiagnosis.trim() || undefined,
                treatmentGoals: treatmentGoals.trim() || undefined,
                treatmentPlan: treatmentPlan.trim() || undefined
            };

            let savedEval: PatientEvaluation;

            if (existingEvaluation?.id) {
                savedEval = await evaluationsApi.update(existingEvaluation.id, evalData);
                toast.success('Avaliação clínica atualizada com sucesso!');
            } else {
                savedEval = await evaluationsApi.create(evalData);
                toast.success('Avaliação clínica registrada com sucesso!');
            }

            if (onSave) onSave(savedEval);
            onClose();
        } catch (error: any) {
            console.error('Erro ao salvar avaliação:', error);
            toast.error(error.message || 'Erro ao salvar avaliação clínica.');
        } finally {
            setSaving(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl relative z-10 overflow-hidden animate-fade-in border border-gray-100 flex flex-col max-h-[92vh]">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 p-5 text-white flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-white/15 rounded-xl backdrop-blur-sm">
                            <Stethoscope className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                {existingEvaluation ? 'Editar Avaliação Clínica' : 'Nova Avaliação Clínica (Anamnese)'}
                            </h2>
                            <p className="text-xs text-blue-100">Prontuário e exame físico fisioterapêutico estruturado</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handlePrint}
                            title="Imprimir Ficha de Avaliação"
                            className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors flex items-center gap-1.5 text-xs font-semibold"
                        >
                            <Printer className="w-4 h-4" />
                            <span className="hidden sm:inline">Imprimir / PDF</span>
                        </button>
                        <button
                            onClick={onClose}
                            className="text-white/80 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Sub-Header Navigation Tabs */}
                <div className="bg-gray-50 border-b border-gray-200 px-6 py-2 flex items-center justify-between gap-2 overflow-x-auto shrink-0">
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setActiveSection('anamnesis')}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                activeSection === 'anamnesis'
                                    ? 'bg-blue-600 text-white shadow-xs'
                                    : 'text-gray-600 hover:bg-gray-200/60'
                            }`}
                        >
                            <FileText className="w-3.5 h-3.5" />
                            1. Identificação & Anamnese
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveSection('exam')}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                activeSection === 'exam'
                                    ? 'bg-blue-600 text-white shadow-xs'
                                    : 'text-gray-600 hover:bg-gray-200/60'
                            }`}
                        >
                            <HeartPulse className="w-3.5 h-3.5" />
                            2. Exame Físico & Escala de Dor
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveSection('plan')}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                activeSection === 'plan'
                                    ? 'bg-blue-600 text-white shadow-xs'
                                    : 'text-gray-600 hover:bg-gray-200/60'
                            }`}
                        >
                            <Activity className="w-3.5 h-3.5" />
                            3. Diagnóstico & Conduta
                        </button>
                    </div>
                </div>

                {/* Scrollable Form Content */}
                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-6">
                    {/* SECTION 1: IDENTIFICAÇÃO & ANAMNESE */}
                    {activeSection === 'anamnesis' && (
                        <div className="space-y-4 animate-fade-in">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                {/* Paciente */}
                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                                        Paciente <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        required
                                        value={selectedPatientId}
                                        onChange={(e) => setSelectedPatientId(e.target.value)}
                                        className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all cursor-pointer"
                                    >
                                        <option value="">Selecione o paciente...</option>
                                        {patients.map(p => (
                                            <option key={p.id} value={p.id}>{p.name} {p.cpf ? `(${p.cpf})` : ''}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Data */}
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                                        Data da Avaliação <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                {/* Especialidade / Área */}
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                                        Especialidade Clínica
                                    </label>
                                    <select
                                        value={specialty}
                                        onChange={(e) => setSpecialty(e.target.value)}
                                        className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all cursor-pointer"
                                    >
                                        {SPECIALTY_OPTIONS.map(opt => (
                                            <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Fisioterapeuta Avaliador */}
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                                        Fisioterapeuta Avaliador
                                    </label>
                                    <select
                                        value={selectedProfessionalId}
                                        onChange={(e) => setSelectedProfessionalId(e.target.value)}
                                        className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all cursor-pointer"
                                    >
                                        <option value="">Selecione o profissional...</option>
                                        {professionals.map(p => (
                                            <option key={p.id} value={p.id}>{p.name} ({p.specialty})</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Unidade */}
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                                        Unidade / Filial
                                    </label>
                                    <select
                                        value={selectedUnitId}
                                        onChange={(e) => setSelectedUnitId(e.target.value)}
                                        className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all cursor-pointer"
                                    >
                                        {units.map(u => (
                                            <option key={u.id} value={u.id}>{u.name} - {u.city}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Queixa Principal */}
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                                    Queixa Principal (HDA) <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    required
                                    rows={3}
                                    placeholder="Descreva o motivo da consulta, sintomas, início do quadro e localização da dor/limitação..."
                                    value={chiefComplaint}
                                    onChange={(e) => setChiefComplaint(e.target.value)}
                                    className="w-full p-3 bg-gray-50/50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                />
                            </div>

                            {/* Histórico da Doença Atual (HDA detalhada) */}
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                                    História da Moléstia Atual (Evolução dos Sintomas / Fatores de Melhora e Piora)
                                </label>
                                <textarea
                                    rows={2}
                                    placeholder="Mecanismo de lesão, tratamentos anteriores realizados, exames de imagem prévios..."
                                    value={historyCurrentIllness}
                                    onChange={(e) => setHistoryCurrentIllness(e.target.value)}
                                    className="w-full p-3 bg-gray-50/50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                />
                            </div>

                            {/* HDP e Hábitos */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                                        Histórico Patológico Pregresso (HDP / Cirurgias / Doenças de Base)
                                    </label>
                                    <textarea
                                        rows={2}
                                        placeholder="HAS, DM, cirurgias prévias, fraturas, próteses..."
                                        value={pastMedicalHistory}
                                        onChange={(e) => setPastMedicalHistory(e.target.value)}
                                        className="w-full p-3 bg-gray-50/50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                                        Hábitos de Vida & Medicamentos em Uso
                                    </label>
                                    <textarea
                                        rows={2}
                                        placeholder="Atividade física, tabagismo, postura no trabalho, analgésicos/anti-inflamatórios..."
                                        value={lifestyleHabits}
                                        onChange={(e) => setLifestyleHabits(e.target.value)}
                                        className="w-full p-3 bg-gray-50/50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SECTION 2: EXAME FÍSICO & ESCALA DE DOR */}
                    {activeSection === 'exam' && (
                        <div className="space-y-6 animate-fade-in">
                            {/* ESCALA VISUAL DE DOR (EVA 0-10) */}
                            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200/80">
                                <div className="flex justify-between items-center mb-3">
                                    <div>
                                        <label className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                            <HeartPulse className="w-4 h-4 text-red-500" />
                                            Escala Visual Analógica de Dor (EVA: 0 a 10)
                                        </label>
                                        <p className="text-xs text-gray-500">Selecione o nível de dor referido pelo paciente na avaliação inicial</p>
                                    </div>
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-xl shadow-xs border border-gray-200">
                                        <span className="text-xl">{PAIN_LEVELS[painLevel].emoji}</span>
                                        <span className="text-sm font-extrabold text-gray-900">Nível {painLevel}</span>
                                        <span className="text-xs font-semibold text-gray-500">({PAIN_LEVELS[painLevel].label})</span>
                                    </div>
                                </div>

                                {/* Seletor de botões EVA */}
                                <div className="grid grid-cols-11 gap-1 sm:gap-2">
                                    {PAIN_LEVELS.map((item) => (
                                        <button
                                            key={item.value}
                                            type="button"
                                            onClick={() => setPainLevel(item.value)}
                                            className={`p-2 sm:py-3 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer ${
                                                painLevel === item.value
                                                    ? `${item.color} shadow-md scale-105 ring-2 ring-blue-600 ring-offset-2 font-bold`
                                                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                                            }`}
                                        >
                                            <span className="text-sm sm:text-base font-extrabold">{item.value}</span>
                                            <span className="text-[10px] hidden sm:block mt-1 font-medium">{item.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Exame Físico / Inspeção / Palpação */}
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                                    Exame Físico Fisioterapêutico (Inspeção, Palpação & Goniometria / ADM)
                                </label>
                                <textarea
                                    rows={5}
                                    placeholder="Descreva:
- Inspeção estática e dinâmica / Avaliação postural
- Palpação (pontos-gatilho, tônus muscular, edema)
- Amplitude de Movimento (ADM / Goniometria)
- Testes especiais ortopédicos / neurológicos realizados e resultados..."
                                    value={physicalExamination}
                                    onChange={(e) => setPhysicalExamination(e.target.value)}
                                    className="w-full p-3 bg-gray-50/50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono text-xs leading-relaxed"
                                />
                            </div>
                        </div>
                    )}

                    {/* SECTION 3: DIAGNÓSTICO & CONDUTA */}
                    {activeSection === 'plan' && (
                        <div className="space-y-4 animate-fade-in">
                            {/* Diagnóstico Clínico / Fisioterapêutico */}
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                                    Diagnóstico Fisioterapêutico / Clínico
                                </label>
                                <input
                                    type="text"
                                    placeholder="Ex: Lombalgia mecânica crônica com instabilidade lombo-pélvica (CID M54.5)"
                                    value={clinicalDiagnosis}
                                    onChange={(e) => setClinicalDiagnosis(e.target.value)}
                                    className="w-full px-3 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                />
                            </div>

                            {/* Objetivos Terapêuticos */}
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                                    Objetivos do Tratamento (Curto, Médio e Longo Prazo)
                                </label>
                                <textarea
                                    rows={3}
                                    placeholder="Ex:
1. Alívio do quadro álgico (reduzir EVA de 7 para 2).
2. Ganho de amplitude de movimento de flexão lombar.
3. Fortalecimento de CORE e estabilizadores profundos.
4. Retorno seguro às atividades diárias e esportivas."
                                    value={treatmentGoals}
                                    onChange={(e) => setTreatmentGoals(e.target.value)}
                                    className="w-full p-3 bg-gray-50/50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                />
                            </div>

                            {/* Conduta Proposta & Frequência */}
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                                    Plano de Tratamento / Conduta Proposta & Frequência Semanal
                                </label>
                                <textarea
                                    rows={3}
                                    placeholder="Ex: Fisioterapia 2x por semana (Total 10 sessões iniciais). Protocolo: TENS analgesia + Liberação Miofascial + Cinesioterapia com foco em estabilização segmentar e exercícios no solo/aparelhos."
                                    value={treatmentPlan}
                                    onChange={(e) => setTreatmentPlan(e.target.value)}
                                    className="w-full p-3 bg-gray-50/50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                />
                            </div>
                        </div>
                    )}

                    {/* Footer Actions */}
                    <div className="pt-4 border-t border-gray-200 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            {activeSection !== 'anamnesis' && (
                                <button
                                    type="button"
                                    onClick={() => setActiveSection(activeSection === 'plan' ? 'exam' : 'anamnesis')}
                                    className="px-3.5 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
                                >
                                    Voltar
                                </button>
                            )}
                            {activeSection !== 'plan' && (
                                <button
                                    type="button"
                                    onClick={() => setActiveSection(activeSection === 'anamnesis' ? 'exam' : 'plan')}
                                    className="px-4 py-2 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-xl transition-all flex items-center gap-1"
                                >
                                    Próximo Passo <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-3">
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
                                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white text-sm font-bold rounded-xl shadow-md shadow-blue-600/20 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                            >
                                {saving ? (
                                    <>Salvando...</>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4" />
                                        Salvar Avaliação
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};
