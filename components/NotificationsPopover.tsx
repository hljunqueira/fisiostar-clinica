import React, { useState } from 'react';
import { Bell, Check, Trash2, X } from 'lucide-react';
import { Notification } from '../types';

interface NotificationsPopoverProps {
    notifications: Notification[];
    onMarkAsRead: (id: string) => void;
    onClearAll: () => void;
}

export const NotificationsPopover: React.FC<NotificationsPopoverProps> = ({ notifications, onMarkAsRead, onClearAll }) => {
    const [isOpen, setIsOpen] = useState(false);
    const unreadCount = notifications.filter(n => !n.read).length;

    const toggleOpen = () => setIsOpen(!isOpen);

    return (
        <div className="relative">
            <button
                onClick={toggleOpen}
                className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                title="Notificações"
            >
                <Bell className="w-6 h-6" />
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse" />
                )}
            </button>

            {/* Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-30"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Popover */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 md:w-96 bg-white rounded-xl shadow-xl border border-gray-100 z-40 transform origin-top-right animate-fade-in divide-y divide-gray-100">
                    <div className="p-4 flex items-center justify-between bg-gray-50 rounded-t-xl">
                        <h3 className="font-bold text-gray-900">Notificações</h3>
                        <div className="flex gap-2">
                            {notifications.length > 0 && (
                                <button
                                    onClick={onClearAll}
                                    className="text-xs text-gray-500 hover:text-red-600 transition-colors"
                                    title="Limpar todas"
                                >
                                    Limpar
                                </button>
                            )}
                            <button onClick={() => setIsOpen(false)}>
                                <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                            </button>
                        </div>
                    </div>

                    <div className="max-h-[300px] overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-gray-400">
                                <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                <p className="text-sm">Nenhuma notificação nova</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-50">
                                {notifications.map(notification => (
                                    <div
                                        key={notification.id}
                                        className={`p-4 hover:bg-gray-50 transition-colors relative group ${notification.read ? 'opacity-60' : 'bg-blue-50/30'}`}
                                    >
                                        <div className="flex gap-3">
                                            <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${notification.type === 'warning' ? 'bg-orange-400' :
                                                    notification.type === 'success' ? 'bg-green-400' :
                                                        notification.type === 'info' ? 'bg-blue-400' :
                                                            'bg-gray-400'
                                                }`} />
                                            <div className="flex-1">
                                                <h4 className={`text-sm font-medium ${notification.read ? 'text-gray-700' : 'text-gray-900'}`}>
                                                    {notification.title}
                                                </h4>
                                                <p className="text-xs text-gray-500 mt-1">{notification.message}</p>
                                                <p className="text-[10px] text-gray-400 mt-2">
                                                    {new Date(notification.createdAt).toLocaleDateString('pt-BR')} às {new Date(notification.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                            {!notification.read && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onMarkAsRead(notification.id);
                                                    }}
                                                    className="absolute top-4 right-4 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-blue-50 rounded"
                                                    title="Marcar como lida"
                                                >
                                                    <Check className="w-3 h-3" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
