import React, { useState, useEffect, useRef } from 'react';
import { X, FileSignature, ShieldCheck, Printer, Save, CheckCircle2, User, Calendar, AlertCircle, RefreshCw, Download, FileText, Lock, Sparkles, Building2 } from 'lucide-react';
import { PatientContract, ContractTemplate, Patient, PlanTemplate, Unit, UnitId } from '../types';
import { contractsApi, patientsApi, unitsApi, planTemplatesApi } from '../src/services/api';
import toast from 'react-hot-toast';

interface ContractModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave?: (contract: PatientContract) => void;
    patientId?: string;
    existingContract?: PatientContract | null;
    currentUnit?: UnitId;
}

const DEFAULT_TEMPLATES: Array<Omit<ContractTemplate, 'id' | 'createdAt' | 'updatedAt'>> = [
    {
        title: 'Contrato de Prestação de Serviços de Fisioterapia & Pacotes',
        type: 'service_agreement',
        isActive: true,
        content: `CONTRATO DE PRESTAÇÃO DE SERVIÇOS FISIOTERAPÊUTICOS

Pelo presente instrumento particular, de um lado:
CLÍNICA: FISIOSTAR CLÍNICA DE FISIOTERAPIA - UNIDADE {{CLINICA_UNIDADE}}
E, de outro lado, o(a) PACIENTE/CONTRATANTE:
NOME: {{NOME_PACIENTE}}
CPF: {{CPF_PACIENTE}}
ENDEREÇO: {{ENDERECO_PACIENTE}}

CLÁUSULA 1ª - DO OBJETO
O presente contrato tem por objeto a prestação de serviços profissionais de fisioterapia e reabilitação, compreendendo o pacote/plano "{{PLANO_NOME}}", totalizando {{NUM_SESSOES}} sessões de tratamento.

CLÁUSULA 2ª - DOS VALORES E FORMA DE PAGAMENTO
Pela prestação dos serviços ora contratados, o(a) CONTRATANTE pagará à CONTRATADA o valor total de R$ {{VALOR_TOTAL}}.

CLÁUSULA 3ª - DAS FALTAS, CANCELAMENTOS E REPOSIÇÕES
§ 1º - O cancelamento ou reagendamento de consultas deverá ser comunicado com antecedência mínima de 24 (vinte e quatro) horas úteis.
§ 2º - Faltas sem aviso prévio no prazo estabelecido serão computadas como sessão realizada, não havendo direito à reposição ou devolução de valores.

CLÁUSULA 4ª - DA VALIDADE DO PACOTE
O pacote de sessões contratado possui validade improrrogável de {{VALIDADE_DIAS}} dias a contar da data de assinatura deste instrumento.

CLÁUSULA 5ª - DO FORO
Para dirimir quaisquer dúvidas decorrentes deste contrato, as partes elegem o foro da comarca da sede da CONTRATADA.

{{DATA_CONTRATO}}`
    },
    {
        title: 'Termo de Consentimento Livre e Esclarecido (TCLE)',
        type: 'tcle',
        isActive: true,
        content: `TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO (TCLE)

Eu, {{NOME_PACIENTE}}, portador(a) do CPF nº {{CPF_PACIENTE}}, declaro que fui devidamente informado(a) pela equipe da FISIOSTAR CLÍNICA DE FISIOTERAPIA sobre os objetivos, procedimentos terapêuticos, técnicas aplicadas, eventuais desconfortos esperados e benefícios do tratamento fisioterapêutico proposto.

Declaro que tive a oportunidade de esclarecer todas as minhas dúvidas com o fisioterapeuta responsável e concordo voluntariamente em realizar o plano de tratamento proposto, comprometendo-me a seguir as orientações domiciliares e os horários agendados.

{{DATA_CONTRATO}}`
    },
    {
        title: 'Termo de Autorização de Uso de Imagem e Registro Fotográfico',
        type: 'image_rights',
        isActive: true,
        content: `TERMO DE AUTORIZAÇÃO DE USO DE IMAGEM E REGISTROS CLÍNICOS

Eu, {{NOME_PACIENTE}}, CPF nº {{CPF_PACIENTE}}, autorizo a FISIOSTAR CLÍNICA DE FISIOTERAPIA a realizar registros fotográficos e de vídeo exclusivamente para acompanhamento da evolução postural e funcional do meu tratamento fisioterapêutico (prontuário confidencial), bem como para fins educacionais ou de divulgação técnico-científica sem identificação nominal, em conformidade com as diretrizes da LGPD (Lei nº 13.709/2018).

{{DATA_CONTRATO}}`
    }
];

// Helper to compute SHA-256 hash in browser
async function computeSHA256(text: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export const ContractModal: React.FC<ContractModalProps> = ({
    isOpen,
    onClose,
    onSave,
    patientId: initialPatientId,
    existingContract,
    currentUnit
}) => {
    const [selectedPatientId, setSelectedPatientId] = useState<string>(existingContract?.patientId || initialPatientId || '');
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>(existingContract?.templateId || '');
    const [title, setTitle] = useState<string>(existingContract?.title || 'Contrato de Prestação de Serviços');
    const [contractBody, setContractBody] = useState<string>(existingContract?.content || '');
    const [status, setStatus] = useState<'pending' | 'signed' | 'cancelled'>(existingContract?.status || 'pending');

    // Signer info
    const [signerName, setSignerName] = useState<string>(existingContract?.signerName || '');
    const [signerCpf, setSignerCpf] = useState<string>(existingContract?.signerCpf || '');
    const [documentHash, setDocumentHash] = useState<string>(existingContract?.documentHash || '');
    const [signedAt, setSignedAt] = useState<string>(existingContract?.signedAt || '');

    // Signature Canvas
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasDrawn, setHasDrawn] = useState(false);
    const [signatureUrl, setSignatureUrl] = useState<string>(existingContract?.signatureUrl || '');

    // Lists
    const [patients, setPatients] = useState<Patient[]>([]);
    const [templates, setTemplates] = useState<ContractTemplate[]>([]);
    const [units, setUnits] = useState<Unit[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [step, setStep] = useState<'edit' | 'sign' | 'view'>(existingContract?.status === 'signed' ? 'view' : 'edit');

    useEffect(() => {
        if (!isOpen) return;

        async function loadData() {
            setLoading(true);
            try {
                const [pats, tmpls, unitsList] = await Promise.all([
                    patientsApi.getAll(),
                    contractsApi.getTemplates(),
                    unitsApi.getAll()
                ]);

                setPatients(pats);
                setUnits(unitsList);

                if (tmpls.length === 0) {
                    // Seed initial templates in memory for selection
                    setTemplates(DEFAULT_TEMPLATES.map((dt, index) => ({
                        ...dt,
                        id: `default-${index}`
                    })));
                    if (!contractBody) {
                        setContractBody(DEFAULT_TEMPLATES[0].content);
                        setTitle(DEFAULT_TEMPLATES[0].title);
                    }
                } else {
                    setTemplates(tmpls);
                    if (!contractBody && tmpls.length > 0) {
                        setContractBody(tmpls[0].content);
                        setTitle(tmpls[0].title);
                        setSelectedTemplateId(tmpls[0].id);
                    }
                }
            } catch (err) {
                console.error('Erro ao carregar dados de contratos:', err);
            } finally {
                setLoading(false);
            }
        }

        loadData();
    }, [isOpen]);

    const selectedPatient = patients.find(p => p.id === selectedPatientId);
    const selectedUnitObj = units.find(u => u.id === (selectedPatient?.unitId || currentUnit));

    // Handle template change & auto variable replacement
    const applyTemplate = (templateContent: string, templateTitle: string) => {
        setTitle(templateTitle);
        if (!selectedPatient) {
            setContractBody(templateContent);
            return;
        }

        const now = new Date();
        const formattedDate = `${now.getDate()} de ${now.toLocaleDateString('pt-BR', { month: 'long' })} de ${now.getFullYear()}`;

        let replaced = templateContent
            .replace(/\{\{NOME_PACIENTE\}\}/g, selectedPatient.name || '')
            .replace(/\{\{CPF_PACIENTE\}\}/g, selectedPatient.cpf || 'Não informado')
            .replace(/\{\{ENDERECO_PACIENTE\}\}/g, selectedPatient.address ? `${selectedPatient.address}, ${selectedPatient.city || ''}` : 'Não informado')
            .replace(/\{\{PLANO_NOME\}\}/g, selectedPatient.plan?.name || 'Fisioterapia Individual')
            .replace(/\{\{VALOR_TOTAL\}\}/g, selectedPatient.plan?.totalPaid ? selectedPatient.plan.totalPaid.toFixed(2) : 'A combinar')
            .replace(/\{\{NUM_SESSOES\}\}/g, String(selectedPatient.plan?.totalSessions || 10))
            .replace(/\{\{VALIDADE_DIAS\}\}/g, '90')
            .replace(/\{\{CLINICA_UNIDADE\}\}/g, selectedUnitObj?.name || 'Matriz')
            .replace(/\{\{DATA_CONTRATO\}\}/g, formattedDate);

        setContractBody(replaced);
        setSignerName(selectedPatient.name || '');
        setSignerCpf(selectedPatient.cpf || '');
    };

    const handleSelectTemplate = (tmplId: string) => {
        setSelectedTemplateId(tmplId);
        const found = templates.find(t => t.id === tmplId);
        if (found) {
            applyTemplate(found.content, found.title);
        }
    };

    // Canvas drawing helpers
    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
        const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

        ctx.beginPath();
        ctx.moveTo(x, y);
        setIsDrawing(true);
        setHasDrawn(true);
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
        const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

        ctx.lineTo(x, y);
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setHasDrawn(false);
    };

    const handleSaveAndSign = async () => {
        if (!selectedPatientId) {
            toast.error('Selecione o paciente do contrato.');
            return;
        }

        if (!hasDrawn && !signatureUrl) {
            toast.error('Por favor, colete a assinatura digital na tela antes de confirmar.');
            return;
        }

        try {
            setSaving(true);

            // Get signature image
            let currentSigUrl = signatureUrl;
            if (hasDrawn && canvasRef.current) {
                currentSigUrl = canvasRef.current.toDataURL('image/png');
            }

            // Compute document cryptographic hash (SHA-256)
            const payloadToHash = `${title}\n${contractBody}\n${signerName}\n${signerCpf}\n${currentSigUrl}`;
            const hash = await computeSHA256(payloadToHash);

            let savedContract: PatientContract;

            if (existingContract?.id) {
                savedContract = await contractsApi.sign(existingContract.id, {
                    signatureUrl: currentSigUrl,
                    signerName: signerName || selectedPatient?.name || 'Paciente',
                    signerCpf: signerCpf || selectedPatient?.cpf || '',
                    documentHash: hash
                });
                toast.success('Contrato assinado e autenticado com sucesso!');
            } else {
                const newContract = await contractsApi.create({
                    patientId: selectedPatientId,
                    templateId: selectedTemplateId.startsWith('default-') ? undefined : selectedTemplateId,
                    title: title,
                    content: contractBody,
                    status: 'signed',
                    documentHash: hash,
                    signerName: signerName || selectedPatient?.name || 'Paciente',
                    signerCpf: signerCpf || selectedPatient?.cpf || ''
                });

                savedContract = await contractsApi.sign(newContract.id, {
                    signatureUrl: currentSigUrl,
                    signerName: signerName || selectedPatient?.name || 'Paciente',
                    signerCpf: signerCpf || selectedPatient?.cpf || '',
                    documentHash: hash
                });
                toast.success('Contrato gerado, assinado e registrado no prontuário!');
            }

            setSignatureUrl(currentSigUrl);
            setDocumentHash(hash);
            setStatus('signed');
            setStep('view');

            if (onSave) onSave(savedContract);
        } catch (error: any) {
            console.error('Erro ao salvar contrato:', error);
            toast.error(error.message || 'Erro ao processar contrato.');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[75] flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl relative z-10 overflow-hidden animate-fade-in border border-gray-100 flex flex-col max-h-[92vh]">
                {/* Header */}
                <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-5 text-white flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-sm">
                            <FileSignature className="w-6 h-6 text-indigo-300" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                {status === 'signed' ? 'Contrato / Termo Assinado Digitalmente' : 'Emissão & Assinatura de Contrato'}
                            </h2>
                            <p className="text-xs text-indigo-200">Validade jurídica com registro criptográfico SHA-256 e LGPD</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => window.print()}
                            className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors flex items-center gap-1.5 text-xs font-semibold"
                        >
                            <Printer className="w-4 h-4" />
                            <span className="hidden sm:inline">Imprimir</span>
                        </button>
                        <button
                            onClick={onClose}
                            className="text-white/80 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Sub-Header Navigation */}
                <div className="bg-gray-50 border-b border-gray-200 px-6 py-2 flex items-center justify-between gap-2 overflow-x-auto shrink-0">
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setStep('edit')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                step === 'edit'
                                    ? 'bg-slate-900 text-white shadow-xs'
                                    : 'text-gray-600 hover:bg-gray-200/60'
                            }`}
                        >
                            <FileText className="w-3.5 h-3.5" />
                            1. Conteúdo do Contrato
                        </button>
                        <button
                            type="button"
                            onClick={() => setStep('sign')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                step === 'sign'
                                    ? 'bg-slate-900 text-white shadow-xs'
                                    : 'text-gray-600 hover:bg-gray-200/60'
                            }`}
                        >
                            <FileSignature className="w-3.5 h-3.5" />
                            2. Coleta de Assinatura Digital
                        </button>
                        {status === 'signed' && (
                            <button
                                type="button"
                                onClick={() => setStep('view')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                    step === 'view'
                                        ? 'bg-slate-900 text-white shadow-xs'
                                        : 'text-gray-600 hover:bg-gray-200/60'
                                }`}
                            >
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                                3. Certificado & Autenticação
                            </button>
                        )}
                    </div>
                </div>

                {/* Body Content */}
                <div className="p-6 overflow-y-auto flex-1 space-y-5">
                    {/* STEP 1: EDIT CONTENT */}
                    {step === 'edit' && (
                        <div className="space-y-4 animate-fade-in">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                                        Paciente <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        required
                                        value={selectedPatientId}
                                        onChange={(e) => {
                                            setSelectedPatientId(e.target.value);
                                            const foundTmpl = templates.find(t => t.id === selectedTemplateId) || templates[0];
                                            if (foundTmpl) applyTemplate(foundTmpl.content, foundTmpl.title);
                                        }}
                                        className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:bg-white focus:ring-2 focus:ring-slate-900 outline-none transition-all cursor-pointer"
                                    >
                                        <option value="">Selecione o paciente...</option>
                                        {patients.map(p => (
                                            <option key={p.id} value={p.id}>{p.name} {p.cpf ? `(${p.cpf})` : ''}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                                        Modelo de Documento
                                    </label>
                                    <select
                                        value={selectedTemplateId}
                                        onChange={(e) => handleSelectTemplate(e.target.value)}
                                        className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-slate-900 outline-none transition-all cursor-pointer"
                                    >
                                        {templates.map(t => (
                                            <option key={t.id} value={t.id}>{t.title}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                                        Título do Documento
                                    </label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-slate-900 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            {/* Textarea do contrato */}
                            <div>
                                <div className="flex justify-between items-center mb-1.5">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                                        Termos e Cláusulas Contratuais
                                    </label>
                                    <span className="text-xs text-gray-500">As variáveis foram preenchidas automaticamente</span>
                                </div>
                                <textarea
                                    rows={14}
                                    value={contractBody}
                                    onChange={(e) => setContractBody(e.target.value)}
                                    className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-900 font-mono leading-relaxed focus:bg-white focus:ring-2 focus:ring-slate-900 outline-none transition-all"
                                />
                            </div>
                        </div>
                    )}

                    {/* STEP 2: SIGNATURE COLLECTION */}
                    {step === 'sign' && (
                        <div className="space-y-5 animate-fade-in">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                                        Nome do Signatário / Responsável <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={signerName}
                                        onChange={(e) => setSignerName(e.target.value)}
                                        className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-slate-900 outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                                        CPF do Signatário
                                    </label>
                                    <input
                                        type="text"
                                        value={signerCpf}
                                        onChange={(e) => setSignerCpf(e.target.value)}
                                        className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-slate-900 outline-none"
                                    />
                                </div>
                            </div>

                            {/* Assinatura Digital Canvas */}
                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                                <div className="flex justify-between items-center">
                                    <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                        <FileSignature className="w-4 h-4 text-indigo-600" />
                                        Assinatura do Paciente / Responsável (Touch ou Mouse)
                                    </label>
                                    <button
                                        type="button"
                                        onClick={clearCanvas}
                                        className="text-xs font-semibold text-red-600 hover:text-red-800 transition-colors cursor-pointer"
                                    >
                                        Limpar Assinatura
                                    </button>
                                </div>

                                <div className="bg-white rounded-xl border-2 border-dashed border-slate-300 overflow-hidden relative touch-none">
                                    <canvas
                                        ref={canvasRef}
                                        width={700}
                                        height={180}
                                        onMouseDown={startDrawing}
                                        onMouseMove={draw}
                                        onMouseUp={stopDrawing}
                                        onMouseLeave={stopDrawing}
                                        onTouchStart={startDrawing}
                                        onTouchMove={draw}
                                        onTouchEnd={stopDrawing}
                                        className="w-full h-[180px] cursor-crosshair bg-white"
                                    />
                                    {!hasDrawn && !signatureUrl && (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-slate-400 gap-1">
                                            <FileSignature className="w-6 h-6" />
                                            <p className="text-xs font-medium">Assine neste espaço com o dedo ou mouse</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl text-xs text-indigo-950 flex items-center gap-2">
                                <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0" />
                                <span>Ao assinar, o sistema gerará um hash de segurança SHA-256 e registrará o timestamp oficial para garantia jurídica.</span>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: CERTIFICATE & VIEW */}
                    {step === 'view' && (
                        <div className="space-y-4 animate-fade-in">
                            <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3">
                                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="text-sm font-bold text-emerald-950">Documento Assinado e Autenticado</h4>
                                    <p className="text-xs text-emerald-800 mt-0.5">O contrato possui integridade criptográfica e está armazenado de forma imutável.</p>
                                    {documentHash && (
                                        <div className="mt-2 p-2 bg-white/80 rounded-lg border border-emerald-200 text-[11px] font-mono text-emerald-950 break-all">
                                            <strong>Hash SHA-256:</strong> {documentHash}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Preview da Assinatura */}
                            {signatureUrl && (
                                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex flex-col items-center justify-center">
                                    <p className="text-xs text-gray-500 mb-2">Assinatura Registrada:</p>
                                    <img src={signatureUrl} alt="Assinatura Digital" className="max-h-24 object-contain bg-white px-4 py-2 rounded-lg border border-gray-200" />
                                    <p className="text-xs font-bold text-gray-800 mt-2">{signerName} {signerCpf ? `- CPF: ${signerCpf}` : ''}</p>
                                </div>
                            )}

                            {/* Prévia do Contrato */}
                            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-xs font-mono whitespace-pre-wrap max-h-60 overflow-y-auto leading-relaxed">
                                {contractBody}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-5 bg-gray-50 border-t border-gray-200 flex justify-between items-center shrink-0">
                    <div>
                        {step === 'sign' && (
                            <button
                                type="button"
                                onClick={() => setStep('edit')}
                                className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-200 rounded-xl transition-all"
                            >
                                Voltar para o Texto
                            </button>
                        )}
                        {step === 'edit' && (
                            <button
                                type="button"
                                onClick={() => setStep('sign')}
                                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                            >
                                Avançar para Assinatura <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all"
                        >
                            Fechar
                        </button>
                        {step === 'sign' && (
                            <button
                                type="button"
                                onClick={handleSaveAndSign}
                                disabled={saving}
                                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-sm font-bold rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                            >
                                {saving ? (
                                    <>Autenticando...</>
                                ) : (
                                    <>
                                        <ShieldCheck className="w-4 h-4" />
                                        Salvar & Concluir Assinatura
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
