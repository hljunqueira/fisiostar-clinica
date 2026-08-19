import { supabase } from '../lib/supabase';
import { Room, RoomReservation } from '../types';

export const roomsApi = {
  // --- Salas ---
  async getAll(unitId?: string): Promise<Room[]> {
    let query = supabase
      .from('rooms')
      .select('*')
      .order('name', { ascending: true });

    if (unitId && unitId !== 'ALL') {
      query = query.eq('unit_id', unitId);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching rooms:', error);
      throw error;
    }

    return (data || []).map(r => ({
      id: r.id,
      unitId: r.unit_id,
      name: r.name,
      description: r.description || '',
      capacity: r.capacity || 1,
      color: r.color || '#3b82f6',
      active: r.active !== false,
      createdAt: r.created_at
    }));
  },

  async createRoom(room: Omit<Room, 'id'>): Promise<Room> {
    const { data, error } = await supabase
      .from('rooms')
      .insert({
        unit_id: room.unitId,
        name: room.name,
        description: room.description || null,
        capacity: room.capacity || 1,
        color: room.color || '#3b82f6',
        active: room.active !== false
      })
      .select('*')
      .limit(1);

    if (error) {
      console.error('Error creating room:', error);
      throw error;
    }

    const r = data[0];
    return {
      id: r.id,
      unitId: r.unit_id,
      name: r.name,
      description: r.description || '',
      capacity: r.capacity || 1,
      color: r.color || '#3b82f6',
      active: r.active !== false,
      createdAt: r.created_at
    };
  },

  async updateRoom(id: string, updates: Partial<Room>): Promise<void> {
    const payload: any = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.description !== undefined) payload.description = updates.description;
    if (updates.capacity !== undefined) payload.capacity = updates.capacity;
    if (updates.color !== undefined) payload.color = updates.color;
    if (updates.active !== undefined) payload.active = updates.active;
    if (updates.unitId !== undefined) payload.unit_id = updates.unitId;

    const { error } = await supabase
      .from('rooms')
      .update(payload)
      .eq('id', id);

    if (error) {
      console.error('Error updating room:', error);
      throw error;
    }
  },

  async deleteRoom(id: string): Promise<void> {
    const { error } = await supabase
      .from('rooms')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting room:', error);
      throw error;
    }
  },

  // --- Reservas de Salas ---
  async getReservations(date: string, unitId?: string): Promise<RoomReservation[]> {
    let query = supabase
      .from('room_reservations')
      .select(`
        *,
        rooms (name),
        professionals (name),
        units (name)
      `)
      .eq('date', date)
      .eq('status', 'confirmed')
      .order('start_time', { ascending: true });

    if (unitId && unitId !== 'ALL') {
      query = query.eq('unit_id', unitId);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching room reservations:', error);
      throw error;
    }

    return (data || []).map(r => ({
      id: r.id,
      roomId: r.room_id,
      unitId: r.unit_id,
      professionalId: r.professional_id,
      date: r.date,
      startTime: (r.start_time || '').substring(0, 5),
      endTime: (r.end_time || '').substring(0, 5),
      purpose: r.purpose || '',
      status: r.status || 'confirmed',
      createdAt: r.created_at,
      roomName: r.rooms?.name || 'Sala',
      professionalName: r.professionals?.name || 'Profissional',
      unitName: r.units?.name || 'Unidade'
    }));
  },

  async createReservation(res: Omit<RoomReservation, 'id'>): Promise<RoomReservation> {
    // 1. Verificação de conflito de horário (Double-booking check)
    const { data: conflicts, error: checkError } = await supabase
      .from('room_reservations')
      .select('id, start_time, end_time')
      .eq('room_id', res.roomId)
      .eq('date', res.date)
      .eq('status', 'confirmed');

    if (checkError) {
      console.error('Error checking room conflicts:', checkError);
      throw checkError;
    }

    const newStart = res.startTime;
    const newEnd = res.endTime;

    const hasConflict = (conflicts || []).some(c => {
      const cStart = (c.start_time || '').substring(0, 5);
      const cEnd = (c.end_time || '').substring(0, 5);
      return newStart < cEnd && newEnd > cStart;
    });

    if (hasConflict) {
      throw new Error('Esta sala já está reservada no horário selecionado. Por favor, escolha outro horário ou sala.');
    }

    // 2. Inserção no banco
    const { data, error } = await supabase
      .from('room_reservations')
      .insert({
        room_id: res.roomId,
        unit_id: res.unitId,
        professional_id: res.professionalId,
        date: res.date,
        start_time: res.startTime,
        end_time: res.endTime,
        purpose: res.purpose || null,
        status: 'confirmed'
      })
      .select(`
        *,
        rooms (name),
        professionals (name),
        units (name)
      `)
      .limit(1);

    if (error) {
      console.error('Error creating room reservation:', error);
      throw error;
    }

    const r = data[0];
    return {
      id: r.id,
      roomId: r.room_id,
      unitId: r.unit_id,
      professionalId: r.professional_id,
      date: r.date,
      startTime: (r.start_time || '').substring(0, 5),
      endTime: (r.end_time || '').substring(0, 5),
      purpose: r.purpose || '',
      status: r.status || 'confirmed',
      createdAt: r.created_at,
      roomName: r.rooms?.name || 'Sala',
      professionalName: r.professionals?.name || 'Profissional',
      unitName: r.units?.name || 'Unidade'
    };
  },

  async cancelReservation(id: string): Promise<void> {
    const { error } = await supabase
      .from('room_reservations')
      .update({ status: 'canceled' })
      .eq('id', id);

    if (error) {
      console.error('Error canceling room reservation:', error);
      throw error;
    }
  }
};
