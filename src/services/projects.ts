import { supabase } from '../lib/supabase';
import { Project } from '../types';

export const projectService = {
  async getProjects(): Promise<Project[]> {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw new Error('Failed to fetch projects');
    return data || [];
  },

  async getMemberProjects(userId: string): Promise<Project[]> {
    try {
      // First, get the project IDs that the member has tasks for
      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .select('project_id')
        .eq('user_id', userId)
        .not('project_id', 'is', null);
      
      if (taskError) throw taskError;
      
      // Extract unique project IDs
      const projectIds = [...new Set(taskData?.map(task => task.project_id).filter(Boolean))];
      
      if (projectIds.length === 0) {
        return [];
      }
      
      // Then, get the projects with those IDs
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .in('id', projectIds)
        .order('created_at', { ascending: false });
      
      if (projectError) throw projectError;
      
      return projectData || [];
    } catch (error) {
      console.error('Error in getMemberProjects:', error);
      throw new Error('Failed to fetch member projects');
    }
  },

  async createProject(projectData: Omit<Project, 'id' | 'created_at' | 'updated_at'>): Promise<Project> {
    const { data, error } = await supabase
      .from('projects')
      .insert(projectData)
      .select()
      .single();
    if (error) throw new Error('Failed to create project');
    return data;
  },

  async updateProject(id: string, updates: Partial<Project>): Promise<Project> {
    const { data, error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error('Failed to update project');
    return data;
  },

  async deleteProject(id: string): Promise<void> {
    try {
      // First, delete all related records in the correct order
      
      // 1. Delete project manager assignments
      const { error: assignmentsError } = await supabase
        .from('project_manager_assignments')
        .delete()
        .eq('project_id', id);
      
      if (assignmentsError) {
        console.warn('Error deleting project manager assignments:', assignmentsError);
      }

      // 2. Get task IDs for this project first
      const { data: taskIds } = await supabase
        .from('tasks')
        .select('id')
        .eq('project_id', id);

      // 3. Delete rental stage assignments (must be deleted before tasks)
      if (taskIds && taskIds.length > 0) {
        const taskIdList = taskIds.map(t => t.id);
        const { error: rentalStageAssignmentsError } = await supabase
          .from('rental_stage_assignments')
          .delete()
          .in('task_id', taskIdList);
        
        if (rentalStageAssignmentsError) {
          console.warn('Error deleting rental stage assignments:', rentalStageAssignmentsError);
        }

        // Also delete builder stage assignments
        const { error: builderStageAssignmentsError } = await supabase
          .from('builder_stage_assignments')
          .delete()
          .in('task_id', taskIdList);
        
        if (builderStageAssignmentsError) {
          console.warn('Error deleting builder stage assignments:', builderStageAssignmentsError);
        }

        // Also delete task comments
        const { error: taskCommentsError } = await supabase
          .from('task_comments')
          .delete()
          .in('task_id', taskIdList);
        
        if (taskCommentsError) {
          console.warn('Error deleting task comments:', taskCommentsError);
        }
      }

      // 4. Get rental deal IDs for this project
      const { data: rentalDealIds } = await supabase
        .from('rental_deals')
        .select('id')
        .eq('project_id', id);

      // 5. Delete rental deal stages (must be deleted before rental deals)
      if (rentalDealIds && rentalDealIds.length > 0) {
        const rentalDealIdList = rentalDealIds.map(d => d.id);
        const { error: rentalDealStagesError } = await supabase
          .from('rental_deal_stages')
          .delete()
          .in('deal_id', rentalDealIdList);
        
        if (rentalDealStagesError) {
          console.warn('Error deleting rental deal stages:', rentalDealStagesError);
        }

        // Also delete rental deal team members
        const { error: rentalDealTeamMembersError } = await supabase
          .from('rental_deal_team_members')
          .delete()
          .in('deal_id', rentalDealIdList);
        
        if (rentalDealTeamMembersError) {
          console.warn('Error deleting rental deal team members:', rentalDealTeamMembersError);
        }
      }

      // 6. Get builder deal IDs for this project
      const { data: builderDealIds } = await supabase
        .from('builder_deals')
        .select('id')
        .eq('project_id', id);

      // 7. Delete builder deal stages (must be deleted before builder deals)
      if (builderDealIds && builderDealIds.length > 0) {
        const builderDealIdList = builderDealIds.map(d => d.id);
        const { error: builderDealStagesError } = await supabase
          .from('builder_deal_stages')
          .delete()
          .in('deal_id', builderDealIdList);
        
        if (builderDealStagesError) {
          console.warn('Error deleting builder deal stages:', builderDealStagesError);
        }

        // Also delete builder deal team members
        const { error: builderDealTeamMembersError } = await supabase
          .from('builder_deal_team_members')
          .delete()
          .in('deal_id', builderDealIdList);
        
        if (builderDealTeamMembersError) {
          console.warn('Error deleting builder deal team members:', builderDealTeamMembersError);
        }
      }

      // 8. Delete tasks
      const { error: tasksError } = await supabase
        .from('tasks')
        .delete()
        .eq('project_id', id);
      
      if (tasksError) {
        console.warn('Error deleting tasks:', tasksError);
      }

      // 9. Delete daily tasks
      const { error: dailyTasksError } = await supabase
        .from('daily_tasks')
        .delete()
        .eq('project_id', id);
      
      if (dailyTasksError) {
        console.warn('Error deleting daily tasks:', dailyTasksError);
      }

      // 10. Delete deleted tasks
      const { error: deletedTasksError } = await supabase
        .from('deleted_tasks')
        .delete()
        .eq('project_id', id);
      
      if (deletedTasksError) {
        console.warn('Error deleting deleted tasks:', deletedTasksError);
      }

      // 11. Delete rental deals
      const { error: rentalDealsError } = await supabase
        .from('rental_deals')
        .delete()
        .eq('project_id', id);
      
      if (rentalDealsError) {
        console.warn('Error deleting rental deals:', rentalDealsError);
      }

      // 12. Delete builder deals
      const { error: builderDealsError } = await supabase
        .from('builder_deals')
        .delete()
        .eq('project_id', id);
      
      if (builderDealsError) {
        console.warn('Error deleting builder deals:', builderDealsError);
      }

      // 13. Finally delete the project
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);
      
      if (error) throw new Error('Failed to delete project');
    } catch (error) {
      console.error('Error in deleteProject:', error);
      throw new Error('Failed to delete project');
    }
  },

  async markProjectAsComplete(id: string): Promise<Project> {
    // First, update the project status to completed
    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .update({ status: 'completed' })
      .eq('id', id)
      .select()
      .single();
    
    if (projectError) throw new Error('Failed to mark project as complete');
    
    // Then, mark all associated tasks as completed
    const { error: tasksError } = await supabase
      .from('tasks')
      .update({ status: 'completed' })
      .eq('project_id', id);
    
    if (tasksError) {
      console.error('Failed to update associated tasks:', tasksError);
      // Don't throw error here as the project was successfully updated
    }
    
    return projectData;
  }
}; 