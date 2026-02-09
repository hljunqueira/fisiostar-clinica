import { supabase } from '../lib/supabase';
import type {
    Unit, Professional, Patient, Session, Specialty,
    PlanTemplate, Announcement, SystemUser, SessionStatus,
    DaySchedule, Holiday, PermissionKey
} from '../types';

export interface SystemNotification {
    id: string;
    userId: string;
    title: string;
    message: string;
    read: boolean;
    type: 'info' | 'warning' | 'success' | 'error';
    createdAt: string;
}

// =====================================================
// --- Notifications API ---
export const notificationsApi = {
    async getMy(userId: string): Promise<SystemNotification[]> {
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) throw error;
        return data.map(n => ({
            id: n.id,
            userId: n.user_id,
            title: n.title,
            message: n.message,
            read: n.read,
            type: n.type,
            createdAt: n.created_at
        }));
    },

    async markAsRead(id: string) {
        const { error } = await supabase
            .from('notifications')
            .update({ read: true })
            .eq('id', id);

        if (error) throw error;
    },

    async clearAll(userId: string) {
        // Option 1: Delete all
        // const { error } = await supabase.from('notifications').delete().eq('user_id', userId);

        // Option 2: Mark all as read (safer)
        const { error } = await supabase
            .from('notifications')
            .update({ read: true })
            .eq('user_id', userId);

        if (error) throw error;
    }
};

// --- Storage API ---
// =====================================================

// =====================================================
// UNITS API
// =====================================================

export const unitsApi = {
    async getAll(): Promise<Unit[]> {
        const { data: units, error } = await supabase
            .from('units')
            .select('*, unit_operating_hours(*), unit_holidays(*)');

        if (error) throw error;

        return units.map(unit => ({
            id: unit.id,
            name: unit.name,
            city: unit.city,
            specialties: [], // TODO: Add unit_specialties table if needed
            hasPool: unit.has_pool,
            isActive: unit.is_active,
            operatingHours: unit.unit_operating_hours?.map((oh: any) => ({
                day: oh.day,
                isOpen: oh.is_open,
                start: oh.start_time,
                end: oh.end_time
            })) || [],
            holidays: unit.unit_holidays?.map((h: any) => ({
                id: h.id,
                date: h.date,
                name: h.name
            })) || []
        }));
    },

    async create(unit: Omit<Unit, 'id'>): Promise<Unit> {
        const { data, error } = await supabase
            .from('units')
            .insert({
                name: unit.name,
                city: unit.city,
                has_pool: unit.hasPool,
                is_active: unit.isActive
            })
            .select()
            .single();

        if (error) throw error;

        // Insert operating hours if provided
        if (unit.operatingHours && unit.operatingHours.length > 0) {
            await supabase.from('unit_operating_hours').insert(
                unit.operatingHours.map(oh => ({
                    unit_id: data.id,
                    day: oh.day,
                    is_open: oh.isOpen,
                    start_time: oh.start,
                    end_time: oh.end
                }))
            );
        }

        return this.getById(data.id);
    },

    async getById(id: string): Promise<Unit> {
        const units = await this.getAll();
        const unit = units.find(u => u.id === id);
        if (!unit) throw new Error('Unit not found');
        return unit;
    },

    async update(id: string, updates: Partial<Unit>): Promise<Unit> {
        const { error } = await supabase
            .from('units')
            .update({
                name: updates.name,
                city: updates.city,
                has_pool: updates.hasPool,
                is_active: updates.isActive
            })
            .eq('id', id);

        if (error) throw error;

        // Update operating hours: delete old and insert new
        if (updates.operatingHours) {
            // Delete existing operating hours
            await supabase
                .from('unit_operating_hours')
                .delete()
                .eq('unit_id', id);

            // Insert new operating hours
            if (updates.operatingHours.length > 0) {
                const { error: ohError } = await supabase
                    .from('unit_operating_hours')
                    .insert(
                        updates.operatingHours.map(oh => ({
                            unit_id: id,
                            day: oh.day,
                            is_open: oh.isOpen,
                            start_time: oh.start,
                            end_time: oh.end
                        }))
                    );
                if (ohError) console.error('Error updating operating hours:', ohError);
            }
        }

        // Update holidays: delete old and insert new
        if (updates.holidays) {
            // Delete existing holidays
            await supabase
                .from('unit_holidays')
                .delete()
                .eq('unit_id', id);

            // Insert new holidays
            if (updates.holidays.length > 0) {
                const { error: hError } = await supabase
                    .from('unit_holidays')
                    .insert(
                        updates.holidays.map(h => ({
                            unit_id: id,
                            date: h.date,
                            name: h.name
                        }))
                    );
                if (hError) console.error('Error updating holidays:', hError);
            }
        }

        return this.getById(id);
    }
};

// =====================================================
// PROFESSIONALS API
// =====================================================

export const professionalsApi = {
    async getAll(): Promise<Professional[]> {
        const { data: professionals, error } = await supabase
            .from('professionals')
            .select('*, professional_units(unit_id)');

        if (error) throw error;

        return professionals.map(prof => ({
            id: prof.id,
            name: prof.name,
            crf: prof.crf,
            specialty: prof.specialty,
            hourlyRate: prof.hourly_rate,
            unitIds: prof.professional_units?.map((pu: any) => pu.unit_id) || [],
            color: prof.color,
            avatarUrl: prof.avatar_url
        }));
    },

    async create(professional: Omit<Professional, 'id'>): Promise<Professional> {
        const { data, error } = await supabase
            .from('professionals')
            .insert({
                name: professional.name,
                crf: professional.crf,
                specialty: professional.specialty,
                hourly_rate: professional.hourlyRate,
                color: professional.color,
                avatar_url: professional.avatarUrl
            })
            .select()
            .single();

        if (error) throw error;

        // Link to units
        if (professional.unitIds && professional.unitIds.length > 0) {
            await supabase.from('professional_units').insert(
                professional.unitIds.map(unitId => ({
                    professional_id: data.id,
                    unit_id: unitId
                }))
            );
        }

        return this.getById(data.id);
    },

    async getById(id: string): Promise<Professional> {
        const professionals = await this.getAll();
        const professional = professionals.find(p => p.id === id);
        if (!professional) throw new Error('Professional not found');
        return professional;
    },

    async update(id: string, updates: Partial<Professional>): Promise<Professional> {
        const { error } = await supabase
            .from('professionals')
            .update({
                name: updates.name,
                crf: updates.crf,
                specialty: updates.specialty,
                hourly_rate: updates.hourlyRate,
                color: updates.color,
                avatar_url: updates.avatarUrl
            })
            .eq('id', id);

        if (error) throw error;

        // Update unit associations if provided
        if (updates.unitIds) {
            // Delete existing associations
            await supabase
                .from('professional_units')
                .delete()
                .eq('professional_id', id);

            // Insert new associations
            if (updates.unitIds.length > 0) {
                await supabase.from('professional_units').insert(
                    updates.unitIds.map(unitId => ({
                        professional_id: id,
                        unit_id: unitId
                    }))
                );
            }
        }

        return this.getById(id);
    },

    async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from('professionals')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    async deleteAll(): Promise<void> {
        const { error } = await supabase
            .from('professionals')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000');

        if (error) throw error;
    }
};

// =====================================================
// PATIENTS API
// =====================================================

export const patientsApi = {
    async getAll(): Promise<Patient[]> {
        const { data: patients, error } = await supabase
            .from('patients')
            .select('*, patient_plans(*)');

        if (error) throw error;

        return patients.map(patient => ({
            id: patient.id,
            name: patient.name,
            unitId: patient.unit_id,
            phone: patient.phone,
            cpf: patient.cpf,
            birthDate: patient.birth_date,
            address: patient.address,
            city: patient.city,
            status: patient.status,
            photoUrl: patient.photo_url,
            lastVisit: patient.last_visit,
            plan: patient.patient_plans?.[0] ? {
                name: patient.patient_plans[0].name,
                totalSessions: patient.patient_plans[0].total_sessions,
                remainingSessions: patient.patient_plans[0].remaining_sessions,
                expiresAt: patient.patient_plans[0].expires_at
            } : undefined
        }));
    },

    async create(patient: Omit<Patient, 'id'>): Promise<Patient> {
        const { data, error } = await supabase
            .from('patients')
            .insert({
                name: patient.name,
                unit_id: patient.unitId,
                phone: patient.phone,
                cpf: patient.cpf,
                birth_date: patient.birthDate,
                address: patient.address,
                city: patient.city,
                status: patient.status,
                photo_url: patient.photoUrl,
                last_visit: patient.lastVisit
            })
            .select()
            .single();

        if (error) throw error;

        // Create patient plan if provided
        if (patient.plan) {
            const { error: planError } = await supabase.from('patient_plans').insert({
                patient_id: data.id,
                name: patient.plan.name,
                total_sessions: patient.plan.totalSessions,
                remaining_sessions: patient.plan.remainingSessions,
                expires_at: patient.plan.expiresAt
            });

            if (planError) {
                console.error('Error creating patient plan:', planError);
                // We don't throw here to avoid failing the whole patient creation, 
                // but we should probably log it. 
                // Alternatively, we could throw. Let's log for now.
            }
        }

        return this.getById(data.id);
    },

    async getById(id: string): Promise<Patient> {
        const patients = await this.getAll();
        const patient = patients.find(p => p.id === id);
        if (!patient) throw new Error('Patient not found');
        return patient;
    },

    async update(id: string, updates: Partial<Patient>): Promise<Patient> {
        const { error } = await supabase
            .from('patients')
            .update({
                name: updates.name,
                unit_id: updates.unitId,
                phone: updates.phone,
                cpf: updates.cpf,
                birth_date: updates.birthDate,
                address: updates.address,
                city: updates.city,
                status: updates.status,
                photo_url: updates.photoUrl,
                last_visit: updates.lastVisit
            })
            .eq('id', id);

        if (error) throw error;

        // Update plan if provided
        if (updates.plan) {
            const { data: existingPlan } = await supabase
                .from('patient_plans')
                .select('id')
                .eq('patient_id', id)
                .single();

            if (existingPlan) {
                await supabase
                    .from('patient_plans')
                    .update({
                        name: updates.plan.name,
                        total_sessions: updates.plan.totalSessions,
                        remaining_sessions: updates.plan.remainingSessions,
                        expires_at: updates.plan.expiresAt
                    })
                    .eq('id', existingPlan.id);
            } else {
                await supabase.from('patient_plans').insert({
                    patient_id: id,
                    name: updates.plan.name,
                    total_sessions: updates.plan.totalSessions,
                    remaining_sessions: updates.plan.remainingSessions,
                    expires_at: updates.plan.expiresAt
                });
            }
        }

        return this.getById(id);
    },

    async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from('patients')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    async deleteAll(): Promise<void> {
        const { error } = await supabase
            .from('patients')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

        if (error) throw error;
    }
};

// =====================================================
// SESSIONS API
// =====================================================

export const sessionsApi = {
    async getAll(filters?: { patientId?: string; professionalId?: string; unitId?: string }): Promise<Session[]> {
        let query = supabase
            .from('sessions')
            .select('*')
            .order('date', { ascending: true })
            .order('time', { ascending: true });

        if (filters?.patientId) {
            query = query.eq('patient_id', filters.patientId);
        }
        if (filters?.professionalId) {
            query = query.eq('professional_id', filters.professionalId);
        }
        if (filters?.unitId) {
            query = query.eq('unit_id', filters.unitId);
        }

        const { data: sessions, error } = await query;

        if (error) throw error;

        return sessions.map(session => ({
            id: session.id,
            patientId: session.patient_id,
            professionalId: session.professional_id,
            unitId: session.unit_id,
            date: session.date,
            time: session.time,
            duration: session.duration_minutes || 30,
            type: session.type,
            status: session.status as SessionStatus,
            notes: session.notes,
            signed: session.signed,
            isOutsidePlan: session.is_outside_plan,
            price: session.price,
            signatureUrl: session.signature_url
        }));
    },

    async getByDate(date: string): Promise<Session[]> {
        const { data: sessions, error } = await supabase
            .from('sessions')
            .select('*')
            .eq('date', date)
            .order('time', { ascending: true });

        if (error) throw error;

        return sessions.map(session => ({
            id: session.id,
            patientId: session.patient_id,
            professionalId: session.professional_id,
            unitId: session.unit_id,
            date: session.date,
            time: session.time,
            duration: session.duration_minutes || 30,
            type: session.type,
            status: session.status as SessionStatus,
            notes: session.notes,
            signed: session.signed,
            isOutsidePlan: session.is_outside_plan,
            price: session.price,
            signatureUrl: session.signature_url
        }));
    },

    async create(session: Omit<Session, 'id'>): Promise<Session> {
        const { data, error } = await supabase
            .from('sessions')
            .insert({
                patient_id: session.patientId,
                professional_id: session.professionalId,
                unit_id: session.unitId,
                date: session.date,
                time: session.time,
                duration_minutes: session.duration || 30,
                type: session.type,
                status: session.status,
                notes: session.notes || null,
                signed: session.signed ?? false,
                is_outside_plan: session.isOutsidePlan ?? false,
                price: session.price || null,
                signature_url: session.signatureUrl
            })
            .select()
            .single();

        if (error) throw error;

        return {
            id: data.id,
            patientId: data.patient_id,
            professionalId: data.professional_id,
            unitId: data.unit_id,
            date: data.date,
            time: data.time,
            duration: data.duration_minutes || 30,
            type: data.type,
            status: data.status,
            notes: data.notes || '',
            signed: data.signed,
            isOutsidePlan: data.is_outside_plan,
            price: data.price
        };
    },

    async update(id: string, updates: Partial<Session>): Promise<Session> {
        const { data, error } = await supabase
            .from('sessions')
            .update({
                patient_id: updates.patientId,
                professional_id: updates.professionalId,
                unit_id: updates.unitId,
                date: updates.date,
                time: updates.time,
                duration_minutes: updates.duration,
                type: updates.type,
                status: updates.status,
                notes: updates.notes,
                signed: updates.signed,
                is_outside_plan: updates.isOutsidePlan,
                price: updates.price,
                signature_url: updates.signatureUrl
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return {
            id: data.id,
            patientId: data.patient_id,
            professionalId: data.professional_id,
            unitId: data.unit_id,
            date: data.date,
            time: data.time,
            duration: data.duration_minutes || 30,
            type: data.type,
            status: data.status,
            notes: data.notes,
            signed: data.signed,
            isOutsidePlan: data.is_outside_plan,
            price: data.price,
            signatureUrl: data.signature_url
        };
    },

    async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from('sessions')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};

// =====================================================
// PLAN TEMPLATES API
// =====================================================

export const specialtiesApi = {
    async getAll(): Promise<Specialty[]> {
        const { data, error } = await supabase
            .from('specialties')
            .select('*')
            .order('name', { ascending: true });

        if (error) throw error;

        return data.map(s => ({
            id: s.id,
            name: s.name,
            active: s.active
        }));
    },

    async create(name: string): Promise<Specialty> {
        const { data, error } = await supabase
            .from('specialties')
            .insert({ name, active: true })
            .select()
            .single();

        if (error) throw error;

        return {
            id: data.id,
            name: data.name,
            active: data.active
        };
    },

    async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from('specialties')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};

export const planTemplatesApi = {
    async getAll(): Promise<PlanTemplate[]> {
        const { data, error } = await supabase
            .from('plan_templates')
            .select('*')
            .order('name', { ascending: true });

        if (error) throw error;

        return data.map(pt => ({
            id: pt.id,
            name: pt.name,
            specialtyId: pt.specialty_id,
            sessions: pt.sessions,
            price: pt.price,
            description: pt.description,
            active: pt.active
        }));
    },

    async create(template: Omit<PlanTemplate, 'id'>): Promise<PlanTemplate> {
        const { data, error } = await supabase
            .from('plan_templates')
            .insert({
                name: template.name,
                specialty_id: template.specialtyId,
                sessions: template.sessions,
                price: template.price,
                description: template.description,
                active: template.active
            })
            .select()
            .single();

        if (error) throw error;

        return {
            id: data.id,
            name: data.name,
            specialtyId: data.specialty_id,
            sessions: data.sessions,
            price: data.price,
            description: data.description,
            active: data.active
        };
    },

    async update(id: string, updates: Partial<PlanTemplate>): Promise<PlanTemplate> {
        const { data, error } = await supabase
            .from('plan_templates')
            .update({
                name: updates.name,
                specialty_id: updates.specialtyId,
                sessions: updates.sessions,
                price: updates.price,
                description: updates.description,
                active: updates.active
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return {
            id: data.id,
            name: data.name,
            specialtyId: data.specialty_id,
            sessions: data.sessions,
            price: data.price,
            description: data.description,
            active: data.active
        };
    },

    async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from('plan_templates')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};

// =====================================================
// ANNOUNCEMENTS API
// =====================================================

export const announcementsApi = {
    async getAll(): Promise<Announcement[]> {
        const { data, error } = await supabase
            .from('announcements')
            .select('*')
            .order('date', { ascending: false });

        if (error) throw error;

        return data.map(a => ({
            id: a.id,
            title: a.title,
            message: a.message,
            type: a.type,
            date: a.date,
            targetRole: a.target_role
        }));
    },

    async create(announcement: Omit<Announcement, 'id'>): Promise<Announcement> {
        const { data, error } = await supabase
            .from('announcements')
            .insert({
                title: announcement.title,
                message: announcement.message,
                type: announcement.type,
                date: announcement.date,
                target_role: announcement.targetRole
            })
            .select()
            .single();

        if (error) throw error;

        return {
            id: data.id,
            title: data.title,
            message: data.message,
            type: data.type,
            date: data.date,
            targetRole: data.target_role
        };
    },

    async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from('announcements')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};

// =====================================================
// SYSTEM USERS API
// =====================================================

export const systemUsersApi = {
    async create(user: Omit<SystemUser, 'id'>): Promise<SystemUser> {
        // Note: This creates a system user record only. 
        // For real auth, they would need an auth.users entry (handled by demo_users.sql or auth signup).
        // For seeded secretaries, we just want them to appear in the list.
        const { data, error } = await supabase
            .from('system_users')
            .insert({
                name: user.name,
                email: user.email,
                role: user.role,
                unit_id: user.unitId,
                avatar_url: user.avatarUrl
            })
            .select()
            .single();

        if (error) throw error;

        return {
            id: data.id,
            name: data.name,
            email: data.email,
            role: data.role,
            unitId: data.unit_id,
            avatarUrl: data.avatar_url,
            customPermissions: data.custom_permissions || []
        };
    },

    async getAll(): Promise<SystemUser[]> {
        const { data, error } = await supabase
            .from('system_users')
            .select('*')
            .order('name', { ascending: true });

        if (error) throw error;

        return data.map(u => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            unitId: u.unit_id,
            avatarUrl: u.avatar_url,
            customPermissions: u.custom_permissions || []
        }));
    },

    async getByEmail(email: string): Promise<SystemUser | null> {
        const { data, error } = await supabase
            .from('system_users')
            .select('*')
            .eq('email', email)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null; // Not found
            throw error;
        }

        return {
            id: data.id,
            name: data.name,
            email: data.email,
            role: data.role,
            unitId: data.unit_id,
            avatarUrl: data.avatar_url,
            customPermissions: data.custom_permissions || []
        };
    },

    async getById(id: string): Promise<SystemUser | null> {
        const { data, error } = await supabase
            .from('system_users')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null;
            throw error;
        }

        return {
            id: data.id,
            name: data.name,
            email: data.email,
            role: data.role,
            unitId: data.unit_id,
            avatarUrl: data.avatar_url,
            customPermissions: data.custom_permissions || []
        };
    },

    async updatePermissions(userId: string, permissions: PermissionKey[]): Promise<void> {
        const { error } = await supabase
            .from('system_users')
            .update({ custom_permissions: permissions })
            .eq('id', userId);

        if (error) throw error;
    },

    async update(id: string, updates: Partial<SystemUser>): Promise<SystemUser> {
        const { error } = await supabase
            .from('system_users')
            .update({
                name: updates.name,
                email: updates.email,
                role: updates.role,
                unit_id: updates.unitId,
                avatar_url: updates.avatarUrl
                // Note: custom_permissions is handled separately by updatePermissions
            })
            .eq('id', id);

        if (error) throw error;

        const updatedUser = await this.getById(id);
        if (!updatedUser) throw new Error('User not found after update');
        return updatedUser;
    },

    async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from('system_users')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    async deleteAllSecretaries(): Promise<void> {
        const { error } = await supabase
            .from('system_users')
            .delete()
            .eq('role', 'secretary');

        if (error) throw error;
    }
};
