import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, CheckCheck, Trash2, MessageSquare, Calendar, UserCheck, FileText, DollarSign, AlertCircle, X } from 'lucide-react';
import { Notification, NotificationType } from '../../src/types';
import { notificationsApi } from '../../src/services/notifications-api';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

interface NotificationBellProps {
  userId?: string;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ userId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'chat' | 'appointment' | 'system'>('all');
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const prevUnreadRef = useRef<number>(-1);
  const navigate = useNavigate();

  const unreadCount = notifications.filter(n => !n.read).length;

  const playChimeSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08); // A5
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {
      // Audio autoplay policy fallback
    }
  };

  useEffect(() => {
    if (!userId) return;

    loadNotifications();

    // Inscrição em tempo real no Supabase
    const unsubscribe = notificationsApi.subscribe(userId, () => {
      loadNotifications();
    });

    // ⚡ Polling rápido de notificações (3 segundos) para entrega garantida
    const pollInterval = setInterval(() => {
      loadNotifications();
    }, 3000);

    return () => {
      unsubscribe();
      clearInterval(pollInterval);
    };
  }, [userId]);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const loadNotifications = async () => {
    if (!userId) return;
    try {
      const data = await notificationsApi.getMy(userId);
      setNotifications(data);

      const unread = data.filter(n => !n.read).length;
      if (prevUnreadRef.current !== -1 && unread > prevUnreadRef.current) {
        playChimeSound();
      }
      prevUnreadRef.current = unread;
    } catch (e) {
      console.error('Error loading notifications in bell:', e);
    }
  };

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      await notificationsApi.markAsRead(id);
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!userId) return;
    try {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      await notificationsApi.markAllAsRead(userId);
      toast.success('Todas as notificações marcadas como lidas');
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      setNotifications(prev => prev.filter(n => n.id !== id));
      await notificationsApi.delete(id);
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const handleClearAll = async () => {
    if (!userId) return;
    try {
      setNotifications([]);
      await notificationsApi.clearAll(userId);
      toast.success('Notificações limpas com sucesso');
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      await handleMarkAsRead(notification.id);
    }
    setIsOpen(false);

    if (notification.linkUrl) {
      navigate(notification.linkUrl);
    }
  };

  const getIcon = (type?: NotificationType) => {
    switch (type) {
      case 'chat':
        return <MessageSquare className="w-4 h-4 text-blue-500" />;
      case 'appointment':
      case 'session':
        return <Calendar className="w-4 h-4 text-emerald-500" />;
      case 'patient_arrival':
        return <UserCheck className="w-4 h-4 text-teal-500" />;
      case 'room_reservation':
        return <Calendar className="w-4 h-4 text-indigo-500" />;
      case 'contract':
        return <FileText className="w-4 h-4 text-purple-500" />;
      case 'financial':
        return <DollarSign className="w-4 h-4 text-amber-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (filterType === 'all') return true;
    if (filterType === 'chat') return n.type === 'chat';
    if (filterType === 'appointment') return n.type === 'appointment' || n.type === 'patient_arrival' || n.type === 'room_reservation';
    if (filterType === 'system') return n.type === 'system' || n.type === 'contract' || n.type === 'financial';
    return true;
  });

  return (
    <div className="relative shrink-0" ref={dropdownRef}>
      {/* Botão Sininho */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title="Central de Notificações"
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all cursor-pointer active:scale-95 focus:outline-none"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full ring-2 ring-white animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown de Notificações */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200/80 z-[70] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="p-3.5 border-b border-gray-100 bg-gray-50/70 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-gray-900">Notificações</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full">
                  {unreadCount} nova{unreadCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllAsRead}
                  title="Marcar todas como lidas"
                  className="p-1 text-gray-400 hover:text-blue-600 hover:bg-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <CheckCheck className="w-4 h-4" />
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  title="Limpar todas as notificações"
                  className="p-1 text-gray-400 hover:text-red-600 hover:bg-white rounded-lg text-xs transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Filtros em Abas */}
          <div className="flex border-b border-gray-100 px-3 pt-2 gap-1 bg-white text-xs">
            <button
              onClick={() => setFilterType('all')}
              className={`pb-2 px-2.5 font-bold transition-all border-b-2 ${filterType === 'all' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
            >
              Todas
            </button>
            <button
              onClick={() => setFilterType('chat')}
              className={`pb-2 px-2.5 font-bold transition-all border-b-2 ${filterType === 'chat' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
            >
              Chat
            </button>
            <button
              onClick={() => setFilterType('appointment')}
              className={`pb-2 px-2.5 font-bold transition-all border-b-2 ${filterType === 'appointment' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
            >
              Agenda
            </button>
            <button
              onClick={() => setFilterType('system')}
              className={`pb-2 px-2.5 font-bold transition-all border-b-2 ${filterType === 'system' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
            >
              Sistema
            </button>
          </div>

          {/* Lista de Notificações */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-gray-50">
            {filteredNotifications.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-gray-400">
                <Bell className="w-8 h-8 stroke-1 text-gray-300" />
                <p className="text-xs font-medium">Nenhuma notificação por aqui</p>
              </div>
            ) : (
              filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-3.5 flex items-start gap-3 hover:bg-gray-50/80 transition-colors cursor-pointer relative group ${!notification.read ? 'bg-blue-50/30' : ''}`}
                >
                  {/* Ícone */}
                  <div className="p-2 bg-gray-100 rounded-xl shrink-0 mt-0.5">
                    {getIcon(notification.type)}
                  </div>

                  {/* Conteúdo */}
                  <div className="flex-1 min-w-0 pr-6">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <p className={`text-xs truncate ${!notification.read ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                        {notification.title}
                      </p>
                      {!notification.read && (
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-gray-600 line-clamp-2 leading-relaxed">
                      {notification.message}
                    </p>
                    <span className="block text-[9px] text-gray-400 mt-1 font-mono">
                      {new Date(notification.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} • {new Date(notification.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                    </span>
                  </div>

                  {/* Ações de Hover */}
                  <div className="absolute right-2 top-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    {!notification.read && (
                      <button
                        type="button"
                        onClick={(e) => handleMarkAsRead(notification.id, e)}
                        title="Marcar como lida"
                        className="p-1 hover:bg-gray-200 rounded-md text-gray-500 hover:text-emerald-600 transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => handleDelete(notification.id, e)}
                      title="Excluir notificação"
                      className="p-1 hover:bg-gray-200 rounded-md text-gray-500 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
