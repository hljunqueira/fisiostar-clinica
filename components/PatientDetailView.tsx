import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Clock, Stethoscope, Activity, ShieldCheck, CreditCard, User, 
    Printer, Phone as PhoneIcon, Edit2, Trash2, XCircle, CheckCircle, 
    UploadCloud, Camera, ChevronLeft, Plus, FileText, AlertCircle, 
    Calendar as CalendarIcon, FileSignature, Check, MapPin, Hash, Sparkles, X,
    RefreshCw, DollarSign, Save, Search, Filter, ArrowUpDown, Share2, Heart,
    Baby, Home, Download
} from 'lucide-react';
import { UnitId, Patient, SessionStatus, Professional, Session, Unit, PatientEvaluation, PatientEvolution, PatientContract, PlanTemplate, Agreement } from '../types';
import { patientsApi, sessionsApi, unitsApi, evaluationsApi, evolutionsApi, contractsApi, planTemplatesApi, agreementsApi } from '../src/services/api';
import { maskPhone, maskCpf, maskCep, validateCpf, formatPhone } from '../src/utils/masks';
import { storageApi } from '../src/services/storage-api';
import { EvaluationModal } from './EvaluationModal';
import { EvolutionModal } from './EvolutionModal';
import { ContractModal } from './ContractModal';
import { DocumentGeneratorModal } from './DocumentGeneratorModal';
import SignatureModal from './SignatureModal';
import { useAuth } from '../src/contexts/AuthContext';
import toast from 'react-hot-toast';

interface PatientDetailViewProps {
    patient: Patient;
    onClose: () => void;
    currentUnit: UnitId;
    professionals: Professional[];
    units: Unit[];
    initialTab?: 'timeline' | 'evaluations' | 'evolutions' | 'contracts' | 'financial' | 'info' | 'guardian';
    onOpenFacialScan?: (patient: Patient) => void;
    onEdit?: (patient: Patient) => void;
    onToggleStatus?: (patient: Patient) => void;
    onDelete?: (id: string) => void;
    onUpdatePatient?: (updated: Partial<Patient> & { id: string }) => void;
    onRequestConfirm?: (config: { title: string; description: string; confirmLabel?: string; variant?: 'danger' | 'warning' | 'info'; onConfirm: () => void }) => void;
}

const getWhatsappUrl = (phone?: string, text?: string) => {
    if (!phone) return '#';
    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone) return '#';
    const finalPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    const message = text || 'Olá! Entro em contato da clínica FisioStar.';
    return `https://wa.me/${finalPhone}?text=${encodeURIComponent(message)}`;
};

export const PatientDetailView: React.FC<PatientDetailViewProps> = ({
    patient: initialPatient,
    onClose,
    currentUnit,
    professionals,
    units,
    initialTab = 'timeline',
    onOpenFacialScan,
    onToggleStatus,
    onDelete,
    onUpdatePatient,
    onRequestConfirm
}) => {
    const navigate = useNavigate();
    const [patient, setPatient] = useState<Patient>(initialPatient);
    const [unitName, setUnitName] = useState('');
    const { systemUser } = useAuth();
    const [agreements, setAgreements] = useState<Agreement[]>([]);

    useEffect(() => {
        setPatient(initialPatient);
        setCurrentPhoto(initialPatient.photoUrl);
    }, [initialPatient]);

    useEffect(() => {
        if (currentUnit === 'ALL') {
            setUnitName(`Todas (Paciente: ${units.find(u => u.id === patient.unitId)?.name || 'N/A'})`);
        } else {
            unitsApi.getById(currentUnit).then(u => setUnitName(u.name)).catch(() => setUnitName('FisioStar'));
        }
        agreementsApi.getAll().then(setAgreements).catch(() => {});
    }, [currentUnit, patient.unitId, units]);

    const [activeTab, setActiveTab] = useState<'timeline' | 'evaluations' | 'evolutions' | 'contracts' | 'financial' | 'info' | 'guardian'>(initialTab);
    
    // Clinical Records State
    const [evaluations, setEvaluations] = useState<PatientEvaluation[]>([]);
    const [evolutions, setEvolutions] = useState<PatientEvolution[]>([]);
    const [contracts, setContracts] = useState<PatientContract[]>([]);
    const [planTemplates, setPlanTemplates] = useState<PlanTemplate[]>([]);
    const [patientHistory, setPatientHistory] = useState<Session[]>([]);
    const [loadingClinical, setLoadingClinical] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(true);

    // Modals state
    const [isEvalModalOpen, setIsEvalModalOpen] = useState(false);
    const [selectedEvalToEdit, setSelectedEvalToEdit] = useState<PatientEvaluation | null>(null);
    const [isEvolModalOpen, setIsEvolModalOpen] = useState(false);
    const [selectedEvolToEdit, setSelectedEvolToEdit] = useState<PatientEvolution | null>(null);
    const [isContractModalOpen, setIsContractModalOpen] = useState(false);
    const [selectedContractToView, setSelectedContractToView] = useState<PatientContract | null>(null);
    const [isDocGenModalOpen, setIsDocGenModalOpen] = useState(false);
    const [showSignatureModal, setShowSignatureModal] = useState(false);
    const [sessionToSign, setSessionToSign] = useState<string | null>(null);

    // Modal de Vincular / Trocar Plano
    const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
    const [selectedPlanTemplateId, setSelectedPlanTemplateId] = useState<string>('');
    const [customPlanName, setCustomPlanName] = useState('');
    const [planTotalSessions, setPlanTotalSessions] = useState(10);
    const [planRemainingSessions, setPlanRemainingSessions] = useState(10);
    const [planTotalPaid, setPlanTotalPaid] = useState<number>(0);
    const [planPaymentStatus, setPlanPaymentStatus] = useState<'paid' | 'pending'>('paid');
    const [planPaymentMethod, setPlanPaymentMethod] = useState<string>('pix');
    const [planExpiryDays, setPlanExpiryDays] = useState(60);
    const [savingPlan, setSavingPlan] = useState(false);

    // Timeline Filters State
    const [timelineCategory, setTimelineCategory] = useState<'all' | 'sessions' | 'evolutions' | 'evaluations' | 'contracts' | 'guardian'>('all');
    const [timelineProfessional, setTimelineProfessional] = useState<string>('all');
    const [timelinePeriod, setTimelinePeriod] = useState<'all' | 'this_month' | 'three_months'>('all');
    const [timelineSearch, setTimelineSearch] = useState('');
    const [timelineSortOrder, setTimelineSortOrder] = useState<'desc' | 'asc'>('desc');

    // Modo de Edição de Dados Pessoais
    const [isEditingInfo, setIsEditingInfo] = useState(false);
    const [savingInfo, setSavingInfo] = useState(false);

    // Form State (Personal Info)
    const [editName, setEditName] = useState(patient.name);
    const [editIsSocialName, setEditIsSocialName] = useState(patient.isSocialName || false);
    const [editSocialName, setEditSocialName] = useState(patient.socialName || '');
    const [editCpf, setEditCpf] = useState(patient.cpf || '');
    const [editRg, setEditRg] = useState(patient.rg || '');
    const [editCns, setEditCns] = useState(patient.cns || '');
    const [editBirthDate, setEditBirthDate] = useState(patient.birthDate || '');
    const [editMaritalStatus, setEditMaritalStatus] = useState(patient.maritalStatus || '');
    const [editGender, setEditGender] = useState(patient.gender || '');
    const [editProfession, setEditProfession] = useState(patient.profession || '');
    const [editCompanyName, setEditCompanyName] = useState(patient.companyName || '');
    const [editBriefDiagnosis, setEditBriefDiagnosis] = useState(patient.briefDiagnosis || '');

    // Form State (Contact)
    const [editPhone, setEditPhone] = useState(patient.phone || '');
    const [editLandlinePhone, setEditLandlinePhone] = useState(patient.landlinePhone || '');
    const [editEmail, setEditEmail] = useState(patient.email || '');
    const [editContactPreference, setEditContactPreference] = useState<'whatsapp' | 'email' | 'sms' | 'call'>(patient.contactPreference || 'whatsapp');
    const [editAllowReminders, setEditAllowReminders] = useState(patient.allowReminders !== undefined ? patient.allowReminders : true);

    // Form State (Insurance)
    const [editAgreementId, setEditAgreementId] = useState(patient.agreementId || '');
    const [editInsuranceCardNumber, setEditInsuranceCardNumber] = useState(patient.insuranceCardNumber || '');
    const [editInsuranceCardExpiry, setEditInsuranceCardExpiry] = useState(patient.insuranceCardExpiry || '');
    const [editInsuranceCardHolder, setEditInsuranceCardHolder] = useState(patient.insuranceCardHolder || '');

    // Form State (Address)
    const [editCountry, setEditCountry] = useState(patient.country || 'Brasil');
    const [editCep, setEditCep] = useState(patient.cep || '');
    const [editState, setEditState] = useState(patient.state || 'SC');
    const [editCity, setEditCity] = useState(patient.city || '');
    const [editStreet, setEditStreet] = useState(patient.street || '');
    const [editNumber, setEditNumber] = useState(patient.number || '');
    const [editBairro, setEditBairro] = useState(patient.bairro || '');
    const [editComplement, setEditComplement] = useState(patient.complement || '');

    // Form State (Guardian / Pediatric)
    const [editHasGuardian, setEditHasGuardian] = useState(patient.hasGuardian || false);
    const [editGuardianName, setEditGuardianName] = useState(patient.guardianName || '');
    const [editGuardianRelationship, setEditGuardianRelationship] = useState(patient.guardianRelationship || 'Mãe');
    const [editGuardianCpf, setEditGuardianCpf] = useState(patient.guardianCpf || '');
    const [editGuardianPhone, setEditGuardianPhone] = useState(patient.guardianPhone || '');
    const [editGuardianEmail, setEditGuardianEmail] = useState(patient.guardianEmail || '');
    const [editHomeCareInstructions, setEditHomeCareInstructions] = useState(patient.homeCareInstructions || '');

    // Form State (Referral)
    const [editReferralSource, setEditReferralSource] = useState(patient.referralSource || '');
    const [editReferralDoctor, setEditReferralDoctor] = useState(patient.referralDoctor || '');

    // Photo Capture State
    const [showCamera, setShowCamera] = useState(false);
    const [currentPhoto, setCurrentPhoto] = useState<string | undefined>(patient.photoUrl);
    const videoRef = useRef<HTMLVideoElement>(null);

    const loadClinicalData = async () => {
        setLoadingClinical(true);
        try {
            const [evals, evos, conts, templates] = await Promise.all([
                evaluationsApi.getByPatientId(patient.id),
                evolutionsApi.getByPatientId(patient.id),
                contractsApi.getByPatientId(patient.id),
                planTemplatesApi.getAll()
            ]);
            setEvaluations(evals);
            setEvolutions(evos);
            setContracts(conts);
            setPlanTemplates(templates.filter(t => t.active));
        } catch (error) {
            console.error('Erro ao carregar dados clínicos:', error);
        } finally {
            setLoadingClinical(false);
        }
    };

    useEffect(() => {
        loadClinicalData();
        setLoadingHistory(true);
        sessionsApi.getAll({ patientId: patient.id }).then(sessions => {
            setPatientHistory(sessions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        }).catch(err => {
            console.error('Error fetching sessions:', err);
        }).finally(() => {
            setLoadingHistory(false);
        });
    }, [patient.id]);

    const handleCepSearch = async (val: string) => {
        const masked = maskCep(val);
        setEditCep(masked);
        const clean = masked.replace(/\D/g, '');
        if (clean.length === 8) {
            try {
                const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
                const data = await res.json();
                if (!data.erro) {
                    if (data.logradouro) setEditStreet(data.logradouro);
                    if (data.bairro) setEditBairro(data.bairro);
                    if (data.localidade) setEditCity(data.localidade);
                    if (data.uf) setEditState(data.uf);
                    toast.success('Endereço preenchido automaticamente!');
                }
            } catch (err) {
                console.error(err);
            }
        }
    };

    const handleSaveInfo = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!editName.trim()) {
            toast.error('Informe o nome do paciente.');
            return;
        }

        try {
            setSavingInfo(true);
            const updates: Partial<Patient> = {
                name: editName.trim(),
                isSocialName: editIsSocialName,
                socialName: editSocialName.trim() || undefined,
                cpf: editCpf.trim() || undefined,
                rg: editRg.trim() || undefined,
                cns: editCns.trim() || undefined,
                birthDate: editBirthDate || undefined,
                maritalStatus: editMaritalStatus || undefined,
                gender: editGender || undefined,
                profession: editProfession.trim() || undefined,
                companyName: editCompanyName.trim() || undefined,
                briefDiagnosis: editBriefDiagnosis.trim() || undefined,
                phone: editPhone.trim(),
                landlinePhone: editLandlinePhone.trim() || undefined,
                email: editEmail.trim() || undefined,
                contactPreference: editContactPreference,
                allowReminders: editAllowReminders,
                agreementId: editAgreementId || undefined,
                insuranceCardNumber: editInsuranceCardNumber.trim() || undefined,
                insuranceCardExpiry: editInsuranceCardExpiry || undefined,
                insuranceCardHolder: editInsuranceCardHolder.trim() || undefined,
                country: editCountry || 'Brasil',
                cep: editCep.trim() || undefined,
                state: editState || undefined,
                city: editCity.trim() || undefined,
                street: editStreet.trim() || undefined,
                number: editNumber.trim() || undefined,
                bairro: editBairro.trim() || undefined,
                complement: editComplement.trim() || undefined,
                address: editStreet ? `${editStreet}${editNumber ? ', ' + editNumber : ''}${editBairro ? ' - ' + editBairro : ''}${editCity ? ', ' + editCity : ''}` : undefined,
                hasGuardian: editHasGuardian,
                guardianName: editGuardianName.trim() || undefined,
                guardianRelationship: editGuardianRelationship || undefined,
                guardianCpf: editGuardianCpf.trim() || undefined,
                guardianPhone: editGuardianPhone.trim() || undefined,
                guardianEmail: editGuardianEmail.trim() || undefined,
                homeCareInstructions: editHomeCareInstructions.trim() || undefined,
                referralSource: editReferralSource || undefined,
                referralDoctor: editReferralDoctor.trim() || undefined
            };

            const updated = await patientsApi.update(patient.id, updates);
            setPatient(updated);
            if (onUpdatePatient) onUpdatePatient({ id: patient.id, ...updates });
            toast.success('Dados cadastrais atualizados com sucesso!');
            setIsEditingInfo(false);
        } catch (error) {
            console.error('Error saving patient details:', error);
            toast.error('Erro ao salvar dados do paciente.');
        } finally {
            setSavingInfo(false);
        }
    };

    // Calculate Age
    const calculatedAge = useMemo(() => {
        if (!patient.birthDate) return null;
        const birth = new Date(patient.birthDate + 'T00:00:00');
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        return age >= 0 ? age : null;
    }, [patient.birthDate]);

    // Aggregate Timeline Events
    interface TimelineEvent {
        id: string;
        type: 'session' | 'evolution' | 'evaluation' | 'contract' | 'guardian_note';
        date: string;
        time?: string;
        title: string;
        subtitle: string;
        professionalName?: string;
        status?: string;
        statusColor?: string;
        details?: string;
        badge?: string;
        rawObject?: any;
    }

    const timelineEvents = useMemo(() => {
        const events: TimelineEvent[] = [];

        // Sessions
        patientHistory.forEach(s => {
            const prof = professionals.find(p => p.id === s.professionalId);
            events.push({
                id: `session-${s.id}`,
                type: 'session',
                date: s.date,
                time: s.time,
                title: s.type || 'Atendimento de Fisioterapia',
                subtitle: `Fisioterapeuta: ${prof?.name || 'Não atribuído'}`,
                professionalName: prof?.name,
                status: s.status,
                details: s.notes,
                rawObject: s
            });
        });

        // Evolutions
        evolutions.forEach(ev => {
            const prof = professionals.find(p => p.id === ev.professionalId);
            events.push({
                id: `evolution-${ev.id}`,
                type: 'evolution',
                date: ev.date,
                title: 'Evolução Clínica Diária',
                subtitle: `Fisioterapeuta: ${prof?.name || 'Profissional'} • ${ev.specialty || 'Geral'}`,
                professionalName: prof?.name,
                details: ev.conduct || ev.subjective || ev.assessment,
                rawObject: ev
            });
        });

        // Evaluations
        evaluations.forEach(evalItem => {
            const prof = professionals.find(p => p.id === evalItem.professionalId);
            events.push({
                id: `evaluation-${evalItem.id}`,
                type: 'evaluation',
                date: evalItem.date,
                title: `Avaliação Clínica (${evalItem.specialty || 'Anamnese'})`,
                subtitle: `Avaliador: ${prof?.name || 'Profissional'}${evalItem.painLevel !== undefined ? ` • Dor EVA: ${evalItem.painLevel}/10` : ''}`,
                professionalName: prof?.name,
                details: `Queixa: ${evalItem.chiefComplaint}${evalItem.diagnosis ? ` | Diagnóstico: ${evalItem.diagnosis}` : ''}`,
                rawObject: evalItem
            });
        });

        // Contracts / Plans
        contracts.forEach(c => {
            events.push({
                id: `contract-${c.id}`,
                type: 'contract',
                date: c.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0],
                title: `Contrato / Termo de Tratamento`,
                subtitle: `Plano: ${c.planName || 'Pacote Terapêutico'} (${c.totalSessions || 0} sessões)`,
                details: `Status: ${c.status === 'signed' ? 'Assinado digitalmente' : 'Pendente de assinatura'}`,
                rawObject: c
            });
        });

        // Home Care / Pediatric Instructions
        if (patient.homeCareInstructions) {
            events.push({
                id: `guardian-instruction-${patient.id}`,
                type: 'guardian_note',
                date: patient.updatedAt ? patient.updatedAt.split('T')[0] : (patient.lastVisit || new Date().toISOString().split('T')[0]),
                title: 'Orientações Domiciliares para os Pais (Home Care)',
                subtitle: `Destinatário: ${patient.guardianName || 'Família / Responsável'}`,
                details: patient.homeCareInstructions,
                rawObject: patient
            });
        }

        // Apply Filters
        return events.filter(item => {
            // Category filter
            if (timelineCategory === 'sessions' && item.type !== 'session') return false;
            if (timelineCategory === 'evolutions' && item.type !== 'evolution') return false;
            if (timelineCategory === 'evaluations' && item.type !== 'evaluation') return false;
            if (timelineCategory === 'contracts' && item.type !== 'contract') return false;
            if (timelineCategory === 'guardian' && item.type !== 'guardian_note') return false;

            // Professional filter
            if (timelineProfessional !== 'all' && item.professionalName !== timelineProfessional) return false;

            // Period filter
            if (timelinePeriod !== 'all') {
                const itemDate = new Date(item.date);
                const now = new Date();
                if (timelinePeriod === 'this_month') {
                    if (itemDate.getMonth() !== now.getMonth() || itemDate.getFullYear() !== now.getFullYear()) return false;
                } else if (timelinePeriod === 'three_months') {
                    const threeMonthsAgo = new Date();
                    threeMonthsAgo.setMonth(now.getMonth() - 3);
                    if (itemDate < threeMonthsAgo) return false;
                }
            }

            // Search filter
            if (timelineSearch.trim()) {
                const q = timelineSearch.toLowerCase();
                const matchText = (item.title + ' ' + item.subtitle + ' ' + (item.details || '')).toLowerCase();
                if (!matchText.includes(q)) return false;
            }

            return true;
        }).sort((a, b) => {
            const timeA = new Date(a.date + (a.time ? 'T' + a.time : 'T00:00:00')).getTime();
            const timeB = new Date(b.date + (b.time ? 'T' + b.time : 'T00:00:00')).getTime();
            return timelineSortOrder === 'desc' ? timeB - timeA : timeA - timeB;
        });
    }, [patientHistory, evolutions, evaluations, contracts, patient.homeCareInstructions, timelineCategory, timelineProfessional, timelinePeriod, timelineSearch, timelineSortOrder, professionals]);

    // Summary Counters
    const counters = useMemo(() => {
        return {
            evaluations: evaluations.length,
            evolutions: evolutions.length,
            scheduled: patientHistory.filter(s => s.status === 'Agendada' || s.status === 'Confirmada').length,
            completed: patientHistory.filter(s => s.status === 'Realizada' || s.status === 'Atendido').length,
            cancelled: patientHistory.filter(s => s.status === 'Cancelada' || s.status === 'Cancelado').length,
            noShow: patientHistory.filter(s => s.status === 'Falta' || s.status === 'Faltou').length,
            hasGuardian: !!patient.hasGuardian
        };
    }, [evaluations, evolutions, patientHistory, patient.hasGuardian]);

    // Group Timeline Events by Date
    const groupedTimeline = useMemo(() => {
        const groups: { date: string; formattedDate: string; items: TimelineEvent[] }[] = [];
        timelineEvents.forEach(ev => {
            const lastGroup = groups[groups.length - 1];
            if (lastGroup && lastGroup.date === ev.date) {
                lastGroup.items.push(ev);
            } else {
                const d = new Date(ev.date + 'T00:00:00');
                const formattedDate = isNaN(d.getTime()) ? ev.date : d.toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                });
                groups.push({
                    date: ev.date,
                    formattedDate,
                    items: [ev]
                });
            }
        });
        return groups;
    }, [timelineEvents]);

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="space-y-4 animate-fade-in pb-10">
            {/* Top Navigation Header Clean */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:px-6 rounded-2xl border border-slate-200/90 shadow-xs">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer group"
                        title="Voltar para lista de pacientes"
                    >
                        <span>← Voltar para Pacientes</span>
                    </button>
                    <div className="h-6 w-px bg-slate-200 hidden sm:block" />
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Prontuário & Histórico</span>
                            <span className="text-slate-300">•</span>
                            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">{unitName}</span>
                            {calculatedAge !== null && (
                                <span className="text-xs text-slate-500 font-medium">({calculatedAge} anos)</span>
                            )}
                        </div>
                        <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                            <span>{patient.name}</span>
                            {patient.isSocialName && patient.socialName && (
                                <span className="text-xs font-normal text-slate-500 italic">({patient.socialName})</span>
                            )}
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => navigate(`/agenda?patientId=${patient.id}`)}
                        className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                    >
                        Ver na Agenda
                    </button>
                    <button
                        onClick={() => setIsDocGenModalOpen(true)}
                        className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                    >
                        Gerar Documento
                    </button>
                    <button
                        onClick={handlePrint}
                        className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs cursor-pointer"
                    >
                        Imprimir Prontuário
                    </button>
                </div>
            </div>

            {/* Main Layout Grid */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col lg:flex-row min-h-[750px]">
                {/* Left Sidebar Clean */}
                <div className="w-full lg:w-72 bg-slate-50/70 border-r border-slate-200/80 p-5 flex flex-col items-center flex-shrink-0 space-y-4">
                    {/* Patient Photo */}
                    <div className="relative group">
                        <div className="w-28 h-28 rounded-full overflow-hidden shadow-md border-4 border-white relative bg-white">
                            {currentPhoto ? (
                                <img src={currentPhoto} alt={patient.name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-blue-100 flex items-center justify-center text-blue-600 font-extrabold text-3xl">
                                    {patient.name.charAt(0)}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="text-center w-full">
                        <h2 className="text-base font-bold text-slate-900 leading-snug">{patient.name}</h2>
                        {patient.phone && (
                            <a
                                href={getWhatsappUrl(patient.phone)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold inline-flex items-center gap-1 hover:underline mt-0.5"
                            >
                                <span>WhatsApp: {formatPhone(patient.phone)}</span>
                            </a>
                        )}
                        {patient.briefDiagnosis && (
                            <p className="text-[11px] text-slate-600 font-medium bg-slate-100 p-2 rounded-lg mt-2 text-left">
                                <strong className="text-slate-800">Diagnóstico:</strong> {patient.briefDiagnosis}
                            </p>
                        )}
                    </div>

                    {/* Badge do Responsável / Criança (Araranguá) */}
                    {patient.hasGuardian && patient.guardianName && (
                        <div className="w-full bg-indigo-50/80 border border-indigo-200 p-3 rounded-xl text-left">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 block mb-0.5">
                                Responsável Legal ({patient.guardianRelationship || 'Mãe'})
                            </span>
                            <p className="text-xs font-bold text-slate-900">{patient.guardianName}</p>
                            {patient.guardianPhone && (
                                <a
                                    href={getWhatsappUrl(patient.guardianPhone, `Olá ${patient.guardianName}! Entramos em contato da FisioStar sobre o atendimento de ${patient.name}.`)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[11px] text-indigo-600 hover:underline font-semibold block mt-0.5"
                                >
                                    Enviar WhatsApp ao Responsável
                                </a>
                            )}
                        </div>
                    )}

                    {/* Resumo do Plano */}
                    <div className="w-full bg-white p-3 rounded-xl border border-slate-200 text-left">
                        <div className="flex justify-between items-center mb-0.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Plano</span>
                            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${patient.plan && patient.plan.remainingSessions > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                                {patient.plan ? (patient.plan.remainingSessions > 0 ? 'Ativo' : 'Esgotado') : 'Sem Plano'}
                            </span>
                        </div>
                        <p className="text-xs font-bold text-slate-900 truncate">{patient.plan?.name || 'Nenhum plano vinculado'}</p>
                        <p className="text-xs text-blue-600 font-bold mt-0.5">
                            {patient.plan?.remainingSessions || 0} de {patient.plan?.totalSessions || 0} sessões restantes
                        </p>
                    </div>

                    {/* Filtros Rápidos da Timeline com Contadores */}
                    <div className="w-full space-y-1 pt-1 border-t border-slate-200">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 px-1">
                            Filtros do Histórico
                        </span>
                        
                        <button
                            type="button"
                            onClick={() => { setActiveTab('timeline'); setTimelineCategory('all'); }}
                            className={`w-full px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-between transition-colors cursor-pointer ${timelineCategory === 'all' && activeTab === 'timeline' ? 'bg-blue-600 text-white' : 'hover:bg-slate-100 text-slate-700'}`}
                        >
                            <span>Todas as Atividades</span>
                            <span className="text-[11px] font-mono">{timelineEvents.length}</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => { setActiveTab('timeline'); setTimelineCategory('evaluations'); }}
                            className={`w-full px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-between transition-colors cursor-pointer ${timelineCategory === 'evaluations' && activeTab === 'timeline' ? 'bg-blue-600 text-white' : 'hover:bg-slate-100 text-slate-700'}`}
                        >
                            <span>Avaliações</span>
                            <span className="text-[11px] font-mono">{counters.evaluations}</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => { setActiveTab('timeline'); setTimelineCategory('evolutions'); }}
                            className={`w-full px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-between transition-colors cursor-pointer ${timelineCategory === 'evolutions' && activeTab === 'timeline' ? 'bg-blue-600 text-white' : 'hover:bg-slate-100 text-slate-700'}`}
                        >
                            <span>Evoluções</span>
                            <span className="text-[11px] font-mono">{counters.evolutions}</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => { setActiveTab('timeline'); setTimelineCategory('sessions'); }}
                            className={`w-full px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-between transition-colors cursor-pointer ${timelineCategory === 'sessions' && activeTab === 'timeline' ? 'bg-blue-600 text-white' : 'hover:bg-slate-100 text-slate-700'}`}
                        >
                            <span>Consultas & Sessões</span>
                            <span className="text-[11px] font-mono">{counters.completed + counters.scheduled}</span>
                        </button>

                        {patient.homeCareInstructions && (
                            <button
                                type="button"
                                onClick={() => { setActiveTab('timeline'); setTimelineCategory('guardian'); }}
                                className={`w-full px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-between transition-colors cursor-pointer ${timelineCategory === 'guardian' && activeTab === 'timeline' ? 'bg-blue-600 text-white' : 'hover:bg-slate-100 text-slate-700'}`}
                            >
                                <span>Orientações aos Pais</span>
                                <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 rounded">Home Care</span>
                            </button>
                        )}
                    </div>

                    {/* Botões Rápidos */}
                    <div className="w-full space-y-2 pt-2 border-t border-slate-200">
                        <button
                            type="button"
                            onClick={() => { setSelectedEvolToEdit(null); setIsEvolModalOpen(true); }}
                            className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs cursor-pointer text-center block"
                        >
                            + Nova Evolução
                        </button>
                        <button
                            type="button"
                            onClick={() => { setSelectedEvalToEdit(null); setIsEvalModalOpen(true); }}
                            className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-all cursor-pointer text-center block"
                        >
                            + Nova Avaliação
                        </button>
                    </div>
                </div>

                {/* Right Content Area */}
                <div className="flex-1 flex flex-col min-h-0 bg-white overflow-hidden">
                    {/* Navigation Tabs Clean */}
                    <div className="border-b border-slate-200 bg-slate-50/60 px-4 sm:px-6 overflow-x-auto custom-scrollbar">
                        <nav className="flex gap-2" aria-label="Tabs">
                            <button
                                onClick={() => setActiveTab('timeline')}
                                className={`py-3.5 px-4 font-bold text-xs sm:text-sm border-b-2 transition-all whitespace-nowrap cursor-pointer ${activeTab === 'timeline' ? 'border-blue-600 text-blue-700 bg-white shadow-2xs rounded-t-lg' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                            >
                                <span>Linha do Tempo</span>
                            </button>

                            <button
                                onClick={() => setActiveTab('evaluations')}
                                className={`py-3.5 px-4 font-bold text-xs sm:text-sm border-b-2 transition-all whitespace-nowrap cursor-pointer ${activeTab === 'evaluations' ? 'border-blue-600 text-blue-700 bg-white shadow-2xs rounded-t-lg' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                            >
                                <span>Avaliações ({evaluations.length})</span>
                            </button>

                            <button
                                onClick={() => setActiveTab('evolutions')}
                                className={`py-3.5 px-4 font-bold text-xs sm:text-sm border-b-2 transition-all whitespace-nowrap cursor-pointer ${activeTab === 'evolutions' ? 'border-blue-600 text-blue-700 bg-white shadow-2xs rounded-t-lg' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                            >
                                <span>Evoluções ({evolutions.length})</span>
                            </button>

                            <button
                                onClick={() => setActiveTab('guardian')}
                                className={`py-3.5 px-4 font-bold text-xs sm:text-sm border-b-2 transition-all whitespace-nowrap cursor-pointer ${activeTab === 'guardian' ? 'border-blue-600 text-blue-700 bg-white shadow-2xs rounded-t-lg' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                            >
                                <span>Acompanhamento dos Pais</span>
                            </button>

                            <button
                                onClick={() => setActiveTab('contracts')}
                                className={`py-3.5 px-4 font-bold text-xs sm:text-sm border-b-2 transition-all whitespace-nowrap cursor-pointer ${activeTab === 'contracts' ? 'border-blue-600 text-blue-700 bg-white shadow-2xs rounded-t-lg' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                            >
                                <span>Documentos & Termos ({contracts.length})</span>
                            </button>

                            <button
                                onClick={() => setActiveTab('financial')}
                                className={`py-3.5 px-4 font-bold text-xs sm:text-sm border-b-2 transition-all whitespace-nowrap cursor-pointer ${activeTab === 'financial' ? 'border-blue-600 text-blue-700 bg-white shadow-2xs rounded-t-lg' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                            >
                                <span>Financeiro</span>
                            </button>

                            <button
                                onClick={() => setActiveTab('info')}
                                className={`py-3.5 px-4 font-bold text-xs sm:text-sm border-b-2 transition-all whitespace-nowrap cursor-pointer ${activeTab === 'info' ? 'border-blue-600 text-blue-700 bg-white shadow-2xs rounded-t-lg' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                            >
                                <span>Dados Pessoais</span>
                            </button>
                        </nav>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
                        {/* ======================================================== */}
                        {/* TAB 1: LINHA DO TEMPO (TIMELINE UNIFICADA & CLEAN)        */}
                        {/* ======================================================== */}
                        {activeTab === 'timeline' && (
                            <div className="space-y-5 animate-fade-in max-w-4xl">
                                {/* Top Filter Bar Clean */}
                                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
                                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                                        <div className="sm:col-span-4">
                                            <input
                                                type="text"
                                                placeholder="Buscar no histórico..."
                                                value={timelineSearch}
                                                onChange={e => setTimelineSearch(e.target.value)}
                                                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>

                                        <div className="sm:col-span-3">
                                            <select
                                                value={timelineCategory}
                                                onChange={e => setTimelineCategory(e.target.value as any)}
                                                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                                            >
                                                <option value="all">Mostrar: Todos os Eventos</option>
                                                <option value="sessions">Apenas Consultas & Sessões</option>
                                                <option value="evolutions">Apenas Evoluções Clínicas</option>
                                                <option value="evaluations">Apenas Avaliações</option>
                                                <option value="contracts">Apenas Contratos / Planos</option>
                                                <option value="guardian">Apenas Orientações aos Pais</option>
                                            </select>
                                        </div>

                                        <div className="sm:col-span-3">
                                            <select
                                                value={timelinePeriod}
                                                onChange={e => setTimelinePeriod(e.target.value as any)}
                                                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                                            >
                                                <option value="all">Período: Todo o Histórico</option>
                                                <option value="this_month">Período: Este Mês</option>
                                                <option value="three_months">Período: Últimos 3 Meses</option>
                                            </select>
                                        </div>

                                        <div className="sm:col-span-2 flex justify-end">
                                            <button
                                                type="button"
                                                onClick={() => setTimelineSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                                                className="w-full text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-lg transition-colors text-center cursor-pointer"
                                                title="Alternar ordem cronológica"
                                            >
                                                {timelineSortOrder === 'desc' ? 'Mais Recentes ↓' : 'Mais Antigos ↑'}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Timeline Feed */}
                                {loadingClinical || loadingHistory ? (
                                    <div className="py-12 text-center text-slate-400 text-xs">Carregando linha do tempo...</div>
                                ) : groupedTimeline.length === 0 ? (
                                    <div className="p-8 bg-white rounded-xl border border-slate-200 text-center text-slate-400 text-xs">
                                        Nenhum registro encontrado para os filtros selecionados.
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {groupedTimeline.map(group => (
                                            <div key={group.date} className="space-y-3">
                                                {/* Date Badge */}
                                                <div className="inline-block">
                                                    <span className="bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-md shadow-2xs">
                                                        {group.formattedDate}
                                                    </span>
                                                </div>

                                                {/* Event Cards */}
                                                <div className="space-y-3 pl-2 border-l-2 border-slate-200 ml-3">
                                                    {group.items.map(ev => (
                                                        <div
                                                            key={ev.id}
                                                            className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs hover:border-blue-300 transition-all ml-3 space-y-2 relative"
                                                        >
                                                            {/* Event Header */}
                                                            <div className="flex items-start justify-between gap-2">
                                                                <div>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                                                                            ev.type === 'session' ? 'bg-blue-50 text-blue-700' :
                                                                            ev.type === 'evolution' ? 'bg-purple-50 text-purple-700' :
                                                                            ev.type === 'evaluation' ? 'bg-teal-50 text-teal-700' :
                                                                            ev.type === 'guardian_note' ? 'bg-indigo-50 text-indigo-700' :
                                                                            'bg-slate-100 text-slate-700'
                                                                        }`}>
                                                                            {ev.type === 'session' ? 'Consulta / Atendimento' :
                                                                             ev.type === 'evolution' ? 'Evolução Clínica' :
                                                                             ev.type === 'evaluation' ? 'Avaliação Clínica' :
                                                                             ev.type === 'guardian_note' ? 'Orientações aos Pais' :
                                                                             'Documento'}
                                                                        </span>
                                                                        {ev.time && (
                                                                            <span className="text-xs font-mono text-slate-500 font-semibold">
                                                                                às {ev.time.substring(0, 5)}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <h4 className="font-bold text-sm text-slate-900 mt-1">{ev.title}</h4>
                                                                    <p className="text-xs text-slate-500 font-medium">{ev.subtitle}</p>
                                                                </div>

                                                                {ev.status && (
                                                                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                                                                        ev.status === 'Realizada' || ev.status === 'Atendido' ? 'bg-emerald-50 text-emerald-700' :
                                                                        ev.status === 'Agendada' || ev.status === 'Agendado' ? 'bg-blue-50 text-blue-700' :
                                                                        ev.status === 'Confirmada' || ev.status === 'Confirmado' ? 'bg-teal-50 text-teal-700' :
                                                                        ev.status === 'Cancelada' || ev.status === 'Cancelado' ? 'bg-amber-50 text-amber-700' :
                                                                        'bg-red-50 text-red-700'
                                                                    }`}>
                                                                        {ev.status}
                                                                    </span>
                                                                )}
                                                            </div>

                                                            {/* Event Details Content */}
                                                            {ev.details && (
                                                                <div className="bg-slate-50/80 p-3 rounded-lg border border-slate-100 text-xs text-slate-700 whitespace-pre-wrap">
                                                                    {ev.details}
                                                                </div>
                                                            )}

                                                            {/* Pontos de Dor (Escala EVA) */}
                                                            {ev.rawObject?.pain_points && Array.isArray(ev.rawObject.pain_points) && ev.rawObject.pain_points.length > 0 && (
                                                                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pontos de Dor (EVA):</span>
                                                                    {ev.rawObject.pain_points.map((p: any) => (
                                                                        <span
                                                                            key={p.id || Math.random()}
                                                                            className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-100"
                                                                        >
                                                                            <span>{p.label || 'Ponto'}</span>
                                                                            <span className="bg-rose-600 text-white text-[10px] px-1 rounded-full">{p.intensity}/10</span>
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            )}

                                                            {/* Anexos e Exames */}
                                                            {ev.rawObject?.attachments && Array.isArray(ev.rawObject.attachments) && ev.rawObject.attachments.length > 0 && (
                                                                <div className="flex flex-wrap items-center gap-2 pt-1">
                                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Exames / Laudos:</span>
                                                                    {ev.rawObject.attachments.map((fileUrl: string, idx: number) => (
                                                                        <a
                                                                            key={idx}
                                                                            href={fileUrl}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors border border-blue-100"
                                                                        >
                                                                            <span>📎 Anexo {idx + 1}</span>
                                                                        </a>
                                                                    ))}
                                                                </div>
                                                            )}

                                                            {/* Fotos Clínicas */}
                                                            {ev.rawObject?.images && Array.isArray(ev.rawObject.images) && ev.rawObject.images.length > 0 && (
                                                                <div className="pt-1">
                                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Fotos Posturais / Clínicas:</span>
                                                                    <div className="flex flex-wrap gap-2">
                                                                        {ev.rawObject.images.map((imgUrl: string, idx: number) => (
                                                                            <a
                                                                                key={idx}
                                                                                href={imgUrl}
                                                                                target="_blank"
                                                                                rel="noopener noreferrer"
                                                                                className="relative group block w-16 h-16 rounded-lg overflow-hidden border border-slate-200 shadow-2xs hover:opacity-90 transition-opacity"
                                                                            >
                                                                                <img src={imgUrl} alt={`Foto Clínica ${idx + 1}`} className="w-full h-full object-cover" />
                                                                            </a>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Event Actions */}
                                                            <div className="flex items-center justify-end gap-2 pt-1">
                                                                {ev.type === 'session' && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => { setSelectedEvolToEdit(null); setIsEvolModalOpen(true); }}
                                                                        className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                                                                    >
                                                                        Registrar Evolução →
                                                                    </button>
                                                                )}
                                                                {ev.type === 'evolution' && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => { setSelectedEvolToEdit(ev.rawObject); setIsEvolModalOpen(true); }}
                                                                        className="text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
                                                                    >
                                                                        Ver Detalhes
                                                                    </button>
                                                                )}
                                                                {ev.type === 'evaluation' && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => { setSelectedEvalToEdit(ev.rawObject); setIsEvalModalOpen(true); }}
                                                                        className="text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
                                                                    >
                                                                        Ver Avaliação Completa
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ======================================================== */}
                        {/* TAB 2: AVALIAÇÕES CLÍNICAS (ANAMNESE)                    */}
                        {/* ======================================================== */}
                        {activeTab === 'evaluations' && (
                            <div className="space-y-4 animate-fade-in max-w-4xl">
                                <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                                    <div>
                                        <h3 className="font-bold text-slate-900 text-sm">Avaliações Clínicas</h3>
                                        <p className="text-xs text-slate-500">Histórico de diagnósticos cinético-funcionais e anamneses.</p>
                                    </div>
                                    <button
                                        onClick={() => { setSelectedEvalToEdit(null); setIsEvalModalOpen(true); }}
                                        className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition-all cursor-pointer"
                                    >
                                        + Nova Avaliação
                                    </button>
                                </div>

                                {evaluations.length === 0 ? (
                                    <div className="p-8 bg-white rounded-xl border border-slate-200 text-center text-slate-400 text-xs">
                                        Nenhuma avaliação cadastrada para este paciente.
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {evaluations.map(ev => (
                                            <div key={ev.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
                                                <div className="flex justify-between items-center">
                                                    <span className="font-bold text-sm text-slate-900">{ev.date} - {ev.specialty || 'Fisioterapia'}</span>
                                                    <button
                                                        onClick={() => { setSelectedEvalToEdit(ev); setIsEvalModalOpen(true); }}
                                                        className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                                                    >
                                                        Editar
                                                    </button>
                                                </div>
                                                <p className="text-xs text-slate-700"><strong>Queixa:</strong> {ev.chiefComplaint}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ======================================================== */}
                        {/* TAB 3: EVOLUÇÕES CLÍNICAS                                */}
                        {/* ======================================================== */}
                        {activeTab === 'evolutions' && (
                            <div className="space-y-4 animate-fade-in max-w-4xl">
                                <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                                    <div>
                                        <h3 className="font-bold text-slate-900 text-sm">Evoluções Diárias de Tratamento</h3>
                                        <p className="text-xs text-slate-500">Condutas fisioterapêuticas e resposta clínica.</p>
                                    </div>
                                    <button
                                        onClick={() => { setSelectedEvolToEdit(null); setIsEvolModalOpen(true); }}
                                        className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition-all cursor-pointer"
                                    >
                                        + Nova Evolução
                                    </button>
                                </div>

                                {evolutions.length === 0 ? (
                                    <div className="p-8 bg-white rounded-xl border border-slate-200 text-center text-slate-400 text-xs">
                                        Nenhuma evolução clínica registrada.
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {evolutions.map(ev => (
                                            <div key={ev.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
                                                <div className="flex justify-between items-center">
                                                    <span className="font-bold text-sm text-slate-900">{ev.date} • {ev.specialty || 'Fisioterapia'}</span>
                                                    <button
                                                        onClick={() => { setSelectedEvolToEdit(ev); setIsEvolModalOpen(true); }}
                                                        className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                                                    >
                                                        Visualizar / Editar
                                                    </button>
                                                </div>
                                                <p className="text-xs text-slate-700 whitespace-pre-wrap">{ev.conduct || ev.subjective}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ======================================================== */}
                        {/* TAB 4: ACOMPANHAMENTO DOS PAIS & PEDIÁTRICO (ARARANGUÁ)  */}
                        {/* ======================================================== */}
                        {activeTab === 'guardian' && (
                            <div className="space-y-5 animate-fade-in max-w-4xl">
                                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
                                    <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                                        <div>
                                            <h3 className="font-bold text-slate-900 text-base">Acompanhamento Familiar & Pediátrico</h3>
                                            <p className="text-xs text-slate-500">Orientações domiciliares (Home Care) e comunicação direta com pais e cuidadores.</p>
                                        </div>
                                        {patient.guardianPhone && (
                                            <a
                                                href={getWhatsappUrl(patient.guardianPhone, `Olá ${patient.guardianName || 'Família'}! Aqui estão as orientações domiciliares de ${patient.name}:\n\n${patient.homeCareInstructions || 'Sem orientações cadastradas no momento.'}`)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs inline-flex items-center gap-1.5"
                                            >
                                                Enviar Orientações no WhatsApp
                                            </a>
                                        )}
                                    </div>

                                    {/* Resumo ou Formulário do Responsável */}
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                                                Dados do Responsável Legal (Mãe, Pai ou Tutor)
                                            </span>
                                            <label className="inline-flex items-center gap-2 text-xs font-semibold text-blue-600 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={editHasGuardian}
                                                    onChange={e => setEditHasGuardian(e.target.checked)}
                                                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                                                />
                                                <span>Vincular Responsável ao Paciente</span>
                                            </label>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                                            <div className="sm:col-span-5">
                                                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Nome do Responsável</label>
                                                <input
                                                    type="text"
                                                    value={editGuardianName}
                                                    onChange={e => setEditGuardianName(e.target.value)}
                                                    placeholder="Ex: Maria Silva"
                                                    className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                            <div className="sm:col-span-3">
                                                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Parentesco</label>
                                                <select
                                                    value={editGuardianRelationship}
                                                    onChange={e => setEditGuardianRelationship(e.target.value)}
                                                    className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:ring-2 focus:ring-blue-500"
                                                >
                                                    <option value="Mãe">Mãe</option>
                                                    <option value="Pai">Pai</option>
                                                    <option value="Avó/Avô">Avó / Avô</option>
                                                    <option value="Tutor Legal">Tutor Legal</option>
                                                    <option value="Cuidador">Cuidador</option>
                                                    <option value="Outro">Outro</option>
                                                </select>
                                            </div>
                                            <div className="sm:col-span-4">
                                                <label className="text-[11px] font-semibold text-slate-600 block mb-1">WhatsApp do Responsável</label>
                                                <input
                                                    type="text"
                                                    value={editGuardianPhone}
                                                    onChange={e => setEditGuardianPhone(maskPhone(e.target.value))}
                                                    placeholder="(00) 00000-0000"
                                                    className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                            <div className="sm:col-span-6">
                                                <label className="text-[11px] font-semibold text-slate-600 block mb-1">CPF do Responsável</label>
                                                <input
                                                    type="text"
                                                    maxLength={14}
                                                    value={editGuardianCpf}
                                                    onChange={e => setEditGuardianCpf(maskCpf(e.target.value))}
                                                    placeholder="000.000.000-00"
                                                    className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                            <div className="sm:col-span-6">
                                                <label className="text-[11px] font-semibold text-slate-600 block mb-1">E-mail do Responsável</label>
                                                <input
                                                    type="email"
                                                    value={editGuardianEmail}
                                                    onChange={e => setEditGuardianEmail(e.target.value)}
                                                    placeholder="responsavel@email.com"
                                                    className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex justify-end pt-1">
                                            <button
                                                type="button"
                                                onClick={handleSaveInfo}
                                                disabled={savingInfo}
                                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                                            >
                                                {savingInfo ? 'Salvando...' : 'Salvar Dados do Responsável'}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Orientações Domiciliares (Home Care) */}
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                                                Orientações e Exercícios para Casa (Home Care)
                                            </label>
                                            <span className="text-[11px] text-slate-400">Recomendações práticas para os pais</span>
                                        </div>
                                        <textarea
                                            rows={5}
                                            value={editHomeCareInstructions}
                                            onChange={e => setEditHomeCareInstructions(e.target.value)}
                                            placeholder="Ex: Realizar alongamento de cadeia posterior 2x ao dia por 30 segundos. Manter postura alinhada durante os estudos..."
                                            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                        <div className="flex justify-end">
                                            <button
                                                type="button"
                                                onClick={handleSaveInfo}
                                                disabled={savingInfo}
                                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                                            >
                                                {savingInfo ? 'Salvando...' : 'Salvar Orientações'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ======================================================== */}
                        {/* TAB 5: DOCUMENTOS & CONTRATOS                            */}
                        {/* ======================================================== */}
                        {activeTab === 'contracts' && (
                            <div className="space-y-4 animate-fade-in max-w-4xl">
                                <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                                    <div>
                                        <h3 className="font-bold text-slate-900 text-sm">Contratos & Documentos Assinados</h3>
                                        <p className="text-xs text-slate-500">Termos de consentimento e contratos de tratamento.</p>
                                    </div>
                                    <button
                                        onClick={() => setIsDocGenModalOpen(true)}
                                        className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition-all cursor-pointer"
                                    >
                                        + Gerar Novo Documento
                                    </button>
                                </div>

                                {contracts.length === 0 ? (
                                    <div className="p-8 bg-white rounded-xl border border-slate-200 text-center text-slate-400 text-xs">
                                        Nenhum contrato gerado para este paciente.
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {contracts.map(c => (
                                            <div key={c.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex justify-between items-center">
                                                <div>
                                                    <p className="font-bold text-sm text-slate-900">{c.planName || 'Termo de Atendimento'}</p>
                                                    <p className="text-xs text-slate-500">{c.createdAt ? new Date(c.createdAt).toLocaleDateString('pt-BR') : ''}</p>
                                                </div>
                                                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${c.status === 'signed' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                                                    {c.status === 'signed' ? 'Assinado' : 'Pendente'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ======================================================== */}
                        {/* TAB 6: FINANCEIRO & PLANOS                               */}
                        {/* ======================================================== */}
                        {activeTab === 'financial' && (
                            <div className="space-y-4 animate-fade-in max-w-4xl">
                                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
                                    <h3 className="font-bold text-slate-900 text-base">Plano de Tratamento & Saldo</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl">
                                        <div>
                                            <span className="text-[11px] font-bold text-slate-400 uppercase block mb-1">Plano Contratado</span>
                                            <p className="text-sm font-bold text-slate-900">{patient.plan?.name || 'Particular / Avulso'}</p>
                                        </div>
                                        <div>
                                            <span className="text-[11px] font-bold text-slate-400 uppercase block mb-1">Sessões Restantes</span>
                                            <p className="text-sm font-bold text-blue-600">{patient.plan?.remainingSessions || 0} de {patient.plan?.totalSessions || 0}</p>
                                        </div>
                                        <div>
                                            <span className="text-[11px] font-bold text-slate-400 uppercase block mb-1">Validade</span>
                                            <p className="text-sm text-slate-700">{patient.plan?.expiresAt || 'Sem expiração'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ======================================================== */}
                        {/* TAB 7: DADOS PESSOAIS & CADASTRAIS COMPLETOS             */}
                        {/* ======================================================== */}
                        {activeTab === 'info' && (
                            <div className="space-y-6 animate-fade-in max-w-4xl">
                                <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                                    <div>
                                        <h3 className="font-bold text-slate-900 text-sm">Ficha Cadastral do Paciente</h3>
                                        <p className="text-xs text-slate-500">Dados pessoais, contatos, convênio, endereço e responsáveis.</p>
                                    </div>
                                    {!isEditingInfo ? (
                                        <button
                                            type="button"
                                            onClick={() => setIsEditingInfo(true)}
                                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                                        >
                                            Editar Ficha
                                        </button>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setIsEditingInfo(false)}
                                                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                                            >
                                                Cancelar
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleSaveInfo}
                                                disabled={savingInfo}
                                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                                            >
                                                {savingInfo ? 'Salvando...' : 'Salvar Alterações'}
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {!isEditingInfo ? (
                                    /* Modo Visualização Clean */
                                    <div className="space-y-5">
                                        {/* Card 1: Identificação */}
                                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
                                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">1. Identificação & Documentação</h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                <div>
                                                    <span className="text-[11px] font-bold text-slate-400 block mb-1">Nome Completo</span>
                                                    <p className="text-sm font-semibold text-slate-900">{patient.name}</p>
                                                </div>
                                                <div>
                                                    <span className="text-[11px] font-bold text-slate-400 block mb-1">CPF</span>
                                                    <p className="text-sm font-mono text-slate-900">{patient.cpf || '-'}</p>
                                                </div>
                                                <div>
                                                    <span className="text-[11px] font-bold text-slate-400 block mb-1">RG</span>
                                                    <p className="text-sm text-slate-900">{patient.rg || '-'}</p>
                                                </div>
                                                <div>
                                                    <span className="text-[11px] font-bold text-slate-400 block mb-1">CNS (Cartão Nacional de Saúde)</span>
                                                    <p className="text-sm font-mono text-slate-900">{patient.cns || '-'}</p>
                                                </div>
                                                <div>
                                                    <span className="text-[11px] font-bold text-slate-400 block mb-1">Data de Nascimento</span>
                                                    <p className="text-sm text-slate-900">
                                                        {patient.birthDate ? new Date(patient.birthDate + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}
                                                    </p>
                                                </div>
                                                <div>
                                                    <span className="text-[11px] font-bold text-slate-400 block mb-1">Estado Civil / Sexo</span>
                                                    <p className="text-sm text-slate-900">{patient.maritalStatus || '-'} / {patient.gender || '-'}</p>
                                                </div>
                                                <div className="sm:col-span-3">
                                                    <span className="text-[11px] font-bold text-slate-400 block mb-1">Breve Diagnóstico Clínico</span>
                                                    <p className="text-sm text-slate-900">{patient.briefDiagnosis || 'Não informado'}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Card 2: Contatos */}
                                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
                                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">2. Contatos & Comunicação</h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                <div>
                                                    <span className="text-[11px] font-bold text-slate-400 block mb-1">Celular / WhatsApp</span>
                                                    <p className="text-sm font-mono text-slate-900">{patient.phone ? formatPhone(patient.phone) : '-'}</p>
                                                </div>
                                                <div>
                                                    <span className="text-[11px] font-bold text-slate-400 block mb-1">Telefone Fixo</span>
                                                    <p className="text-sm font-mono text-slate-900">{patient.landlinePhone ? formatPhone(patient.landlinePhone) : '-'}</p>
                                                </div>
                                                <div>
                                                    <span className="text-[11px] font-bold text-slate-400 block mb-1">E-mail</span>
                                                    <p className="text-sm text-slate-900">{patient.email || '-'}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Card 3: Convênio */}
                                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
                                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">3. Convênio de Saúde</h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                <div>
                                                    <span className="text-[11px] font-bold text-slate-400 block mb-1">Convênio</span>
                                                    <p className="text-sm font-bold text-slate-900">
                                                        {agreements.find(a => a.id === patient.agreementId)?.name || 'Particular'}
                                                    </p>
                                                </div>
                                                <div>
                                                    <span className="text-[11px] font-bold text-slate-400 block mb-1">Número da Carteirinha</span>
                                                    <p className="text-sm font-mono text-slate-900">{patient.insuranceCardNumber || '-'}</p>
                                                </div>
                                                <div>
                                                    <span className="text-[11px] font-bold text-slate-400 block mb-1">Validade</span>
                                                    <p className="text-sm text-slate-900">{patient.insuranceCardExpiry || '-'}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Card 4: Endereço */}
                                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
                                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">4. Endereço</h4>
                                            <p className="text-sm font-semibold text-slate-800">{patient.address || 'Endereço não cadastrado'}</p>
                                        </div>

                                        {/* Card 5: Responsável Legal */}
                                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
                                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">5. Responsável Legal / Pediátrico</h4>
                                            {patient.hasGuardian ? (
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                    <div>
                                                        <span className="text-[11px] font-bold text-slate-400 block mb-1">Nome do Responsável</span>
                                                        <p className="text-sm font-bold text-slate-900">{patient.guardianName}</p>
                                                    </div>
                                                    <div>
                                                        <span className="text-[11px] font-bold text-slate-400 block mb-1">Parentesco</span>
                                                        <p className="text-sm text-slate-900">{patient.guardianRelationship}</p>
                                                    </div>
                                                    <div>
                                                        <span className="text-[11px] font-bold text-slate-400 block mb-1">Celular do Responsável</span>
                                                        <p className="text-sm font-mono text-slate-900">{patient.guardianPhone ? formatPhone(patient.guardianPhone) : '-'}</p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="text-xs text-slate-500">Paciente maior de idade sem responsável legal vinculado.</p>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    /* Modo Edição Completo */
                                    <form onSubmit={handleSaveInfo} className="space-y-6">
                                        {/* Seção 1: Identificação */}
                                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
                                            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">1. Identificação & Documentação</h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                                                <div className="sm:col-span-8">
                                                    <label className="text-xs font-semibold text-slate-600 block mb-1">Nome Completo *</label>
                                                    <input
                                                        type="text"
                                                        required
                                                        value={editName}
                                                        onChange={e => setEditName(e.target.value)}
                                                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:ring-2 focus:ring-blue-500"
                                                    />
                                                </div>

                                                <div className="sm:col-span-4 flex items-center pt-5">
                                                    <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={editIsSocialName}
                                                            onChange={e => setEditIsSocialName(e.target.checked)}
                                                            className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                                                        />
                                                        <span>É nome social</span>
                                                    </label>
                                                </div>

                                                {editIsSocialName && (
                                                    <div className="sm:col-span-12">
                                                        <label className="text-xs font-semibold text-slate-600 block mb-1">Nome Social</label>
                                                        <input
                                                            type="text"
                                                            value={editSocialName}
                                                            onChange={e => setEditSocialName(e.target.value)}
                                                            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900"
                                                        />
                                                    </div>
                                                )}

                                                <div className="sm:col-span-4">
                                                    <label className="text-xs font-semibold text-slate-600 block mb-1">CPF</label>
                                                    <input
                                                        type="text"
                                                        maxLength={14}
                                                        value={editCpf}
                                                        onChange={e => setEditCpf(maskCpf(e.target.value))}
                                                        placeholder="000.000.000-00"
                                                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900"
                                                    />
                                                </div>

                                                <div className="sm:col-span-4">
                                                    <label className="text-xs font-semibold text-slate-600 block mb-1">RG</label>
                                                    <input
                                                        type="text"
                                                        value={editRg}
                                                        onChange={e => setEditRg(e.target.value)}
                                                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900"
                                                    />
                                                </div>

                                                <div className="sm:col-span-4">
                                                    <label className="text-xs font-semibold text-slate-600 block mb-1">CNS (Cartão SUS)</label>
                                                    <input
                                                        type="text"
                                                        value={editCns}
                                                        onChange={e => setEditCns(e.target.value)}
                                                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900"
                                                    />
                                                </div>

                                                <div className="sm:col-span-4">
                                                    <label className="text-xs font-semibold text-slate-600 block mb-1">Data de Nascimento</label>
                                                    <input
                                                        type="date"
                                                        value={editBirthDate}
                                                        onChange={e => setEditBirthDate(e.target.value)}
                                                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900"
                                                    />
                                                </div>

                                                <div className="sm:col-span-4">
                                                    <label className="text-xs font-semibold text-slate-600 block mb-1">Estado Civil</label>
                                                    <select
                                                        value={editMaritalStatus}
                                                        onChange={e => setEditMaritalStatus(e.target.value)}
                                                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900"
                                                    >
                                                        <option value="">Selecione</option>
                                                        <option value="Solteiro(a)">Solteiro(a)</option>
                                                        <option value="Casado(a)">Casado(a)</option>
                                                        <option value="Divorciado(a)">Divorciado(a)</option>
                                                        <option value="Viúvo(a)">Viúvo(a)</option>
                                                        <option value="União Estável">União Estável</option>
                                                    </select>
                                                </div>

                                                <div className="sm:col-span-4">
                                                    <label className="text-xs font-semibold text-slate-600 block mb-1">Sexo / Gênero</label>
                                                    <select
                                                        value={editGender}
                                                        onChange={e => setEditGender(e.target.value)}
                                                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900"
                                                    >
                                                        <option value="">Selecione</option>
                                                        <option value="Feminino">Feminino</option>
                                                        <option value="Masculino">Masculino</option>
                                                        <option value="Outro">Outro</option>
                                                    </select>
                                                </div>

                                                <div className="sm:col-span-12">
                                                    <label className="text-xs font-semibold text-slate-600 block mb-1">Breve Diagnóstico Clínico</label>
                                                    <input
                                                        type="text"
                                                        value={editBriefDiagnosis}
                                                        onChange={e => setEditBriefDiagnosis(e.target.value)}
                                                        placeholder="Ex: Lombalgia crônica mecânica-postural"
                                                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Seção 2: Contatos */}
                                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
                                            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">2. Contatos & Comunicação</h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                                                <div className="sm:col-span-4">
                                                    <label className="text-xs font-semibold text-slate-600 block mb-1">Celular / WhatsApp *</label>
                                                    <input
                                                        type="text"
                                                        required
                                                        value={editPhone}
                                                        onChange={e => setEditPhone(maskPhone(e.target.value))}
                                                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900"
                                                    />
                                                </div>
                                                <div className="sm:col-span-4">
                                                    <label className="text-xs font-semibold text-slate-600 block mb-1">Telefone Fixo</label>
                                                    <input
                                                        type="text"
                                                        value={editLandlinePhone}
                                                        onChange={e => setEditLandlinePhone(maskPhone(e.target.value))}
                                                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900"
                                                    />
                                                </div>
                                                <div className="sm:col-span-4">
                                                    <label className="text-xs font-semibold text-slate-600 block mb-1">E-mail</label>
                                                    <input
                                                        type="email"
                                                        value={editEmail}
                                                        onChange={e => setEditEmail(e.target.value)}
                                                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Seção 3: Convênio */}
                                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
                                            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">3. Convênio de Saúde</h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                                                <div className="sm:col-span-4">
                                                    <label className="text-xs font-semibold text-slate-600 block mb-1">Convênio</label>
                                                    <select
                                                        value={editAgreementId}
                                                        onChange={e => setEditAgreementId(e.target.value)}
                                                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900"
                                                    >
                                                        <option value="">Particular / Próprio</option>
                                                        {agreements.map(a => (
                                                            <option key={a.id} value={a.id}>{a.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="sm:col-span-4">
                                                    <label className="text-xs font-semibold text-slate-600 block mb-1">Número da Carteirinha</label>
                                                    <input
                                                        type="text"
                                                        value={editInsuranceCardNumber}
                                                        onChange={e => setEditInsuranceCardNumber(e.target.value)}
                                                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900"
                                                    />
                                                </div>
                                                <div className="sm:col-span-4">
                                                    <label className="text-xs font-semibold text-slate-600 block mb-1">Validade da Carteirinha</label>
                                                    <input
                                                        type="date"
                                                        value={editInsuranceCardExpiry}
                                                        onChange={e => setEditInsuranceCardExpiry(e.target.value)}
                                                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Seção 4: Endereço */}
                                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
                                            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">4. Endereço</h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                                                <div className="sm:col-span-4">
                                                    <label className="text-xs font-semibold text-slate-600 block mb-1">CEP (Busca Automática)</label>
                                                    <input
                                                        type="text"
                                                        maxLength={9}
                                                        value={editCep}
                                                        onChange={e => handleCepSearch(e.target.value)}
                                                        placeholder="00000-000"
                                                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900"
                                                    />
                                                </div>
                                                <div className="sm:col-span-6">
                                                    <label className="text-xs font-semibold text-slate-600 block mb-1">Cidade</label>
                                                    <input
                                                        type="text"
                                                        value={editCity}
                                                        onChange={e => setEditCity(e.target.value)}
                                                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900"
                                                    />
                                                </div>
                                                <div className="sm:col-span-2">
                                                    <label className="text-xs font-semibold text-slate-600 block mb-1">Estado</label>
                                                    <input
                                                        type="text"
                                                        value={editState}
                                                        onChange={e => setEditState(e.target.value)}
                                                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 uppercase"
                                                    />
                                                </div>
                                                <div className="sm:col-span-6">
                                                    <label className="text-xs font-semibold text-slate-600 block mb-1">Rua / Logradouro</label>
                                                    <input
                                                        type="text"
                                                        value={editStreet}
                                                        onChange={e => setEditStreet(e.target.value)}
                                                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900"
                                                    />
                                                </div>
                                                <div className="sm:col-span-2">
                                                    <label className="text-xs font-semibold text-slate-600 block mb-1">Número</label>
                                                    <input
                                                        type="text"
                                                        value={editNumber}
                                                        onChange={e => setEditNumber(e.target.value)}
                                                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900"
                                                    />
                                                </div>
                                                <div className="sm:col-span-4">
                                                    <label className="text-xs font-semibold text-slate-600 block mb-1">Bairro</label>
                                                    <input
                                                        type="text"
                                                        value={editBairro}
                                                        onChange={e => setEditBairro(e.target.value)}
                                                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Seção 5: Responsável Legal & Pediátrico */}
                                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
                                            <div className="flex justify-between items-center">
                                                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">5. Responsável Legal / Pediátrico (Araranguá)</h4>
                                                <label className="inline-flex items-center gap-2 text-xs font-semibold text-blue-600 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={editHasGuardian}
                                                        onChange={e => setEditHasGuardian(e.target.checked)}
                                                        className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                                                    />
                                                    <span>Paciente é Criança/Adolescente/Dependente</span>
                                                </label>
                                            </div>

                                            {editHasGuardian && (
                                                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 bg-indigo-50/40 p-4 rounded-xl border border-indigo-100">
                                                    <div className="sm:col-span-6">
                                                        <label className="text-xs font-semibold text-slate-600 block mb-1">Nome do Responsável *</label>
                                                        <input
                                                            type="text"
                                                            value={editGuardianName}
                                                            onChange={e => setEditGuardianName(e.target.value)}
                                                            className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2.5 text-slate-900"
                                                        />
                                                    </div>
                                                    <div className="sm:col-span-3">
                                                        <label className="text-xs font-semibold text-slate-600 block mb-1">Parentesco</label>
                                                        <select
                                                            value={editGuardianRelationship}
                                                            onChange={e => setEditGuardianRelationship(e.target.value)}
                                                            className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2.5 text-slate-900"
                                                        >
                                                            <option value="Mãe">Mãe</option>
                                                            <option value="Pai">Pai</option>
                                                            <option value="Avó/Avô">Avó / Avô</option>
                                                            <option value="Tutor Legal">Tutor Legal</option>
                                                            <option value="Cuidador">Cuidador</option>
                                                            <option value="Outro">Outro</option>
                                                        </select>
                                                    </div>
                                                    <div className="sm:col-span-3">
                                                        <label className="text-xs font-semibold text-slate-600 block mb-1">WhatsApp do Responsável</label>
                                                        <input
                                                            type="text"
                                                            value={editGuardianPhone}
                                                            onChange={e => setEditGuardianPhone(maskPhone(e.target.value))}
                                                            className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2.5 text-slate-900"
                                                        />
                                                    </div>
                                                    <div className="sm:col-span-6">
                                                        <label className="text-xs font-semibold text-slate-600 block mb-1">CPF do Responsável</label>
                                                        <input
                                                            type="text"
                                                            maxLength={14}
                                                            value={editGuardianCpf}
                                                            onChange={e => setEditGuardianCpf(maskCpf(e.target.value))}
                                                            className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2.5 text-slate-900"
                                                        />
                                                    </div>
                                                    <div className="sm:col-span-6">
                                                        <label className="text-xs font-semibold text-slate-600 block mb-1">E-mail do Responsável</label>
                                                        <input
                                                            type="email"
                                                            value={editGuardianEmail}
                                                            onChange={e => setEditGuardianEmail(e.target.value)}
                                                            className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2.5 text-slate-900"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex justify-end gap-2 pt-2">
                                            <button
                                                type="button"
                                                onClick={() => setIsEditingInfo(false)}
                                                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                                            >
                                                Cancelar
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={savingInfo}
                                                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                                            >
                                                {savingInfo ? 'Salvando...' : 'Salvar Alterações'}
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modais Clínicos */}
            {isEvalModalOpen && (
                <EvaluationModal
                    isOpen={isEvalModalOpen}
                    onClose={() => { setIsEvalModalOpen(false); setSelectedEvalToEdit(null); }}
                    patientId={patient.id}
                    patientName={patient.name}
                    existingEvaluation={selectedEvalToEdit}
                    currentUnit={currentUnit}
                    onSave={(savedEval) => {
                        setEvaluations(prev => {
                            const idx = prev.findIndex(e => e.id === savedEval.id);
                            if (idx >= 0) {
                                const copy = [...prev];
                                copy[idx] = savedEval;
                                return copy;
                            }
                            return [savedEval, ...prev];
                        });
                    }}
                />
            )}

            {isEvolModalOpen && (
                <EvolutionModal
                    isOpen={isEvolModalOpen}
                    onClose={() => { setIsEvolModalOpen(false); setSelectedEvolToEdit(null); }}
                    patientId={patient.id}
                    patientName={patient.name}
                    existingEvolution={selectedEvolToEdit}
                    currentUnit={currentUnit}
                    onSave={(savedEvol) => {
                        setEvolutions(prev => {
                            const idx = prev.findIndex(e => e.id === savedEvol.id);
                            if (idx >= 0) {
                                const copy = [...prev];
                                copy[idx] = savedEvol;
                                return copy;
                            }
                            return [savedEvol, ...prev];
                        });
                    }}
                />
            )}

            {isDocGenModalOpen && (
                <DocumentGeneratorModal
                    isOpen={isDocGenModalOpen}
                    onClose={() => setIsDocGenModalOpen(false)}
                    patient={patient}
                    currentUnit={currentUnit}
                    unitName={unitName}
                />
            )}
        </div>
    );
};
