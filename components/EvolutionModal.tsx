import React, { useState, useEffect } from 'react';
import { X, Activity, Save, User, Calendar, Clock, Stethoscope, Sparkles, Check, ChevronDown, Plus, Layers, MapPin, AlignLeft, CheckSquare, Trash2 } from 'lucide-react';
import { PatientEvolution, Patient, Professional, Session, Unit, UnitId, ClinicalTemplate, ClinicalTemplateSection, PainPoint } from '../types';
import { evolutionsApi, patientsApi, professionalsApi, sessionsApi, unitsApi, clinicalTemplatesApi } from '../src/services/api';
import { BodyPainMap } from './Clinical/BodyPainMap';
import { ClinicalTemplateModal } from './Clinical/ClinicalTemplateModal';
import { useAuth } from '../src/contexts/AuthContext';
import toast from 'react-hot-toast';

interface EvolutionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave?: (evolution: PatientEvolution) => void;
    patientId?: string;
    patientName?: string;
    sessionId?: string;
    existingEvolution?: PatientEvolution | null;
    currentUnit?: UnitId;
}

const DEFAULT_EVOLUTION_ITEMS: ClinicalTemplateSection[] = [
    { id: 'terapia_manual', title: 'Terapia Manual', type: 'checkbox_text', checked: true, placeholder: 'Manobras manuais realizadas...' },
    { id: 'eletroterapia', title: 'Eletroterapia', type: 'checkbox_text', checked: true, placeholder: 'TENS, Ultrassom, Laser, tempo e parâmetros...' },
    { id: 'exercicio_forca', title: 'Exercício de força', type: 'checkbox_text', checked: true, placeholder: 'Exercícios com carga, séries e repetições...' },
    { id: 'mobilidade', title: 'Mobilidade', type: 'checkbox_text', checked: true, placeholder: 'Mobilizações articulares e ganho de ADM...' },
    { id: 'alongamento', title: 'Alongamento', type: 'checkbox_text', checked: true, placeholder: 'Alongamento muscular passivo/ativo...' },
    { id: 'exercicio_aerobico', title: 'Exercício aeróbico', type: 'checkbox_text', checked: false, placeholder: 'Bicicleta, esteira, tempo...' },
    { id: 'apresentacao_paciente', title: 'Apresentação do paciente', type: 'checkbox_text', checked: true, placeholder: 'Estado do paciente ao chegar...' },
    { id: 'propriocepcao', title: 'Propriocepção', type: 'checkbox_text', checked: true, placeholder: 'Treino proprioceptivo e equilíbrio...' },
    { id: 'exercicio_funcional', title: 'Exercício funcional', type: 'checkbox_text', checked: true, placeholder: 'Gestos funcionais e adaptados...' },
    { id: 'final_atendimento', title: 'Final do atendimento', type: 'checkbox_text', checked: true, placeholder: 'Feedback do paciente e orientações...' }
];

export const EvolutionModal: React.FC<EvolutionModalProps> = ({
    isOpen,
    onClose,
    onSave,
    patientId: initialPatientId,
    patientName: initialPatientName,
    sessionId: initialSessionId,
    existingEvolution,
    currentUnit
}) => {
    const { systemUser } = useAuth();
    const now = new Date();

    // Basic form state
    const [selectedPatientId, setSelectedPatientId] = useState<string>(existingEvolution?.patientId || initialPatientId || '');
    const [selectedSessionId, setSelectedSessionId] = useState<string>(existingEvolution?.sessionId || initialSessionId || '');
    const [selectedProfessionalId, setSelectedProfessionalId] = useState<string>(existingEvolution?.professionalId || '');
    const [selectedUnitId, setSelectedUnitId] = useState<string>(existingEvolution?.unitId || (currentUnit && currentUnit !== 'ALL' ? currentUnit : ''));
    const [date, setDate] = useState<string>(existingEvolution?.date || now.toISOString().split('T')[0]);
    const [time, setTime] = useState<string>(existingEvolution?.time || `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
    const [painLevel, setPainLevel] = useState<number>(existingEvolution?.painLevel !== undefined ? existingEvolution.painLevel : 2);
    const [conduct, setConduct] = useState<string>(existingEvolution?.conduct || '');
    const [patientResponse, setPatientResponse] = useState<string>(existingEvolution?.patientResponse || '');
    const [nextSteps, setNextSteps] = useState<string>(existingEvolution?.nextSteps || '');
    const [editReason, setEditReason] = useState<string>('');

    // Pain Points Map State
    const [painPoints, setPainPoints] = useState<PainPoint[]>(existingEvolution?.painPoints || []);
    const [activeTab, setActiveTab] = useState<'conducts' | 'pain_map' | 'soape'>('conducts');

    // Dynamic Sections & Templates
    const [sections, setSections] = useState<ClinicalTemplateSection[]>(DEFAULT_EVOLUTION_ITEMS);
    const [templates, setTemplates] = useState<ClinicalTemplate[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<ClinicalTemplate | null>(null);
    const [templateData, setTemplateData] = useState<Record<string, { checked: boolean; text: string }>>({});
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState<'my' | 'standard' | null>(null);

    // Add new custom procedure on-the-fly
    const [isAddingProcedure, setIsAddingProcedure] = useState(false);
    const [newProcedureTitle, setNewProcedureTitle] = useState('');

    // Lists
    const [patients, setPatients] = useState<Patient[]>([]);
    const [professionals, setProfessionals] = useState<Professional[]>([]);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [units, setUnits] = useState<Unit[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const isEditing = !!existingEvolution?.id;

    // Load initial data
    useEffect(() => {
        if (!isOpen) return;

        async function loadData() {
            setLoading(true);
            try {
                const [pats, profs, sessList, unitsList, tmpls] = await Promise.all([
                    patientsApi.getAll(),
                    professionalsApi.getAll(),
                    sessionsApi.getAll(),
                    unitsApi.getAll(),
                    clinicalTemplatesApi.getByType('evolution').catch(() => [])
                ]);

                setPatients(pats);
                setProfessionals(profs);
                setSessions(sessList);
                setUnits(unitsList);
                setTemplates(tmpls);

                if (!selectedUnitId && unitsList.length > 0) {
                    setSelectedUnitId(unitsList[0].id);
                }

                // Match logged-in user to professional if not set
                let profId = selectedProfessionalId;
                if (!profId && profs.length > 0) {
                    const matchedProf = profs.find(p => p.email === systemUser?.email || p.name.toLowerCase() === systemUser?.name.toLowerCase());
                    profId = matchedProf ? matchedProf.id : profs[0].id;
                    setSelectedProfessionalId(profId);
                }

                // Initial template setup for the selected professional
                if (existingEvolution?.templateData && Object.keys(existingEvolution.templateData).length > 0) {
                    setTemplateData(existingEvolution.templateData);
                } else if (!existingEvolution) {
                    const prof = profs.find(p => p.id === profId);
                    const profTemplate = tmpls.find(t => (prof && t.professionalId === prof.id) || (prof && t.title.toLowerCase().includes(prof.name.toLowerCase())));
                    
                    if (profTemplate) {
                        applyTemplate(profTemplate);
                    } else {
                        const initData: Record<string, { checked: boolean; text: string }> = {};
                        DEFAULT_EVOLUTION_ITEMS.forEach(item => {
                            initData[item.id] = { checked: item.checked !== undefined ? item.checked : true, text: '' };
                        });
                        setTemplateData(initData);
                        setSections(DEFAULT_EVOLUTION_ITEMS);
                    }
                }
            } catch (error) {
                console.error('Erro ao carregar dados:', error);
                toast.error('Erro ao carregar dados da evolução');
            } finally {
                setLoading(false);
            }
        }

        loadData();
    }, [isOpen]);

    // When professional dropdown changes, pull their template or update title
    const handleProfessionalChange = (profId: string) => {
        setSelectedProfessionalId(profId);
        const prof = professionals.find(p => p.id === profId);
        if (prof) {
            const profTemplate = templates.find(t => t.professionalId === prof.id || t.title.toLowerCase().includes(prof.name.toLowerCase()));
            if (profTemplate) {
                applyTemplate(profTemplate);
            }
        }
    };

    const applyTemplate = (tmpl: ClinicalTemplate) => {
        setSelectedTemplate(tmpl);
        setSections(tmpl.sections || DEFAULT_EVOLUTION_ITEMS);
        const data: Record<string, { checked: boolean; text: string }> = {};

        (tmpl.sections || []).forEach(sec => {
            data[sec.id] = {
                checked: sec.checked !== undefined ? sec.checked : true,
                text: sec.value || ''
            };
        });

        setTemplateData(data);
        setIsDropdownOpen(null);
        toast.success(`Modelo "${tmpl.title}" aplicado!`);
    };

    const handleToggleCheck = (id: string) => {
        setTemplateData(prev => ({
            ...prev,
            [id]: {
                checked: !prev[id]?.checked,
                text: prev[id]?.text || ''
            }
        }));
    };

    const handleTextChange = (id: string, text: string) => {
        setTemplateData(prev => ({
            ...prev,
            [id]: {
                checked: prev[id]?.checked !== undefined ? prev[id].checked : true,
                text
            }
        }));
    };

    // Add dynamic custom procedure on the fly
    const handleAddCustomProcedure = () => {
        if (!newProcedureTitle.trim()) {
            toast.error('Digite o nome do procedimento.');
            return;
        }

        const newId = `custom_${Date.now()}`;
        const newSec: ClinicalTemplateSection = {
            id: newId,
            title: newProcedureTitle.trim(),
            type: 'checkbox_text',
            checked: true,
            placeholder: `Relato de ${newProcedureTitle.trim()}...`
        };

        setSections(prev => [...prev, newSec]);
        setTemplateData(prev => ({
            ...prev,
            [newId]: { checked: true, text: '' }
        }));

        setNewProcedureTitle('');
        setIsAddingProcedure(false);
        toast.success(`Procedimento "${newSec.title}" adicionado!`);
    };

    const handleRemoveProcedure = (secId: string) => {
        setSections(prev => prev.filter(s => s.id !== secId));
        setTemplateData(prev => {
            const copy = { ...prev };
            delete copy[secId];
            return copy;
        });
    };

    // Auto-generate conduct summary from template checkboxes and text
    const generateSummaryConduct = () => {
        const lines: string[] = [];
        sections.forEach(sec => {
            const itemData = templateData[sec.id];
            if (itemData?.checked) {
                if (itemData.text?.trim()) {
                    lines.push(`• ${sec.title}: ${itemData.text.trim()}`);
                } else {
                    lines.push(`• ${sec.title}`);
                }
            }
        });

        return lines.join('\n');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedPatientId) {
            toast.error('Por favor, selecione o paciente.');
            return;
        }

        const finalConduct = conduct.trim() || generateSummaryConduct();
        if (!finalConduct) {
            toast.error('Informe ao menos uma conduta ou procedimento realizado.');
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
                date,
                time,
                painLevel,
                conduct: finalConduct,
                patientResponse: patientResponse.trim() || undefined,
                nextSteps: nextSteps.trim() || undefined,
                painPoints,
                templateId: selectedTemplate?.id || undefined,
                templateData
            };

            let saved: PatientEvolution;
            if (isEditing && existingEvolution?.id) {
                saved = await evolutionsApi.update(existingEvolution.id, evolutionData, editReason.trim());
                toast.success('Evolução clínica atualizada!');
            } else {
                saved = await evolutionsApi.create(evolutionData);
                toast.success('Evolução clínica registrada com sucesso!');
            }

            if (onSave) onSave(saved);
            onClose();
        } catch (error: any) {
            console.error('Erro ao salvar evolução:', error);
            toast.error(error.message || 'Erro ao registrar evolução.');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    const currentProf = professionals.find(p => p.id === selectedProfessionalId);
    const profDisplayName = currentProf?.name ? (currentProf.name.startsWith('Dr') ? currentProf.name : `Dr(a). ${currentProf.name}`) : '';
    const activeEvolutionTitle = selectedTemplate?.title || (profDisplayName ? `Evolução ${profDisplayName}` : 'Evolução Fisioterapêutica');

    const patientName = initialPatientName || patients.find(p => p.id === selectedPatientId)?.name || 'Paciente';
    const myTemplates = templates.filter(t => t.category === 'custom' || t.professionalId);
    const standardTemplates = templates.filter(t => t.category === 'standard' || t.isSystem);

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl relative z-10 overflow-hidden animate-fade-in border border-slate-200 flex flex-col max-h-[94vh]">
                {/* Header Clean */}
                <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 p-5 text-white flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-white/15 rounded-xl backdrop-blur-sm">
                            <Activity className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                {isEditing ? `Editar Evolução: ${patientName}` : `Nova Evolução para ${patientName}`}
                            </h2>
                            <p className="text-xs text-blue-100">Prontuário diário de sessão e procedimentos terapêuticos</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-white/80 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Barra de Seleção de Templates do Topo */}
                <div className="bg-slate-50 border-b border-slate-200 px-5 py-2.5 flex flex-wrap items-center justify-between gap-2 shrink-0">
                    <div className="flex items-center gap-2">
                        {/* Dropdown Minhas Evoluções */}
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setIsDropdownOpen(isDropdownOpen === 'my' ? null : 'my')}
                                className="px-3.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                            >
                                <span>Minhas evoluções</span>
                                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                            </button>

                            {isDropdownOpen === 'my' && (
                                <div className="absolute left-0 mt-1 w-56 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 z-40 animate-fade-in text-xs">
                                    {myTemplates.length > 0 ? (
                                        myTemplates.map(t => (
                                            <button
                                                key={t.id}
                                                type="button"
                                                onClick={() => applyTemplate(t)}
                                                className="w-full px-3.5 py-2 text-left hover:bg-blue-50 text-slate-800 font-medium flex items-center justify-between cursor-pointer"
                                            >
                                                <span>{t.title}</span>
                                                {selectedTemplate?.id === t.id && <Check className="w-3.5 h-3.5 text-blue-600" />}
                                            </button>
                                        ))
                                    ) : (
                                        <div className="px-3.5 py-2 text-slate-400 italic">Nenhum modelo personalizado</div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Dropdown Evoluções Padrão */}
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setIsDropdownOpen(isDropdownOpen === 'standard' ? null : 'standard')}
                                className="px-3.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                            >
                                <span>Evoluções padrão</span>
                                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                            </button>

                            {isDropdownOpen === 'standard' && (
                                <div className="absolute left-0 mt-1 w-56 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 z-40 animate-fade-in text-xs">
                                    {standardTemplates.map(t => (
                                        <button
                                            key={t.id}
                                            type="button"
                                            onClick={() => applyTemplate(t)}
                                            className="w-full px-3.5 py-2 text-left hover:bg-blue-50 text-slate-800 font-medium flex items-center justify-between cursor-pointer"
                                        >
                                            <span>{t.title}</span>
                                            {selectedTemplate?.id === t.id && <Check className="w-3.5 h-3.5 text-blue-600" />}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Botão Novo Modelo de Evolução */}
                        <button
                            type="button"
                            onClick={() => setIsTemplateModalOpen(true)}
                            className="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 font-bold text-xs rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Novo modelo de evolução</span>
                        </button>
                    </div>

                    {selectedTemplate && (
                        <span className="text-xs font-bold text-slate-600 bg-slate-200/70 px-2.5 py-1 rounded-md">
                            Modelo ativo: {selectedTemplate.title}
                        </span>
                    )}
                </div>

                {/* Sub-Tabs: Condutas / Pontos de Dor / SOAPE */}
                <div className="border-b border-slate-200 bg-white px-5 flex gap-2">
                    <button
                        type="button"
                        onClick={() => setActiveTab('conducts')}
                        className={`py-2.5 px-3.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${activeTab === 'conducts' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                    >
                        <CheckSquare className="w-3.5 h-3.5" />
                        <span>Condutas & Procedimentos</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('pain_map')}
                        className={`py-2.5 px-3.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${activeTab === 'pain_map' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                    >
                        <MapPin className="w-3.5 h-3.5" />
                        <span>Pontos de Dor ({painPoints.length})</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('soape')}
                        className={`py-2.5 px-3.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${activeTab === 'soape' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                    >
                        <AlignLeft className="w-3.5 h-3.5" />
                        <span>Resumo Geral / SOAPE</span>
                    </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-5">
                    {/* Linha 1: Dados do Atendimento */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                        <div className="sm:col-span-4">
                            <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">Data: *</label>
                            <input
                                type="date"
                                required
                                value={date}
                                onChange={e => setDate(e.target.value)}
                                className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2 text-slate-900 font-semibold focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div className="sm:col-span-4">
                            <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">Horário do Atendimento: *</label>
                            <input
                                type="time"
                                required
                                value={time}
                                onChange={e => setTime(e.target.value)}
                                className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2 text-slate-900 font-mono font-bold focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div className="sm:col-span-4">
                            <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">Fisioterapeuta:</label>
                            <select
                                value={selectedProfessionalId}
                                onChange={e => handleProfessionalChange(e.target.value)}
                                className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2 text-slate-900 font-semibold focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Selecione o profissional...</option>
                                {professionals.map(p => (
                                    <option key={p.id} value={p.id}>{p.name} ({p.specialty})</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* CONTEÚDO DA ABA 1: CONDUTAS (CHECKBOX + CAIXA DE RELATO) */}
                    {activeTab === 'conducts' && (
                        <div className="space-y-4 animate-fade-in">
                            {/* Título Dinâmico do Profissional + Botão Adicionar Procedimento */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                                <div>
                                    <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                                        <span>{activeEvolutionTitle}</span>
                                        <span className="text-[11px] font-bold px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">
                                            {sections.length} itens
                                        </span>
                                    </h3>
                                    <span className="text-xs text-slate-500">Marque as condutas realizadas e detalhe no campo</span>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setIsAddingProcedure(true)}
                                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Adicionar Procedimento</span>
                                </button>
                            </div>

                            {/* Caixa Expansível de Adicionar Novo Procedimento */}
                            {isAddingProcedure && (
                                <div className="bg-blue-50/90 p-3.5 rounded-xl border border-blue-200 animate-fade-in flex flex-col sm:flex-row items-center gap-2">
                                    <input
                                        type="text"
                                        placeholder="Nome da conduta (Ex: Dry Needling, Ventosaterapia, Bandagem...)"
                                        value={newProcedureTitle}
                                        onChange={e => setNewProcedureTitle(e.target.value)}
                                        className="flex-1 text-xs bg-white border border-slate-200 rounded-lg p-2 font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 w-full"
                                        autoFocus
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleAddCustomProcedure();
                                            }
                                        }}
                                    />
                                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                                        <button
                                            type="button"
                                            onClick={handleAddCustomProcedure}
                                            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                                        >
                                            Inserir
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { setIsAddingProcedure(false); setNewProcedureTitle(''); }}
                                            className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Lista dos Blocos com Checkbox + Caixa de Relato */}
                            <div className="space-y-3">
                                {sections.map(sec => {
                                    const itemData = templateData[sec.id] || { checked: true, text: '' };

                                    return (
                                        <div
                                            key={sec.id}
                                            className={`p-3.5 rounded-xl border transition-all ${itemData.checked ? 'bg-white border-slate-200/90 shadow-2xs' : 'bg-slate-50/50 border-slate-100 opacity-60'}`}
                                        >
                                            <div className="flex items-center justify-between gap-2 mb-2">
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="checkbox"
                                                        id={`check-${sec.id}`}
                                                        checked={itemData.checked}
                                                        onChange={() => handleToggleCheck(sec.id)}
                                                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                    />
                                                    <label
                                                        htmlFor={`check-${sec.id}`}
                                                        className="text-xs font-bold text-slate-800 uppercase tracking-wide cursor-pointer"
                                                    >
                                                        {sec.title}
                                                    </label>
                                                </div>

                                                {/* Permite remover procedimento adicionado dinamicamente */}
                                                {sec.id.startsWith('custom_') && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveProcedure(sec.id)}
                                                        className="text-slate-400 hover:text-red-600 p-1 transition-colors"
                                                        title="Remover procedimento"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>

                                            {itemData.checked && (
                                                <textarea
                                                    rows={2}
                                                    value={itemData.text}
                                                    onChange={e => handleTextChange(sec.id, e.target.value)}
                                                    placeholder={sec.placeholder || `Descreva a conduta de ${sec.title}...`}
                                                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500"
                                                />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* CONTEÚDO DA ABA 2: PONTOS DE DOR ANATÔMICOS */}
                    {activeTab === 'pain_map' && (
                        <div className="animate-fade-in">
                            <BodyPainMap
                                painPoints={painPoints}
                                onChange={setPainPoints}
                            />
                        </div>
                    )}

                    {/* CONTEÚDO DA ABA 3: RESUMO SOAPE */}
                    {activeTab === 'soape' && (
                        <div className="space-y-4 animate-fade-in">
                            <div>
                                <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                                    Condutas Realizadas (Texto Consolidado)
                                </label>
                                <textarea
                                    rows={4}
                                    value={conduct || generateSummaryConduct()}
                                    onChange={e => setConduct(e.target.value)}
                                    placeholder="Resumo geral das condutas..."
                                    className="w-full text-xs bg-white border border-slate-200 rounded-xl p-3 text-slate-900 focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                                        Resposta do Paciente (Subjetivo)
                                    </label>
                                    <textarea
                                        rows={3}
                                        value={patientResponse}
                                        onChange={e => setPatientResponse(e.target.value)}
                                        placeholder="Relato de alívio, desconforto ou evolução..."
                                        className="w-full text-xs bg-white border border-slate-200 rounded-xl p-3 text-slate-900 focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                                        Orientações / Próxima Sessão (Plano)
                                    </label>
                                    <textarea
                                        rows={3}
                                        value={nextSteps}
                                        onChange={e => setNextSteps(e.target.value)}
                                        placeholder="Orientações domiciliares, exercícios..."
                                        className="w-full text-xs bg-white border border-slate-200 rounded-xl p-3 text-slate-900 focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Footer Actions */}
                    <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                        >
                            <Save className="w-3.5 h-3.5" />
                            {saving ? 'Salvando...' : 'Salvar Evolução'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Modal de Construtor de Modelos */}
            {isTemplateModalOpen && (
                <ClinicalTemplateModal
                    isOpen={isTemplateModalOpen}
                    onClose={() => setIsTemplateModalOpen(false)}
                    type="evolution"
                    currentProfessional={professionals.find(p => p.id === selectedProfessionalId) || null}
                    onSaveSuccess={(newTmpl) => {
                        setTemplates(prev => [newTmpl, ...prev]);
                        applyTemplate(newTmpl);
                    }}
                />
            )}
        </div>
    );
};
