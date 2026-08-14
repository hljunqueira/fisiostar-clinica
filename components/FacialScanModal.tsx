import React, { useState, useRef, useEffect } from 'react';
import { Camera, CheckCircle2, RefreshCw, X, Shield, Sparkles, UserCheck } from 'lucide-react';
import toast from 'react-hot-toast';

interface FacialScanModalProps {
    isOpen: boolean;
    onClose: () => void;
    patientName: string;
    onSaveFacialData: (facialDescriptor: string) => Promise<void>;
}

export const FacialScanModal: React.FC<FacialScanModalProps> = ({
    isOpen,
    onClose,
    patientName,
    onSaveFacialData
}) => {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [isCaptured, setIsCaptured] = useState(false);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            startCamera();
        } else {
            stopCamera();
            resetScan();
        }

        return () => {
            stopCamera();
        };
    }, [isOpen]);

    const startCamera = async () => {
        try {
            setCameraError(null);
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480, facingMode: 'user' }
            });
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
        } catch (err) {
            console.error('Error accessing camera:', err);
            setCameraError('Não foi possível acessar a câmera. Verifique as permissões do seu navegador.');
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
    };

    const resetScan = () => {
        setIsScanning(false);
        setIsCaptured(false);
        setCapturedImage(null);
    };

    const handleCapture = () => {
        if (!videoRef.current) return;

        setIsScanning(true);

        // Simula animação de escaneamento por 1.5s
        setTimeout(() => {
            const canvas = canvasRef.current || document.createElement('canvas');
            canvas.width = 640;
            canvas.height = 480;
            const ctx = canvas.getContext('2d');
            if (ctx && videoRef.current) {
                ctx.drawImage(videoRef.current, 0, 0, 640, 480);
                const imageData = canvas.toDataURL('image/jpeg', 0.85);
                setCapturedImage(imageData);
                setIsCaptured(true);
            }
            setIsScanning(false);
            toast.success('Biometria facial analisada com sucesso!');
        }, 1500);
    };

    const handleSave = async () => {
        if (!capturedImage) return;

        try {
            setSaving(true);
            // Simulação de descriptor facial gerado (hash de biometria)
            const simulatedDescriptor = JSON.stringify({
                version: '1.0-simulated',
                timestamp: new Date().toISOString(),
                hash: btoa(capturedImage.substring(0, 100))
            });

            await onSaveFacialData(simulatedDescriptor);
            toast.success(`Face cadastrada para ${patientName}!`);
            onClose();
        } catch (error) {
            console.error('Error saving facial data:', error);
            toast.error('Erro ao salvar biometria facial');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

            {/* Modal Box */}
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg relative z-10 overflow-hidden animate-fadeIn border border-slate-100">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                            <Sparkles className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 text-base">Reconhecimento Facial</h3>
                            <p className="text-xs text-slate-500">Cadastramento Biométrico • {patientName}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body / Camera Feed */}
                <div className="p-6 flex flex-col items-center">
                    {cameraError ? (
                        <div className="w-full py-12 px-4 text-center bg-red-50 rounded-2xl border border-red-100 text-red-600 text-sm font-medium flex flex-col items-center gap-3">
                            <Camera className="w-10 h-10 text-red-400" />
                            <p>{cameraError}</p>
                            <button
                                onClick={startCamera}
                                className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-semibold hover:bg-red-700 transition-all"
                            >
                                Tentar Novamente
                            </button>
                        </div>
                    ) : (
                        <div className="relative w-full aspect-[4/3] rounded-2xl bg-slate-950 overflow-hidden shadow-inner flex items-center justify-center border border-slate-800">
                            {isCaptured && capturedImage ? (
                                <img
                                    src={capturedImage}
                                    alt="Face Capturada"
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    className="w-full h-full object-cover transform -scale-x-100"
                                />
                            )}

                            {/* Guia Visual Oval Rosto */}
                            {!isCaptured && (
                                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                                    <div className={`w-52 h-64 rounded-[50%] border-2 ${isScanning ? 'border-emerald-400 shadow-[0_0_30px_rgba(52,211,153,0.5)]' : 'border-blue-400/70'} transition-all duration-300 relative flex items-center justify-center`}>
                                        {/* Linha de Varredura de Scan */}
                                        {isScanning && (
                                            <div className="absolute w-full h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-bounce top-1/2" />
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Overlay Status */}
                            {isScanning && (
                                <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[1px] flex flex-col items-center justify-center text-white space-y-2">
                                    <div className="w-10 h-10 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                                    <span className="text-xs font-semibold tracking-wider uppercase text-emerald-300">Escaneando Rosto...</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Canvas invisível para snapshot */}
                    <canvas ref={canvasRef} className="hidden" />

                    {/* Dica do Usuário */}
                    <div className="mt-4 flex items-center gap-2 text-xs text-slate-500 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
                        <Shield className="w-4 h-4 text-blue-500 flex-shrink-0" />
                        <span>Posicione o rosto centralizado no retângulo guia.</span>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <button
                        onClick={onClose}
                        className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-100 transition-colors"
                    >
                        Cancelar
                    </button>

                    <div className="flex items-center gap-2">
                        {isCaptured ? (
                            <>
                                <button
                                    onClick={() => { resetScan(); startCamera(); }}
                                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-100 transition-colors flex items-center gap-1.5"
                                >
                                    <RefreshCw className="w-3.5 h-3.5" />
                                    Refazer
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5"
                                >
                                    {saving ? (
                                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <CheckCircle2 className="w-4 h-4" />
                                            Salvar Biometria
                                        </>
                                    )}
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={handleCapture}
                                disabled={isScanning || !!cameraError}
                                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-600/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
                            >
                                <Camera className="w-4 h-4" />
                                Escanear Rosto
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
