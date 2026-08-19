import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, MoveUp, MoveDown, Layers, FileText, CheckSquare, AlignLeft, Image, Paperclip, MapPin } from 'lucide-react';
import { ClinicalTemplate, ClinicalTemplateSection, Professional } from '../../types';
import { clinicalTemplatesApi } from '../../src/services/api';
import toast from 'react-hot-toast';

interface ClinicalTemplateModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: 'evolution' | 'evaluation';
    currentProfessional?: Professional | null;
    existingTemplate?: ClinicalTemplate | null;
    onSaveSuccess: (template: ClinicalTemplate) => void;
}

const DEFAULT_EVOLUTION_SECTIONS: ClinicalTemplateSection[] = [
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

const DEFAULT_EVALUATION_SECTIONS: ClinicalTemplateSection[] = [
    { id: 'patient_presentation', title: 'APRESENTAÇÃO DO PACIENTE', type: 'textarea', placeholder: 'Queixa principal e história atual...' },
    { id: 'complementary_exams', title: 'EXAMES COMPLEMENTARES', type: 'file_upload', placeholder: 'Laudos e exames de imagem...' },
    { id: 'medications', title: 'USA MEDICAMENTOS?', type: 'text', placeholder: 'Medicamentos em uso...' },
    { id: 'inspection_palpation', title: 'INSPEÇÃO/PALPAÇÃO', type: 'textarea', placeholder: 'Edema, contraturas, dor palpatória...' },
    { id: 'semiology', title: 'SEMIOLOGIA', type: 'textarea', placeholder: 'Achados semiológicos gerais...' },
    { id: 'active_movements', title: 'MOVIMENTOS ATIVOS / FORÇA MUSCULAR / GONIOMETRIA / FLEXIBILIDADE', type: 'textarea', placeholder: 'Amplitude articular e força...' },
    { id: 'passive_movements', title: 'MOVIMENTOS PASSIVOS', type: 'textarea', placeholder: 'End-feel e bloqueios...' },
    { id: 'functional_tests', title: 'TESTES FUNCIONAIS', type: 'textarea', placeholder: 'Desempenho funcional...' },
    { id: 'gait_proprioception', title: 'MARCHA / PROPRIOCEPÇÃO', type: 'textarea', placeholder: 'Padrão de marcha e equilíbrio...' },
    { id: 'specific_tests', title: 'TESTES ESPECÍFICOS', type: 'textarea', placeholder: 'Testes ortopédicos especiais...' },
    { id: 'pain_intensity', title: 'AVALIAÇÃO DA INTENSIDADE DOR', type: 'pain_map', placeholder: 'Escala de dor e mapa corporal...' },
    { id: 'functional_diagnosis', title: 'DIAGNÓSTICO CINÉTICO FUNCIONAL', type: 'textarea', placeholder: 'Conclusão diagnóstica e plano...' },
    { id: 'images', title: 'IMAGENS', type: 'image_upload', placeholder: 'Fotos comparativas do paciente...' }
];

export const ClinicalTemplateModal: React.FC<ClinicalTemplateModalProps> = ({
    isOpen,
    onClose,
    type,
    currentProfessional,
    existingTemplate,
    onSaveSuccess
}) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState<'standard' | 'restricted' | 'custom'>('custom');
    const [sections, setSections] = useState<ClinicalTemplateSection[]>([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!isOpen) return;

        if (existingTemplate) {
            setTitle(existingTemplate.title);
            setDescription(existingTemplate.description || '');
            setCategory(existingTemplate.category || 'custom');
            setSections(existingTemplate.sections || []);
        } else {
            setTitle(type === 'evolution' ? `Evolução ${currentProfessional?.name || 'Profissional'}` : `Avaliação ${currentProfessional?.name || 'Profissional'}`);
            setDescription('');
            setCategory('custom');
            setSections(type === 'evolution' ? DEFAULT_EVOLUTION_SECTIONS : DEFAULT_EVALUATION_SECTIONS);
        }
    }, [isOpen, existingTemplate, type, currentProfessional]);

    if (!isOpen) return null;

    const handleAddSection = (sectionType: ClinicalTemplateSection['type']) => {
        const newSec: ClinicalTemplateSection = {
            id: `sec_${Date.now()}`,
            title: sectionType === 'checkbox_text' ? 'Nova Conduta Terapêutica' : 'Novo Campo Clínico',
            type: sectionType,
            checked: true,
            placeholder: 'Digite a descrição ou relato...'
        };
        setSections(prev => [...prev, newSec]);
    };

    const handleRemoveSection = (index: number) => {
        setSections(prev => prev.filter((_, i) => i !== index));
    };

    const handleUpdateSection = (index: number, updates: Partial<ClinicalTemplateSection>) => {
        setSections(prev => prev.map((s, i) => i === index ? { ...s, ...updates } : s));
    };

    const handleMoveSection = (index: number, direction: 'up' | 'down') => {
        if ((direction === 'up' && index === 0) || (direction === 'down' && index === sections.length - 1)) return;
        const newSections = [...sections];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        const [moved] = newSections.splice(index, 1);
        newSections.splice(targetIndex, 0, moved);
        setSections(newSections);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) {
            toast.error('Informe o nome do modelo.');
            return;
        }

        if (sections.length === 0) {
            toast.error('O modelo precisa ter pelo menos um bloco.');
            return;
        }

        try {
            setSaving(true);
            let saved: ClinicalTemplate;

            if (existingTemplate?.id) {
                saved = await clinicalTemplatesApi.update(existingTemplate.id, {
                    title: title.trim(),
                    description: description.trim() || undefined,
                    category,
                    sections
                });
                toast.success('Modelo atualizado com sucesso!');
            } else {
                saved = await clinicalTemplatesApi.create({
                    type,
                    category,
                    professionalId: currentProfessional?.id || undefined,
                    title: title.trim(),
                    description: description.trim() || undefined,
                    sections,
                    isSystem: false
                });
                toast.success('Novo modelo salvo com sucesso!');
            }

            onSaveSuccess(saved);
            onClose();
        } catch (err: any) {
            console.error('Erro ao salvar modelo:', err);
            toast.error(err.message || 'Erro ao salvar modelo');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl relative z-10 overflow-hidden animate-fade-in border border-slate-200 flex flex-col max-h-[92vh]">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-700 to-indigo-800 p-5 text-white flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-white/15 rounded-xl backdrop-blur-sm">
                            <Layers className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                {existingTemplate ? 'Editar Modelo' : `Novo Modelo de ${type === 'evolution' ? 'Evolução' : 'Avaliação'}`}
                            </h2>
                            <p className="text-xs text-blue-100">Personalize os blocos, caixas de texto e opções do seu atendimento</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-white/80 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form Content */}
                <form onSubmit={handleSave} className="p-6 overflow-y-auto flex-1 space-y-6">
                    {/* Linha de Identificação */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                        <div className="sm:col-span-8">
                            <label className="text-xs font-bold text-slate-700 uppercase block mb-1">Nome do Modelo *</label>
                            <input
                                type="text"
                                required
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                placeholder="Ex: Evolução Ortopédica, Avaliação Cinético-Funcional..."
                                className="w-full text-xs font-bold bg-white border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div className="sm:col-span-4">
                            <label className="text-xs font-bold text-slate-700 uppercase block mb-1">Categoria</label>
                            <select
                                value={category}
                                onChange={e => setCategory(e.target.value as any)}
                                className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="custom">Minhas Evoluções / Pessoal</option>
                                <option value="standard">Evolução Padrão da Clínica</option>
                                <option value="restricted">Restrita / Especializada</option>
                            </select>
                        </div>

                        <div className="sm:col-span-12">
                            <label className="text-xs font-semibold text-slate-600 block mb-1">Descrição Breve (Opcional)</label>
                            <input
                                type="text"
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder="Ex: Modelo com 10 condutas rápidas para pacientes ortopédicos"
                                className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2 text-slate-900"
                            />
                        </div>
                    </div>

                    {/* Lista de Seções / Blocos do Modelo */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                                Blocos e Campos do Modelo ({sections.length})
                            </h3>
                            <span className="text-[11px] text-slate-500">Arraste ou use as setas para reordenar</span>
                        </div>

                        <div className="space-y-2.5">
                            {sections.map((sec, idx) => (
                                <div
                                    key={sec.id || idx}
                                    className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-blue-300 transition-all"
                                >
                                    <div className="flex items-center gap-2.5 flex-1">
                                        <span className="w-6 h-6 rounded-md bg-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center shrink-0">
                                            #{idx + 1}
                                        </span>

                                        <div className="flex-1 space-y-1">
                                            <input
                                                type="text"
                                                value={sec.title}
                                                onChange={e => handleUpdateSection(idx, { title: e.target.value })}
                                                className="w-full text-xs font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:bg-white focus:ring-2 focus:ring-blue-500"
                                            />
                                            <span className="text-[10px] text-slate-500 block">
                                                Tipo: {sec.type === 'checkbox_text' ? '☑️ Checkbox + Caixa de Relato' :
                                                       sec.type === 'textarea' ? '📝 Área de Texto Completa' :
                                                       sec.type === 'pain_map' ? '📍 Mapa Anatômico de Pontos de Dor' :
                                                       sec.type === 'file_upload' ? '📎 Upload de Exames Complementares' :
                                                       sec.type === 'image_upload' ? '🖼️ Upload de Imagens/Fotos' :
                                                       'Linha de Texto'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                                        <button
                                            type="button"
                                            onClick={() => handleMoveSection(idx, 'up')}
                                            disabled={idx === 0}
                                            className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded-lg hover:bg-slate-100 cursor-pointer"
                                            title="Mover para cima"
                                        >
                                            <MoveUp className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleMoveSection(idx, 'down')}
                                            disabled={idx === sections.length - 1}
                                            className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded-lg hover:bg-slate-100 cursor-pointer"
                                            title="Mover para baixo"
                                        >
                                            <MoveDown className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveSection(idx)}
                                            className="p-1.5 text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50 cursor-pointer"
                                            title="Excluir bloco"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Botões para Adicionar Novos Blocos */}
                        <div className="flex flex-wrap items-center gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => handleAddSection('checkbox_text')}
                                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                            >
                                <CheckSquare className="w-3.5 h-3.5" />
                                + Adicionar Checkbox + Caixa de Relato
                            </button>
                            <button
                                type="button"
                                onClick={() => handleAddSection('textarea')}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                            >
                                <AlignLeft className="w-3.5 h-3.5" />
                                + Adicionar Área de Texto
                            </button>
                            <button
                                type="button"
                                onClick={() => handleAddSection('pain_map')}
                                className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-xs rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                            >
                                <MapPin className="w-3.5 h-3.5" />
                                + Adicionar Mapa de Dor
                            </button>
                            <button
                                type="button"
                                onClick={() => handleAddSection('file_upload')}
                                className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                            >
                                <Paperclip className="w-3.5 h-3.5" />
                                + Adicionar Upload de Exames
                            </button>
                        </div>
                    </div>

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
                            {saving ? 'Salvando...' : 'Salvar Modelo'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
