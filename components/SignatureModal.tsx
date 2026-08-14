import React, { useRef, useState, useEffect } from 'react';
import { X, Trash2, Camera, Pen, Check } from 'lucide-react';
import toast from 'react-hot-toast';

interface SignatureModalProps {
    title: string;
    description?: string;
    onConfirm: (imageData: string, type: 'signature' | 'photo') => void;
    onCancel: () => void;
}

const SignatureModal: React.FC<SignatureModalProps> = ({ title, description, onConfirm, onCancel }) => {
    const [mode, setMode] = useState<'signature' | 'photo'>('signature');
    const [signatureData, setSignatureData] = useState<string | null>(null);
    const [photoData, setPhotoData] = useState<string | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);

    // Signature canvas refs
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const contextRef = useRef<CanvasRenderingContext2D | null>(null);

    // Camera refs
    const videoRef = useRef<HTMLVideoElement>(null);
    const [cameraActive, setCameraActive] = useState(false);
    const mediaStreamRef = useRef<MediaStream | null>(null);

    // Camera effect
    useEffect(() => {
        if (mode === 'photo' && cameraActive) {
            let active = true;
            navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
                .then(stream => {
                    if (!active) {
                        stream.getTracks().forEach(t => t.stop());
                        return;
                    }
                    mediaStreamRef.current = stream;
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                    }
                })
                .catch(err => {
                    console.error('Error accessing camera:', err);
                    setCameraActive(false);
                    toast.error('Não foi possível acessar a câmera');
                });

            return () => {
                active = false;
                if (mediaStreamRef.current) {
                    mediaStreamRef.current.getTracks().forEach(t => t.stop());
                    mediaStreamRef.current = null;
                }
            };
        }
    }, [mode, cameraActive]);

    // Initialize canvas
    useEffect(() => {
        if (canvasRef.current && mode === 'signature') {
            const canvas = canvasRef.current;
            canvas.width = canvas.offsetWidth * 2;
            canvas.height = canvas.offsetHeight * 2;

            const context = canvas.getContext('2d');
            if (context) {
                context.scale(2, 2);
                context.lineCap = 'round';
                context.lineJoin = 'round';
                context.strokeStyle = '#1e40af';
                context.lineWidth = 3;
                contextRef.current = context;
            }
        }
    }, [mode]);

    // Drawing handlers
    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        if (!contextRef.current || !canvasRef.current) return;

        const rect = canvasRef.current.getBoundingClientRect();
        let x, y;

        if ('touches' in e) {
            x = e.touches[0].clientX - rect.left;
            y = e.touches[0].clientY - rect.top;
        } else {
            x = e.clientX - rect.left;
            y = e.clientY - rect.top;
        }

        contextRef.current.beginPath();
        contextRef.current.moveTo(x, y);
        setIsDrawing(true);
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing || !contextRef.current || !canvasRef.current) return;

        const rect = canvasRef.current.getBoundingClientRect();
        let x, y;

        if ('touches' in e) {
            e.preventDefault();
            x = e.touches[0].clientX - rect.left;
            y = e.touches[0].clientY - rect.top;
        } else {
            x = e.clientX - rect.left;
            y = e.clientY - rect.top;
        }

        contextRef.current.lineTo(x, y);
        contextRef.current.stroke();
    };

    const stopDrawing = () => {
        if (!contextRef.current) return;
        contextRef.current.closePath();
        setIsDrawing(false);

        if (canvasRef.current) {
            setSignatureData(canvasRef.current.toDataURL('image/png'));
        }
    };

    const clearSignature = () => {
        if (!contextRef.current || !canvasRef.current) return;
        contextRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        setSignatureData(null);
    };

    // Camera handlers
    const startCamera = () => {
        setCameraActive(true);
    };

    const stopCamera = () => {
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        setCameraActive(false);
    };

    const capturePhoto = () => {
        if (videoRef.current) {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth || 640;
            canvas.height = videoRef.current.videoHeight || 480;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(videoRef.current, 0, 0);
                const dataUrl = canvas.toDataURL('image/jpeg');
                setPhotoData(dataUrl);
                stopCamera();
            }
        }
    };

    // Cleanup camera on unmount
    useEffect(() => {
        return () => {
            stopCamera();
        };
    }, []);

    const handleConfirm = () => {
        if (mode === 'signature' && signatureData) {
            onConfirm(signatureData, 'signature');
        } else if (mode === 'photo' && photoData) {
            onConfirm(photoData, 'photo');
        }
    };

    const canConfirm = (mode === 'signature' && signatureData) || (mode === 'photo' && photoData);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />

            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg relative z-10 animate-fade-in overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">{title}</h3>
                        {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
                    </div>
                    <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-full">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Mode Toggle */}
                <div className="p-4 border-b border-gray-100 flex gap-2">
                    <button
                        onClick={() => { setMode('signature'); stopCamera(); }}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${mode === 'signature' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        <Pen className="w-4 h-4" />
                        Assinatura
                    </button>
                    <button
                        onClick={() => { setMode('photo'); startCamera(); }}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${mode === 'photo' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        <Camera className="w-4 h-4" />
                        Foto
                    </button>
                </div>

                {/* Content */}
                <div className="p-4">
                    {mode === 'signature' && (
                        <div className="space-y-3">
                            <div className="border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 relative">
                                <canvas
                                    ref={canvasRef}
                                    className="w-full h-48 touch-none cursor-crosshair"
                                    onMouseDown={startDrawing}
                                    onMouseMove={draw}
                                    onMouseUp={stopDrawing}
                                    onMouseLeave={stopDrawing}
                                    onTouchStart={startDrawing}
                                    onTouchMove={draw}
                                    onTouchEnd={stopDrawing}
                                />
                                {!signatureData && (
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <p className="text-gray-400 text-sm">Desenhe sua assinatura aqui</p>
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={clearSignature}
                                className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
                            >
                                <Trash2 className="w-4 h-4" />
                                Limpar
                            </button>
                        </div>
                    )}

                    {mode === 'photo' && (
                        <div className="space-y-3">
                            {!photoData ? (
                                <>
                                    {cameraActive ? (
                                        <div className="relative">
                                            <video
                                                ref={videoRef}
                                                autoPlay
                                                playsInline
                                                className="w-full h-48 object-cover rounded-lg bg-black"
                                            />
                                            <button
                                                onClick={capturePhoto}
                                                className="absolute bottom-4 left-1/2 -translate-x-1/2 px-6 py-2 bg-white text-blue-600 rounded-full font-medium shadow-lg hover:bg-gray-50"
                                            >
                                                Capturar
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={startCamera}
                                            className="w-full h-48 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 flex flex-col items-center justify-center gap-2 hover:bg-gray-100 transition-colors"
                                        >
                                            <Camera className="w-8 h-8 text-gray-400" />
                                            <span className="text-gray-500">Clique para abrir a câmera</span>
                                        </button>
                                    )}
                                </>
                            ) : (
                                <div className="relative">
                                    <img src={photoData} alt="Captured" className="w-full h-48 object-cover rounded-lg" />
                                    <button
                                        onClick={() => setPhotoData(null)}
                                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-200 flex gap-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!canConfirm}
                        className={`flex-1 py-2 rounded-lg font-medium flex items-center justify-center gap-2 ${canConfirm
                                ? 'bg-green-600 text-white hover:bg-green-700'
                                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            }`}
                    >
                        <Check className="w-4 h-4" />
                        Confirmar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SignatureModal;
