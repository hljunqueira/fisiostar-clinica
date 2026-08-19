import { supabase } from '../lib/supabase';
import { Notification, NotificationType } from '../types';

export const notificationsApi = {
  async getMy(userId: string): Promise<Notification[]> {
    if (!userId) return [];

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(40);

    if (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }

    return (data || []).map(n => ({
      id: n.id,
      userId: n.user_id,
      title: n.title,
      message: n.message,
      type: n.type as NotificationType,
      linkUrl: n.link_url || undefined,
      read: !!n.read,
      readAt: n.read_at || undefined,
      createdAt: n.created_at
    }));
  },

  async markAsRead(id: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({
        read: true,
        read_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  },

  async markAllAsRead(userId: string): Promise<void> {
    if (!userId) return;

    const { error } = await supabase
      .from('notifications')
      .update({
        read: true,
        read_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  },

  async clearAll(userId: string): Promise<void> {
    if (!userId) return;

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('Error clearing all notifications:', error);
      throw error;
    }
  },

  async create(notification: {
    userId: string;
    title: string;
    message: string;
    type: NotificationType;
    linkUrl?: string;
  }): Promise<Notification> {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: notification.userId,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        link_url: notification.linkUrl || null,
        read: false
      })
      .select('*')
      .limit(1);

    if (error) {
      console.error('Error creating notification:', error);
      throw error;
    }

    const n = data[0];
    return {
      id: n.id,
      userId: n.user_id,
      title: n.title,
      message: n.message,
      type: n.type as NotificationType,
      linkUrl: n.link_url || undefined,
      read: false,
      createdAt: n.created_at
    };
  },

  subscribe(userId: string, onChange: () => void): () => void {
    if (!userId) return () => {};

    let sub: any = null;
    try {
      const channelName = `user_notif_${userId}_${Date.now()}`;
      sub = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`
          },
          () => {
            onChange();
          }
        )
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            // Realtime WebSocket offline, o polling fallback manterá a sincronização ativa
          }
        });
    } catch (e) {
      console.warn('Realtime subscription not available, using interval polling.');
    }

    // Polling fallback a cada 10 segundos
    const interval = setInterval(() => {
      onChange();
    }, 10000);

    return () => {
      if (sub) {
        try {
          supabase.removeChannel(sub);
        } catch (_) {}
      }
      clearInterval(interval);
    };
  }
};
