import { supabase } from '../lib/supabase';
import { ChatChannel, ChatMessage, SystemUser } from '../types';

export const chatApi = {
  // --- Listar canais do usuário ---
  async getChannels(userId: string, unitId?: string): Promise<ChatChannel[]> {
    try {
      // 1. Buscar canais públicos (gerais, unidade, função)
      let publicQuery = supabase
        .from('chat_channels')
        .select('*')
        .in('type', ['general', 'unit', 'role'])
        .order('name', { ascending: true });

      if (unitId && unitId !== 'ALL') {
        publicQuery = publicQuery.or(`unit_id.is.null,unit_id.eq.${unitId}`);
      }

      const { data: publicChannels, error: pubError } = await publicQuery;
      if (pubError) throw pubError;

      // 2. Buscar favoritos do usuário
      const { data: favorites } = await supabase
        .from('chat_favorites')
        .select('channel_id')
        .eq('user_id', userId);

      const favSet = new Set((favorites || []).map(f => f.channel_id));

      // 3. Buscar canais diretos (DMs) onde o usuário é participante
      const { data: myParticipations, error: partError } = await supabase
        .from('chat_participants')
        .select('channel_id')
        .eq('user_id', userId);

      if (partError) throw partError;

      const dmChannelIds = (myParticipations || []).map(p => p.channel_id);

      let dmChannels: any[] = [];
      if (dmChannelIds.length > 0) {
        const { data: dms, error: dmError } = await supabase
          .from('chat_channels')
          .select(`
            *,
            chat_participants (
              user_id,
              system_users (
                id,
                name,
                email,
                role,
                avatar_url
              )
            )
          `)
          .in('id', dmChannelIds)
          .eq('type', 'direct');

        if (!dmError && dms) {
          dmChannels = dms;
        }
      }

      // 4. Mesclar canais e remover qualquer duplicado por id
      const rawChannelsMap = new Map<string, any>();
      (publicChannels || []).forEach(c => rawChannelsMap.set(c.id, c));
      dmChannels.forEach(c => rawChannelsMap.set(c.id, c));

      const allRawChannels = Array.from(rawChannelsMap.values());

      // 5. Formatar canais
      const formatted: ChatChannel[] = allRawChannels.map(c => {
        let otherUser: SystemUser | undefined = undefined;
        let channelName = c.name;

        if (c.type === 'direct' && c.chat_participants) {
          const otherPart = c.chat_participants.find((p: any) => p.user_id !== userId);
          if (otherPart && otherPart.system_users) {
            const u = otherPart.system_users;
            otherUser = {
              id: u.id,
              name: u.name,
              email: u.email,
              role: u.role,
              avatarUrl: u.avatar_url
            };
            channelName = u.name;
          }
        }

        return {
          id: c.id,
          name: channelName,
          type: c.type,
          icon: c.icon || (c.type === 'direct' ? '👤' : c.type === 'unit' ? '🏢' : '📢'),
          description: c.description || undefined,
          unitId: c.unit_id,
          createdBy: c.created_by,
          createdAt: c.created_at,
          updatedAt: c.updated_at,
          otherUser,
          isFavorite: favSet.has(c.id)
        };
      });

      return formatted;
    } catch (error) {
      console.error('Error fetching chat channels:', error);
      return [];
    }
  },

  // --- Criar Canal Oficial (Admin) ---
  async createChannel(channel: {
    name: string;
    type: 'general' | 'unit' | 'role';
    icon?: string;
    description?: string;
    unitId?: string;
    createdBy?: string;
  }): Promise<ChatChannel> {
    const insertPayload: any = {
      name: channel.name.trim(),
      type: channel.type,
      icon: channel.icon || '📢',
      description: channel.description?.trim() || null,
      unit_id: channel.unitId || null
    };

    const { data, error } = await supabase
      .from('chat_channels')
      .insert(insertPayload)
      .select('*')
      .limit(1);

    if (error || !data || data.length === 0) {
      console.error('Error creating channel:', error);
      throw error || new Error('Erro ao criar canal');
    }

    const c = data[0];
    return {
      id: c.id,
      name: c.name,
      type: c.type,
      icon: c.icon || '📢',
      description: c.description || undefined,
      unitId: c.unit_id,
      createdBy: c.created_by,
      createdAt: c.created_at,
      updatedAt: c.updated_at
    };
  },

  // --- Atualizar Canal (Admin) ---
  async updateChannel(channelId: string, updates: {
    name: string;
    icon?: string;
    description?: string;
    unitId?: string;
  }): Promise<void> {
    const { error } = await supabase
      .from('chat_channels')
      .update({
        name: updates.name.trim(),
        icon: updates.icon || '📢',
        description: updates.description?.trim() || null,
        unit_id: updates.unitId || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', channelId);

    if (error) {
      console.error('Error updating channel:', error);
      throw error;
    }
  },

  // --- Excluir Canal ou Conversa para Todos (Admin / Participante) ---
  async deleteChannel(channelId: string): Promise<void> {
    const { error } = await supabase
      .from('chat_channels')
      .delete()
      .eq('id', channelId);

    if (error) {
      console.error('Error deleting channel:', error);
      throw error;
    }
  },

  // --- Alternar Favorito (Fixar / Desafixar) ---
  async toggleFavorite(userId: string, channelId: string): Promise<boolean> {
    try {
      const { data: existing } = await supabase
        .from('chat_favorites')
        .select('id')
        .eq('user_id', userId)
        .eq('channel_id', channelId)
        .limit(1);

      if (existing && existing.length > 0) {
        await supabase
          .from('chat_favorites')
          .delete()
          .eq('user_id', userId)
          .eq('channel_id', channelId);
        return false;
      } else {
        await supabase
          .from('chat_favorites')
          .insert({
            user_id: userId,
            channel_id: channelId
          });
        return true;
      }
    } catch (e) {
      console.error('Error toggling favorite:', e);
      return false;
    }
  },

  // --- Garantir canais padrão sem duplicados ---
  async ensureDefaultChannels(units: { id: string; name: string }[]): Promise<void> {
    try {
      const { data: existing } = await supabase
        .from('chat_channels')
        .select('id, type, name, unit_id');

      const hasGeneral = existing?.some(c => c.type === 'general');
      if (!hasGeneral) {
        await supabase.from('chat_channels').insert({
          name: 'Geral FisioStar',
          type: 'general',
          icon: '📢',
          description: 'Canal oficial para avisos e comunicação de toda a clínica'
        });
      }

      for (const u of units) {
        if (u.id === 'ALL') continue;
        const hasUnitChannel = existing?.some(c => c.type === 'unit' && c.unit_id === u.id);
        if (!hasUnitChannel) {
          await supabase.from('chat_channels').insert({
            name: `${u.name}`,
            type: 'unit',
            unit_id: u.id,
            icon: '🏢',
            description: `Canal exclusivo da unidade ${u.name}`
          });
        }
      }
    } catch (e) {
      console.error('Error ensuring default channels:', e);
    }
  },

  // --- Criar ou Obter Canal Direto (1 a 1) ---
  async getOrCreateDirectChannel(currentUserId: string, targetUserId: string, targetUserName: string): Promise<string> {
    try {
      // 1. Procurar se já existe um canal com ambos os participantes
      const { data: myChannels } = await supabase
        .from('chat_participants')
        .select('channel_id')
        .eq('user_id', currentUserId);

      const myIds = (myChannels || []).map(c => c.channel_id);

      if (myIds.length > 0) {
        const { data: targetChannels } = await supabase
          .from('chat_participants')
          .select('channel_id')
          .eq('user_id', targetUserId)
          .in('channel_id', myIds);

        if (targetChannels && targetChannels.length > 0) {
          const { data: directChannel } = await supabase
            .from('chat_channels')
            .select('id')
            .eq('id', targetChannels[0].channel_id)
            .eq('type', 'direct')
            .limit(1);

          if (directChannel && directChannel.length > 0) {
            return directChannel[0].id;
          }
        }
      }

      // 2. Se não existir, criar novo canal direto
      const { data: newChan, error: chanErr } = await supabase
        .from('chat_channels')
        .insert({
          name: targetUserName,
          type: 'direct',
          icon: '👤'
        })
        .select('id')
        .limit(1);

      if (chanErr || !newChan || newChan.length === 0) {
        console.error('Error creating direct channel record:', chanErr);
        throw chanErr || new Error('Erro ao criar registro de canal direto');
      }

      const channelId = newChan[0].id;

      // Inserir os 2 participantes
      try {
        await supabase.from('chat_participants').insert([
          { channel_id: channelId, user_id: currentUserId },
          { channel_id: channelId, user_id: targetUserId }
        ]);
      } catch (pErr) {
        console.warn('Warning inserting participants:', pErr);
      }

      return channelId;
    } catch (error) {
      console.error('Error getting/creating direct channel:', error);
      throw error;
    }
  },

  // --- Buscar mensagens de um canal ---
  async getMessages(channelId: string): Promise<ChatMessage[]> {
    if (!channelId) return [];

    const { data, error } = await supabase
      .from('chat_messages')
      .select(`
        *,
        patients (name)
      `)
      .eq('channel_id', channelId)
      .order('created_at', { ascending: true })
      .limit(100);

    if (error) {
      console.error('Error fetching messages:', error);
      return [];
    }

    return (data || []).map(m => ({
      id: m.id,
      channelId: m.channel_id,
      senderId: m.sender_id,
      senderName: m.sender_name,
      senderRole: m.sender_role,
      content: m.content,
      patientId: m.patient_id || undefined,
      attachmentUrl: m.attachment_url || undefined,
      createdAt: m.created_at,
      patientName: m.patients?.name || undefined
    }));
  },

  // --- Enviar mensagem ---
  async sendMessage(msg: {
    channelId: string;
    senderId: string;
    senderName: string;
    senderRole: string;
    content: string;
    patientId?: string;
    attachmentUrl?: string;
  }): Promise<ChatMessage> {
    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        channel_id: msg.channelId,
        sender_id: msg.senderId,
        sender_name: msg.senderName,
        sender_role: msg.senderRole,
        content: msg.content.trim(),
        patient_id: msg.patientId || null,
        attachment_url: msg.attachmentUrl || null
      })
      .select(`
        *,
        patients (name)
      `)
      .limit(1);

    if (error) {
      console.error('Error sending message:', error);
      throw error;
    }

    // Atualizar updated_at do canal
    await supabase
      .from('chat_channels')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', msg.channelId);

    // Disparar notificações para os participantes/destinatários
    try {
      const { data: channelInfo } = await supabase
        .from('chat_channels')
        .select('id, name, type, unit_id')
        .eq('id', msg.channelId)
        .single();

      if (channelInfo) {
        if (channelInfo.type === 'direct') {
          // Conversa direta: notificar o outro participante
          let targetUserIds: string[] = [];
          const { data: participants } = await supabase
            .from('chat_participants')
            .select('user_id')
            .eq('channel_id', msg.channelId)
            .neq('user_id', msg.senderId);

          if (participants && participants.length > 0) {
            targetUserIds = participants.map((p) => p.user_id);
          } else {
            // Fallback: procurar pelo nome do canal caso chat tenha sido criado antes
            const { data: matchedUser } = await supabase
              .from('system_users')
              .select('id')
              .ilike('name', `%${channelInfo.name}%`)
              .neq('id', msg.senderId)
              .limit(1);

            if (matchedUser && matchedUser.length > 0) {
              targetUserIds = [matchedUser[0].id];
              // Registra os participantes para próximas mensagens
              try {
                await supabase.from('chat_participants').insert([
                  { channel_id: msg.channelId, user_id: msg.senderId },
                  { channel_id: msg.channelId, user_id: matchedUser[0].id }
                ]);
              } catch (_) {}
            }
          }

          if (targetUserIds.length > 0) {
            const notifs = targetUserIds.map((uId) => ({
              user_id: uId,
              title: `Nova mensagem de ${msg.senderName}`,
              message: msg.content.length > 90 ? `${msg.content.substring(0, 87)}...` : msg.content,
              type: 'chat',
              link_url: `/chat?channel=${msg.channelId}`,
              read: false
            }));
            await supabase.from('notifications').insert(notifs);
          }
        } else {
          // Canal público / Unidade: notificar outros usuários da clínica
          const { data: targetUsers } = await supabase
            .from('system_users')
            .select('id')
            .neq('id', msg.senderId);

          if (targetUsers && targetUsers.length > 0) {
            const notifs = targetUsers.map((u) => ({
              user_id: u.id,
              title: `Nova mensagem em #${channelInfo.name}`,
              message: `${msg.senderName}: ${msg.content.length > 80 ? `${msg.content.substring(0, 77)}...` : msg.content}`,
              type: 'chat',
              link_url: `/chat?channel=${msg.channelId}`,
              read: false
            }));
            await supabase.from('notifications').insert(notifs);
          }
        }
      }
    } catch (notifErr) {
      console.warn('Could not dispatch chat notification:', notifErr);
    }

    const m = data[0];
    return {
      id: m.id,
      channelId: m.channel_id,
      senderId: m.sender_id,
      senderName: m.sender_name,
      senderRole: m.sender_role,
      content: m.content,
      patientId: m.patient_id || undefined,
      attachmentUrl: m.attachment_url || undefined,
      createdAt: m.created_at,
      patientName: m.patients?.name || undefined
    };
  },

  // --- Inscrição Realtime em Mensagens de um Canal ---
  subscribeToChannel(channelId: string, onNewMessage: (msg: ChatMessage) => void): () => void {
    if (!channelId) return () => {};

    let sub: any = null;
    try {
      const channelName = `chat_chan_${channelId}_${Date.now()}`;
      sub = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages',
            filter: `channel_id=eq.${channelId}`
          },
          (payload) => {
            const m = payload.new as any;
            onNewMessage({
              id: m.id,
              channelId: m.channel_id,
              senderId: m.sender_id,
              senderName: m.sender_name,
              senderRole: m.sender_role,
              content: m.content,
              patientId: m.patient_id || undefined,
              attachmentUrl: m.attachment_url || undefined,
              createdAt: m.created_at
            });
          }
        )
        .subscribe();
    } catch (e) {
      console.warn('Realtime chat subscription not available, using interval polling.');
    }

    // Polling fallback a cada 4 segundos
    let lastPolled = new Date().toISOString();
    const interval = setInterval(async () => {
      try {
        const { data } = await supabase
          .from('chat_messages')
          .select(`*, patients (name)`)
          .eq('channel_id', channelId)
          .gt('created_at', lastPolled)
          .order('created_at', { ascending: true });

        if (data && data.length > 0) {
          lastPolled = data[data.length - 1].created_at;
          data.forEach(m => {
            onNewMessage({
              id: m.id,
              channelId: m.channel_id,
              senderId: m.sender_id,
              senderName: m.sender_name,
              senderRole: m.sender_role,
              content: m.content,
              patientId: m.patient_id || undefined,
              attachmentUrl: m.attachment_url || undefined,
              createdAt: m.created_at,
              patientName: m.patients?.name || undefined
            });
          });
        }
      } catch (_) {}
    }, 4000);

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
