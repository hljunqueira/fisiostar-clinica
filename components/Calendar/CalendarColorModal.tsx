import React, { useState, useEffect } from 'react';
import { X, Palette, Check, RefreshCw, UserCheck, Tag, Bookmark, Eye, Pipette } from 'lucide-react';
import { SessionStatus, Professional } from '../../types';
import toast from 'react-hot-toast';

export type ColorMode = 'status' | 'professional' | 'specialty';

export interface ColorEntry {
    bg: string;
    border: string;
    text: string;
    hex?: string;
}

export interface ColorConfig {
    mode: ColorMode;
    statusColors: Record<string, ColorEntry>;
    professionalColors: Record<string, ColorEntry>;
    specialtyColors: Record<string, ColorEntry>;
}

export const PRESET_SWATCHES = [
    { name: 'Azul', bg: 'bg-blue-50', border: 'border-l-blue-500', text: 'text-blue-900', dot: 'bg-blue-500', hex: '#3B82F6' },
    { name: 'Esmeralda', bg: 'bg-emerald-50', border: 'border-l-emerald-500', text: 'text-emerald-900', dot: 'bg-emerald-500', hex: '#10B981' },
    { name: 'Âmbar', bg: 'bg-amber-50', border: 'border-l-amber-500', text: 'text-amber-900', dot: 'bg-amber-500', hex: '#F59E0B' },
    { name: 'Vermelho', bg: 'bg-red-50', border: 'border-l-red-500', text: 'text-red-900', dot: 'bg-red-500', hex: '#EF4444' },
    { name: 'Roxo', bg: 'bg-purple-50', border: 'border-l-purple-500', text: 'text-purple-900', dot: 'bg-purple-500', hex: '#8B5CF6' },
    { name: 'Rosa', bg: 'bg-pink-50', border: 'border-l-pink-500', text: 'text-pink-900', dot: 'bg-pink-500', hex: '#EC4899' },
    { name: 'Ciano', bg: 'bg-cyan-50', border: 'border-l-cyan-500', text: 'text-cyan-900', dot: 'bg-cyan-500', hex: '#06B6D4' },
    { name: 'Laranja', bg: 'bg-orange-50', border: 'border-l-orange-500', text: 'text-orange-900', dot: 'bg-orange-500', hex: '#F97316' },
    { name: 'Cinza', bg: 'bg-gray-100', border: 'border-l-gray-400', text: 'text-gray-800', dot: 'bg-gray-400', hex: '#6B7280' },
];

export const DEFAULT_COLOR_CONFIG: ColorConfig = {
    mode: 'professional',
    statusColors: {
        [SessionStatus.SCHEDULED]: { bg: 'bg-blue-50', border: 'border-l-blue-500', text: 'text-blue-900', hex: '#3B82F6' },
        [SessionStatus.CONFIRMED]: { bg: 'bg-cyan-50', border: 'border-l-cyan-500', text: 'text-cyan-900', hex: '#06B6D4' },
        [SessionStatus.COMPLETED]: { bg: 'bg-emerald-50', border: 'border-l-emerald-500', text: 'text-emerald-900', hex: '#10B981' },
        [SessionStatus.NOSHOW]: { bg: 'bg-red-50', border: 'border-l-red-500', text: 'text-red-900', hex: '#EF4444' },
        [SessionStatus.CANCELED]: { bg: 'bg-gray-100', border: 'border-l-gray-400', text: 'text-gray-700', hex: '#6B7280' },
    },
    professionalColors: {},
    specialtyColors: {
        'Pilates': { bg: 'bg-purple-50', border: 'border-l-purple-500', text: 'text-purple-900', hex: '#8B5CF6' },
        'Fisioterapia': { bg: 'bg-blue-50', border: 'border-l-blue-500', text: 'text-blue-900', hex: '#3B82F6' },
        'RPG': { bg: 'bg-emerald-50', border: 'border-l-emerald-500', text: 'text-emerald-900', hex: '#10B981' },
        'Hidroterapia': { bg: 'bg-cyan-50', border: 'border-l-cyan-500', text: 'text-cyan-900', hex: '#06B6D4' },
    }
};

export const getColorStyles = (entry?: ColorEntry) => {
    if (!entry) {
        return {
            className: 'bg-blue-50 border-l-blue-500 text-blue-900',
            dotClassName: 'bg-blue-500',
            style: {},
            dotStyle: {}
        };
    }

    if (entry.hex) {
        return {
            className: 'border-l-[3px]',
            dotClassName: '',
            style: {
                backgroundColor: `${entry.hex}1F`, // ~12% opacity
                borderLeftColor: entry.hex,
                color: entry.hex
            },
            dotStyle: {
                backgroundColor: entry.hex
            }
        };
    }

    return {
        className: `${entry.bg} ${entry.border} ${entry.text}`,
        dotClassName: 'bg-blue-500',
        style: {},
        dotStyle: {}
    };
};

export const getSavedColorConfig = (): ColorConfig => {
    try {
        const saved = localStorage.getItem('calendar_color_config');
        if (saved) {
            return JSON.parse(saved);
        }
    } catch (e) {
        console.error('Error reading saved color config', e);
    }
    return DEFAULT_COLOR_CONFIG;
};

interface CalendarColorModalProps {
    isOpen: boolean;
    onClose: () => void;
    professionals: Professional[];
    specialtiesList?: string[];
    onSaveConfig: (config: ColorConfig) => void;
}

export const CalendarColorModal: React.FC<CalendarColorModalProps> = ({
    isOpen,
    onClose,
    professionals,
    specialtiesList = ['Pilates', 'Fisioterapia', 'RPG', 'Hidroterapia'],
    onSaveConfig
}) => {
    const [config, setConfig] = useState<ColorConfig>(getSavedColorConfig());

    useEffect(() => {
        if (isOpen) {
            const current = getSavedColorConfig();

            // Auto-populate professional default colors if not defined
            const updatedProfColors = { ...current.professionalColors };
            professionals.forEach((p, idx) => {
                if (!updatedProfColors[p.id]) {
                    const preset = PRESET_SWATCHES[idx % PRESET_SWATCHES.length];
                    updatedProfColors[p.id] = { bg: preset.bg, border: preset.border, text: preset.text, hex: preset.hex };
                }
            });

            setConfig({
                ...current,
                professionalColors: updatedProfColors
            });
        }
    }, [isOpen, professionals]);

    if (!isOpen) return null;

    const handleSave = () => {
        try {
            localStorage.setItem('calendar_color_config', JSON.stringify(config));
            onSaveConfig(config);
            toast.success('Cores personalizadas salvas!');
            onClose();
        } catch (e) {
            console.error('Error saving color config', e);
            toast.error('Erro ao salvar configuração de cores.');
        }
    };

    const setItemColor = (category: 'status' | 'professional' | 'specialty', key: string, swatch: typeof PRESET_SWATCHES[0]) => {
        setConfig(prev => {
            const field = category === 'status' ? 'statusColors' : category === 'professional' ? 'professionalColors' : 'specialtyColors';
            return {
                ...prev,
                [field]: {
                    ...prev[field],
                    [key]: { bg: swatch.bg, border: swatch.border, text: swatch.text, hex: swatch.hex }
                }
            };
        });
    };

    const setCustomHexColor = (category: 'status' | 'professional' | 'specialty', key: string, hexValue: string) => {
        setConfig(prev => {
            const field = category === 'status' ? 'statusColors' : category === 'professional' ? 'professionalColors' : 'specialtyColors';
            return {
                ...prev,
                [field]: {
                    ...prev[field],
                    [key]: { bg: '', border: '', text: '', hex: hexValue }
                }
            };
        });
    };

    const findSwatchByBgOrHex = (entry?: ColorEntry) => {
        if (!entry) return PRESET_SWATCHES[0];
        if (entry.hex) {
            const matched = PRESET_SWATCHES.find(s => s.hex?.toLowerCase() === entry.hex?.toLowerCase());
            if (matched) return matched;
        }
        return PRESET_SWATCHES.find(s => s.bg === entry.bg) || PRESET_SWATCHES[0];
    };

    const renderItemRow = (category: 'status' | 'professional' | 'specialty', key: string, title: string, subtitle?: string) => {
        const field = category === 'status' ? 'statusColors' : category === 'professional' ? 'professionalColors' : 'specialtyColors';
        const current = config[field][key] || PRESET_SWATCHES[0];
        const styles = getColorStyles(current);

        return (
            <div key={key} className="p-3.5 bg-gray-50/80 rounded-2xl border border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:border-gray-200 transition-colors">
                <div className="flex items-center gap-2.5">
                    <span
                        className={`w-4 h-4 rounded-full shadow-xs transition-all ${styles.dotClassName}`}
                        style={styles.dotStyle}
                    />
                    <div>
                        <p className="text-xs font-bold text-gray-800">{title}</p>
                        {subtitle && <p className="text-[10px] text-gray-400">{subtitle}</p>}
                    </div>
                </div>

                <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-gray-200/70 shadow-xs">
                    {PRESET_SWATCHES.map(swatch => (
                        <button
                            key={swatch.name}
                            type="button"
                            onClick={() => setItemColor(category, key, swatch)}
                            className={`w-5 h-5 rounded-full ${swatch.dot} transition-transform hover:scale-125 relative flex items-center justify-center ${current.hex?.toLowerCase() === swatch.hex.toLowerCase() ? 'scale-110 ring-2 ring-offset-1 ring-blue-600' : 'opacity-80 hover:opacity-100'
                                }`}
                            title={swatch.name}
                        />
                    ))}

                    {/* Custom Hex Color Picker (Pipette) */}
                    <div className="w-[1px] h-4 bg-gray-200 mx-0.5" />

                    <label
                        className={`w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center cursor-pointer transition-transform hover:scale-110 relative bg-gradient-to-tr from-purple-500 via-pink-500 to-amber-500 text-white shadow-xs ${!PRESET_SWATCHES.some(s => s.hex.toLowerCase() === (current.hex || '').toLowerCase()) ? 'ring-2 ring-offset-1 ring-blue-600 scale-110' : 'opacity-85 hover:opacity-100'
                            }`}
                        title="Escolher Cor Personalizada (Pipeta / Rodinha de Cores)"
                    >
                        <Pipette className="w-3.5 h-3.5 text-white drop-shadow-xs" />
                        <input
                            type="color"
                            value={current.hex || '#3B82F6'}
                            onChange={(e) => setCustomHexColor(category, key, e.target.value)}
                            className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                        />
                    </label>
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-gray-100 relative max-h-[92vh] flex flex-col">

                {/* Header */}
                <div className="flex justify-between items-start pb-4 border-b border-gray-100 mb-5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shadow-xs">
                            <Palette className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Estilo dos Agendamentos</h2>
                            <p className="text-xs text-gray-500">Escolha paletas pré-definidas ou use a pipeta para cores personalizadas</p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="space-y-6 overflow-y-auto pr-1 flex-1">

                    {/* Mode Selector - Segmented Control */}
                    <div>
                        <span className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Organizar Cores Por</span>
                        <div className="bg-gray-100/80 p-1.5 rounded-2xl flex gap-1 border border-gray-200/60">
                            <button
                                type="button"
                                onClick={() => setConfig(prev => ({ ...prev, mode: 'professional' }))}
                                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 ${config.mode === 'professional'
                                        ? 'bg-white text-gray-900 shadow-sm border border-gray-200/80'
                                        : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                                    }`}
                            >
                                <UserCheck className={`w-4 h-4 ${config.mode === 'professional' ? 'text-blue-600' : 'text-gray-400'}`} />
                                Profissional
                            </button>

                            <button
                                type="button"
                                onClick={() => setConfig(prev => ({ ...prev, mode: 'status' }))}
                                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 ${config.mode === 'status'
                                        ? 'bg-white text-gray-900 shadow-sm border border-gray-200/80'
                                        : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                                    }`}
                            >
                                <Tag className={`w-4 h-4 ${config.mode === 'status' ? 'text-blue-600' : 'text-gray-400'}`} />
                                Status
                            </button>

                            <button
                                type="button"
                                onClick={() => setConfig(prev => ({ ...prev, mode: 'specialty' }))}
                                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 ${config.mode === 'specialty'
                                        ? 'bg-white text-gray-900 shadow-sm border border-gray-200/80'
                                        : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                                    }`}
                            >
                                <Bookmark className={`w-4 h-4 ${config.mode === 'specialty' ? 'text-blue-600' : 'text-gray-400'}`} />
                                Especialidade
                            </button>
                        </div>
                    </div>

                    {/* Color Swatches Category List */}
                    <div className="space-y-3">
                        <span className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                            Personalizar Paleta de {config.mode === 'professional' ? 'Profissionais' : config.mode === 'status' ? 'Status' : 'Especialidades'}
                        </span>

                        {config.mode === 'professional' && professionals.map((prof) => (
                            renderItemRow('professional', prof.id, prof.name, prof.specialty || 'Geral')
                        ))}

                        {config.mode === 'status' && Object.values(SessionStatus).map((status) => (
                            renderItemRow('status', status, status)
                        ))}

                        {config.mode === 'specialty' && specialtiesList.map((spec) => (
                            renderItemRow('specialty', spec, spec)
                        ))}
                    </div>

                    {/* Live Card Preview Box */}
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-3">
                            <Eye className="w-4 h-4 text-blue-600" /> Pré-visualização na Agenda
                        </div>

                        <div className="space-y-2">
                            {(config.mode === 'professional' ? professionals.slice(0, 2) : config.mode === 'status' ? [SessionStatus.SCHEDULED, SessionStatus.CONFIRMED] : specialtiesList.slice(0, 2)).map((item, idx) => {
                                const key = typeof item === 'string' ? item : item.id;
                                const labelName = typeof item === 'string' ? item : item.name;

                                const colorEntry = config.mode === 'professional'
                                    ? config.professionalColors[key]
                                    : config.mode === 'status'
                                        ? config.statusColors[key]
                                        : config.specialtyColors[key];

                                const styles = getColorStyles(colorEntry || PRESET_SWATCHES[idx]);

                                return (
                                    <div
                                        key={key}
                                        className={`p-2.5 rounded-lg border-l-4 text-xs shadow-2xs ${styles.className}`}
                                        style={styles.style}
                                    >
                                        <div className="flex justify-between items-center font-bold text-[11px]">
                                            <span>08:00 - Maria Silva</span>
                                            <span className="text-[10px] opacity-75">{labelName}</span>
                                        </div>
                                        <p className="text-[10px] opacity-80 mt-0.5">Sessão de Fisioterapia • Sala 01</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="flex justify-between items-center pt-4 border-t border-gray-100 mt-4">
                    <button
                        type="button"
                        onClick={() => {
                            setConfig(DEFAULT_COLOR_CONFIG);
                            toast('Cores restauradas para o padrão', { icon: '🔄' });
                        }}
                        className="text-xs font-semibold text-gray-500 hover:text-gray-700 flex items-center gap-1.5 py-2 px-3 rounded-xl hover:bg-gray-100 transition-colors"
                    >
                        <RefreshCw className="w-3.5 h-3.5" /> Restaurar Padrão
                    </button>

                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm flex items-center gap-1.5 transition-colors"
                        >
                            <Check className="w-4 h-4" /> Salvar Cores
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CalendarColorModal;
