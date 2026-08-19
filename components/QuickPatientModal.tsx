import React, { useState, useEffect } from 'react';
import { X, UserPlus, Phone, User, CreditCard, Building2, CheckCircle2, ShieldCheck, Loader2 } from 'lucide-react';
import { Patient, UnitId, Unit, Agreement } from '../types';
import { patientsApi, agreementsApi, unitsApi } from '../src/services/api';
import { maskPhone, maskCpf, validateCpf } from '../src/utils/masks';
import toast from 'react-hot-toast';

interface QuickPatientModalProps {
    isOpen: boolean;
    onClose: () => void;
    onPatientCreated: (patient: Patient) => void;
    currentUnit: UnitId;
    allUnits?: Unit[];
}

export const QuickPatientModal: React.FC<QuickPatientModalProps> = ({
    isOpen,
    onClose,
    onPatientCreated,
    currentUnit,
    allUnits = []
}) => {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [cpf, setCpf] = useState('');
    const [selectedUnitId, setSelectedUnitId] = useState<string>(currentUnit === 'ALL' ? (allUnits[0]?.id || '') : currentUnit);
    const [selectedAgreementId, setSelectedAgreementId] = useState<string>('');
    const [agreements, setAgreements] = useState<Agreement[]>([]);
    const [units, setUnits] = useState<Unit[]>(allUnits);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!isOpen) return;

        async function loadInitialData() {
            setLoading(true);
            try {
                const [agreementsList, unitsList] = await Promise.all([
                    agreementsApi.getAll(),
                    allUnits.length > 0 ? Promise.resolve(allUnits) : unitsApi.getAll()
                ]);

                setAgreements(agreementsList.filter(a => a.isActive));
                setUnits(unitsList);

                if (!selectedUnitId || selectedUnitId === 'ALL') {
                    setSelectedUnitId(currentUnit === 'ALL' ? (unitsList[0]?.id || '') : currentUnit);
                }
            } catch (err) {
                console.error('Erro ao carregar dados do cadastro rápido:', err);
            } finally {
                setLoading(false);
            }
        }

        loadInitialData();
    }, [isOpen, currentUnit, allUnits]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim()) {
            toast.error('Informe o nome do paciente.');
            return;
        }

        if (cpf && !validateCpf(cpf)) {
            toast.error('CPF inválido. Verifique os números informados.');
            return;
        }

        const unitToSave = selectedUnitId || (units[0]?.id || currentUnit);

        try {
            setSubmitting(true);
            const newPatientData: Omit<Patient, 'id'> = {
                name: name.trim(),
                phone: phone.trim() || '',
                cpf: cpf.trim() || undefined,
                unitId: unitToSave,
                agreementId: selectedAgreementId || undefined,
                status: 'Active',
                plan: {
                    name: 'Particular / Avulso',
                    totalSessions: 0,
                    remainingSessions: 0,
                    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                }
            };

            const created = await patientsApi.create(newPatientData);
            toast.success(`Paciente ${created.name} cadastrado com sucesso!`);
            onPatientCreated(created);
            onClose();
        } catch (error: any) {
            console.error('Erro ao criar paciente:', error);
            toast.error(error.message || 'Erro ao cadastrar paciente.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg relative z-10 overflow-hidden animate-fade-in border border-gray-100">
                {/* Header */}
                <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-5 text-white flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/15 rounded-xl backdrop-blur-sm">
                            <UserPlus className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold">Cadastro Rápido de Paciente</h3>
                            <p className="text-xs text-emerald-100">Cadastre e vincule diretamente ao agendamento</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {loading ? (
                        <div className="py-12 flex flex-col items-center justify-center gap-3 text-gray-500">
                            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                            <p className="text-sm font-medium">Carregando informações...</p>
                        </div>
                    ) : (
                        <>
                            {/* Nome Completo */}
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
                                    Nome Completo <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                    <input
                                        type="text"
                                        required
                                        placeholder="Ex: Maria da Silva"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full pl-9 pr-3 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                                        autoFocus
                                    />
                                </div>
                            </div>

                            {/* Telefone & CPF */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
                                        WhatsApp / Telefone <span className="text-gray-400 font-normal">(Opcional)</span>
                                    </label>
                                    <div className="relative">
                                        <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                        <input
                                            type="text"
                                            placeholder="(00) 00000-0000"
                                            value={phone}
                                            onChange={(e) => setPhone(maskPhone(e.target.value))}
                                            className="w-full pl-9 pr-3 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-600">
                                            CPF <span className="text-gray-400 font-normal">(Opcional)</span>
                                        </label>
                                        {cpf.replace(/\D/g, '').length === 11 && (
                                            validateCpf(cpf) ? (
                                                <span className="text-[10px] font-bold text-emerald-600">✓ Válido</span>
                                            ) : (
                                                <span className="text-[10px] font-bold text-red-500">⚠️ Inválido</span>
                                            )
                                        )}
                                    </div>
                                    <div className="relative">
                                        <ShieldCheck className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                        <input
                                            type="text"
                                            placeholder="000.000.000-00"
                                            value={cpf}
                                            onChange={(e) => setCpf(maskCpf(e.target.value))}
                                            className={`w-full pl-9 pr-3 py-2.5 border rounded-xl text-sm outline-none transition-all ${
                                                cpf.replace(/\D/g, '').length === 11
                                                    ? validateCpf(cpf)
                                                        ? 'border-emerald-500 bg-emerald-50/20 text-gray-900 focus:ring-2 focus:ring-emerald-500'
                                                        : 'border-red-500 bg-red-50/20 text-red-900 focus:ring-2 focus:ring-red-500'
                                                    : 'bg-gray-50/50 border-gray-200 text-gray-900 focus:bg-white focus:ring-2 focus:ring-emerald-500'
                                            }`}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Unidade & Convênio */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
                                        Unidade <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <Building2 className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                        <select
                                            value={selectedUnitId}
                                            onChange={(e) => setSelectedUnitId(e.target.value)}
                                            className="w-full pl-9 pr-3 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all appearance-none cursor-pointer"
                                        >
                                            {units.map((u) => (
                                                <option key={u.id} value={u.id}>{u.name} - {u.city}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
                                        Convênio / Parceria
                                    </label>
                                    <div className="relative">
                                        <CreditCard className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                        <select
                                            value={selectedAgreementId}
                                            onChange={(e) => setSelectedAgreementId(e.target.value)}
                                            className="w-full pl-9 pr-3 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all appearance-none cursor-pointer"
                                        >
                                            <option value="">Particular / Nenhum</option>
                                            {agreements.map((a) => (
                                                <option key={a.id} value={a.id}>{a.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-xl text-xs text-emerald-800 flex items-start gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                <span>Os dados completos (endereço, anamnese e planos) podem ser complementados a qualquer momento na ficha do paciente.</span>
                            </div>

                            {/* Actions */}
                            <div className="pt-3 flex justify-end items-center gap-3 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    disabled={submitting}
                                    className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-sm font-bold rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Cadastrando...
                                        </>
                                    ) : (
                                        <>
                                            <UserPlus className="w-4 h-4" />
                                            Salvar e Selecionar
                                        </>
                                    )}
                                </button>
                            </div>
                        </>
                    )}
                </form>
            </div>
        </div>
    );
};
