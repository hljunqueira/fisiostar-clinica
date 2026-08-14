import React, { useState, useEffect } from 'react';
import { Megaphone, Plus, Trash2, AlertTriangle, Info, AlertCircle, User, Users, ShieldAlert, Check, X } from 'lucide-react';
import { Announcement, UserRole, Professional } from '../types';
import { professionalsApi } from '../src/services/api';
import toast from 'react-hot-toast';

interface AnnouncementsViewProps {
    announcements: Announcement[];
    onAddAnnouncement?: (announcement: Omit<Announcement, 'id'>) => Promise<void>;
    onDeleteAnnouncement?: (id: string) => Promise<void>;
    userRole: UserRole;
    currentProfessionalId?: string;
}

export const AnnouncementsView: React.FC<AnnouncementsViewProps> = ({
    announcements,
    onAddAnnouncement,
    onDeleteAnnouncement,
    userRole,
    currentProfessionalId
}) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [professionalsList, setProfessionalsList] = useState<Professional[]>([]);
    const [loadingProfs, setLoadingProfs] = useState(false);

    // Form state
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [type, setType] = useState<'info' | 'warning' | 'urgent'>('info');
    const [targetRole, setTargetRole] = useState<'all' | 'professional' | 'secretary' | 'individual'>('all');
    const [selectedProfId, setSelectedProfId] = useState<string>('');

    const isAdmin = userRole === 'admin';

    useEffect(() => {
        if (isAdmin) {
            loadProfessionals();
        }
    }, [isAdmin]);

    const loadProfessionals = async () => {
        try {
            setLoadingProfs(true);
            const data = await professionalsApi.getAll();
            setProfessionalsList(data);
            if (data.length > 0) {
                setSelectedProfId(data[0].id);
            }
        } catch (error) {
            console.error('Error loading professionals list for announcements', error);
        } finally {
            setLoadingProfs(false);
        }
    };

    // Filter announcements visible to current user
    const visibleAnnouncements = announcements.filter(a => {
        if (isAdmin) return true; // Admin sees all announcements

        if (a.targetRole === 'individual') {
            return currentProfessionalId && a.targetProfessionalId === currentProfessionalId;
        }

        if (a.targetRole === 'all') return true;
        if (a.targetRole === 'professional' && userRole === 'professional') return true;
        if (a.targetRole === 'secretary' && userRole === 'secretary') return true;

        return false;
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !message.trim()) {
            toast.error('Preencha título e mensagem do comunicado.');
            return;
        }

        if (targetRole === 'individual' && !selectedProfId) {
            toast.error('Selecione um profissional para o envio individual.');
            return;
        }

        try {
            if (onAddAnnouncement) {
                await onAddAnnouncement({
                    title: title.trim(),
                    message: message.trim(),
                    type,
                    date: new Date().toISOString(),
                    targetRole,
                    targetProfessionalId: targetRole === 'individual' ? selectedProfId : undefined
                });
            }
            toast.success('Comunicado publicado com sucesso!');
            setTitle('');
            setMessage('');
            setType('info');
            setTargetRole('all');
            setIsModalOpen(false);
        } catch (error) {
            console.error('Error creating announcement:', error);
            toast.error('Erro ao publicar comunicado.');
        }
    };

    const getTypeIcon = (announcementType: 'info' | 'warning' | 'urgent') => {
        switch (announcementType) {
            case 'urgent':
                return <AlertCircle className="w-5 h-5 text-red-600" />;
            case 'warning':
                return <AlertTriangle className="w-5 h-5 text-amber-600" />;
            default:
                return <Info className="w-5 h-5 text-blue-600" />;
        }
    };

    const getTypeBadge = (announcementType: 'info' | 'warning' | 'urgent') => {
        switch (announcementType) {
            case 'urgent':
                return <span className="bg-red-100 text-red-700 border border-red-200 px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> Urgente</span>;
            case 'warning':
                return <span className="bg-amber-100 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Aviso</span>;
            default:
                return <span className="bg-blue-100 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1"><Info className="w-3.5 h-3.5" /> Informativo</span>;
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header Banner */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 text-primary rounded-xl">
                        <Megaphone className="w-7 h-7" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Comunicados Internos</h1>
                        <p className="text-sm text-gray-500">Mural oficial de avisos e orientações da clínica.</p>
                    </div>
                </div>

                {isAdmin && (
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-bold rounded-xl hover:bg-primary-hover transition-all shadow-md hover:shadow-lg text-sm"
                    >
                        <Plus className="w-4 h-4" /> Novo Comunicado
                    </button>
                )}
            </div>

            {/* Announcements List */}
            {visibleAnnouncements.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                    {visibleAnnouncements.map((item) => {
                        const targetProf = item.targetProfessionalId
                            ? professionalsList.find(p => p.id === item.targetProfessionalId)
                            : null;

                        return (
                            <div
                                key={item.id}
                                className={`p-6 rounded-2xl border transition-all bg-white shadow-sm hover:shadow-md relative overflow-hidden ${item.type === 'urgent'
                                        ? 'border-red-200 border-l-4 border-l-red-500'
                                        : item.type === 'warning'
                                            ? 'border-amber-200 border-l-4 border-l-amber-500'
                                            : 'border-gray-200 border-l-4 border-l-primary'
                                    }`}
                            >
                                <div className="flex justify-between items-start gap-4 mb-3">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {getTypeBadge(item.type)}

                                        {/* Destination Tag */}
                                        {item.targetRole === 'individual' ? (
                                            <span className="bg-purple-100 text-purple-700 border border-purple-200 px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                                                <User className="w-3.5 h-3.5" /> Direct: {targetProf ? targetProf.name : 'Profissional Específico'}
                                            </span>
                                        ) : item.targetRole === 'professional' ? (
                                            <span className="bg-gray-100 text-gray-700 border border-gray-200 px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                                                <Users className="w-3.5 h-3.5" /> Equipe de Saúde
                                            </span>
                                        ) : item.targetRole === 'secretary' ? (
                                            <span className="bg-gray-100 text-gray-700 border border-gray-200 px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                                                <Users className="w-3.5 h-3.5" /> Recepção
                                            </span>
                                        ) : (
                                            <span className="bg-gray-100 text-gray-600 border border-gray-200 px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                                                <Users className="w-3.5 h-3.5" /> Toda a Clínica
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <span className="text-xs text-gray-400 font-medium">
                                            {new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </span>

                                        {isAdmin && onDeleteAnnouncement && (
                                            <button
                                                onClick={() => onDeleteAnnouncement(item.id)}
                                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Remover Comunicado"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <h3 className="text-lg font-bold text-gray-900 mb-2">{item.title}</h3>
                                <p className="text-gray-600 text-sm whitespace-pre-line leading-relaxed">{item.message}</p>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="bg-white p-12 rounded-2xl border border-gray-200 text-center">
                    <Megaphone className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <h3 className="text-lg font-bold text-gray-800">Nenhum comunicado recente</h3>
                    <p className="text-sm text-gray-500 mt-1">Não há novos avisos ou orientações publicadas para você no momento.</p>
                </div>
            )}

            {/* Modal for Admin to Create Announcement */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100">
                        <div className="flex justify-between items-center pb-4 border-b border-gray-100 mb-4">
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <Megaphone className="w-5 h-5 text-primary" /> Publicar Novo Comunicado
                            </h2>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Título do Comunicado</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Ex: Treinamento de Pilates neste Sábado"
                                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Urgência</label>
                                    <select
                                        value={type}
                                        onChange={(e) => setType(e.target.value as any)}
                                        className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm outline-none focus:border-primary"
                                    >
                                        <option value="info">Informativo</option>
                                        <option value="warning">Aviso / Alerta</option>
                                        <option value="urgent">Urgente</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Público Alvo</label>
                                    <select
                                        value={targetRole}
                                        onChange={(e) => setTargetRole(e.target.value as any)}
                                        className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm outline-none focus:border-primary"
                                    >
                                        <option value="all">Toda a Clínica</option>
                                        <option value="professional">Grupo Profissionais</option>
                                        <option value="secretary">Grupo Recepção</option>
                                        <option value="individual">Profissional Específico</option>
                                    </select>
                                </div>
                            </div>

                            {targetRole === 'individual' && (
                                <div className="animate-fade-in bg-purple-50 p-3.5 rounded-xl border border-purple-100">
                                    <label className="block text-xs font-bold text-purple-900 uppercase mb-1">Selecione o Profissional</label>
                                    <select
                                        value={selectedProfId}
                                        onChange={(e) => setSelectedProfId(e.target.value)}
                                        className="w-full px-3 py-2 border border-purple-200 rounded-lg text-sm bg-white outline-none focus:border-purple-500"
                                        required
                                    >
                                        {professionalsList.map(p => (
                                            <option key={p.id} value={p.id}>
                                                {p.name} ({p.specialty})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Mensagem / Conteúdo</label>
                                <textarea
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    rows={4}
                                    placeholder="Digite a mensagem completa do comunicado..."
                                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                    required
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 text-sm font-bold text-white bg-primary hover:bg-primary-hover rounded-xl shadow-md"
                                >
                                    Publicar Comunicado
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AnnouncementsView;
