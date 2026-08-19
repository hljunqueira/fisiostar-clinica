import React, { useState, useEffect } from 'react';
import { X, FileText, Activity, Save, User, Calendar, Stethoscope, Sparkles, Check, ChevronDown, Plus, Layers, MapPin, AlignLeft, Paperclip, Image, UploadCloud, Trash2 } from 'lucide-react';
import { PatientEvaluation, Patient, Professional, Unit, UnitId, ClinicalTemplate, ClinicalTemplateSection, PainPoint } from '../types';
import { evaluationsApi, patientsApi, professionalsApi, unitsApi, clinicalTemplatesApi } from '../src/services/api';
import { BodyPainMap } from './Clinical/BodyPainMap';
import { ClinicalTemplateModal } from './Clinical/ClinicalTemplateModal';
import { storageApi } from '../src/services/storage-api';
import { useAuth } from '../src/contexts/AuthContext';
import toast from 'react-hot-toast';

interface EvaluationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave?: (evaluation: PatientEvaluation) => void;
    patientId?: string;
    patientName?: string;
    existingEvaluation?: PatientEvaluation | null;
    currentUnit?: UnitId;
}

export const EvaluationModal: React.FC<EvaluationModalProps> = ({
    isOpen,
    onClose,
    onSave,
    patientId: initialPatientId,
    patientName: initialPatientName,
    existingEvaluation,
    currentUnit
}) => {
    const { systemUser } = useAuth();
    const now = new Date();

    // Selection state
    const [selectedPatientId, setSelectedPatientId] = useState<string>(existingEvaluation?.patientId || initialPatientId || '');
    const [selectedProfessionalId, setSelectedProfessionalId] = useState<string>(existingEvolutionProfessionalId(existingEvaluation));
    const [selectedUnitId, setSelectedUnitId] = useState<string>(existingEvaluation?.unitId || (currentUnit && currentUnit !== 'ALL' ? currentUnit : ''));
    const [date, setDate] = useState<string>(existingEvaluation?.date || now.toISOString().split('T')[0]);
    const [specialty, setSpecialty] = useState<string>(existingEvaluation?.specialty || 'Fisioterapia Geral');

    function existingEvolutionProfessionalId(ev?: PatientEvaluation | null) {
        return ev?.professionalId || '';
    }

    // Clinical Sections State
    const [patientPresentation, setPatientPresentation] = useState<string>(existingEvaluation?.chiefComplaint || '');
    const [medications, setMedications] = useState<string>(existingEvaluation?.pastMedicalHistory || '');
    const [inspectionPalpation, setInspectionPalpation] = useState<string>(existingEvaluation?.physicalExamination || '');
    const [semiology, setSemiology] = useState<string>(existingEvaluation?.historyCurrentIllness || '');
    const [activeMovementsStrength, setActiveMovementsStrength] = useState<string>('');
    const [passiveMovements, setPassiveMovements] = useState<string>('');
    const [functionalTests, setFunctionalTests] = useState<string>(existingEvaluation?.lifestyleHabits || '');
    const [gaitProprioception, setGaitProprioception] = useState<string>('');
    const [specificTests, setSpecificTests] = useState<string>('');
    const [painIntensity, setPainIntensity] = useState<number>(existingEvaluation?.painLevel !== undefined ? existingEvaluation.painLevel : 5);
    const [functionalDiagnosis, setFunctionalDiagnosis] = useState<string>(existingEvaluation?.clinicalDiagnosis || '');
    const [treatmentGoals, setTreatmentGoals] = useState<string>(existingEvaluation?.treatmentGoals || '');
    const [treatmentPlan, setTreatmentPlan] = useState<string>(existingEvaluation?.treatmentPlan || '');

    // Custom Dynamic Extra Fields
    const [customFields, setCustomFields] = useState<{ id: string; title: string; value: string }[]>([]);
    const [isAddingField, setIsAddingField] = useState(false);
    const [newFieldTitle, setNewFieldTitle] = useState('');

    // Pain Points Map State
    const [painPoints, setPainPoints] = useState<PainPoint[]>(existingEvaluation?.painPoints || []);
    
    // Attachments & Images
    const [attachments, setAttachments] = useState<string[]>(existingEvaluation?.attachments || []);
    const [images, setImages] = useState<string[]>(existingEvaluation?.images || []);
    const [uploadingFiles, setUploadingFiles] = useState(false);

    // Navigation Sub-Tabs
    const [activeTab, setActiveTab] = useState<'form' | 'pain_map' | 'attachments'>('form');

    // Templates State
    const [templates, setTemplates] = useState<ClinicalTemplate[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<ClinicalTemplate | null>(null);
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState<'my' | 'standard' | 'restricted' | null>(null);

    // Lists
    const [patients, setPatients] = useState<Patient[]>([]);
    const [professionals, setProfessionals] = useState<Professional[]>([]);
    const [units, setUnits] = useState<Unit[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const isEditing = !!existingEvaluation?.id;

    useEffect(() => {
        if (!isOpen) return;

        async function loadData() {
            setLoading(true);
            try {
                const [pats, profs, unitsList, tmpls] = await Promise.all([
                    patientsApi.getAll(),
                    professionalsApi.getAll(),
                    unitsApi.getAll(),
                    clinicalTemplatesApi.getByType('evaluation').catch(() => [])
                ]);

                setPatients(pats);
                setProfessionals(profs);
                setUnits(unitsList);
                setTemplates(tmpls);

                if (!selectedUnitId && unitsList.length > 0) {
                    setSelectedUnitId(unitsList[0].id);
                }

                // Match logged-in professional if none selected
                let profId = selectedProfessionalId;
                if (!profId && profs.length > 0) {
                    const matchedProf = profs.find(p => p.email === systemUser?.email || p.name.toLowerCase() === systemUser?.name.toLowerCase());
                    profId = matchedProf ? matchedProf.id : profs[0].id;
                    setSelectedProfessionalId(profId);
                }

                if (existingEvaluation?.templateData) {
                    const td = existingEvaluation.templateData;
                    if (td.patientPresentation) setPatientPresentation(td.patientPresentation);
                    if (td.medications) setMedications(td.medications);
                    if (td.inspectionPalpation) setInspectionPalpation(td.inspectionPalpation);
                    if (td.semiology) setSemiology(td.semiology);
                    if (td.activeMovementsStrength) setActiveMovementsStrength(td.activeMovementsStrength);
                    if (td.passiveMovements) setPassiveMovements(td.passiveMovements);
                    if (td.functionalTests) setFunctionalTests(td.functionalTests);
                    if (td.gaitProprioception) setGaitProprioception(td.gaitProprioception);
                    if (td.specificTests) setSpecificTests(td.specificTests);
                    if (td.functionalDiagnosis) setFunctionalDiagnosis(td.functionalDiagnosis);
                    if (td.customFields) setCustomFields(td.customFields);
                } else if (!existingEvaluation) {
                    const prof = profs.find(p => p.id === profId);
                    const profTemplate = tmpls.find(t => (prof && t.professionalId === prof.id) || (prof && t.title.toLowerCase().includes(prof.name.toLowerCase())));
                    if (profTemplate) {
                        applyTemplate(profTemplate);
                    }
                }
            } catch (error) {
                console.error('Erro ao carregar dados da avaliação:', error);
                toast.error('Erro ao carregar dados');
            } finally {
                setLoading(false);
            }
        }

        loadData();
    }, [isOpen]);

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
        setIsDropdownOpen(null);
        toast.success(`Modelo "${tmpl.title}" selecionado!`);
    };

    const handleAddCustomField = () => {
        if (!newFieldTitle.trim()) {
            toast.error('Digite o título do campo.');
            return;
        }

        setCustomFields(prev => [...prev, {
            id: `field_${Date.now()}`,
            title: newFieldTitle.trim(),
            value: ''
        }]);

        setNewFieldTitle('');
        setIsAddingField(false);
        toast.success(`Campo "${newFieldTitle.trim()}" adicionado!`);
    };

    const handleRemoveCustomField = (id: string) => {
        setCustomFields(prev => prev.filter(f => f.id !== id));
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'attachments' | 'images') => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        try {
            setUploadingFiles(true);
            const uploadedUrls: string[] = [];

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const path = `evaluations/${selectedPatientId || 'temp'}/${Date.now()}_${file.name}`;
                const url = await storageApi.uploadFile('documents', path, file);
                uploadedUrls.push(url);
            }

            if (target === 'attachments') {
                setAttachments(prev => [...prev, ...uploadedUrls]);
                toast.success(`${uploadedUrls.length} exame(s) anexado(s)!`);
            } else {
                setImages(prev => [...prev, ...uploadedUrls]);
                toast.success(`${uploadedUrls.length} imagem(ns) anexada(s)!`);
            }
        } catch (error) {
            console.error('Erro ao fazer upload:', error);
            toast.error('Erro ao enviar arquivo.');
        } finally {
            setUploadingFiles(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedPatientId) {
            toast.error('Selecione o paciente para a avaliação.');
            return;
        }

        if (!patientPresentation.trim()) {
            toast.error('Preencha a Apresentação do Paciente / Queixa Principal.');
            return;
        }

        try {
            setSaving(true);
            const customSectionsSummary = customFields
                .filter(f => f.value.trim())
                .map(f => `[${f.title}]: ${f.value.trim()}`)
                .join('\n\n');

            const physicalExamFull = [
                inspectionPalpation ? `[Inspeção/Palpação]: ${inspectionPalpation}` : '',
                activeMovementsStrength ? `[Movimentos Ativos / Força]: ${activeMovementsStrength}` : '',
                passiveMovements ? `[Movimentos Passivos]: ${passiveMovements}` : '',
                gaitProprioception ? `[Marcha / Propriocepção]: ${gaitProprioception}` : '',
                specificTests ? `[Testes Específicos]: ${specificTests}` : '',
                customSectionsSummary
            ].filter(Boolean).join('\n\n');

            const evalData: Omit<PatientEvaluation, 'id' | 'createdAt' | 'updatedAt'> = {
                patientId: selectedPatientId,
                professionalId: selectedProfessionalId || undefined,
                unitId: selectedUnitId || undefined,
                date,
                specialty,
                chiefComplaint: patientPresentation.trim(),
                historyCurrentIllness: semiology.trim() || undefined,
                pastMedicalHistory: medications.trim() || undefined,
                lifestyleHabits: functionalTests.trim() || undefined,
                painLevel: painIntensity,
                physicalExamination: physicalExamFull,
                clinicalDiagnosis: functionalDiagnosis.trim() || undefined,
                treatmentGoals: treatmentGoals.trim() || undefined,
                treatmentPlan: treatmentPlan.trim() || undefined,
                attachments,
                images,
                painPoints,
                templateId: selectedTemplate?.id || undefined,
                templateData: {
                    patientPresentation,
                    medications,
                    inspectionPalpation,
                    semiology,
                    activeMovementsStrength,
                    passiveMovements,
                    functionalTests,
                    gaitProprioception,
                    specificTests,
                    functionalDiagnosis,
                    customFields
                }
            };

            let saved: PatientEvaluation;
            if (isEditing && existingEvaluation?.id) {
                saved = await evaluationsApi.update(existingEvaluation.id, evalData);
                toast.success('Avaliação clínica atualizada!');
            } else {
                saved = await evaluationsApi.create(evalData);
                toast.success('Avaliação clínica salva com sucesso!');
            }

            if (onSave) onSave(saved);
            onClose();
        } catch (error: any) {
            console.error('Erro ao salvar avaliação:', error);
            toast.error(error.message || 'Erro ao registrar avaliação clínica.');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    const currentProf = professionals.find(p => p.id === selectedProfessionalId);
    const profDisplayName = currentProf?.name ? (currentProf.name.startsWith('Dr') ? currentProf.name : `Dr(a). ${currentProf.name}`) : 'Profissional';
    const activeEvaluationTitle = selectedTemplate?.title || (currentProf ? `Avaliação ${profDisplayName}` : 'Avaliação Fisioterapêutica Geral');

    const patientName = initialPatientName || patients.find(p => p.id === selectedPatientId)?.name || 'Paciente';
    const myTemplates = templates.filter(t => t.category === 'custom' || t.professionalId);
    const standardTemplates = templates.filter(t => t.category === 'standard' || t.isSystem);
    const restrictedTemplates = templates.filter(t => t.category === 'restricted');

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl relative z-10 overflow-hidden animate-fade-in border border-slate-200 flex flex-col max-h-[95vh]">
                {/* Header Clean */}
                <div className="bg-gradient-to-r from-teal-700 via-emerald-700 to-teal-800 p-5 text-white flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-white/15 rounded-xl backdrop-blur-sm">
                            <Stethoscope className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                {isEditing ? `Editar Avaliação: ${patientName}` : `Nova Avaliação para ${patientName}`}
                            </h2>
                            <p className="text-xs text-teal-100">Anamnese completa, exame físico cinético-funcional e mapa de dor</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-white/80 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Barra de Seleção de Templates do Topo */}
                <div className="bg-slate-50 border-b border-slate-200 px-5 py-2.5 flex flex-wrap items-center justify-between gap-2 shrink-0">
                    <div className="flex items-center gap-2">
                        {/* Dropdown Minhas Avaliações */}
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setIsDropdownOpen(isDropdownOpen === 'my' ? null : 'my')}
                                className="px-3.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                            >
                                <span>Minhas avaliações</span>
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
                                                {selectedTemplate?.id === t.id && <Check className="w-3.5 h-3.5 text-teal-600" />}
                                            </button>
                                        ))
                                    ) : (
                                        <div className="px-3.5 py-2 text-slate-400 italic">Nenhum modelo personalizado</div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Dropdown Avaliações Padrão */}
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setIsDropdownOpen(isDropdownOpen === 'standard' ? null : 'standard')}
                                className="px-3.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                            >
                                <span>Avaliações padrão</span>
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
                                            {selectedTemplate?.id === t.id && <Check className="w-3.5 h-3.5 text-teal-600" />}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Dropdown Avaliações Restritas */}
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setIsDropdownOpen(isDropdownOpen === 'restricted' ? null : 'restricted')}
                                className="px-3.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                            >
                                <span>Avaliações restritas</span>
                                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                            </button>

                            {isDropdownOpen === 'restricted' && (
                                <div className="absolute left-0 mt-1 w-56 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 z-40 animate-fade-in text-xs">
                                    {restrictedTemplates.map(t => (
                                        <button
                                            key={t.id}
                                            type="button"
                                            onClick={() => applyTemplate(t)}
                                            className="w-full px-3.5 py-2 text-left hover:bg-blue-50 text-slate-800 font-medium flex items-center justify-between cursor-pointer"
                                        >
                                            <span>{t.title}</span>
                                            {selectedTemplate?.id === t.id && <Check className="w-3.5 h-3.5 text-teal-600" />}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Botão Novo Modelo de Avaliação */}
                        <button
                            type="button"
                            onClick={() => setIsTemplateModalOpen(true)}
                            className="px-3.5 py-1.5 bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-700 font-bold text-xs rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Novo modelo de avaliação</span>
                        </button>
                    </div>

                    {selectedTemplate && (
                        <span className="text-xs font-bold text-slate-600 bg-slate-200/70 px-2.5 py-1 rounded-md">
                            Modelo ativo: {selectedTemplate.title}
                        </span>
                    )}
                </div>

                {/* Sub-Tabs de Navegação */}
                <div className="border-b border-slate-200 bg-white px-5 flex gap-2">
                    <button
                        type="button"
                        onClick={() => setActiveTab('form')}
                        className={`py-2.5 px-3.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${activeTab === 'form' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                    >
                        <AlignLeft className="w-3.5 h-3.5" />
                        <span>Ficha de Avaliação Clínica</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('pain_map')}
                        className={`py-2.5 px-3.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${activeTab === 'pain_map' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                    >
                        <MapPin className="w-3.5 h-3.5" />
                        <span>Mapa de Dor Anatômico ({painPoints.length})</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('attachments')}
                        className={`py-2.5 px-3.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${activeTab === 'attachments' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                    >
                        <Paperclip className="w-3.5 h-3.5" />
                        <span>Exames & Imagens ({attachments.length + images.length})</span>
                    </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-6">
                    {/* Linha 1: Dados Iniciais */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                        <div className="sm:col-span-4">
                            <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">Data da Avaliação: *</label>
                            <input
                                type="date"
                                required
                                value={date}
                                onChange={e => setDate(e.target.value)}
                                className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2 text-slate-900 font-semibold focus:ring-2 focus:ring-teal-500"
                            />
                        </div>

                        <div className="sm:col-span-4">
                            <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">Especialidade / Área:</label>
                            <input
                                type="text"
                                value={specialty}
                                onChange={e => setSpecialty(e.target.value)}
                                className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2 text-slate-900 font-semibold focus:ring-2 focus:ring-teal-500"
                            />
                        </div>

                        <div className="sm:col-span-4">
                            <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">Avaliador Responsável:</label>
                            <select
                                value={selectedProfessionalId}
                                onChange={e => handleProfessionalChange(e.target.value)}
                                className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2 text-slate-900 font-semibold focus:ring-2 focus:ring-teal-500"
                            >
                                <option value="">Selecione o profissional...</option>
                                {professionals.map(p => (
                                    <option key={p.id} value={p.id}>{p.name} ({p.specialty})</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* ABA 1: FORMULÁRIO COMPLETO */}
                    {activeTab === 'form' && (
                        <div className="space-y-5 animate-fade-in">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                                <div>
                                    <h3 className="text-base font-black text-slate-900">
                                        {activeEvaluationTitle}
                                    </h3>
                                    <span className="text-xs text-slate-500">Preencha os dados do exame clínico e semiologia</span>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setIsAddingField(true)}
                                    className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Adicionar Campo Clínico</span>
                                </button>
                            </div>

                            {/* Caixa Expansível de Adicionar Campo Personalizado */}
                            {isAddingField && (
                                <div className="bg-teal-50/90 p-3.5 rounded-xl border border-teal-200 animate-fade-in flex flex-col sm:flex-row items-center gap-2">
                                    <input
                                        type="text"
                                        placeholder="Nome da pergunta/campo (Ex: Histórico Familiar, Cirurgias Prévias...)"
                                        value={newFieldTitle}
                                        onChange={e => setNewFieldTitle(e.target.value)}
                                        className="flex-1 text-xs bg-white border border-slate-200 rounded-lg p-2 font-semibold text-slate-900 focus:ring-2 focus:ring-teal-500 w-full"
                                        autoFocus
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleAddCustomField();
                                            }
                                        }}
                                    />
                                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                                        <button
                                            type="button"
                                            onClick={handleAddCustomField}
                                            className="px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                                        >
                                            Inserir
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { setIsAddingField(false); setNewFieldTitle(''); }}
                                            className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* 1. APRESENTAÇÃO DO PACIENTE */}
                            <div>
                                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1.5">
                                    Apresentação do Paciente *
                                </label>
                                <textarea
                                    rows={3}
                                    required
                                    value={patientPresentation}
                                    onChange={e => setPatientPresentation(e.target.value)}
                                    placeholder="Queixa principal, história da moléstia atual (HMA) e início dos sintomas..."
                                    className="w-full text-xs bg-white border border-slate-200 rounded-xl p-3 text-slate-900 focus:ring-2 focus:ring-teal-500"
                                />
                            </div>

                            {/* 2. USA MEDICAMENTOS? */}
                            <div>
                                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1.5">
                                    Usa Medicamentos?
                                </label>
                                <input
                                    type="text"
                                    value={medications}
                                    onChange={e => setMedications(e.target.value)}
                                    placeholder="Ex: Anti-inflamatório contínuo, analgésico..."
                                    className="w-full text-xs bg-white border border-slate-200 rounded-xl p-3 text-slate-900 focus:ring-2 focus:ring-teal-500"
                                />
                            </div>

                            {/* 3. INSPEÇÃO / PALPAÇÃO */}
                            <div>
                                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1.5">
                                    Inspeção / Palpação
                                </label>
                                <textarea
                                    rows={3}
                                    value={inspectionPalpation}
                                    onChange={e => setInspectionPalpation(e.target.value)}
                                    placeholder="Edema, temperatura local, contraturas musculares, pontos de gatilho miofasciais..."
                                    className="w-full text-xs bg-white border border-slate-200 rounded-xl p-3 text-slate-900 focus:ring-2 focus:ring-teal-500"
                                />
                            </div>

                            {/* 4. SEMIOLOGIA */}
                            <div>
                                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1.5">
                                    Semiologia
                                </label>
                                <textarea
                                    rows={2}
                                    value={semiology}
                                    onChange={e => setSemiology(e.target.value)}
                                    placeholder="Sinais clínicos vitais, achados gerais..."
                                    className="w-full text-xs bg-white border border-slate-200 rounded-xl p-3 text-slate-900 focus:ring-2 focus:ring-teal-500"
                                />
                            </div>

                            {/* 5. MOVIMENTOS ATIVOS / FORÇA MUSCULAR / GONIOMETRIA / FLEXIBILIDADE */}
                            <div>
                                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1.5">
                                    Movimentos Ativos / Força Muscular / Goniometria / Flexibilidade
                                </label>
                                <textarea
                                    rows={3}
                                    value={activeMovementsStrength}
                                    onChange={e => setActiveMovementsStrength(e.target.value)}
                                    placeholder="Graus de amplitude articular (ADM), testes de força muscular de 0 a 5..."
                                    className="w-full text-xs bg-white border border-slate-200 rounded-xl p-3 text-slate-900 focus:ring-2 focus:ring-teal-500"
                                />
                            </div>

                            {/* 6. MOVIMENTOS PASSIVOS */}
                            <div>
                                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1.5">
                                    Movimentos Passivos
                                </label>
                                <textarea
                                    rows={2}
                                    value={passiveMovements}
                                    onChange={e => setPassiveMovements(e.target.value)}
                                    placeholder="End-feel articular, dor ao estiramento passivo..."
                                    className="w-full text-xs bg-white border border-slate-200 rounded-xl p-3 text-slate-900 focus:ring-2 focus:ring-teal-500"
                                />
                            </div>

                            {/* 7. TESTES FUNCIONAIS */}
                            <div>
                                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1.5">
                                    Testes Funcionais
                                </label>
                                <textarea
                                    rows={2}
                                    value={functionalTests}
                                    onChange={e => setFunctionalTests(e.target.value)}
                                    placeholder="Transferências, sentar e levantar, agachamento..."
                                    className="w-full text-xs bg-white border border-slate-200 rounded-xl p-3 text-slate-900 focus:ring-2 focus:ring-teal-500"
                                />
                            </div>

                            {/* 8. MARCHA / PROPRIOCEPÇÃO */}
                            <div>
                                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1.5">
                                    Marcha / Propriocepção
                                </label>
                                <textarea
                                    rows={2}
                                    value={gaitProprioception}
                                    onChange={e => setGaitProprioception(e.target.value)}
                                    placeholder="Fases da marcha, claudicação, apoio unipodal e equilíbrio estático/dinâmico..."
                                    className="w-full text-xs bg-white border border-slate-200 rounded-xl p-3 text-slate-900 focus:ring-2 focus:ring-teal-500"
                                />
                            </div>

                            {/* 9. TESTES ESPECÍFICOS */}
                            <div>
                                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1.5">
                                    Testes Específicos
                                </label>
                                <textarea
                                    rows={3}
                                    value={specificTests}
                                    onChange={e => setSpecificTests(e.target.value)}
                                    placeholder="Ex: Teste de Lasègue, Neer, Hawkins-Kennedy, Lachman, Gaveta anterior..."
                                    className="w-full text-xs bg-white border border-slate-200 rounded-xl p-3 text-slate-900 focus:ring-2 focus:ring-teal-500"
                                />
                            </div>

                            {/* Campos Personalizados Adicionados */}
                            {customFields.map((field, idx) => (
                                <div key={field.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/90 relative">
                                    <div className="flex justify-between items-center mb-1.5">
                                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                                            {field.title}
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveCustomField(field.id)}
                                            className="text-slate-400 hover:text-red-600 p-1 transition-colors"
                                            title="Remover campo"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                    <textarea
                                        rows={2}
                                        value={field.value}
                                        onChange={e => {
                                            const val = e.target.value;
                                            setCustomFields(prev => prev.map(f => f.id === field.id ? { ...f, value: val } : f));
                                        }}
                                        placeholder={`Relato de ${field.title}...`}
                                        className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:ring-2 focus:ring-teal-500"
                                    />
                                </div>
                            ))}

                            {/* 10. AVALIAÇÃO DA INTENSIDADE DOR */}
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                                <div className="flex justify-between items-center">
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                                        Avaliação da Intensidade da Dor (Escala EVA: {painIntensity}/10)
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('pain_map')}
                                        className="text-xs font-bold text-teal-600 hover:underline cursor-pointer"
                                    >
                                        Abrir Mapa de Dor Anatômico ({painPoints.length} pontos) →
                                    </button>
                                </div>
                                <input
                                    type="range"
                                    min={0}
                                    max={10}
                                    value={painIntensity}
                                    onChange={e => setPainIntensity(Number(e.target.value))}
                                    className="w-full accent-teal-600 cursor-pointer"
                                />
                            </div>

                            {/* 11. DIAGNÓSTICO CINÉTICO FUNCIONAL */}
                            <div>
                                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1.5">
                                    Diagnóstico Cinético Funcional
                                </label>
                                <textarea
                                    rows={4}
                                    value={functionalDiagnosis}
                                    onChange={e => setFunctionalDiagnosis(e.target.value)}
                                    placeholder="Conclusão fisioterapêutica, déficits biomecânicos e proposta de tratamento..."
                                    className="w-full text-xs bg-white border border-slate-200 rounded-xl p-3 text-slate-900 focus:ring-2 focus:ring-teal-500"
                                />
                            </div>
                        </div>
                    )}

                    {/* ABA 2: MAPA DE DOR ANATÔMICO */}
                    {activeTab === 'pain_map' && (
                        <div className="animate-fade-in">
                            <BodyPainMap
                                painPoints={painPoints}
                                onChange={setPainPoints}
                            />
                        </div>
                    )}

                    {/* ABA 3: EXAMES COMPLEMENTARES & IMAGENS */}
                    {activeTab === 'attachments' && (
                        <div className="space-y-6 animate-fade-in">
                            {/* Seção Exames Complementares */}
                            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-3">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Exames Complementares (Laudos, PDFs)</h4>
                                        <p className="text-[11px] text-slate-500">Segure o Ctrl para selecionar mais de um arquivo</p>
                                    </div>
                                    <label className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-2xs">
                                        <UploadCloud className="w-3.5 h-3.5" />
                                        <span>{uploadingFiles ? 'Enviando...' : 'Escolher Ficheiros'}</span>
                                        <input
                                            type="file"
                                            multiple
                                            className="hidden"
                                            onChange={e => handleFileUpload(e, 'attachments')}
                                        />
                                    </label>
                                </div>

                                {attachments.length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                                        {attachments.map((url, idx) => (
                                            <div key={idx} className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-slate-200 text-xs">
                                                <a href={url} target="_blank" rel="noopener noreferrer" className="font-semibold text-teal-700 hover:underline truncate max-w-[200px]">
                                                    📄 Exame anexo #{idx + 1}
                                                </a>
                                                <button
                                                    type="button"
                                                    onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                                                    className="text-red-400 hover:text-red-600 p-1"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-4 bg-white rounded-lg border border-dashed border-slate-200 text-center text-xs text-slate-400">
                                        Nenhum exame complementar anexado.
                                    </div>
                                )}
                            </div>

                            {/* Seção Imagens & Fotos */}
                            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-3">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Imagens & Fotos Posturais</h4>
                                        <p className="text-[11px] text-slate-500">Fotos comparativas e registros de inspeção visual</p>
                                    </div>
                                    <label className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-2xs">
                                        <Image className="w-3.5 h-3.5" />
                                        <span>Adicionar Fotos</span>
                                        <input
                                            type="file"
                                            multiple
                                            accept="image/*"
                                            className="hidden"
                                            onChange={e => handleFileUpload(e, 'images')}
                                        />
                                    </label>
                                </div>

                                {images.length > 0 ? (
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                                        {images.map((url, idx) => (
                                            <div key={idx} className="relative group rounded-xl overflow-hidden border border-slate-200 aspect-square bg-white">
                                                <img src={url} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                                                <button
                                                    type="button"
                                                    onClick={() => setImages(prev => prev.filter((_, i) => i !== idx))}
                                                    className="absolute top-1.5 right-1.5 p-1 bg-red-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-4 bg-white rounded-lg border border-dashed border-slate-200 text-center text-xs text-slate-400">
                                        Nenhuma imagem cadastrada.
                                    </div>
                                )}
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
                            className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                        >
                            <Save className="w-3.5 h-3.5" />
                            {saving ? 'Salvando...' : 'Salvar Avaliação'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Modal de Construtor de Modelos de Avaliação */}
            {isTemplateModalOpen && (
                <ClinicalTemplateModal
                    isOpen={isTemplateModalOpen}
                    onClose={() => setIsTemplateModalOpen(false)}
                    type="evaluation"
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
