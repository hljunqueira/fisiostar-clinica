import React, { useState, useEffect } from 'react';
import { X, Camera, Lock, User, Key, Save, UploadCloud, CheckCircle, Shield } from 'lucide-react';
import { SystemUser, Professional } from '../types';
import { systemUsersApi, professionalsApi } from '../src/services/api';
import { storageApi } from '../src/services/storage-api';
import { supabase } from '../src/lib/supabase';
import toast from 'react-hot-toast';

interface UserProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    systemUser: SystemUser;
    professional?: Professional | null;
    onProfileUpdated?: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
    isOpen,
    onClose,
    systemUser,
    professional,
    onProfileUpdated
}) => {
    const [name, setName] = useState(systemUser.name || '');
    const [avatarUrl, setAvatarUrl] = useState(systemUser.avatarUrl || professional?.avatarUrl || '');
    const [crf, setCrf] = useState(professional?.crf || '');
    const [specialty, setSpecialty] = useState(professional?.specialty || '');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (systemUser) {
            setName(systemUser.name || '');
            setAvatarUrl(systemUser.avatarUrl || professional?.avatarUrl || '');
        }
        if (professional) {
            setCrf(professional.crf || '');
            setSpecialty(professional.specialty || '');
        }
    }, [systemUser, professional]);

    if (!isOpen) return null;

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setUploading(true);
            const publicUrl = await storageApi.uploadAvatar(file, systemUser.id);
            setAvatarUrl(publicUrl);
            toast.success('Foto enviada com sucesso!');
        } catch (error) {
            console.error('Error uploading avatar:', error);
            toast.error('Erro ao enviar foto. Tente novamente.');
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim()) {
            toast.error('Informe o seu nome.');
            return;
        }

        if (newPassword && newPassword.length < 6) {
            toast.error('A senha deve conter no mínimo 6 caracteres.');
            return;
        }

        if (newPassword && newPassword !== confirmPassword) {
            toast.error('As senhas digitadas não coincidem.');
            return;
        }

        try {
            setSaving(true);

            // 1. Update system_users table
            await systemUsersApi.update(systemUser.id, {
                ...systemUser,
                name: name.trim(),
                avatarUrl
            });

            // 2. Update professionals table if professional
            if (professional) {
                await professionalsApi.update(professional.id, {
                    name: name.trim(),
                    avatarUrl
                });
            }

            // 3. Update Supabase Auth Password if provided
            if (newPassword) {
                const { error } = await supabase.auth.updateUser({
                    password: newPassword
                });
                if (error) throw error;
                toast.success('Senha alterada com sucesso!');
            }

            toast.success('Perfil atualizado com sucesso!');
            if (onProfileUpdated) onProfileUpdated();
            onClose();
        } catch (error: any) {
            console.error('Error updating profile:', error);
            toast.error(error?.message || 'Erro ao atualizar perfil.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 relative max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center pb-4 border-b border-gray-100 mb-6">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <User className="w-5 h-5 text-primary" /> Meu Perfil
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Avatar Upload Section */}
                    <div className="flex flex-col items-center justify-center gap-3 mb-2">
                        <div className="relative group cursor-pointer">
                            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-primary/20 shadow-md bg-gradient-to-tr from-primary/10 to-primary/30 flex items-center justify-center">
                                {avatarUrl ? (
                                    <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-3xl font-bold text-primary">{name.charAt(0) || 'U'}</span>
                                )}
                            </div>

                            <label className="absolute inset-0 bg-black/40 rounded-full flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                <Camera className="w-6 h-6 mb-1" />
                                <span className="text-[10px] font-bold">Alterar Foto</span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileUpload}
                                    className="hidden"
                                    disabled={uploading}
                                />
                            </label>
                        </div>

                        <label className="flex items-center gap-2 px-3.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-sm">
                            <UploadCloud className="w-4 h-4 text-primary" />
                            {uploading ? 'Enviando Foto...' : 'Carregar Nova Foto'}
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileUpload}
                                className="hidden"
                                disabled={uploading}
                            />
                        </label>
                    </div>

                    {/* Basic Info */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nome Completo</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1 flex items-center justify-between">
                                <span>E-mail de Acesso</span>
                                <span className="text-[10px] font-semibold text-gray-400">Identificador Conta</span>
                            </label>
                            <input
                                type="email"
                                value={systemUser.email}
                                readOnly
                                disabled
                                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 text-gray-600 font-medium cursor-not-allowed"
                            />
                        </div>
                    </div>

                    {/* Professional Info if available (Read-Only, Managed by Admin) */}
                    {professional && (
                        <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3.5 rounded-xl border border-gray-200">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center justify-between">
                                    <span>CRF / Registro</span>
                                    <Lock className="w-3 h-3 text-gray-400" title="Gerenciado pela Administração" />
                                </label>
                                <input
                                    type="text"
                                    value={crf}
                                    readOnly
                                    disabled
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-100 text-gray-600 cursor-not-allowed font-medium"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center justify-between">
                                    <span>Especialidade</span>
                                    <Lock className="w-3 h-3 text-gray-400" title="Gerenciado pela Administração" />
                                </label>
                                <input
                                    type="text"
                                    value={specialty}
                                    readOnly
                                    disabled
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-100 text-gray-600 cursor-not-allowed font-medium"
                                />
                            </div>
                        </div>
                    )}

                    {/* Change Password Section */}
                    <div className="pt-3 border-t border-gray-100">
                        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-3">
                            <Lock className="w-4 h-4 text-gray-500" /> Alterar Senha de Acesso
                        </h3>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Nova Senha (deixe em branco para não alterar)</label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm outline-none focus:border-primary"
                                />
                            </div>

                            {newPassword && (
                                <div className="animate-fade-in">
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Confirmar Nova Senha</label>
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm outline-none focus:border-primary"
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={saving || uploading}
                            className="px-5 py-2 text-sm font-bold text-white bg-primary hover:bg-primary-hover rounded-xl shadow-md flex items-center gap-2 disabled:opacity-50"
                        >
                            <Save className="w-4 h-4" /> {saving ? 'Salvando...' : 'Salvar Alterações'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default UserProfileModal;
