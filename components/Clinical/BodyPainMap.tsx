import React, { useState } from 'react';
import { PainPoint } from '../../types';
import { Trash2, Plus, Check, Info, ZoomIn, Eye, Sparkles } from 'lucide-react';

interface BodyPainMapProps {
    painPoints: PainPoint[];
    onChange: (points: PainPoint[]) => void;
    readOnly?: boolean;
}

const EVA_COLORS: Record<number, { bg: string; text: string; label: string; ring: string }> = {
    0: { bg: 'bg-emerald-500', text: 'text-white', ring: 'ring-emerald-300', label: 'Sem dor' },
    1: { bg: 'bg-emerald-400', text: 'text-white', ring: 'ring-emerald-300', label: 'Muito leve' },
    2: { bg: 'bg-teal-500', text: 'text-white', ring: 'ring-teal-300', label: 'Leve' },
    3: { bg: 'bg-green-500', text: 'text-white', ring: 'ring-green-300', label: 'Leve / Moderada' },
    4: { bg: 'bg-yellow-500', text: 'text-white', ring: 'ring-yellow-300', label: 'Moderada' },
    5: { bg: 'bg-amber-500', text: 'text-white', ring: 'ring-amber-300', label: 'Desconforto' },
    6: { bg: 'bg-orange-500', text: 'text-white', ring: 'ring-orange-300', label: 'Intensa' },
    7: { bg: 'bg-orange-600', text: 'text-white', ring: 'ring-orange-400', label: 'Muito intensa' },
    8: { bg: 'bg-rose-500', text: 'text-white', ring: 'ring-rose-300', label: 'Severa' },
    9: { bg: 'bg-red-600', text: 'text-white', ring: 'ring-red-400', label: 'Muito severa' },
    10: { bg: 'bg-red-700', text: 'text-white', ring: 'ring-red-500', label: 'Insuportável' }
};

export const BodyPainMap: React.FC<BodyPainMapProps> = ({
    painPoints = [],
    onChange,
    readOnly = false
}) => {
    // Mode: 'all' = Todas as Vistas (mockup-muscular1-removebg-preview.png), 'single' = Vista Única (mockup-muscular.webp)
    const [viewMode, setViewMode] = useState<'all' | 'single'>('all');
    const [activePoint, setActivePoint] = useState<{ x: number; y: number; mode: 'all' | 'single' } | null>(null);
    const [selectedIntensity, setSelectedIntensity] = useState<number>(5);
    const [pointLabel, setPointLabel] = useState<string>('');
    const [editingPointId, setEditingPointId] = useState<string | null>(null);

    const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (readOnly) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
        const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);

        setEditingPointId(null);
        setActivePoint({ x, y, mode: viewMode });
        setSelectedIntensity(5);
        setPointLabel('');
    };

    const handleAddPoint = () => {
        if (!activePoint) return;

        const newPoint: PainPoint = {
            id: `pain-${Date.now()}`,
            view: activePoint.mode === 'all' ? 'front' : 'front',
            x: activePoint.x,
            y: activePoint.y,
            intensity: selectedIntensity,
            label: pointLabel.trim() || `Ponto de Dor (${activePoint.x}%, ${activePoint.y}%)`
        };

        onChange([...painPoints, newPoint]);
        setActivePoint(null);
    };

    const handleRemovePoint = (id: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        onChange(painPoints.filter(p => p.id !== id));
        if (editingPointId === id) setEditingPointId(null);
    };

    const handleUpdateIntensity = (id: string, newIntensity: number) => {
        onChange(painPoints.map(p => p.id === id ? { ...p, intensity: newIntensity } : p));
    };

    const currentImageSrc = viewMode === 'all'
        ? '/mockups/mockup-muscular1-removebg-preview.png'
        : '/mockups/mockup-muscular.webp';

    return (
        <div className="space-y-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
            {/* Header com Alternador entre "Todas as Vistas" e "Vista Única" */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                    <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                        <span>Mapa Anatômico de Pontos de Dor</span>
                        <span className="text-xs font-bold px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">
                            {painPoints.length} {painPoints.length === 1 ? 'ponto registrado' : 'pontos registrados'}
                        </span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Clique diretamente sobre o corpo para posicionar o ponto e classificar na escala EVA.
                    </p>
                </div>

                {/* Alternador de Modo */}
                <div className="flex items-center gap-2">
                    <div className="bg-slate-100 p-1 rounded-xl flex items-center text-xs font-bold text-slate-700">
                        <button
                            type="button"
                            onClick={() => { setViewMode('all'); setActivePoint(null); }}
                            className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${viewMode === 'all' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                            Todas as Vistas
                        </button>
                        <button
                            type="button"
                            onClick={() => { setViewMode('single'); setActivePoint(null); }}
                            className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${viewMode === 'single' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                            Vista Única
                        </button>
                    </div>
                </div>
            </div>

            {/* Container Interativo do Mockup */}
            <div className="flex flex-col items-center justify-center bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80">
                <div
                    onClick={handleImageClick}
                    className={`relative w-full max-w-2xl bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden flex items-center justify-center p-3 select-none ${readOnly ? 'cursor-default' : 'cursor-crosshair hover:border-blue-400 transition-colors'}`}
                >
                    {/* Imagem Mockup Anatômica */}
                    <img
                        src={currentImageSrc}
                        alt="Mapa Muscular Anatômico"
                        className="w-full h-auto max-h-[520px] object-contain pointer-events-none drop-shadow-sm"
                    />

                    {/* Pontos de Dor Cadastrados */}
                    {painPoints.map(p => {
                        const evaStyle = EVA_COLORS[p.intensity] || EVA_COLORS[5];

                        return (
                            <div
                                key={p.id}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (!readOnly) {
                                        setEditingPointId(editingPointId === p.id ? null : p.id);
                                    }
                                }}
                                style={{ left: `${p.x}%`, top: `${p.y}%` }}
                                className={`absolute -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full ${evaStyle.bg} ${evaStyle.text} border-2 border-white shadow-lg flex items-center justify-center text-[10px] font-black cursor-pointer transform hover:scale-125 transition-transform z-10`}
                                title={`${p.label || 'Ponto de Dor'}: EVA ${p.intensity}/10 (${evaStyle.label})`}
                            >
                                {p.intensity}

                                {/* Tooltip Popup de Edição / Remoção */}
                                {editingPointId === p.id && !readOnly && (
                                    <div
                                        onClick={(e) => e.stopPropagation()}
                                        className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 bg-slate-900 text-white p-3 rounded-xl shadow-2xl text-xs z-30 animate-fade-in"
                                    >
                                        <p className="font-bold text-white mb-1 truncate">{p.label}</p>
                                        <div className="flex items-center justify-between text-[11px] text-slate-300 mb-2">
                                            <span>Dor EVA: {p.intensity}/10</span>
                                            <span className="text-amber-400 font-semibold">{evaStyle.label}</span>
                                        </div>

                                        <div className="grid grid-cols-6 gap-1 mb-2">
                                            {[0, 2, 4, 6, 8, 10].map(val => (
                                                <button
                                                    key={val}
                                                    type="button"
                                                    onClick={() => handleUpdateIntensity(p.id, val)}
                                                    className={`py-0.5 rounded text-[10px] font-bold ${p.intensity === val ? 'bg-blue-500 text-white ring-1 ring-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                                                >
                                                    {val}
                                                </button>
                                            ))}
                                        </div>

                                        <button
                                            type="button"
                                            onClick={(e) => handleRemovePoint(p.id, e)}
                                            className="w-full py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-[10px] flex items-center justify-center gap-1 transition-colors cursor-pointer"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                            Remover Ponto
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {/* Ponto Ativo Sendo Adicionado */}
                    {activePoint && (
                        <div
                            style={{ left: `${activePoint.x}%`, top: `${activePoint.y}%` }}
                            className="absolute -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-blue-500 border-2 border-white shadow-xl animate-ping z-20"
                        />
                    )}
                </div>
            </div>

            {/* Painel de Configuração do Ponto Clicado */}
            {activePoint && !readOnly && (
                <div className="bg-blue-50/90 p-4 rounded-xl border border-blue-200 shadow-sm animate-fade-in space-y-3">
                    <div className="flex justify-between items-center">
                        <span className="text-xs font-extrabold text-blue-900 uppercase tracking-wide">
                            Registrar Ponto de Dor
                        </span>
                        <button
                            type="button"
                            onClick={() => setActivePoint(null)}
                            className="text-xs font-bold text-slate-400 hover:text-slate-700 cursor-pointer"
                        >
                            ✕ Cancelar
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                        <div className="sm:col-span-4">
                            <label className="text-[11px] font-bold text-slate-700 block mb-1">Região Anatômica / Músculo</label>
                            <input
                                type="text"
                                placeholder="Ex: Trapézio superior D, Lombar L4/L5, Quadríceps..."
                                value={pointLabel}
                                onChange={e => setPointLabel(e.target.value)}
                                className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2 font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500"
                                autoFocus
                                onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddPoint();
                                    }
                                }}
                            />
                        </div>

                        <div className="sm:col-span-5">
                            <div className="flex justify-between items-center mb-1">
                                <label className="text-[11px] font-bold text-slate-700">Intensidade da Dor (EVA: {selectedIntensity}/10)</label>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${EVA_COLORS[selectedIntensity].bg} text-white`}>
                                    {EVA_COLORS[selectedIntensity].label}
                                </span>
                            </div>
                            <input
                                type="range"
                                min={0}
                                max={10}
                                value={selectedIntensity}
                                onChange={e => setSelectedIntensity(Number(e.target.value))}
                                className="w-full accent-blue-600 cursor-pointer"
                            />
                        </div>

                        <div className="sm:col-span-3">
                            <button
                                type="button"
                                onClick={handleAddPoint}
                                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-colors shadow-xs cursor-pointer"
                            >
                                Inserir Ponto
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Lista Resumo dos Pontos de Dor */}
            {painPoints.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                        Pontos Marcados ({painPoints.length})
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {painPoints.map(p => {
                            const eva = EVA_COLORS[p.intensity] || EVA_COLORS[5];
                            return (
                                <div key={p.id} className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                                    <div className="flex items-center gap-2">
                                        <span className={`w-6 h-6 rounded-full ${eva.bg} text-white font-black text-[11px] flex items-center justify-center shrink-0`}>
                                            {p.intensity}
                                        </span>
                                        <div>
                                            <p className="text-xs font-bold text-slate-900 leading-tight">{p.label}</p>
                                            <span className="text-[10px] text-slate-500">
                                                EVA {p.intensity}/10 • {eva.label}
                                            </span>
                                        </div>
                                    </div>

                                    {!readOnly && (
                                        <button
                                            type="button"
                                            onClick={() => handleRemovePoint(p.id)}
                                            className="p-1 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                                            title="Remover ponto"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};
