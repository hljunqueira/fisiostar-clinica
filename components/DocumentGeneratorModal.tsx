import React, { useState, useEffect } from 'react';
import { X, FileText, Printer, CheckCircle2, User, Calendar, Clock, DollarSign, Stethoscope, Building2 } from 'lucide-react';
import { Patient, Professional, Unit, UnitId } from '../types';
import { patientsApi, professionalsApi, unitsApi } from '../src/services/api';
import toast from 'react-hot-toast';

interface DocumentGeneratorModalProps {
    isOpen: boolean;
    onClose: () => void;
    patientId?: string;
    currentUnit?: UnitId;
}

type DocumentType = 'attendance' | 'treatment_declaration' | 'receipt';

export const DocumentGeneratorModal: React.FC<DocumentGeneratorModalProps> = ({
    isOpen,
    onClose,
    patientId: initialPatientId,
    currentUnit
}) => {
    const [docType, setDocType] = useState<DocumentType>('attendance');
    const [selectedPatientId, setSelectedPatientId] = useState<string>(initialPatientId || '');
    const [selectedProfessionalId, setSelectedProfessionalId] = useState<string>('');
    const [selectedUnitId, setSelectedUnitId] = useState<string>(currentUnit && currentUnit !== 'ALL' ? currentUnit : '');

    // Common fields
    const now = new Date();
    const [date, setDate] = useState<string>(now.toISOString().split('T')[0]);
    const [startTime, setStartTime] = useState<string>('14:00');
    const [endTime, setEndTime] = useState<string>('15:00');

    // Treatment declaration fields
    const [diagnosis, setDiagnosis] = useState<string>('Lombalgia / Reabilitação Funcional (CID M54.5)');
    const [sessionsCompleted, setSessionsCompleted] = useState<number>(5);
    const [sessionsTotal, setSessionsTotal] = useState<number>(10);
    const [frequency, setFrequency] = useState<string>('2 vezes por semana');

    // Receipt fields
    const [receiptValue, setReceiptValue] = useState<string>('150,00');
    const [receiptValueExtensive, setReceiptValueExtensive] = useState<string>('Cento e cinquenta reais');
    const [paymentMethod, setPaymentMethod] = useState<string>('PIX');
    const [serviceDescription, setServiceDescription] = useState<string>('Sessão de Fisioterapia e Reabilitação');

    // Lists
    const [patients, setPatients] = useState<Patient[]>([]);
    const [professionals, setProfessionals] = useState<Professional[]>([]);
    const [units, setUnits] = useState<Unit[]>([]);
    const [loading, setLoading] = useState(false);

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
                if (!selectedProfessionalId && profs.length > 0) {
                    setSelectedProfessionalId(profs[0].id);
                }
            } catch (err) {
                console.error('Erro ao carregar dados do gerador de documentos:', err);
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

    const formattedDateLong = new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    const handlePrint = () => {
        if (!selectedPatientId) {
            toast.error('Selecione o paciente.');
            return;
        }
        window.print();
    };

    return (
        <div className="fixed inset-0 z-[75] flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl relative z-10 overflow-hidden animate-fade-in border border-gray-100 flex flex-col max-h-[92vh]">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-5 text-white flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-sm">
                            <FileText className="w-6 h-6 text-blue-300" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                Gerador de Documentos & Atestados
                            </h2>
                            <p className="text-xs text-blue-200">Emissão rápida de atestados, declarações e recibos em PDF</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handlePrint}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-white font-bold text-xs transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                        >
                            <Printer className="w-4 h-4" />
                            Imprimir Documento
                        </button>
                        <button
                            onClick={onClose}
                            className="text-white/80 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Sub-Header Document Type Tabs */}
                <div className="bg-gray-50 border-b border-gray-200 px-6 py-2 flex items-center gap-2 overflow-x-auto shrink-0">
                    <button
                        type="button"
                        onClick={() => setDocType('attendance')}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                            docType === 'attendance'
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'text-gray-600 hover:bg-gray-200/60'
                        }`}
                    >
                        <Clock className="w-3.5 h-3.5" />
                        Atestado de Comparecimento
                    </button>
                    <button
                        type="button"
                        onClick={() => setDocType('treatment_declaration')}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                            docType === 'treatment_declaration'
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'text-gray-600 hover:bg-gray-200/60'
                        }`}
                    >
                        <Stethoscope className="w-3.5 h-3.5" />
                        Declaração de Tratamento
                    </button>
                    <button
                        type="button"
                        onClick={() => setDocType('receipt')}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                            docType === 'receipt'
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'text-gray-600 hover:bg-gray-200/60'
                        }`}
                    >
                        <DollarSign className="w-3.5 h-3.5" />
                        Recibo de Pagamento (IRPF)
                    </button>
                </div>

                {/* Body Content: Form Left / Document Preview Right */}
                <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-y-auto">
                    {/* Controls Panel */}
                    <div className="lg:col-span-5 p-6 border-b lg:border-b-0 lg:border-r border-gray-200 space-y-4 bg-gray-50/50">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Parâmetros do Documento</h3>

                        {/* Paciente */}
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Paciente</label>
                            <select
                                value={selectedPatientId}
                                onChange={(e) => setSelectedPatientId(e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                <option value="">Selecione o paciente...</option>
                                {patients.map(p => (
                                    <option key={p.id} value={p.id}>{p.name} {p.cpf ? `(${p.cpf})` : ''}</option>
                                ))}
                            </select>
                        </div>

                        {/* Profissional e Unidade */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Profissional</label>
                                <select
                                    value={selectedProfessionalId}
                                    onChange={(e) => setSelectedProfessionalId(e.target.value)}
                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    {professionals.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Unidade</label>
                                <select
                                    value={selectedUnitId}
                                    onChange={(e) => setSelectedUnitId(e.target.value)}
                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    {units.map(u => (
                                        <option key={u.id} value={u.id}>{u.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Date */}
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Data</label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>

                        {/* Specific parameters by DocType */}
                        {docType === 'attendance' && (
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Horário Início</label>
                                    <input
                                        type="time"
                                        value={startTime}
                                        onChange={(e) => setStartTime(e.target.value)}
                                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Horário Término</label>
                                    <input
                                        type="time"
                                        value={endTime}
                                        onChange={(e) => setEndTime(e.target.value)}
                                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                            </div>
                        )}

                        {docType === 'treatment_declaration' && (
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Diagnóstico / CID</label>
                                    <input
                                        type="text"
                                        value={diagnosis}
                                        onChange={(e) => setDiagnosis(e.target.value)}
                                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Sessões Feitas</label>
                                        <input
                                            type="number"
                                            value={sessionsCompleted}
                                            onChange={(e) => setSessionsCompleted(Number(e.target.value))}
                                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Total de Sessões</label>
                                        <input
                                            type="number"
                                            value={sessionsTotal}
                                            onChange={(e) => setSessionsTotal(Number(e.target.value))}
                                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {docType === 'receipt' && (
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Valor (R$)</label>
                                        <input
                                            type="text"
                                            value={receiptValue}
                                            onChange={(e) => setReceiptValue(e.target.value)}
                                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Forma Pagto</label>
                                        <select
                                            value={paymentMethod}
                                            onChange={(e) => setPaymentMethod(e.target.value)}
                                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                                        >
                                            <option value="PIX">PIX</option>
                                            <option value="Cartão de Crédito">Cartão de Crédito</option>
                                            <option value="Cartão de Débito">Cartão de Débito</option>
                                            <option value="Dinheiro">Dinheiro</option>
                                            <option value="Transferência (TED)">Transferência (TED)</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Valor por Extenso</label>
                                    <input
                                        type="text"
                                        value={receiptValueExtensive}
                                        onChange={(e) => setReceiptValueExtensive(e.target.value)}
                                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Document Preview Sheet (Ready for Print) */}
                    <div className="lg:col-span-7 p-6 bg-white flex flex-col justify-between">
                        <div className="p-8 border-2 border-dashed border-gray-200 rounded-2xl space-y-6 text-gray-900 font-serif">
                            {/* Document Header */}
                            <div className="text-center border-b border-gray-200 pb-4">
                                <h1 className="text-lg font-bold tracking-wide uppercase font-sans text-blue-900">
                                    FisioStar Clínica de Fisioterapia
                                </h1>
                                <p className="text-xs text-gray-500 font-sans mt-0.5">
                                    Unidade {selectedUnitObj?.name || 'Matriz'} - {selectedUnitObj?.city || 'Brasil'}
                                </p>
                            </div>

                            {/* Document Title */}
                            <div className="text-center">
                                <h2 className="text-base font-bold uppercase tracking-wider underline">
                                    {docType === 'attendance' && 'Atestado de Comparecimento'}
                                    {docType === 'treatment_declaration' && 'Declaração de Tratamento Fisioterapêutico'}
                                    {docType === 'receipt' && 'Recibo de Prestação de Serviços'}
                                </h2>
                            </div>

                            {/* Document Body */}
                            <div className="text-sm leading-relaxed text-justify space-y-4 font-sans">
                                {docType === 'attendance' && (
                                    <p>
                                        Atesto para os devidos fins que o(a) Sr.(a) <strong>{selectedPatient?.name || '__________________________'}</strong>,
                                        {selectedPatient?.cpf ? ` portador(a) do CPF nº ${selectedPatient.cpf},` : ''} compareceu a esta clínica no dia <strong>{new Date(date + 'T12:00:00').toLocaleDateString('pt-BR')}</strong>,
                                        permanecendo em atendimento fisioterapêutico no período das <strong>{startTime}</strong> às <strong>{endTime}</strong>.
                                    </p>
                                )}

                                {docType === 'treatment_declaration' && (
                                    <>
                                        <p>
                                            Declaro para os devidos fins que o(a) paciente <strong>{selectedPatient?.name || '__________________________'}</strong>,
                                            {selectedPatient?.cpf ? ` CPF nº ${selectedPatient.cpf},` : ''} encontra-se sob tratamento fisioterapêutico nesta unidade para reabilitação do quadro clínico de <strong>{diagnosis}</strong>.
                                        </p>
                                        <p>
                                            O plano terapêutico prescrito prevê a realização de <strong>{sessionsTotal} sessões</strong>, com frequência de <strong>{frequency}</strong>, tendo sido realizadas até a presente data <strong>{sessionsCompleted} sessões</strong>.
                                        </p>
                                    </>
                                )}

                                {docType === 'receipt' && (
                                    <>
                                        <p>
                                            Recebemos de <strong>{selectedPatient?.name || '__________________________'}</strong>,
                                            {selectedPatient?.cpf ? ` CPF nº ${selectedPatient.cpf},` : ''} a importância de <strong>R$ {receiptValue} ({receiptValueExtensive})</strong>,
                                            referente à prestação de serviços de <strong>{serviceDescription}</strong>, pago via <strong>{paymentMethod}</strong>.
                                        </p>
                                    </>
                                )}
                            </div>

                            {/* Document Footer Date & Signature */}
                            <div className="pt-8 text-center font-sans space-y-8">
                                <p className="text-xs text-gray-600">
                                    {selectedUnitObj?.city || 'Cidade'}, {formattedDateLong}.
                                </p>

                                <div className="inline-block border-t border-gray-400 pt-2 px-8">
                                    <p className="text-xs font-bold text-gray-900">{selectedProf?.name || 'Fisioterapeuta Responsável'}</p>
                                    <p className="text-[11px] text-gray-500">{selectedProf?.specialty || 'Fisioterapia'} {selectedProf?.crf ? `- CREFITO/CRF: ${selectedProf.crf}` : ''}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
