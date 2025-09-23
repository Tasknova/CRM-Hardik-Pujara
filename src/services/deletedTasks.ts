import { supabase } from '../lib/supabase';
import { DeletedTask } from '../types';

export const deletedTasksService = {
  // Record a deleted task
  async recordDeletedTask(taskData: any, deletedBy: string, taskType: 'regular' | 'daily' = 'regular'): Promise<DeletedTask | null> {
    try {
      const deletedTaskRecord = {
        original_task_id: taskData.id,
        task_name: taskData.task_name,
        description: taskData.description,
        status: taskData.status,
        priority: taskData.priority,
        due_date: taskData.due_date,
        progress: taskData.progress || 0,
        user_id: taskData.user_id,
        created_by: taskData.created_by,
        deleted_by: deletedBy,
        project_id: taskData.project_id,
        estimated_hours: taskData.estimated_hours,
        actual_hours: taskData.actual_hours,
        tags: taskData.tags,
        attachments: taskData.attachments,
        completed_at: taskData.completed_at,
        created_at: taskData.created_at,
        updated_at: taskData.updated_at,
        task_type: taskType,
        task_date: taskData.task_date,
        is_active: taskData.is_active
      };

      const { data, error } = await supabase
        .from('deleted_tasks')
        .insert([deletedTaskRecord])
        .select()
        .single();

      if (error) {
        console.error('Error recording deleted task:', error);
        return null;
      }

      return data;
    } catch (err) {
      console.error('Error in recordDeletedTask:', err);
      return null;
    }
  },

  // Get deleted tasks for audit purposes
  async getDeletedTasks(filters?: {
    deletedBy?: string;
    taskType?: 'regular' | 'daily';
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
  }): Promise<DeletedTask[]> {
    try {
      let query = supabase
        .from('deleted_tasks')
        .select('*')
        .order('deleted_at', { ascending: false });

      if (filters?.deletedBy) {
        query = query.eq('deleted_by', filters.deletedBy);
      }

      if (filters?.taskType) {
        query = query.eq('task_type', filters.taskType);
      }

      if (filters?.dateFrom) {
        query = query.gte('deleted_at', filters.dateFrom);
      }

      if (filters?.dateTo) {
        query = query.lte('deleted_at', filters.dateTo);
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching deleted tasks:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('Error in getDeletedTasks:', err);
      return [];
    }
  },

  // Get deleted task statistics
  async getDeletedTaskStats(): Promise<{
    totalDeleted: number;
    deletedToday: number;
    deletedThisWeek: number;
    deletedThisMonth: number;
    byType: { regular: number; daily: number };
  }> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const [
        { count: totalDeleted },
        { count: deletedToday },
        { count: deletedThisWeek },
        { count: deletedThisMonth },
        { data: byTypeData }
      ] = await Promise.all([
        supabase.from('deleted_tasks').select('*', { count: 'exact', head: true }),
        supabase.from('deleted_tasks').select('*', { count: 'exact', head: true }).gte('deleted_at', today),
        supabase.from('deleted_tasks').select('*', { count: 'exact', head: true }).gte('deleted_at', weekAgo),
        supabase.from('deleted_tasks').select('*', { count: 'exact', head: true }).gte('deleted_at', monthAgo),
        supabase.from('deleted_tasks').select('task_type').gte('deleted_at', monthAgo)
      ]);

      const byType = {
        regular: byTypeData?.filter(item => item.task_type === 'regular').length || 0,
        daily: byTypeData?.filter(item => item.task_type === 'daily').length || 0
      };

      return {
        totalDeleted: totalDeleted || 0,
        deletedToday: deletedToday || 0,
        deletedThisWeek: deletedThisWeek || 0,
        deletedThisMonth: deletedThisMonth || 0,
        byType
      };
    } catch (err) {
      console.error('Error in getDeletedTaskStats:', err);
      return {
        totalDeleted: 0,
        deletedToday: 0,
        deletedThisWeek: 0,
        deletedThisMonth: 0,
        byType: { regular: 0, daily: 0 }
      };
    }
  }
};
