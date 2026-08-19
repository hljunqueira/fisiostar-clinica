import { supabase } from '../lib/supabase';
import { AuditLogItem } from '../types';

export const auditApi = {
  async getAll(filters?: {
    module?: string;
    startDate?: string;
    endDate?: string;
    userId?: string;
  }): Promise<AuditLogItem[]> {
    try {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (filters?.module && filters.module !== 'ALL') {
        query = query.eq('module', filters.module);
      }

      if (filters?.userId) {
        query = query.eq('user_id', filters.userId);
      }

      if (filters?.startDate) {
        query = query.gte('created_at', `${filters.startDate}T00:00:00.000Z`);
      }

      if (filters?.endDate) {
        query = query.lte('created_at', `${filters.endDate}T23:59:59.999Z`);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Error fetching audit logs:', error);
        return [];
      }

      return (data || []).map(l => ({
        id: l.id,
        userId: l.user_id || undefined,
        userName: l.user_name || 'Sistema',
        userRole: l.user_role || 'admin',
        category: (l.module?.toLowerCase() || 'system') as any,
        action: l.action,
        details: typeof l.details === 'string' ? l.details : JSON.stringify(l.details || {}),
        createdAt: l.created_at
      }));
    } catch (e) {
      console.error('Error in auditApi.getAll:', e);
      return [];
    }
  },

  async log(
    action: string,
    module: string,
    details?: any,
    user?: { id?: string; name?: string; role?: string }
  ): Promise<void> {
    try {
      await supabase.from('audit_logs').insert({
        user_id: user?.id || null,
        user_name: user?.name || 'Sistema',
        user_role: user?.role || 'admin',
        action,
        module: module.toUpperCase(),
        details: typeof details === 'object' ? details : { message: details }
      });
    } catch (error) {
      // Falhas no log de auditoria não devem travar o fluxo operacional
      console.warn('Silent audit log error:', error);
    }
  }
};
