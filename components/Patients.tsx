
import React, { useState, useRef, useEffect } from 'react';
import { Search, Filter, MoreHorizontal, UserPlus, FileText, X, Camera, FileSignature, CheckCircle, Clock, UploadCloud, User, Printer, Check, Phone as PhoneIcon, CreditCard, Save, MapPin, Calendar as CalendarIcon, Hash, Edit2, Trash2, XCircle, DollarSign, Sparkles, LayoutGrid, List, ChevronLeft, ChevronRight } from 'lucide-react';
import { FacialScanModal } from './FacialScanModal';
import { ConfirmModal } from './ConfirmModal';


import { UnitId, Patient, SessionStatus, PlanTemplate, Professional, Session, Unit } from '../types';
import { patientsApi, planTemplatesApi, professionalsApi, sessionsApi, unitsApi } from '../src/services/api';
import { maskPhone, maskCpf, maskCep, validateCpf } from '../src/utils/masks';
import { storageApi } from '../src/services/storage-api';
import { revenuesApi } from '../src/services/financial-api';
import toast from 'react-hot-toast';
import SignatureModal from './SignatureModal';
import { useAuth } from '../src/contexts/AuthContext';

// ... (omitted)

// ScheduleSessionModal
const ScheduleSessionModal = ({ onClose, onSave, patient, professionals, units, currentUnit }: {
    onClose: () => void,
    onSave: (session: any) => void,
    patient: Patient,
    professionals: Professional[],
    units: Unit[],
    currentUnit: UnitId
}) => {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [time, setTime] = useState('08:00');
    const [professionalId, setProfessionalId] = useState('');
    const [type, setType] = useState('Fisioterapia');
    const [unitId, setUnitId] = useState(currentUnit === 'ALL' ? (patient.unitId || units[0]?.id) : currentUnit);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            date,
            time,
            professionalId,
            type,
            unitId,
            patientId: patient.id,
            status: 'Agendada'
        });
    };

    const availableProfessionals = professionals.filter(p => p.unitIds.includes(unitId));

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md relative z-10 animate-fade-in p-6">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-gray-900">Agendar Sessão</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {currentUnit === 'ALL' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Unidade</label>
                            <select
                                value={unitId}
                                onChange={e => setUnitId(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                required
                            >
                                {units.map(u => (
                                    <option key={u.id} value={u.id}>{u.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                            <input
                                type="date"
                                required
                                value={date}
                                onChange={e => setDate(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Hora</label>
                            <input
                                type="time"
                                required
                                value={time}
                                onChange={e => setTime(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Profissional</label>
                        <select
                            required
                            value={professionalId}
                            onChange={e => setProfessionalId(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="">Selecione...</option>
                            {availableProfessionals.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tipo / Procedimento</label>
                        <select
                            value={type}
                            onChange={e => setType(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="Fisioterapia">Fisioterapia</option>
                            <option value="Pilates">Pilates</option>
                            <option value="Avaliação">Avaliação</option>
                            <option value="Hidroterapia">Hidroterapia</option>
                        </select>
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg">
                            Cancelar
                        </button>
                        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                            Confirmar Agendamento
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// CreatePatientModal
const CreatePatientModal = ({ onClose, onSave, currentUnit, planTemplates, initialData, allUnits }: { onClose: () => void, onSave: (p: Patient) => void, currentUnit: UnitId, planTemplates: PlanTemplate[], initialData?: Patient | null, allUnits: Unit[] }) => {
    // Basic Info
    const [name, setName] = useState(initialData?.name || '');
    const [cpf, setCpf] = useState(initialData?.cpf || '');
    const [birthDate, setBirthDate] = useState(initialData?.birthDate || '');
    const [selectedUnitId, setSelectedUnitId] = useState(initialData?.unitId || (currentUnit === 'ALL' ? allUnits[0]?.id : currentUnit));
    const [unitName, setUnitName] = useState('');

    useEffect(() => {
        if (currentUnit === 'ALL') {
            const u = allUnits.find(u => u.id === selectedUnitId);
            setUnitName(u?.name || 'Selecione');
        } else {
            unitsApi.getById(currentUnit).then(u => setUnitName(u.name)).catch(() => setUnitName('Unidade Desconhecida'));
        }
    }, [currentUnit, selectedUnitId, allUnits]);

    // Contact & Address
    const [cep, setCep] = useState(initialData?.cep || '');
    const [phone, setPhone] = useState(initialData?.phone || '');
    const [city, setCity] = useState(initialData?.city || '');
    const [street, setStreet] = useState(initialData?.street || '');
    const [number, setNumber] = useState(initialData?.number || '');
    const [bairro, setBairro] = useState(initialData?.bairro || '');
    const [complement, setComplement] = useState(initialData?.complement || '');
    const [isFetchingCep, setIsFetchingCep] = useState(false);
    
    // CEP Control States:
    // isCepFetched: true after successfully querying ViaCEP
    // isGeneralCep: true if CEP is city-wide (no logradouro)
    // isManualUnlocked: true if user clicks "Digitar Sem CEP" or edits record without CEP
    const [isCepFetched, setIsCepFetched] = useState(!!initialData?.street || !!initialData?.city);
    const [isGeneralCep, setIsGeneralCep] = useState(false);
    const [isManualUnlocked, setIsManualUnlocked] = useState(!!initialData && !initialData.cep);
    const numberInputRef = useRef<HTMLInputElement>(null);

    const handleCepChange = async (val: string) => {
        const masked = maskCep(val);
        setCep(masked);
        const cleanCep = masked.replace(/\D/g, '');

        if (cleanCep.length === 8) {
            setIsFetchingCep(true);
            try {
                const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
                const data = await res.json();
                if (!data.erro) {
                    setIsCepFetched(true);
                    if (data.localidade && data.uf) {
                        setCity(`${data.localidade} - ${data.uf}`);
                    }
                    if (data.logradouro) {
                        setStreet(data.logradouro);
                        setIsGeneralCep(false);
                        setTimeout(() => numberInputRef.current?.focus(), 150);
                        toast.success('Rua localizada! Digite apenas o Número.');
                    } else {
                        // CEP Único da Cidade
                        setStreet('');
                        setIsGeneralCep(true);
                        toast.success('CEP Geral da Cidade! Preencha a Rua e Bairro.');
                    }
                    if (data.bairro) {
                        setBairro(data.bairro);
                    } else {
                        setBairro('');
                    }
                } else {
                    toast.error('CEP não encontrado');
                    setIsCepFetched(false);
                    setIsGeneralCep(false);
                }
            } catch (err) {
                console.error('Erro ao buscar CEP:', err);
                setIsCepFetched(false);
            } finally {
                setIsFetchingCep(false);
            }
        } else if (cleanCep.length < 8) {
            setIsCepFetched(false);
            setIsGeneralCep(false);
        }
    };

    // Treatment - find matching plan template by name if editing, roughly
    const [selectedPlanId, setSelectedPlanId] = useState(() => {
        if (initialData?.plan) {
            if (initialData.plan.name === 'Particular / Avulso') return 'avulso';
            const match = planTemplates.find(p => p.name === initialData.plan.name);
            return match?.id || '';
        }
        return '';
    });

    const activePlans = planTemplates.filter(p => p.active);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const isAvulso = selectedPlanId === 'avulso';
        const planTemplate = planTemplates.find(p => p.id === selectedPlanId);

        if (!name) return;
        if (!planTemplate && !isAvulso) return;

        let planData = initialData?.plan;

        if (isAvulso) {
            planData = {
                name: 'Particular / Avulso',
                totalSessions: 0,
                remainingSessions: 0,
                expiresAt: new Date(new Date().setFullYear(new Date().getFullYear() + 10)).toISOString() // Long expiry
            };
        } else if (planTemplate) {
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 30);

            if (initialData?.plan && initialData.plan.name === planTemplate.name) {
                planData = initialData.plan;
            } else {
                planData = {
                    name: planTemplate.name,
                    totalSessions: planTemplate.sessions,
                    remainingSessions: planTemplate.sessions,
                    expiresAt: expiresAt.toISOString()
                };
            }
        }

        const formattedAddress = [
            street,
            number ? `nº ${number}` : '',
            bairro ? `Bairro ${bairro}` : '',
            complement
        ].filter(Boolean).join(', ');

        const patientData: Patient = {
            id: initialData?.id || `p-${Date.now()}`,
            name,
            phone: phone || '(00) 00000-0000',
            cpf,
            birthDate,
            cep,
            street,
            number,
            bairro,
            complement,
            address: formattedAddress || initialData?.address,
            city,

            unitId: selectedUnitId || (currentUnit === 'ALL' ? allUnits[0].id : currentUnit),
            status: initialData?.status || 'Active',
            plan: planData!,
            lastVisit: initialData?.lastVisit,
            photoUrl: initialData?.photoUrl
        };

        onSave(patientData);
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 md:p-8">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={onClose} />

            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl relative z-10 animate-fade-in flex flex-col max-h-[90vh] overflow-hidden border border-gray-100">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 via-white to-blue-50/20">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2.5">
                            <UserPlus className="w-7 h-7 text-blue-600" />
                            {initialData ? 'Editar Paciente' : 'Novo Prontuário'}
                        </h2>
                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                            Unidade Responsável: <span className="font-semibold text-gray-800 bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-100">{unitName}</span>
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {currentUnit === 'ALL' && (
                            <select
                                value={selectedUnitId}
                                onChange={e => setSelectedUnitId(e.target.value)}
                                className="px-3.5 py-1.5 border border-gray-200 rounded-xl text-xs font-semibold bg-white text-gray-700 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                {allUnits.map(u => (
                                    <option key={u.id} value={u.id}>{u.name}</option>
                                ))}
                            </select>
                        )}
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-all">
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8">
                    {/* Section 1: Dados Pessoais */}
                    <div>
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-5 border-b border-gray-100 pb-2 flex items-center gap-2">
                            <User className="w-4 h-4 text-blue-600" />
                            Dados Pessoais
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                            <div className="md:col-span-6">
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">Nome Completo *</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 placeholder:text-gray-400 font-medium text-sm transition-all shadow-sm"
                                    placeholder="Ex: João da Silva"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                />
                            </div>
                            <div className="md:col-span-3">
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">CPF</label>
                                <div className="relative">
                                    <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        maxLength={14}
                                        className={`w-full pl-10 pr-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 placeholder:text-gray-400 font-medium text-sm transition-all shadow-sm ${cpf && !validateCpf(cpf) ? 'border-red-500 focus:ring-red-500' : 'border-gray-200'}`}
                                        placeholder="000.000.000-00"
                                        value={cpf}
                                        onChange={e => setCpf(maskCpf(e.target.value))}
                                    />
                                    {cpf && !validateCpf(cpf) && (
                                        <span className="text-[11px] font-semibold text-red-500 absolute -bottom-4 left-0">CPF inválido</span>
                                    )}
                                </div>
                            </div>
                            <div className="md:col-span-3">
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">Data de Nascimento</label>
                                <div className="relative">
                                    <CalendarIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="date"
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 font-medium text-sm transition-all shadow-sm"
                                        value={birthDate}
                                        onChange={e => setBirthDate(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Contato e Endereço */}
                    <div>
                        <div className="flex items-center justify-between mb-5 border-b border-gray-100 pb-2">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-blue-600" />
                                Contato e Localização
                            </h3>
                            {!isManualUnlocked ? (
                                <button
                                    type="button"
                                    onClick={() => setIsManualUnlocked(true)}
                                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 transition-colors"
                                    title="Clique para liberar a digitação manual de todo o endereço sem consultar CEP"
                                >
                                    <span>🔓 Digitar Endereço Sem CEP</span>
                                </button>
                            ) : (
                                <span className="text-[11px] font-semibold text-amber-600 flex items-center gap-1">
                                    <span>✍️ Digitação Manual Liberada</span>
                                </span>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                            {/* Linha 1: Telefone, CEP, Cidade */}
                            <div className="md:col-span-4">
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">Telefone / WhatsApp *</label>
                                <div className="relative">
                                    <PhoneIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        required
                                        maxLength={15}
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 placeholder:text-gray-400 font-medium text-sm transition-all shadow-sm"
                                        placeholder="(00) 90000-0000"
                                        value={phone}
                                        onChange={e => setPhone(maskPhone(e.target.value))}
                                    />
                                </div>
                            </div>

                            <div className="md:col-span-3">
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5 flex items-center justify-between">
                                    <span>CEP</span>
                                    {isFetchingCep && <span className="text-[10px] text-blue-600 animate-pulse font-semibold">Buscando...</span>}
                                </label>
                                <div className="relative">
                                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        maxLength={9}
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 placeholder:text-gray-400 font-medium text-sm transition-all shadow-sm"
                                        placeholder="00000-000"
                                        value={cep}
                                        onChange={e => handleCepChange(e.target.value)}
                                    />
                                    {isFetchingCep && (
                                        <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                                            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="md:col-span-5">
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">Cidade e UF</label>
                                <input
                                    type="text"
                                    disabled={!isManualUnlocked && !isGeneralCep}
                                    className={`w-full px-4 py-2.5 border rounded-xl outline-none font-medium text-sm transition-all shadow-sm ${!isManualUnlocked && !isGeneralCep ? 'bg-gray-100/90 text-gray-700 border-gray-200 cursor-not-allowed' : 'bg-white text-gray-900 border-gray-200 focus:ring-2 focus:ring-blue-500'}`}
                                    placeholder={!isManualUnlocked && !isCepFetched ? "Digite o CEP para buscar..." : "Ex: Araranguá - SC"}
                                    value={city}
                                    onChange={e => setCity(e.target.value)}
                                />
                            </div>

                            {/* Linha 2: Rua, Número, Bairro */}
                            <div className="md:col-span-6">
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5 flex items-center justify-between">
                                    <span>Logradouro / Rua</span>
                                    {!isManualUnlocked && !isCepFetched && <span className="text-[10px] text-amber-600 font-semibold">🔒 Digite o CEP</span>}
                                    {!isManualUnlocked && isCepFetched && !isGeneralCep && <span className="text-[10px] text-emerald-600 font-semibold">✓ Bloqueado pelo CEP</span>}
                                    {!isManualUnlocked && isGeneralCep && <span className="text-[10px] text-blue-600 font-semibold">CEP Único - Digite a Rua</span>}
                                </label>
                                <input
                                    type="text"
                                    disabled={!isManualUnlocked && (!isCepFetched || !isGeneralCep)}
                                    className={`w-full px-4 py-2.5 border rounded-xl outline-none font-medium text-sm transition-all shadow-sm ${!isManualUnlocked && (!isCepFetched || !isGeneralCep) ? 'bg-gray-100/90 text-gray-700 border-gray-200 cursor-not-allowed' : 'bg-white text-gray-900 border-gray-200 focus:ring-2 focus:ring-blue-500'}`}
                                    placeholder={!isManualUnlocked && !isCepFetched ? "Digite o CEP para liberar..." : "Rua / Avenida"}
                                    value={street}
                                    onChange={e => setStreet(e.target.value)}
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-blue-700 uppercase tracking-wide mb-1.5 flex items-center justify-between">
                                    <span>Número *</span>
                                    {!isManualUnlocked && !isCepFetched && <span className="text-[10px] text-amber-600 font-semibold">🔒 Bloqueado</span>}
                                </label>
                                <input
                                    ref={numberInputRef}
                                    type="text"
                                    disabled={!isManualUnlocked && !isCepFetched}
                                    className={`w-full px-4 py-2.5 border rounded-xl outline-none font-bold text-sm transition-all shadow-sm ${!isManualUnlocked && !isCepFetched ? 'bg-gray-100/90 text-gray-400 border-gray-200 cursor-not-allowed' : (isCepFetched && !number ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/20 text-gray-900' : 'border-gray-200 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500')}`}
                                    placeholder="Nº"
                                    value={number}
                                    onChange={e => setNumber(e.target.value)}
                                />
                            </div>

                            <div className="md:col-span-4">
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5 flex items-center justify-between">
                                    <span>Bairro</span>
                                    {!isManualUnlocked && !isCepFetched && <span className="text-[10px] text-amber-600 font-semibold">🔒 Digite o CEP</span>}
                                    {!isManualUnlocked && isCepFetched && !isGeneralCep && <span className="text-[10px] text-emerald-600 font-semibold">✓ Auto-preenchido</span>}
                                </label>
                                <input
                                    type="text"
                                    disabled={!isManualUnlocked && (!isCepFetched || !isGeneralCep)}
                                    className={`w-full px-4 py-2.5 border rounded-xl outline-none font-medium text-sm transition-all shadow-sm ${!isManualUnlocked && (!isCepFetched || !isGeneralCep) ? 'bg-gray-100/90 text-gray-700 border-gray-200 cursor-not-allowed' : 'bg-white text-gray-900 border-gray-200 focus:ring-2 focus:ring-blue-500'}`}
                                    placeholder={!isManualUnlocked && !isCepFetched ? "Digite o CEP..." : "Bairro"}
                                    value={bairro}
                                    onChange={e => setBairro(e.target.value)}
                                />
                            </div>

                            {/* Linha 3: Complemento */}
                            <div className="md:col-span-12">
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">Complemento / Ponto de Referência <span className="font-normal text-gray-400 text-[11px]">(Opcional)</span></label>
                                <input
                                    type="text"
                                    disabled={!isManualUnlocked && !isCepFetched}
                                    className={`w-full px-4 py-2.5 border rounded-xl outline-none font-medium text-sm transition-all shadow-sm ${!isManualUnlocked && !isCepFetched ? 'bg-gray-100/90 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white text-gray-900 border-gray-200 focus:ring-2 focus:ring-blue-500'}`}
                                    placeholder="Ex: Apto 302, Bloco B / Próximo ao Mercado"
                                    value={complement}
                                    onChange={e => setComplement(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section 3: Plano */}
                    <div>
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-blue-600" />
                            Plano de Tratamento
                        </h3>

                        <div className="bg-blue-50/40 p-5 md:p-6 rounded-2xl border border-blue-100/80">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">Selecione o Plano ou Modalidade *</label>
                                <div className="relative">
                                    <select
                                        value={selectedPlanId}
                                        onChange={e => setSelectedPlanId(e.target.value)}
                                        className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none appearance-none bg-white font-semibold text-sm text-gray-800 shadow-sm"
                                        required
                                    >
                                        <option value="">Selecione...</option>
                                        <option value="avulso" className="font-bold text-blue-700">✨ Atendimento Avulso / Particular</option>
                                        <optgroup label="Planos Disponíveis">
                                            {activePlans.map(plan => (
                                                <option key={plan.id} value={plan.id}>{plan.name} - {plan.sessions} sessões</option>
                                            ))}
                                        </optgroup>
                                    </select>
                                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                                        <Hash className="w-4 h-4" />
                                    </div>
                                </div>
                                <p className="text-xs text-gray-500 mt-2">
                                    Selecione "Avulso" para pacientes que pagam por sessão ou não possuem pacote fechado.
                                </p>
                            </div>
                        </div>
                    </div>
                </form>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50 sticky bottom-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-2.5 bg-white border border-gray-200 text-gray-700 font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-gray-100 transition-all shadow-sm"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        onClick={handleSubmit}
                        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2"
                    >
                        <Save className="w-4 h-4" />
                        Salvar Prontuário
                    </button>
                </div>
            </div>
        </div>
    );
};

const getWhatsappUrl = (phone?: string) => {
    if (!phone) return '#';
    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone) return '#';
    const finalPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    return `https://wa.me/${finalPhone}?text=${encodeURIComponent('Olá! Entro em contato da clínica FisioStar.')}`;
};

// --- Sub-component: Patient Detail Modal ---

const PatientDetailModal = ({
    patient,
    onClose,
    currentUnit,
    professionals,
    units,
    onOpenFacialScan,
    onEdit,
    onToggleStatus,
    onDelete,
    onUpdatePatient,
    onRequestConfirm
}: {
    patient: Patient,
    onClose: () => void,
    currentUnit: UnitId,
    professionals: Professional[],
    units: Unit[],
    onOpenFacialScan?: (patient: Patient) => void,
    onEdit?: (patient: Patient) => void,
    onToggleStatus?: (patient: Patient) => void,
    onDelete?: (id: string) => void,
    onUpdatePatient?: (updated: Partial<Patient> & { id: string }) => void,
    onRequestConfirm?: (config: { title: string; description: string; confirmLabel?: string; variant?: 'danger' | 'warning' | 'info'; onConfirm: () => void }) => void
}) => {
    const [unitName, setUnitName] = useState('');
    const { systemUser } = useAuth();
    useEffect(() => {
        if (currentUnit === 'ALL') {
            setUnitName(`Todas (Paciente: ${units.find(u => u.id === patient.unitId)?.name || 'N/A'})`);
        } else {
            unitsApi.getById(currentUnit).then(u => setUnitName(u.name)).catch(() => setUnitName('FisioStar'));
        }
    }, [currentUnit, patient.unitId, units]);

    const [activeTab, setActiveTab] = useState<'info' | 'signatures' | 'financial'>('signatures');
    // ... items ...
    const [isScheduling, setIsScheduling] = useState(false);
    const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
    const [newProfessionalId, setNewProfessionalId] = useState('');

    // ... continue ...
    const [currentPhoto, setCurrentPhoto] = useState(patient.photoUrl);
    const [showCamera, setShowCamera] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    const [patientHistory, setPatientHistory] = useState<Session[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(true);

    useEffect(() => {
        async function loadHistory() {
            try {
                setLoadingHistory(true);
                const sessions = await sessionsApi.getAll({ patientId: patient.id });
                setPatientHistory(sessions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
            } catch (error) {
                console.error("Error loading patient history", error);
            } finally {
                setLoadingHistory(false);
            }
        }
        loadHistory();
    }, [patient.id]);

    const handleStartCamera = async () => {
        setShowCamera(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error(err);
            toast.error('Erro ao acessar câmera. Verifique se você deu permissão.');
            setShowCamera(false);
        }
    };

    const handleStopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
        }
        setShowCamera(false);
    };

    const handleCapture = () => {
        if (videoRef.current) {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(videoRef.current, 0, 0);
                const dataUrl = canvas.toDataURL('image/jpeg');

                // Upload photo
                (async () => {
                    try {
                        const fileName = `patient-${patient.id}-${Date.now()}.jpg`;
                        const publicUrl = await storageApi.uploadBase64('patient-photos', fileName, dataUrl);
                        await patientsApi.update(patient.id, { photoUrl: publicUrl });
                        setCurrentPhoto(publicUrl);
                        patient.photoUrl = publicUrl;
                        if (onUpdatePatient) onUpdatePatient({ id: patient.id, photoUrl: publicUrl });
                        toast.success('Foto capturada e salva com sucesso!');
                    } catch (error) {
                        console.error('Error uploading photo:', error);
                        toast.error('Erro ao salvar foto');
                    }
                })();

                handleStopCamera();
            }
        }
    };

    const handleDeletePhoto = () => {
        const executeDelete = async () => {
            try {
                await patientsApi.update(patient.id, { photoUrl: '' });
                setCurrentPhoto(undefined);
                patient.photoUrl = undefined;
                if (onUpdatePatient) onUpdatePatient({ id: patient.id, photoUrl: undefined });
                toast.success('Foto de perfil removida com sucesso!');
            } catch (err) {
                console.error(err);
                toast.error('Erro ao remover foto de perfil');
            }
        };

        if (onRequestConfirm) {
            onRequestConfirm({
                title: 'Remover Foto de Perfil',
                description: 'Tem certeza que deseja remover a foto de perfil deste paciente?',
                confirmLabel: 'Remover Foto',
                variant: 'danger',
                onConfirm: executeDelete
            });
        } else {
            executeDelete();
        }
    };

    // Signature modal state
    const [showSignatureModal, setShowSignatureModal] = useState(false);
    const [sessionToSign, setSessionToSign] = useState<string | null>(null);
    const [showPaymentSignatureModal, setShowPaymentSignatureModal] = useState(false);

    const handleOpenSignatureModal = (sessionId: string) => {
        setSessionToSign(sessionId);
        setShowSignatureModal(true);
    };

    const handleConfirmSignature = async (imageData: string, type: 'signature' | 'photo') => {
        if (!sessionToSign) return;
        try {
            const session = patientHistory.find(s => s.id === sessionToSign);
            const fileName = `session-${sessionToSign}-${type}-${Date.now()}.png`;
            const publicUrl = await storageApi.uploadBase64('signatures', fileName, imageData);

            await sessionsApi.update(sessionToSign, {
                signed: true,
                signatureUrl: publicUrl
            });

            // Automatically create revenue if it's an outside plan session
            if (session?.isOutsidePlan && session.price) {
                try {
                    await revenuesApi.create({
                        unitId: currentUnit,
                        patientId: patient.id,
                        category: 'session',
                        description: `Sessão Avulsa - ${session.type} - ${patient.name}`,
                        amount: session.price,
                        revenueDate: new Date().toISOString().split('T')[0],
                        createdBy: systemUser?.id
                    });
                    toast.success('Financeiro atualizado com sucesso!');
                } catch (err) {
                    console.error('Error creating revenue:', err);
                    toast.error('Erro ao gerar lançamento financeiro');
                }
            }

            setPatientHistory(prev => prev.map(s =>
                s.id === sessionToSign ? { ...s, signed: true, signatureUrl: publicUrl } : s
            ));
            toast.success(`Assinatura confirmada via ${type === 'signature' ? 'desenho' : 'foto'}!`);
            setShowSignatureModal(false);
            setSessionToSign(null);
        } catch (error) {
            console.error('Error confirming signature:', error);
            toast.error('Erro ao confirmar assinatura');
        }
    }

    const handleScheduleSession = async (sessionData: any) => {
        try {
            const newSession = await sessionsApi.create(sessionData);
            setPatientHistory(prev => [newSession, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
            toast.success('Sessão agendada com sucesso!');
            setIsScheduling(false);
        } catch (error) {
            console.error('Error scheduling session:', error);
            toast.error('Erro ao agendar sessão');
        }
    };

    const handleUpdateProfessional = async (sessionId: string, professionalId: string) => {
        try {
            await sessionsApi.update(sessionId, { professionalId });
            setPatientHistory(prev => prev.map(s => s.id === sessionId ? { ...s, professionalId } : s));
            toast.success('Profissional da sessão atualizado!');
            setEditingSessionId(null);
        } catch (error) {
            console.error('Error updating professional:', error);
            toast.error('Erro ao atualizar profissional');
        }
    };

    const handleConfirmPayment = async (imageData: string, type: 'signature' | 'photo') => {
        // In the future, this would save to patient_plans payment fields
        toast.success(`Pagamento confirmado via ${type === 'signature' ? 'assinatura' : 'foto'}!`);
        setShowPaymentSignatureModal(false);
    };

    const handlePrint = () => {
        const printWindow = window.open('', '', 'width=900,height=700');

        if (!printWindow) {
            toast.error('O bloqueador de pop-ups impediu a impressão. Por favor, permita pop-ups para este site.');
            return;
        }

        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Ficha de Controle - ${patient.name}</title>
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
                    body { font-family: 'Inter', sans-serif; color: #111; padding: 40px; max-width: 210mm; margin: 0 auto; background: white; }
                    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; border-bottom: 2px solid #111; padding-bottom: 20px; }
                    .brand { font-size: 26px; font-weight: 800; color: #2563EB; letter-spacing: -0.5px; }
                    .unit-details { text-align: right; font-size: 12px; color: #444; line-height: 1.5; }
                    
                    .section-header { font-size: 14px; text-transform: uppercase; font-weight: 700; color: #000; border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-top: 25px; margin-bottom: 15px; }
                    
                    .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; font-size: 14px; }
                    .info-item label { font-size: 11px; text-transform: uppercase; color: #666; font-weight: 600; display: block; margin-bottom: 3px; }
                    .info-item span { font-weight: 500; font-size: 15px; color: #000; }
                    
                    .sessions-table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
                    .sessions-table th { text-align: left; border-bottom: 2px solid #000; padding: 10px 5px; font-weight: 700; font-size: 12px; text-transform: uppercase; }
                    .sessions-table td { border-bottom: 1px solid #ddd; padding: 12px 5px; vertical-align: middle; }
                    .signature-box { border-bottom: 1px solid #000; height: 30px; width: 100%; }
                    
                    .footer { margin-top: 50px; text-align: center; font-size: 11px; color: #666; border-top: 1px solid #eee; padding-top: 15px; }
                    
                    @media print {
                        @page { size: A4; margin: 15mm; }
                        body { padding: 0; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="brand">FisioStar</div>
                    <div class="unit-details">
                        <strong>${unitName}</strong><br/>
                        Ficha de Controle de Sessões<br/>
                        Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}
                    </div>
                </div>

                <div class="section-header">Dados do Paciente</div>
                <div class="info-grid">
                    <div class="info-item">
                        <label>Nome Completo</label>
                        <span>${patient.name}</span>
                    </div>
                    <div class="info-item">
                        <label>Telefone</label>
                        <span>${patient.phone}</span>
                    </div>
                    <div class="info-item">
                        <label>CPF</label>
                        <span>${patient.cpf || '-'}</span>
                    </div>
                    <div class="info-item">
                        <label>Plano Contratado</label>
                        <span>${patient.plan?.name || 'N/A'}</span>
                    </div>
                     <div class="info-item">
                        <label>Status do Plano</label>
                        <span>${patient.plan ? `${patient.plan.remainingSessions} sessões restantes de ${patient.plan.totalSessions}` : 'Sem plano ativo'}</span>
                    </div>
                </div>

                <div class="section-header">Registro de Presença</div>
                <table class="sessions-table">
                    <thead>
                        <tr>
                            <th width="15%">Data</th>
                            <th width="10%">Hora</th>
                            <th width="25%">Procedimento</th>
                            <th width="20%">Profissional</th>
                            <th width="30%">Assinatura do Paciente</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${patientHistory.map(session => {
            const prof = professionals.find(p => p.id === session.professionalId);
            return `
                                <tr>
                                    <td>${new Date(session.date).toLocaleDateString('pt-BR')}</td>
                                    <td>${session.time}</td>
                                    <td>${session.type}</td>
                                    <td>${prof?.name || '-'}</td>
                                    <td>
                                        ${session.signatureUrl ?
                    `<img src="${session.signatureUrl}" style="max-height: 25px; max-width: 100px;" alt="Assinado" />` :
                    `<div class="signature-box"></div>`
                }
                                    </td>
                                </tr>
                            `;
        }).join('')}
                    </tbody>
                </table>

                <div class="footer">
                    Declaro que recebi os atendimentos descritos acima nas datas indicadas.
                    <br/>FisioStar - Documento Interno
                </div>

                <script>
                    window.onload = function() { window.print(); }
                </script>
            </body>
            </html>
        `;

        printWindow.document.write(htmlContent);
        printWindow.document.close();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={onClose} />

            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden relative z-10 flex flex-col md:flex-row animate-fade-in">
                <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-white/50 hover:bg-white rounded-full text-gray-500 hover:text-gray-900 z-20">
                    <X className="w-5 h-5" />
                </button>

                {/* Left Sidebar: Photo & Key Info */}
                <div className="w-full md:w-72 bg-gray-50 border-r border-gray-200 p-6 flex flex-col items-center flex-shrink-0">
                    <div className="relative group mb-4">
                        <div className="w-32 h-32 rounded-full overflow-hidden shadow-md border-4 border-white relative bg-white">
                            {currentPhoto ? (
                                <img src={currentPhoto} alt={patient.name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-4xl">
                                    {patient.name.charAt(0)}
                                </div>
                            )}

                            {/* File Upload Overlay */}
                            <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                                <UploadCloud className="w-8 h-8 text-white" />
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        try {
                                            const publicUrl = await storageApi.uploadFile('patient-photos', `patient-${patient.id}-${Date.now()}`, file);
                                            await patientsApi.update(patient.id, { photoUrl: publicUrl });
                                            setCurrentPhoto(publicUrl);
                                            patient.photoUrl = publicUrl;
                                            if (onUpdatePatient) onUpdatePatient({ id: patient.id, photoUrl: publicUrl });
                                            toast.success('Foto atualizada!');
                                        } catch (err) {
                                            console.error(err);
                                            toast.error('Erro ao enviar foto');
                                        }
                                    }}
                                />
                            </label>
                        </div>

                        <div className="absolute bottom-0 right-0 flex items-center gap-1 z-10">
                            {currentPhoto && (
                                <button
                                    type="button"
                                    onClick={handleDeletePhoto}
                                    className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700 shadow-md transition-transform hover:scale-105"
                                    title="Excluir foto de perfil"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={handleStartCamera}
                                className="p-2 bg-primary text-white rounded-full hover:bg-primary-hover shadow-md transition-transform hover:scale-105"
                                title="Tirar foto com câmera"
                            >
                                <Camera className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>

                    <h2 className="text-xl font-bold text-center text-gray-900">{patient.name}</h2>
                    <a
                        href={getWhatsappUrl(patient.phone)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-sm text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1.5 hover:underline mb-3 transition-colors"
                        title="Abrir conversa no WhatsApp"
                    >
                        <PhoneIcon className="w-4 h-4 text-emerald-600 fill-emerald-50" />
                        <span>{patient.phone}</span>
                    </a>

                    {/* Centralized Action Buttons */}
                    <div className="w-full flex flex-col gap-2 mb-4">
                        {onEdit && (
                            <button
                                onClick={() => { onClose(); onEdit(patient); }}
                                className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm"
                            >
                                <Edit2 className="w-3.5 h-3.5" /> Editar Cadastro
                            </button>
                        )}

                        {onOpenFacialScan && (
                            <button
                                onClick={() => onOpenFacialScan(patient)}
                                className="w-full py-1.5 px-3 text-xs font-semibold rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-all flex items-center justify-center gap-1.5"
                                title="Escanear biometria facial do paciente"
                            >
                                <span>{patient.facialDescriptor ? 'Face Cadastrada ✓' : 'Escanear Biometria'}</span>
                            </button>
                        )}

                        <div className="flex gap-2 w-full mt-1">
                            {onToggleStatus && (
                                <button
                                    onClick={() => onToggleStatus(patient)}
                                    className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-xl border transition-colors flex items-center justify-center gap-1 ${patient.status === 'Active' ? 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100' : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'}`}
                                >
                                    {patient.status === 'Active' ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                                    {patient.status === 'Active' ? 'Inativar' : 'Ativar'}
                                </button>
                            )}

                            {onDelete && (
                                <button
                                    onClick={() => {
                                        if (confirm('Tem certeza que deseja excluir este paciente? Esta ação não pode ser desfeita.')) {
                                            onClose();
                                            onDelete(patient.id);
                                        }
                                    }}
                                    className="py-1.5 px-2.5 bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1"
                                    title="Excluir paciente"
                                >
                                    <Trash2 className="w-3.5 h-3.5" /> Excluir
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="w-full border-t border-gray-200 pt-4 mt-auto hidden md:block">
                        <p className="text-xs text-center text-gray-400">Cadastrado em {new Date().toLocaleDateString('pt-BR')}</p>
                    </div>
                </div>

                {/* Right Content: Tabs */}
                <div className="flex-1 flex flex-col min-h-0 bg-white">
                    <div className="border-b border-gray-200">
                        <nav className="flex px-6" aria-label="Tabs">
                            <button
                                onClick={() => setActiveTab('signatures')}
                                className={`py-4 px-4 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${activeTab === 'signatures' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                            >
                                <FileSignature className="w-4 h-4" />
                                Histórico & Assinaturas
                            </button>
                            <button
                                onClick={() => setActiveTab('financial')}
                                className={`py-4 px-4 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${activeTab === 'financial' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                            >
                                <CreditCard className="w-4 h-4" />
                                Financeiro & Plano
                            </button>
                            <button
                                onClick={() => setActiveTab('info')}
                                className={`py-4 px-4 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${activeTab === 'info' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                            >
                                <User className="w-4 h-4" />
                                Dados Pessoais
                            </button>
                        </nav>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
                        {activeTab === 'signatures' && (
                            <div className="space-y-6 animate-fade-in">
                                <div className="flex justify-between items-center bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                                    <div>
                                        <h3 className="font-bold text-gray-900">Ficha de Presença</h3>
                                        <p className="text-sm text-gray-600">Imprima a ficha para controle físico de assinaturas.</p>
                                    </div>
                                    <button
                                        onClick={handlePrint}
                                        className="bg-gray-50 border border-gray-200 text-gray-700 hover:bg-white hover:border-blue-300 hover:text-blue-600 px-4 py-2 rounded-lg font-medium transition-all text-sm flex items-center gap-2"
                                    >
                                        <Printer className="w-4 h-4" />
                                        Imprimir
                                    </button>
                                </div>

                                {isScheduling && (
                                    <ScheduleSessionModal
                                        onClose={() => setIsScheduling(false)}
                                        onSave={handleScheduleSession}
                                        patient={patient}
                                        professionals={professionals}
                                        units={units}
                                        currentUnit={currentUnit}
                                    />
                                )}

                                <div className="flex justify-between items-center">
                                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-primary" />
                                        Histórico de Atendimentos
                                    </h3>
                                    <button
                                        onClick={() => setIsScheduling(true)}
                                        className="text-sm bg-primary text-white px-3 py-1.5 rounded-lg hover:bg-primary-hover transition-colors flex items-center gap-2"
                                    >
                                        <CalendarIcon className="w-4 h-4" />
                                        Agendar Sessão
                                    </button>
                                </div>
                                <p className="text-xs text-gray-500 mt-2 mb-4 bg-blue-50 p-2 rounded border border-blue-100 flex items-center gap-2">
                                    <span className="font-bold text-blue-600">Dica:</span>
                                    Para substituir o profissional de uma sessão, clique no ícone de lápis ao lado do nome do profissional na tabela abaixo.
                                </p>


                                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                                    {patientHistory.length > 0 ? (
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                                                <tr>
                                                    <th className="px-5 py-3">Data/Hora</th>
                                                    <th className="px-5 py-3">Procedimento</th>
                                                    <th className="px-5 py-3">Profissional</th>
                                                    <th className="px-5 py-3 text-center">Status</th>
                                                    <th className="px-5 py-3 text-right">Ação</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {patientHistory.map(session => {
                                                    const prof = professionals.find(p => p.id === session.professionalId);
                                                    return (
                                                        <tr key={session.id} className="hover:bg-gray-50 transition-colors">
                                                            <td className="px-5 py-3 font-medium text-gray-900">
                                                                {new Date(session.date).toLocaleDateString('pt-BR')} <span className="text-gray-400 font-normal ml-1">{session.time}</span>
                                                            </td>

                                                            <td className="px-5 py-3 text-gray-600">{session.type}</td>
                                                            <td className="px-5 py-3 text-gray-600">
                                                                {editingSessionId === session.id ? (
                                                                    <div className="flex items-center gap-2">
                                                                        <select
                                                                            className="text-xs border rounded p-1"
                                                                            value={newProfessionalId}
                                                                            onChange={(e) => setNewProfessionalId(e.target.value)}
                                                                        >
                                                                            <option value="">Selecione...</option>
                                                                            {professionals.map(p => (
                                                                                <option key={p.id} value={p.id}>{p.name}</option>
                                                                            ))}
                                                                        </select>
                                                                        <button onClick={() => handleUpdateProfessional(session.id, newProfessionalId)} className="text-green-600 hover:text-green-800"><Check className="w-3 h-3" /></button>
                                                                        <button onClick={() => setEditingSessionId(null)} className="text-red-600 hover:text-red-800"><X className="w-3 h-3" /></button>
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex items-center gap-2 group/prof">
                                                                        <span>{prof?.name || '-'}</span>
                                                                        <button
                                                                            onClick={() => { setEditingSessionId(session.id); setNewProfessionalId(session.professionalId); }}
                                                                            className="text-gray-400 hover:text-blue-600 transition-colors"
                                                                            title="Trocar Profissional"
                                                                        >
                                                                            <Edit2 className="w-3 h-3" />
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td className="px-5 py-3 text-center">
                                                                {session.signed ? (
                                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-100">
                                                                        <CheckCircle className="w-3 h-3" /> Assinado
                                                                    </span>
                                                                ) : (
                                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-50 text-orange-700 text-xs font-medium border border-orange-100">
                                                                        <Clock className="w-3 h-3" /> Pendente
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="px-5 py-3 text-right">
                                                                {!session.signed && (
                                                                    <button
                                                                        onClick={() => handleOpenSignatureModal(session.id)}
                                                                        className="text-primary hover:text-primary-hover font-medium text-xs border border-primary/20 hover:border-primary/50 hover:bg-primary/5 px-3 py-1.5 rounded transition-all flex items-center gap-1 ml-auto"
                                                                        title="Assinar digitalmente"
                                                                    >
                                                                        <Check className="w-3 h-3" />
                                                                        Assinar
                                                                    </button>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <div className="p-10 text-center text-gray-400 flex flex-col items-center gap-3">
                                            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                                                <CalendarIcon className="w-6 h-6 text-gray-300" />
                                            </div>
                                            Nenhuma sessão registrada neste histórico.
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'financial' && (
                            <div className="space-y-6 animate-fade-in">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Plan Details Card */}
                                    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -mr-4 -mt-4 opacity-50"></div>
                                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 relative z-10">Plano Atual</h3>
                                        <div className="relative z-10">
                                            <p className="text-2xl font-bold text-gray-900 mb-1">{patient.plan?.name || 'Nenhum plano ativo'}</p>
                                            <div className="flex items-center gap-2">
                                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${patient.plan?.remainingSessions > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                                    {patient.plan ? (patient.plan.remainingSessions > 0 ? 'Ativo' : 'Esgotado') : 'Inativo'}
                                                </span>
                                                <span className="text-sm text-gray-500">
                                                    {patient.plan?.expiresAt ? `Expira em: ${new Date(patient.plan.expiresAt).toLocaleDateString('pt-BR')}` : ''}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Balance Card */}
                                    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden">
                                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Saldo de Sessões</h3>
                                        <div className="flex items-end gap-3 mb-2">
                                            <span className="text-4xl font-bold text-primary">{patient.plan?.remainingSessions || 0}</span>
                                            <span className="text-gray-400 font-medium mb-1">/ {patient.plan?.totalSessions || 0}</span>
                                        </div>
                                        <div className="w-full bg-gray-100 rounded-full h-2">
                                            <div
                                                className="bg-primary h-2 rounded-full transition-all duration-500"
                                                style={{ width: patient.plan ? `${(patient.plan.remainingSessions / patient.plan.totalSessions) * 100}%` : '0%' }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Payment Actions */}
                                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                        <DollarSign className="w-5 h-5 text-green-600" />
                                        Status do Pagamento
                                    </h3>

                                    <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg border border-gray-200">
                                        <div>
                                            <p className="font-semibold text-gray-900">Mensalidade Atual</p>
                                            <p className="text-sm text-gray-500">Valor referente ao pacote de {patient.plan?.name || 'N/A'}</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {patient.plan ? (
                                                <>
                                                    <span className={`px-3 py-1 rounded-full text-sm font-bold border ${patient.plan.remainingSessions === patient.plan.totalSessions ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                                                        {patient.plan.remainingSessions === patient.plan.totalSessions ? 'Pendente' : 'Pago Confirmado'}
                                                    </span>

                                                    {patient.plan.remainingSessions === patient.plan.totalSessions && (
                                                        <button
                                                            onClick={() => setShowPaymentSignatureModal(true)}
                                                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium text-sm shadow-sm transition-colors flex items-center gap-2"
                                                        >
                                                            <FileSignature className="w-4 h-4" />
                                                            Confirmar Pagamento
                                                        </button>
                                                    )}
                                                </>
                                            ) : (
                                                <span className="text-sm text-gray-500 italic">Sem plano ativo</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'info' && (
                            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm animate-fade-in">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <h3 className="font-semibold text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-2">
                                            <User className="w-4 h-4 text-gray-400" />
                                            Informações Pessoais
                                        </h3>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Nome Completo</label>
                                            <p className="text-gray-900 font-medium bg-gray-50 px-3 py-2 rounded-md border border-gray-100">{patient.name}</p>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Telefone</label>
                                            <p className="text-gray-900 font-medium bg-gray-50 px-3 py-2 rounded-md border border-gray-100">{patient.phone}</p>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">CPF</label>
                                            <p className="text-gray-900 font-medium bg-gray-50 px-3 py-2 rounded-md border border-gray-100">{patient.cpf || '-'}</p>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <h3 className="font-semibold text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-2">
                                            <MapPin className="w-4 h-4 text-gray-400" />
                                            Endereço
                                        </h3>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Cidade</label>
                                            <p className="text-gray-900 font-medium bg-gray-50 px-3 py-2 rounded-md border border-gray-100">{patient.city || '-'}</p>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Endereço Completo</label>
                                            <p className="text-gray-900 font-medium bg-gray-50 px-3 py-2 rounded-md border border-gray-100">{patient.address || '-'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Modal Footer */}
                    <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3 rounded-b-2xl">
                        <button onClick={onClose} className="px-5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors">
                            Fechar
                        </button>
                    </div>
                </div>
            </div>

            {/* Camera Overlay Modal */}
            {
                showCamera && (
                    <div className="fixed inset-0 z-[60] bg-black bg-opacity-90 flex flex-col items-center justify-center p-4">
                        <div className="relative w-full max-w-md bg-black rounded-xl overflow-hidden shadow-2xl">
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                onLoadedMetadata={() => videoRef.current?.play()}
                                className="w-full h-auto bg-gray-900"
                            />
                            <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-8">
                                <button
                                    onClick={handleStopCamera}
                                    className="bg-white/20 hover:bg-white/30 text-white rounded-full p-3 backdrop-blur-sm transition-colors"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                                <button
                                    onClick={handleCapture}
                                    className="bg-white rounded-full p-4 hover:scale-105 transition-transform border-4 border-gray-200"
                                >
                                    <div className="w-12 h-12 bg-transparent rounded-full border-2 border-black/10" />
                                </button>
                            </div>
                        </div>
                        <p className="text-white mt-4 text-sm font-medium">Ajuste o rosto no quadro e clique no botão central para capturar.</p>
                    </div>
                )
            }

            {/* Session Signature Modal */}
            {
                showSignatureModal && (
                    <SignatureModal
                        title="Assinar Sessão"
                        description="Desenhe sua assinatura ou tire uma foto para confirmar a sessão."
                        onConfirm={handleConfirmSignature}
                        onCancel={() => { setShowSignatureModal(false); setSessionToSign(null); }}
                    />
                )
            }

            {/* Payment Signature Modal */}
            {
                showPaymentSignatureModal && (
                    <SignatureModal
                        title="Confirmar Pagamento"
                        description="Desenhe sua assinatura ou tire uma foto para confirmar o pagamento do plano."
                        onConfirm={handleConfirmPayment}
                        onCancel={() => setShowPaymentSignatureModal(false)}
                    />
                )
            }
        </div >
    );
};


const Patients = ({ currentUnit }: { currentUnit: UnitId }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
    const [patientsList, setPatientsList] = useState<Patient[]>([]);
    const [planTemplates, setPlanTemplates] = useState<PlanTemplate[]>([]);
    const [professionals, setProfessionals] = useState<Professional[]>([]);
    const [loading, setLoading] = useState(true);
    const [unitName, setUnitName] = useState('');
    const [allUnits, setAllUnits] = useState<Unit[]>([]);

    useEffect(() => {
        loadData();
    }, [currentUnit]);

    async function loadData() {
        try {
            setLoading(true);
            const [patientsData, plansData, professionalsData, unitData, allUnitsData] = await Promise.all([
                patientsApi.getAll(),
                planTemplatesApi.getAll(),
                professionalsApi.getAll(),
                currentUnit === 'ALL' ? Promise.resolve({ name: 'Todas as Unidades', id: 'ALL' } as Unit) : unitsApi.getById(currentUnit),
                unitsApi.getAll()
            ]);
            setPatientsList(patientsData);
            setPlanTemplates(plansData);
            setProfessionals(professionalsData);
            setUnitName(unitData.name);
            setAllUnits(allUnitsData);
        } catch (error) {
            console.error('Error loading data:', error);
            // toast.error('Erro ao carregar dados');
        } finally {
            setLoading(false);
        }
    }

    const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');
    const [planFilter, setPlanFilter] = useState<'All' | 'ActivePlan' | 'ExpiredPlan'>('All');
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

    const filteredPatients = patientsList.filter(patient => {
        const matchesSearch = patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (patient.cpf && patient.cpf.includes(searchTerm));

        // Filter by unit if not ALL
        const matchesUnit = currentUnit === 'ALL' ? true : patient.unitId === currentUnit;

        const matchesStatus = statusFilter === 'All'
            ? true
            : patient.status === statusFilter;

        const matchesPlan = planFilter === 'All'
            ? true
            : planFilter === 'ActivePlan'
                ? (patient.plan?.remainingSessions || 0) > 0
                : (patient.plan?.remainingSessions || 0) === 0;

        return matchesSearch && matchesStatus && matchesPlan && matchesUnit;
    });

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(12);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter, planFilter, currentUnit]);

    const totalPages = Math.ceil(filteredPatients.length / itemsPerPage) || 1;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, filteredPatients.length);
    const paginatedPatients = filteredPatients.slice(startIndex, startIndex + itemsPerPage);

    const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
    const [facialScanPatient, setFacialScanPatient] = useState<Patient | null>(null);

    const handleSaveFacialData = async (descriptor: string) => {
        if (!facialScanPatient) return;
        try {
            await patientsApi.update(facialScanPatient.id, {
                facialDescriptor: descriptor
            });
            handlePatientUpdated({ id: facialScanPatient.id, facialDescriptor: descriptor });
            toast.success('Biometria facial registrada!');
        } catch (error) {
            console.error('Error saving facial descriptor:', error);
            toast.error('Erro ao salvar biometria facial');
        }
    };

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
        onConfirm: () => {}
    });

    const handlePatientUpdated = (updated: Partial<Patient> & { id: string }) => {
        setPatientsList(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p));
        setSelectedPatient(prev => prev && prev.id === updated.id ? { ...prev, ...updated } : prev);
    };

    const handleCreatePatient = async (patientData: Patient) => {
        try {
            if (editingPatient) {
                await patientsApi.update(patientData.id, patientData);
                handlePatientUpdated(patientData);
                toast.success('Paciente atualizado com sucesso!');
            } else {
                const newPatient = await patientsApi.create(patientData);
                setPatientsList(prev => [newPatient, ...prev]);
                toast.success('Paciente cadastrado com sucesso!');
            }
            setIsCreateModalOpen(false);
            setEditingPatient(null);
        } catch (error) {
            console.error('Error saving patient:', error);
            toast.error('Erro ao salvar paciente');
        }
    };

    const handleDeletePatient = (id: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setConfirmModal({
            isOpen: true,
            title: 'Excluir Paciente',
            description: 'Tem certeza que deseja excluir este paciente? Esta ação não pode ser desfeita.',
            confirmLabel: 'Excluir Paciente',
            variant: 'danger',
            onConfirm: async () => {
                try {
                    await patientsApi.delete(id);
                    setPatientsList(prev => prev.filter(p => p.id !== id));
                    if (selectedPatient?.id === id) setSelectedPatient(null);
                    toast.success('Paciente excluído com sucesso');
                } catch (error) {
                    console.error('Error deleting patient:', error);
                    toast.error('Erro ao excluir paciente');
                } finally {
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                }
            }
        });
    };

    const handleToggleStatus = async (patient: Patient, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        try {
            const newStatus = patient.status === 'Active' ? 'Inactive' : 'Active';
            await patientsApi.update(patient.id, { status: newStatus });
            handlePatientUpdated({ id: patient.id, status: newStatus });
            toast.success(`Paciente ${newStatus === 'Active' ? 'ativado' : 'inativado'} com sucesso`);
        } catch (error) {
            console.error('Error updating status:', error);
            toast.error('Erro ao atualizar status');
        }
    };

    const openEditModal = (patient: Patient, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setEditingPatient(patient);
        setIsCreateModalOpen(true);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Pacientes</h1>
                    <p className="text-gray-500">Gestão de prontuários e tratamentos - {unitName}</p>
                </div>
                <button
                    onClick={() => { setEditingPatient(null); setIsCreateModalOpen(true); }}
                    className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-sm shadow-primary/30"
                >
                    <UserPlus className="w-4 h-4" />
                    Novo Paciente
                </button>
            </div>

            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar por nome ou CPF..."
                        className="input-primary pl-10"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-2">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as any)}
                        className="input-primary w-auto min-w-[140px]"
                    >
                        <option value="All">Todos Status</option>
                        <option value="Active">Ativos</option>
                        <option value="Inactive">Inativos</option>
                    </select>
                    <select
                        value={planFilter}
                        onChange={(e) => setPlanFilter(e.target.value as any)}
                        className="input-primary w-auto min-w-[140px]"
                    >
                        <option value="All">Todos Planos</option>
                        <option value="ActivePlan">Plano Ativo</option>
                        <option value="ExpiredPlan">Sem Sessões</option>
                    </select>

                    {/* View Mode Toggle */}
                    <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200/80">
                        <button
                            type="button"
                            onClick={() => setViewMode('grid')}
                            className={`px-3 py-1.5 rounded-lg font-medium text-xs flex items-center gap-1.5 transition-all ${
                                viewMode === 'grid'
                                    ? 'bg-white text-gray-900 shadow-sm font-bold'
                                    : 'text-gray-500 hover:text-gray-900'
                            }`}
                            title="Visualização em Cards"
                        >
                            <LayoutGrid className="w-3.5 h-3.5 text-blue-600" />
                            <span className="hidden sm:inline">Cards</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('table')}
                            className={`px-3 py-1.5 rounded-lg font-medium text-xs flex items-center gap-1.5 transition-all ${
                                viewMode === 'table'
                                    ? 'bg-white text-gray-900 shadow-sm font-bold'
                                    : 'text-gray-500 hover:text-gray-900'
                            }`}
                            title="Visualização em Lista / Tabela"
                        >
                            <List className="w-3.5 h-3.5 text-blue-600" />
                            <span className="hidden sm:inline">Lista</span>
                        </button>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center p-8 text-gray-500">Carregando pacientes...</div>
            ) : filteredPatients.length > 0 ? (
                <>
                    {viewMode === 'grid' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {paginatedPatients.map(patient => (
                                <div
                                    key={patient.id}
                                    onClick={() => setSelectedPatient(patient)}
                                    className="bg-white p-5 rounded-2xl border border-gray-200/90 shadow-sm hover:shadow-md hover:border-blue-400 transition-all cursor-pointer group relative flex flex-col justify-between"
                                >
                                    <div>
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-3">
                                                {patient.photoUrl ? (
                                                    <img src={patient.photoUrl} alt={patient.name} className="w-12 h-12 rounded-full object-cover shadow-sm ring-2 ring-gray-100" />
                                                ) : (
                                                    <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 font-bold text-lg flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors shadow-sm">
                                                        {patient.name.charAt(0)}
                                                    </div>
                                                )}
                                                <div>
                                                    <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors flex items-center gap-1.5">
                                                        {patient.name}
                                                    </h3>
                                                    <a
                                                        href={getWhatsappUrl(patient.phone)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1 hover:underline transition-colors mt-0.5"
                                                        title="Conversar no WhatsApp"
                                                    >
                                                        <PhoneIcon className="w-3.5 h-3.5 text-emerald-600 fill-emerald-50" />
                                                        <span>{patient.phone}</span>
                                                    </a>
                                                </div>
                                            </div>

                                            <div className="flex flex-col items-end gap-1">
                                                <span className="text-[10px] uppercase font-bold text-gray-400 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full">
                                                    {allUnits.find(u => u.id === patient.unitId)?.name || 'N/A'}
                                                </span>
                                                <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${patient.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-600 border border-gray-200'}`}>
                                                    {patient.status === 'Active' ? 'Em Tratamento' : 'Inativo'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="space-y-2 py-2 border-t border-gray-100">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-gray-500 font-medium">Plano Contratado</span>
                                                <span className="font-bold text-gray-800">{patient.plan?.name || 'Sem plano'}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-gray-500 font-medium">Sessões Restantes</span>
                                                <span className="font-bold text-gray-900">
                                                    {patient.plan ? `${patient.plan.remainingSessions} de ${patient.plan.totalSessions}` : '-'}
                                                </span>
                                            </div>
                                            {patient.plan && (
                                                <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1 overflow-hidden">
                                                    <div
                                                        className="bg-blue-600 h-1.5 rounded-full transition-all"
                                                        style={{ width: `${(patient.plan.remainingSessions / patient.plan.totalSessions) * 100}%` }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="pt-3 mt-3 border-t border-gray-100 flex items-center justify-between text-xs text-blue-600 font-semibold group-hover:text-blue-700">
                                        <span>Ver Prontuário Completo</span>
                                        <span className="text-blue-400 group-hover:translate-x-1 transition-transform">→</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        /* Table View Mode */
                        <div className="bg-white rounded-2xl border border-gray-200/90 shadow-sm overflow-hidden animate-fade-in">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50/80 border-b border-gray-200/80 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                            <th className="px-6 py-4">Paciente</th>
                                            <th className="px-6 py-4">Telefone / WhatsApp</th>
                                            <th className="px-6 py-4">Unidade</th>
                                            <th className="px-6 py-4">Plano Contratado</th>
                                            <th className="px-6 py-4 text-center">Sessões Restantes</th>
                                            <th className="px-6 py-4 text-center">Status</th>
                                            <th className="px-6 py-4 text-right">Ação</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 text-sm">
                                        {paginatedPatients.map(patient => (
                                            <tr
                                                key={patient.id}
                                                onClick={() => setSelectedPatient(patient)}
                                                className="hover:bg-blue-50/30 transition-colors cursor-pointer group"
                                            >
                                                <td className="px-6 py-4 font-medium text-gray-900">
                                                    <div className="flex items-center gap-3">
                                                        {patient.photoUrl ? (
                                                            <img src={patient.photoUrl} alt={patient.name} className="w-10 h-10 rounded-full object-cover shadow-sm ring-2 ring-gray-100" />
                                                        ) : (
                                                            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 font-bold text-sm flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors shadow-sm">
                                                                {patient.name.charAt(0)}
                                                            </div>
                                                        )}
                                                        <div>
                                                            <div className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                                                                {patient.name}
                                                            </div>
                                                            {patient.cpf && (
                                                                <div className="text-xs text-gray-400 font-mono mt-0.5">
                                                                    CPF: {patient.cpf}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <a
                                                        href={getWhatsappUrl(patient.phone)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline transition-colors"
                                                        title="Conversar no WhatsApp"
                                                    >
                                                        <PhoneIcon className="w-3.5 h-3.5 text-emerald-600 fill-emerald-50" />
                                                        <span>{patient.phone}</span>
                                                    </a>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-xs font-semibold text-gray-600 bg-gray-100 border border-gray-200 px-2.5 py-1 rounded-full">
                                                        {allUnits.find(u => u.id === patient.unitId)?.name || 'N/A'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-gray-800 font-medium">
                                                    {patient.plan?.name || 'Sem plano'}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    {patient.plan ? (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                                            {patient.plan.remainingSessions} de {patient.plan.totalSessions}
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-400 text-xs">-</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold ${patient.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-600 border border-gray-200'}`}>
                                                        {patient.status === 'Active' ? 'Em Tratamento' : 'Inativo'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className="text-xs font-semibold text-blue-600 group-hover:text-blue-700 flex items-center justify-end gap-1">
                                                        <span>Ver Prontuário</span>
                                                        <span className="group-hover:translate-x-0.5 transition-transform">→</span>
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Pagination Controls Bar */}
                    <div className="bg-white px-6 py-4 rounded-2xl border border-gray-200/90 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
                        <div className="flex items-center gap-3 text-xs text-gray-500 font-medium">
                            <span>
                                Mostrando <strong className="text-gray-900">{filteredPatients.length > 0 ? startIndex + 1 : 0}</strong> a <strong className="text-gray-900">{endIndex}</strong> de <strong className="text-gray-900">{filteredPatients.length}</strong> pacientes
                            </span>
                            <span className="hidden md:inline text-gray-300">|</span>
                            <div className="hidden md:flex items-center gap-1.5">
                                <span>Exibir:</span>
                                <select
                                    value={itemsPerPage}
                                    onChange={(e) => {
                                        setItemsPerPage(Number(e.target.value));
                                        setCurrentPage(1);
                                    }}
                                    className="bg-gray-50 border border-gray-200 text-gray-800 text-xs font-bold rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                                >
                                    <option value={9}>9 por pág.</option>
                                    <option value={12}>12 por pág.</option>
                                    <option value={24}>24 por pág.</option>
                                    <option value={48}>48 por pág.</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className={`p-2 rounded-lg border text-xs font-medium flex items-center gap-1 transition-all ${
                                    currentPage === 1
                                        ? 'bg-gray-50 text-gray-300 border-gray-200 cursor-not-allowed'
                                        : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-200 shadow-sm cursor-pointer'
                                }`}
                                title="Página Anterior"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                <span className="hidden sm:inline">Anterior</span>
                            </button>

                            {/* Page Numbers */}
                            <div className="flex items-center gap-1">
                                {Array.from({ length: totalPages }, (_, i) => i + 1)
                                    .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
                                    .map((page, idx, arr) => {
                                        const prevPage = arr[idx - 1];
                                        const showEllipsis = prevPage && page - prevPage > 1;
                                        return (
                                            <React.Fragment key={page}>
                                                {showEllipsis && <span className="px-1 text-gray-400 text-xs">...</span>}
                                                <button
                                                    type="button"
                                                    onClick={() => setCurrentPage(page)}
                                                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                                                        currentPage === page
                                                            ? 'bg-primary text-white shadow-sm shadow-primary/30'
                                                            : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                                                    }`}
                                                >
                                                    {page}
                                                </button>
                                            </React.Fragment>
                                        );
                                    })}
                            </div>

                            <button
                                type="button"
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className={`p-2 rounded-lg border text-xs font-medium flex items-center gap-1 transition-all ${
                                    currentPage === totalPages
                                        ? 'bg-gray-50 text-gray-300 border-gray-200 cursor-not-allowed'
                                        : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-200 shadow-sm cursor-pointer'
                                }`}
                                title="Próxima Página"
                            >
                                <span className="hidden sm:inline">Próxima</span>
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </>
            ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <User className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-1">Nenhum paciente encontrado</h3>
                    <p className="text-gray-500 max-w-sm">
                        Não encontramos nenhum paciente correspondente aos filtros selecionados.
                    </p>
                    <button
                        onClick={() => { setSearchTerm(''); setStatusFilter('All'); setPlanFilter('All'); }}
                        className="mt-6 text-primary hover:text-primary-hover font-medium text-sm transition-colors"
                    >
                        Limpar todos os filtros
                    </button>
                </div>
            )}

            {
                isCreateModalOpen && (
                    <CreatePatientModal
                        onClose={() => { setIsCreateModalOpen(false); setEditingPatient(null); }}
                        onSave={handleCreatePatient}
                        currentUnit={currentUnit}
                        planTemplates={planTemplates}
                        initialData={editingPatient}
                        allUnits={allUnits}
                    />
                )
            }

            {
                selectedPatient && (
                    <PatientDetailModal
                        patient={selectedPatient}
                        onClose={() => setSelectedPatient(null)}
                        currentUnit={currentUnit}
                        professionals={professionals}
                        units={allUnits}
                        onOpenFacialScan={(p) => setFacialScanPatient(p)}
                        onEdit={(p) => openEditModal(p)}
                        onToggleStatus={(p) => handleToggleStatus(p)}
                        onDelete={(id) => handleDeletePatient(id)}
                        onUpdatePatient={handlePatientUpdated}
                        onRequestConfirm={(config) => setConfirmModal({ ...config, isOpen: true })}
                    />
                )
            }

            {
                facialScanPatient && (
                    <FacialScanModal
                        isOpen={!!facialScanPatient}
                        onClose={() => setFacialScanPatient(null)}
                        patientName={facialScanPatient.name}
                        onSaveFacialData={handleSaveFacialData}
                    />
                )
            }

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

export default Patients;
