import React, { useState, useEffect, useRef } from 'react';
import { UnitId, ChatChannel, ChatMessage, SystemUser, Patient, Unit } from '../../types';
import { chatApi } from '../../src/services/chat-api';
import { systemUsersApi, patientsApi, unitsApi } from '../../src/services/api';
import { notificationsApi } from '../../src/services/notifications-api';
import {
  MessageSquare,
  Hash,
  User,
  Send,
  UserCheck,
  Plus,
  Search,
  ChevronLeft,
  Trash2,
  Star,
  DoorClosed,
  MoreVertical,
  Users,
  AlertCircle,
  Pencil
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';

interface InternalChatProps {
  currentUnit: UnitId;
  currentUser?: {
    id: string;
    name: string;
    email: string;
    role: string;
    avatarUrl?: string;
  } | null;
}

const PRESET_ICONS = ['📢', '🏢', '🩺', '💼', '⚡', '📋', '💡', '🛡️', '🎯', '🏋️‍♀️', '💬', '✨'];

export const InternalChat: React.FC<InternalChatProps> = ({ currentUnit, currentUser }) => {
  const [searchParams] = useSearchParams();
  const channelParam = searchParams.get('channel');

  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [teamMembers, setTeamMembers] = useState<SystemUser[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);

  // Form Message
  const [text, setText] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  // Mobile View state
  const [mobileShowChat, setMobileShowChat] = useState(false);

  // Modals
  const [isNewChannelModalOpen, setIsNewChannelModalOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDesc, setNewChannelDesc] = useState('');
  const [newChannelIcon, setNewChannelIcon] = useState('📢');
  const [newChannelUnitId, setNewChannelUnitId] = useState<string>('');
  const [creatingChannel, setCreatingChannel] = useState(false);

  // Edit Channel Modal
  const [isEditChannelModalOpen, setIsEditChannelModalOpen] = useState(false);
  const [editChannelId, setEditChannelId] = useState('');
  const [editChannelName, setEditChannelName] = useState('');
  const [editChannelDesc, setEditChannelDesc] = useState('');
  const [editChannelIcon, setEditChannelIcon] = useState('📢');
  const [editChannelUnitId, setEditChannelUnitId] = useState<string>('');
  const [savingChannelEdit, setSavingChannelEdit] = useState(false);

  const [isNewDmModalOpen, setIsNewDmModalOpen] = useState(false);
  const [dmSearchTerm, setDmSearchTerm] = useState('');

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingChannel, setDeletingChannel] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

  useEffect(() => {
    if (currentUser?.id) {
      loadInitialData();
    }
  }, [currentUnit, currentUser?.id]);

  useEffect(() => {
    if (activeChannelId) {
      loadMessages(activeChannelId);

      const unsubscribe = chatApi.subscribeToChannel(activeChannelId, (newMsg) => {
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
        scrollToBottom();
      });

      // ⚡ Polling rápido ativo (2 segundos) para garantir mensagens em tempo real
      const pollTimer = setInterval(async () => {
        try {
          const fresh = await chatApi.getMessages(activeChannelId);
          setMessages((prev) => {
            if (fresh.length !== prev.length || fresh[fresh.length - 1]?.id !== prev[prev.length - 1]?.id) {
              return fresh;
            }
            return prev;
          });
        } catch (e) {
          // ignore quiet polling
        }
      }, 2000);

      return () => {
        unsubscribe();
        clearInterval(pollTimer);
      };
    }
  }, [activeChannelId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadInitialData = async () => {
    if (!currentUser?.id) return;
    try {
      setLoading(true);
      const [unitsData, usersData, patientsData] = await Promise.all([
        unitsApi.getAll(),
        systemUsersApi.getAll(),
        patientsApi.getAll()
      ]);
      setUnits(unitsData);
      setTeamMembers(usersData.filter((u) => u.id !== currentUser.id));
      setPatients(patientsData);

      await chatApi.ensureDefaultChannels(unitsData);

      const channelsData = await chatApi.getChannels(currentUser.id, currentUnit);
      setChannels(channelsData);

      if (channelParam && channelsData.some((c) => c.id === channelParam)) {
        setActiveChannelId(channelParam);
      } else if (channelsData.length > 0 && !activeChannelId) {
        setActiveChannelId(channelsData[0].id);
      }
    } catch (e) {
      console.error('Error loading chat initial data:', e);
      toast.error('Erro ao carregar chat');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (channelParam && channels.some((c) => c.id === channelParam)) {
      setActiveChannelId(channelParam);
    }
  }, [channelParam, channels]);

  const loadMessages = async (cId: string) => {
    try {
      setMessagesLoading(true);
      const data = await chatApi.getMessages(cId);
      setMessages(data);
    } catch (e) {
      console.error('Error loading messages:', e);
    } finally {
      setMessagesLoading(false);
    }
  };

  const handleSelectChannel = (cId: string) => {
    setActiveChannelId(cId);
    setMobileShowChat(true);
  };

  const handleToggleFavorite = async (channelId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!currentUser?.id) return;

    try {
      const isFav = await chatApi.toggleFavorite(currentUser.id, channelId);
      setChannels((prev) =>
        prev.map((c) => (c.id === channelId ? { ...c, isFavorite: isFav } : c))
      );
      toast.success(isFav ? 'Canal fixado em Favoritos ⭐' : 'Canal removido dos Favoritos');
    } catch (err) {
      console.error('Error toggling favorite:', err);
    }
  };

  const handleStartDirectChat = async (targetUser: SystemUser) => {
    if (!currentUser?.id) return;
    try {
      const channelId = await chatApi.getOrCreateDirectChannel(
        currentUser.id,
        targetUser.id,
        targetUser.name
      );

      const channelsData = await chatApi.getChannels(currentUser.id, currentUnit);
      
      const found = channelsData.find(c => c.id === channelId);
      if (!found) {
        // Criar fallback local
        const newDm: ChatChannel = {
          id: channelId,
          name: targetUser.name,
          type: 'direct',
          icon: '👤',
          otherUser: targetUser,
          isFavorite: false
        };
        setChannels([newDm, ...channelsData]);
      } else {
        setChannels(channelsData);
      }

      setActiveChannelId(channelId);
      setMobileShowChat(true);
      setIsNewDmModalOpen(false);
    } catch (e: any) {
      console.error('Error starting direct chat:', e);
      toast.error(e?.message || 'Erro ao abrir conversa direta');
    }
  };

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      toast.error('Apenas administradores podem criar canais oficiais.');
      return;
    }
    if (!newChannelName.trim()) {
      toast.error('Informe o nome do canal.');
      return;
    }

    try {
      setCreatingChannel(true);
      const created = await chatApi.createChannel({
        name: newChannelName.trim(),
        type: newChannelUnitId ? 'unit' : 'general',
        icon: newChannelIcon,
        description: newChannelDesc.trim(),
        unitId: newChannelUnitId || undefined,
        createdBy: currentUser?.id
      });

      toast.success('Canal criado com sucesso!');
      setIsNewChannelModalOpen(false);
      setNewChannelName('');
      setNewChannelDesc('');
      setNewChannelIcon('📢');
      setNewChannelUnitId('');

      if (currentUser?.id) {
        const channelsData = await chatApi.getChannels(currentUser.id, currentUnit);
        setChannels(channelsData);
        setActiveChannelId(created.id);
      }
    } catch (error: any) {
      console.error('Error creating channel:', error);
      toast.error(error.message || 'Erro ao criar canal');
    } finally {
      setCreatingChannel(false);
    }
  };

  const openEditChannelModal = (channel: ChatChannel) => {
    setEditChannelId(channel.id);
    setEditChannelName(channel.name);
    setEditChannelDesc(channel.description || '');
    setEditChannelIcon(channel.icon || '📢');
    setEditChannelUnitId(channel.unitId || '');
    setIsEditChannelModalOpen(true);
  };

  const handleSaveChannelEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editChannelId || !isAdmin) return;
    if (!editChannelName.trim()) {
      toast.error('Informe o nome do canal.');
      return;
    }

    try {
      setSavingChannelEdit(true);
      await chatApi.updateChannel(editChannelId, {
        name: editChannelName.trim(),
        description: editChannelDesc.trim(),
        icon: editChannelIcon,
        unitId: editChannelUnitId || undefined
      });
      toast.success('Canal atualizado com sucesso!');
      setIsEditChannelModalOpen(false);

      if (currentUser?.id) {
        const channelsData = await chatApi.getChannels(currentUser.id, currentUnit);
        setChannels(channelsData);
      }
    } catch (error: any) {
      console.error('Error updating channel:', error);
      toast.error(error?.message || 'Erro ao atualizar canal');
    } finally {
      setSavingChannelEdit(false);
    }
  };

  const handleDeleteActiveChannel = async () => {
    if (!activeChannel) return;

    if (activeChannel.type !== 'direct' && !isAdmin) {
      toast.error('Apenas administradores podem excluir canais oficiais.');
      return;
    }

    try {
      setDeletingChannel(true);
      await chatApi.deleteChannel(activeChannel.id);
      toast.success(
        activeChannel.type === 'direct'
          ? 'Conversa excluída para todos com sucesso'
          : 'Canal excluído com sucesso'
      );
      setIsDeleteModalOpen(false);

      if (currentUser?.id) {
        const channelsData = await chatApi.getChannels(currentUser.id, currentUnit);
        setChannels(channelsData);
        setActiveChannelId(channelsData[0]?.id || '');
      }
    } catch (error) {
      console.error('Error deleting channel:', error);
      toast.error('Erro ao excluir');
    } finally {
      setDeletingChannel(false);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!text.trim() || !activeChannelId || !currentUser?.id) return;

    const contentToSend = text.trim();
    const patientTag = selectedPatientId || undefined;
    const patientObj = patients.find((p) => p.id === patientTag);
    const tempId = `temp-${Date.now()}`;

    // ⚡ Optimistic UI: Aparece na tela imediatamente (0ms de latência)
    const optimisticMsg: ChatMessage = {
      id: tempId,
      channelId: activeChannelId,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole: currentUser.role,
      senderAvatarUrl: currentUser.avatarUrl,
      content: contentToSend,
      patientId: patientTag,
      patientName: patientObj?.name,
      createdAt: new Date().toISOString(),
      status: 'sending'
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setText('');
    setSelectedPatientId('');
    scrollToBottom();

    try {
      const sent = await chatApi.sendMessage({
        channelId: activeChannelId,
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderRole: currentUser.role,
        content: contentToSend,
        patientId: patientTag
      });

      // Substitui mensagem temporária pela oficial salva
      setMessages((prev) => prev.map((m) => (m.id === tempId ? sent : m)));

      // Atualizar lista de canais para garantir que a DM apareça como ativa
      const activeChan = channels.find((c) => c.id === activeChannelId);
      if (activeChan?.type === 'direct') {
        const channelsData = await chatApi.getChannels(currentUser.id, currentUnit);
        setChannels(channelsData);

        if (activeChan.otherUser) {
          try {
            await notificationsApi.create({
              userId: activeChan.otherUser.id,
              title: `💬 Nova mensagem de ${currentUser.name}`,
              message: contentToSend,
              type: 'chat',
              linkUrl: `/chat?channel=${activeChannelId}`
            });
          } catch (notifErr) {
            console.warn('Could not persist notification:', notifErr);
          }
        }
      }
    } catch (err: any) {
      console.error('Erro ao enviar mensagem:', err);
      toast.error('Erro ao enviar mensagem');
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    }
  };

  const handleQuickPatientArrival = async (patient: Patient) => {
    if (!activeChannelId || !currentUser?.id) return;

    const arrivalText = `🔔 PACIENTE NA RECEPÇÃO: ${patient.name} acabou de chegar e está aguardando atendimento.`;

    try {
      await chatApi.sendMessage({
        channelId: activeChannelId,
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderRole: currentUser.role,
        content: arrivalText,
        patientId: patient.id
      });
      toast.success(`Aviso de chegada de ${patient.name} enviado!`);
    } catch (e) {
      console.error('Error sending arrival notification:', e);
    }
  };

  const activeChannel = channels.find((c) => c.id === activeChannelId);

  const favoriteChannels = channels.filter((c) => c.isFavorite);
  const publicChannels = channels.filter((c) => c.type !== 'direct' && !c.isFavorite);
  const directChannels = channels.filter((c) => c.type === 'direct' && !c.isFavorite);

  const filteredTeam = teamMembers.filter((m) =>
    m.name.toLowerCase().includes(dmSearchTerm.toLowerCase()) ||
    m.role.toLowerCase().includes(dmSearchTerm.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-100px)] flex bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden animate-fade-in">
      {/* Coluna Lateral de Canais */}
      <div
        className={`w-full md:w-80 border-r border-gray-200 flex flex-col bg-gray-50/50 shrink-0 ${mobileShowChat ? 'hidden md:flex' : 'flex'}`}
      >
        {/* Header do Menu */}
        <div className="p-4 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-gray-900 text-base flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              Chat da Equipe
            </h2>
            {isAdmin && (
              <button
                onClick={() => setIsNewChannelModalOpen(true)}
                title="Cadastrar Canal (Admin)"
                className="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="mt-2 relative">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar canal ou conversa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-gray-100/80 border border-gray-200 rounded-xl text-xs outline-none focus:bg-white focus:ring-2 focus:ring-primary transition-all"
            />
          </div>
        </div>

        {/* Lista de Canais & DMs */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {/* Seção Favoritos (se houver) */}
          {favoriteChannels.length > 0 && (
            <div>
              <span className="block px-2 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-600 flex items-center gap-1">
                <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                Favoritos
              </span>
              <div className="space-y-0.5">
                {favoriteChannels.map((channel) => (
                  <button
                    key={channel.id}
                    onClick={() => handleSelectChannel(channel.id)}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all cursor-pointer group ${activeChannelId === channel.id ? 'bg-primary text-white shadow-xs' : 'text-gray-700 hover:bg-gray-200/60'}`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-sm shrink-0">{channel.icon || '💬'}</span>
                      <span className="truncate">{channel.name}</span>
                    </div>
                    <Star
                      onClick={(e) => handleToggleFavorite(channel.id, e)}
                      className="w-3.5 h-3.5 fill-amber-400 text-amber-400 opacity-80 hover:opacity-100 shrink-0"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Canais Oficiais da Clínica */}
          <div>
            <div className="flex items-center justify-between px-2 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Canais da Clínica
              </span>
              {isAdmin && (
                <button
                  onClick={() => setIsNewChannelModalOpen(true)}
                  className="text-[11px] font-bold text-primary hover:underline cursor-pointer"
                >
                  Criar Canal
                </button>
              )}
            </div>
            <div className="space-y-0.5">
              {publicChannels
                .filter((c) => c.name.toLowerCase().includes(searchTerm.toLowerCase()))
                .map((channel) => (
                  <button
                    key={channel.id}
                    onClick={() => handleSelectChannel(channel.id)}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all cursor-pointer group ${activeChannelId === channel.id ? 'bg-primary text-white shadow-xs' : 'text-gray-700 hover:bg-gray-200/60'}`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-sm shrink-0">{channel.icon || '📢'}</span>
                      <span className="truncate">{channel.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {isAdmin && (
                        <Pencil
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditChannelModal(channel);
                          }}
                          className={`w-3.5 h-3.5 transition-opacity ${activeChannelId === channel.id ? 'text-white/70 hover:text-white' : 'text-gray-400 opacity-0 group-hover:opacity-100 hover:text-primary'}`}
                          title="Editar Canal"
                        />
                      )}
                      <Star
                        onClick={(e) => handleToggleFavorite(channel.id, e)}
                        className={`w-3.5 h-3.5 shrink-0 transition-opacity ${activeChannelId === channel.id ? 'text-white/60 hover:text-white' : 'text-gray-300 opacity-0 group-hover:opacity-100 hover:text-amber-400'}`}
                      />
                    </div>
                  </button>
                ))}
            </div>
          </div>

          {/* Mensagens Diretas (Apenas conversas ativas + botão Nova Conversa) */}
          <div>
            <div className="flex items-center justify-between px-2 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Mensagens Diretas
              </span>
              <button
                onClick={() => setIsNewDmModalOpen(true)}
                className="text-[11px] font-bold text-primary hover:underline cursor-pointer"
              >
                Nova Conversa
              </button>
            </div>

            {directChannels.length === 0 ? (
              <div className="px-3 py-4 text-center text-gray-400 text-[11px] bg-white rounded-xl border border-dashed border-gray-200">
                <p>Nenhuma conversa direta aberta</p>
                <button
                  onClick={() => setIsNewDmModalOpen(true)}
                  className="mt-1.5 text-primary font-bold hover:underline"
                >
                  Iniciar Conversa
                </button>
              </div>
            ) : (
              <div className="space-y-0.5">
                {directChannels
                  .filter((c) => c.name.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map((dm) => (
                    <button
                      key={dm.id}
                      onClick={() => handleSelectChannel(dm.id)}
                      className={`w-full px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-between transition-all cursor-pointer group ${activeChannelId === dm.id ? 'bg-primary text-white shadow-xs font-bold' : 'text-gray-700 hover:bg-gray-200/60'}`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <div className="relative shrink-0">
                          {dm.otherUser?.avatarUrl ? (
                            <img
                              src={dm.otherUser.avatarUrl}
                              alt={dm.name}
                              className="w-6 h-6 rounded-full object-cover"
                            />
                          ) : (
                            <div
                              className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] ${activeChannelId === dm.id ? 'bg-white text-primary' : 'bg-gray-200 text-gray-700'}`}
                            >
                              {dm.name.charAt(0)}
                            </div>
                          )}
                          <span className="absolute bottom-0 right-0 w-1.5 h-1.5 bg-emerald-500 rounded-full ring-1 ring-white" />
                        </div>
                        <div className="truncate text-left">
                          <p className="truncate leading-tight">{dm.name}</p>
                          <span
                            className={`text-[9px] capitalize block ${activeChannelId === dm.id ? 'text-blue-100' : 'text-gray-400'}`}
                          >
                            {dm.otherUser?.role || 'Colaborador'}
                          </span>
                        </div>
                      </div>
                      <Star
                        onClick={(e) => handleToggleFavorite(dm.id, e)}
                        className={`w-3.5 h-3.5 shrink-0 transition-opacity ${activeChannelId === dm.id ? 'text-white/60 hover:text-white' : 'text-gray-300 opacity-0 group-hover:opacity-100 hover:text-amber-400'}`}
                      />
                    </button>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Coluna Central / Conversa Ativa */}
      <div
        className={`flex-1 flex flex-col bg-white ${!mobileShowChat ? 'hidden md:flex' : 'flex'}`}
      >
        {activeChannel ? (
          <>
            {/* Header da Conversa */}
            <div className="p-3.5 border-b border-gray-200 bg-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setMobileShowChat(false)}
                  className="md:hidden p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{activeChannel.icon || (activeChannel.type === 'direct' ? '👤' : '📢')}</span>
                    <h3 className="font-bold text-sm text-gray-900 leading-tight">
                      {activeChannel.name}
                    </h3>
                    <button
                      onClick={() => handleToggleFavorite(activeChannel.id)}
                      title={activeChannel.isFavorite ? 'Remover dos favoritos' : 'Fixar nos favoritos'}
                      className="p-1 hover:bg-gray-100 rounded-md transition-colors"
                    >
                      <Star
                        className={`w-4 h-4 ${activeChannel.isFavorite ? 'fill-amber-400 text-amber-400' : 'text-gray-300 hover:text-amber-400'}`}
                      />
                    </button>
                    {isAdmin && activeChannel.type !== 'direct' && (
                      <button
                        onClick={() => openEditChannelModal(activeChannel)}
                        title="Editar Canal (Admin)"
                        className="p-1 text-gray-400 hover:text-primary hover:bg-gray-100 rounded-md transition-colors cursor-pointer"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <span className="text-[10px] text-gray-400 block font-medium mt-0.5">
                    {activeChannel.description ||
                      (activeChannel.type === 'direct'
                        ? 'Conversa Direta Privada'
                        : 'Canal Oficial da Clínica')}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Ação Rápida de Chegada de Paciente */}
                {patients.length > 0 && (
                  <select
                    onChange={(e) => {
                      const p = patients.find((pat) => pat.id === e.target.value);
                      if (p) handleQuickPatientArrival(p);
                      e.target.value = '';
                    }}
                    defaultValue=""
                    className="bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-[11px] font-bold rounded-xl px-2.5 py-1.5 outline-none cursor-pointer transition-colors"
                  >
                    <option value="" disabled>
                      Avisar Chegada de Paciente
                    </option>
                    {patients.slice(0, 15).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                )}

                {/* Excluir Conversa / Canal (Admin ou DM) */}
                {(isAdmin || activeChannel.type === 'direct') && (
                  <button
                    onClick={() => setIsDeleteModalOpen(true)}
                    title={activeChannel.type === 'direct' ? 'Excluir conversa para todos' : 'Excluir canal (Admin)'}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Linha do Tempo das Mensagens */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/30">
              {messagesLoading ? (
                <div className="py-12 text-center text-gray-400 text-xs">
                  Carregando mensagens...
                </div>
              ) : messages.length === 0 ? (
                <div className="py-16 text-center text-gray-400 text-xs">
                  Nenhuma mensagem neste canal ainda. Envie a primeira mensagem!
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.senderId === currentUser?.id;

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-baseline gap-1.5 mb-0.5 px-1">
                        <span className="text-[10px] font-bold text-gray-700">
                          {isMe ? 'Você' : msg.senderName}
                        </span>
                        <span className="text-[9px] text-gray-400 font-mono">
                          {new Date(msg.createdAt).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>

                      <div
                        className={`max-w-md px-4 py-2.5 rounded-2xl text-xs leading-relaxed break-words shadow-2xs ${isMe ? 'bg-primary text-white rounded-tr-xs' : 'bg-white text-gray-900 border border-gray-200/80 rounded-tl-xs'}`}
                      >
                        {msg.content}

                        {msg.patientName && (
                          <div
                            className={`mt-2 pt-1.5 border-t text-[10px] font-semibold flex items-center gap-1 ${isMe ? 'border-white/20 text-white/90' : 'border-gray-100 text-primary'}`}
                          >
                            <User className="w-3 h-3" />
                            <span>Paciente: {msg.patientName}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Caixa de Envio */}
            <form
              onSubmit={handleSendMessage}
              className="p-3 border-t border-gray-200 bg-white flex items-center gap-2"
            >
              <input
                type="text"
                placeholder="Escreva sua mensagem... (Pressione Enter para enviar)"
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:bg-white focus:ring-2 focus:ring-primary transition-all text-gray-900"
              />

              <button
                type="submit"
                disabled={!text.trim()}
                className="p-2.5 bg-primary hover:bg-primary-hover disabled:opacity-40 text-white rounded-xl transition-all shadow-xs cursor-pointer shrink-0 active:scale-95"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-6 text-center">
            <MessageSquare className="w-12 h-12 stroke-1 text-gray-300 mb-2" />
            <h4 className="font-bold text-gray-700 text-sm">Selecione uma conversa</h4>
            <p className="text-xs text-gray-400 mt-1 max-w-xs">
              Escolha um canal oficial da clínica ou inicie um chat direto na barra lateral.
            </p>
          </div>
        )}
      </div>

      {/* Modal: Novo Canal (Apenas Admin) */}
      {isNewChannelModalOpen && (
        <div className="fixed inset-0 z-[85] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsNewChannelModalOpen(false)}
          />

          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative z-10 overflow-hidden border border-gray-100 animate-fade-in">
            <div className="p-5 border-b border-gray-100 bg-gray-50/70 flex justify-between items-center">
              <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
                <Hash className="w-5 h-5 text-primary" />
                Criar Novo Canal da Clínica
              </h3>
              <button
                onClick={() => setIsNewChannelModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateChannel} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
                  Ícone do Canal
                </label>
                <div className="flex flex-wrap gap-2 p-2 bg-gray-50 rounded-xl border border-gray-200">
                  {PRESET_ICONS.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setNewChannelIcon(icon)}
                      className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all cursor-pointer ${newChannelIcon === icon ? 'bg-white shadow-md ring-2 ring-primary scale-110' : 'hover:bg-gray-200/60'}`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
                  Nome do Canal *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Pilates & RPG, Recepção, Cirurgia..."
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
                  Finalidade / Descrição (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Discussão clínica de casos e materiais..."
                  value={newChannelDesc}
                  onChange={(e) => setNewChannelDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
                  Unidade Pertencente (Opcional)
                </label>
                <select
                  value={newChannelUnitId}
                  onChange={(e) => setNewChannelUnitId(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                >
                  <option value="">Geral (Visível para todas as unidades)</option>
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsNewChannelModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl text-sm font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creatingChannel}
                  className="px-5 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-primary/30 cursor-pointer disabled:opacity-50"
                >
                  {creatingChannel ? 'Criando...' : 'Criar Canal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Canal (Admin) */}
      {isEditChannelModalOpen && (
        <div className="fixed inset-0 z-[85] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsEditChannelModalOpen(false)}
          />

          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative z-10 overflow-hidden border border-gray-100 animate-fade-in">
            <div className="p-5 border-b border-gray-100 bg-gray-50/70 flex justify-between items-center">
              <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
                <Pencil className="w-5 h-5 text-primary" />
                Editar Canal da Clínica
              </h3>
              <button
                onClick={() => setIsEditChannelModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveChannelEdit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
                  Ícone do Canal
                </label>
                <div className="flex flex-wrap gap-2 p-2 bg-gray-50 rounded-xl border border-gray-200">
                  {PRESET_ICONS.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setEditChannelIcon(icon)}
                      className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all cursor-pointer ${editChannelIcon === icon ? 'bg-white shadow-md ring-2 ring-primary scale-110' : 'hover:bg-gray-200/60'}`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
                  Nome do Canal *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Pilates & RPG, Recepção, Cirurgia..."
                  value={editChannelName}
                  onChange={(e) => setEditChannelName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
                  Finalidade / Descrição (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Discussão clínica de casos e materiais..."
                  value={editChannelDesc}
                  onChange={(e) => setEditChannelDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
                  Unidade Pertencente (Opcional)
                </label>
                <select
                  value={editChannelUnitId}
                  onChange={(e) => setEditChannelUnitId(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                >
                  <option value="">Geral (Visível para todas as unidades)</option>
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsEditChannelModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl text-sm font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingChannelEdit}
                  className="px-5 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-primary/30 cursor-pointer disabled:opacity-50"
                >
                  {savingChannelEdit ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Nova Conversa Direta */}
      {isNewDmModalOpen && (
        <div className="fixed inset-0 z-[85] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsNewDmModalOpen(false)}
          />

          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative z-10 overflow-hidden border border-gray-100 animate-fade-in flex flex-col max-h-[80vh]">
            <div className="p-5 border-b border-gray-100 bg-gray-50/70 flex justify-between items-center">
              <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Nova Conversa Direta
              </h3>
              <button
                onClick={() => setIsNewDmModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-white"
              >
                ✕
              </button>
            </div>

            <div className="p-4 border-b border-gray-100">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Pesquisar por nome ou função..."
                  value={dmSearchTerm}
                  onChange={(e) => setDmSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 divide-y divide-gray-50">
              {filteredTeam.length === 0 ? (
                <div className="py-8 text-center text-gray-400 text-xs">
                  Nenhum colaborador encontrado.
                </div>
              ) : (
                filteredTeam.map((member) => (
                  <button
                    key={member.id}
                    onClick={() => handleStartDirectChat(member)}
                    className="w-full p-3 rounded-xl hover:bg-gray-50 flex items-center justify-between transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      {member.avatarUrl ? (
                        <img
                          src={member.avatarUrl}
                          alt={member.name}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">
                          {member.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <h4 className="font-bold text-xs text-gray-900">{member.name}</h4>
                        <span className="text-[10px] text-gray-400 capitalize">{member.role}</span>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-primary">Conversar</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirmar Exclusão de Canal / Conversa */}
      {isDeleteModalOpen && activeChannel && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsDeleteModalOpen(false)}
          />

          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative z-10 overflow-hidden border border-gray-100 animate-fade-in p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="font-bold text-gray-900 text-base">
                {activeChannel.type === 'direct'
                  ? 'Excluir conversa para todos?'
                  : `Excluir o canal "${activeChannel.name}"?`}
              </h3>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                Esta ação é definitiva. Todo o histórico de mensagens deste canal será apagado
                permanentemente para todos os participantes.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deletingChannel}
                onClick={handleDeleteActiveChannel}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-red-600/30 cursor-pointer disabled:opacity-50"
              >
                {deletingChannel ? 'Excluindo...' : 'Sim, Excluir para Todos'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
