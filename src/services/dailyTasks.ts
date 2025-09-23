import { supabase } from '../lib/supabase';
import { DailyTask, DailyTaskFilters } from '../types';

export const dailyTasksService = {
  // Get all daily tasks with filters
  async getDailyTasks(filters: DailyTaskFilters = {}): Promise<DailyTask[]> {
      let query = supabase
    .from('daily_tasks')
    .select(`
      *,
      user:members(id, name, email, avatar_url),
      created_by_user:members(id, name, email, avatar_url)
    `)
    .order('created_at', { ascending: false });

    // Apply filters
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.member) {
      query = query.eq('user_id', filters.member);
    }
    if (filters.date) {
      query = query.eq('task_date', filters.date);
    }
    if (filters.priority) {
      query = query.eq('priority', filters.priority);
    }
    if (filters.project) {
      query = query.eq('project_id', filters.project);
    }
    if (filters.search) {
      query = query.or(`task_name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    
    // If we have tasks with project_id, fetch project information separately
    if (data && data.length > 0) {
      const projectIds = [...new Set(data.filter(task => task.project_id).map(task => task.project_id))];
      
      if (projectIds.length > 0) {
        const { data: projectsData, error: projectsError } = await supabase
          .from('projects')
          .select('id, name, description, client_name, status')
          .in('id', projectIds);
        
        if (!projectsError && projectsData) {
          const projectsMap = new Map(projectsData.map(project => [project.id, project]));
          
          // Attach project data to tasks
          data.forEach(task => {
            if (task.project_id && projectsMap.has(task.project_id)) {
              task.project = projectsMap.get(task.project_id);
            }
          });
        }
      }
    }
    
    return data || [];
  },

  // Get daily tasks for a specific user
  async getUserDailyTasks(userId: string, date?: string): Promise<DailyTask[]> {
    let query = supabase
      .from('daily_tasks')
      .select(`
        *,
        user:members(id, name, email, avatar_url),
        created_by_user:members(id, name, email, avatar_url)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (date) {
      query = query.eq('task_date', date);
    }

    const { data, error } = await query;
    if (error) throw error;
    
    // If we have tasks with project_id, fetch project information separately
    if (data && data.length > 0) {
      const projectIds = [...new Set(data.filter(task => task.project_id).map(task => task.project_id))];
      
      if (projectIds.length > 0) {
        const { data: projectsData, error: projectsError } = await supabase
          .from('projects')
          .select('id, name, description, client_name, status')
          .in('id', projectIds);
        
        if (!projectsError && projectsData) {
          const projectsMap = new Map(projectsData.map(project => [project.id, project]));
          
          // Attach project data to tasks
          data.forEach(task => {
            if (task.project_id && projectsMap.has(task.project_id)) {
              task.project = projectsMap.get(task.project_id);
            }
          });
        }
      }
    }
    
    return data || [];
  },

  // Create a new daily task
  async createDailyTask(task: Omit<DailyTask, 'id' | 'created_at' | 'updated_at' | 'user' | 'created_by_user'>): Promise<DailyTask> {
    const { data, error } = await supabase
      .from('daily_tasks')
      .insert([task])
      .select(`
        *,
        user:members(id, name, email, avatar_url),
        created_by_user:members(id, name, email, avatar_url)
      `)
      .single();

    if (error) throw error;
    
    // If the task has a project_id, fetch the project information
    if (data && data.project_id) {
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('id, name, description, client_name, status')
        .eq('id', data.project_id)
        .single();
      
      if (!projectError && projectData) {
        data.project = projectData;
      }
    }
    
    return data;
  },

  // Update a daily task
  async updateDailyTask(id: string, updates: Partial<DailyTask>): Promise<DailyTask> {
    const { data, error } = await supabase
      .from('daily_tasks')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        user:members(id, name, email, avatar_url),
        created_by_user:members(id, name, email, avatar_url)
      `)
      .single();

    if (error) throw error;
    
    // If the task has a project_id, fetch the project information
    if (data && data.project_id) {
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('id, name, description, client_name, status')
        .eq('id', data.project_id)
        .single();
      
      if (!projectError && projectData) {
        data.project = projectData;
      }
    }
    
    return data;
  },

  // Mark task as completed
  async markTaskCompleted(id: string): Promise<DailyTask> {
    return this.updateDailyTask(id, {
      status: 'completed',
      completed_at: new Date().toISOString()
    });
  },

  // Mark task as skipped
  async markTaskSkipped(id: string): Promise<DailyTask> {
    return this.updateDailyTask(id, {
      status: 'skipped',
      completed_at: null
    });
  },

  // Mark task as pending
  async markTaskPending(id: string): Promise<DailyTask> {
    return this.updateDailyTask(id, {
      status: 'pending',
      completed_at: null
    });
  },

  // Delete a daily task
  async deleteDailyTask(id: string): Promise<void> {
    const { error } = await supabase
      .from('daily_tasks')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Get daily tasks for today
  async getTodayTasks(userId?: string): Promise<DailyTask[]> {
    const today = new Date().toISOString().split('T')[0];
    const filters: DailyTaskFilters = { date: today };
    if (userId) {
      return this.getUserDailyTasks(userId, today);
    }
    return this.getDailyTasks(filters);
  }
};
