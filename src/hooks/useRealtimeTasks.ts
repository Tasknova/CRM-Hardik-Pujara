import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Task, TaskFilters } from '../types';
import { deletedTasksService } from '../services/deletedTasks';
import { useAuth } from '../contexts/AuthContext';
import { handleTaskCompletion, handleTaskReopening, syncTaskStatusWithStage } from '../services/stageCompletion';

export const useRealtimeTasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Safe useAuth with fallback
  let user = null;
  try {
    const authContext = useAuth();
    user = authContext.user;
  } catch (error) {
    console.warn('useAuth not available in useRealtimeTasks, using null user');
  }

  const fetchUserDataForTasks = async (tasks: any[]): Promise<Task[]> => {
    if (!tasks.length) return [];
    
    try {
      // Get unique user IDs from tasks (both primary user_id and assigned_user_ids)
      // Don't filter out any IDs here - let the database query handle it
      const primaryUserIds = [...new Set(tasks.map(task => task.user_id).filter(id => id))];
      const assignedUserIds = [...new Set(tasks.flatMap(task => task.assigned_user_ids || []))];
      const allUserIds = [...new Set([...primaryUserIds, ...assignedUserIds])];
      
      // Get unique broker IDs from tasks
      const brokerIds = [...new Set(tasks.map(task => task.broker_id).filter(id => id))];
      
      // Fetch members, admins, project managers, and brokers
      const [membersData, adminsData, projectManagersData, brokersData] = await Promise.all([
        supabase
          .from('members')
          .select('id, name, email, avatar_url')
          .in('id', allUserIds.length > 0 ? allUserIds : ['00000000-0000-0000-0000-000000000000'])
          .eq('is_active', true),
        supabase
          .from('admins')
          .select('id, name, email, avatar_url')
          .in('id', allUserIds.length > 0 ? allUserIds : ['00000000-0000-0000-0000-000000000000'])
          .eq('is_active', true),
        supabase
          .from('project_managers')
          .select('id, name, email, avatar_url')
          .in('id', allUserIds.length > 0 ? allUserIds : ['00000000-0000-0000-0000-000000000000'])
          .eq('is_active', true),
        supabase
          .from('brokers')
          .select('id, name, email, phone')
          .in('id', brokerIds.length > 0 ? brokerIds : ['00000000-0000-0000-0000-000000000000'])
          .or('is_active.is.null,is_active.eq.true')
      ]);

      // Combine members, admins, and project managers into a single map
      const userMap = new Map();
      const brokerMap = new Map();
      
      if (membersData.data) {
        membersData.data.forEach(member => {
          userMap.set(member.id, { ...member, role: 'member' });
        });
      }
      
      if (adminsData.data) {
        adminsData.data.forEach(admin => {
          userMap.set(admin.id, { ...admin, role: 'admin' });
        });
      }
      
      if (projectManagersData.data) {
        projectManagersData.data.forEach(pm => {
          userMap.set(pm.id, { ...pm, role: 'project_manager' });
        });
      }
      
      if (brokersData.data) {
        brokersData.data.forEach(broker => {
          brokerMap.set(broker.id, broker);
        });
      }

      // Attach user data to tasks and create assignments from assigned_user_ids JSONB or broker_id
      return tasks.map(task => {
        let assignments = [];
        
        // Handle broker tasks
        if (task.broker_id) {
          const broker = brokerMap.get(task.broker_id);
          if (broker) {
            assignments = [{
              id: `${task.id}-broker-${task.broker_id}`,
              task_id: task.id,
              user_id: null,
              assigned_at: task.created_at,
              assigned_by: task.created_by,
              member_name: broker.name,
              member_email: broker.email || 'N/A'
            }];
          }
        } else if (task.assigned_user_ids && Array.isArray(task.assigned_user_ids)) {
          // Create assignments from assigned_user_ids JSONB column
          const validUserIds = task.assigned_user_ids.filter((userId: string) => userId);
          
          assignments = validUserIds.map((userId: string) => {
            const user = userMap.get(userId);
            return {
              id: `${task.id}-${userId}`, // Generate a unique ID
              task_id: task.id,
              user_id: userId,
              assigned_at: task.created_at, // Use task creation time
              assigned_by: task.created_by,
              member_name: user?.name || 'Unknown',
              member_email: user?.email || 'Unknown'
            };
          });
        }
        
        return {
          ...task,
          user: task.user_id ? userMap.get(task.user_id) || null : null,
          broker: task.broker_id ? brokerMap.get(task.broker_id) || null : null,
          assignments: assignments
        };
      });
    } catch (error) {
      console.error('Error fetching user data for tasks:', error);
      // Return tasks without user data if there's an error
      return tasks.map(task => ({
        ...task,
        user: null,
        assignments: []
      }));
    }
  };

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Fetch user data for all tasks
      const tasksWithUsers = await fetchUserDataForTasks(data || []);
      console.log('🔍 useRealtimeTasks - Fetched tasks from database:', data?.length || 0);
      console.log('🔍 useRealtimeTasks - Tasks with users:', tasksWithUsers.length);
      console.log('🔍 useRealtimeTasks - Sample tasks:', tasksWithUsers.slice(0, 3).map(t => ({ id: t.id, name: t.task_name, project_id: t.project_id })));
      setTasks(tasksWithUsers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  const addTask = async (task: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      console.log('🔍 useRealtimeTasks - Adding task:', task);
      const { data, error } = await supabase
        .from('tasks')
        .insert([task])
        .select()
        .single();

      if (error) {
        console.error('🔍 useRealtimeTasks - Database error:', error);
        throw error;
      }
      
      console.log('🔍 useRealtimeTasks - Task added successfully:', data);
      // Don't add to local state here - let the real-time subscription handle it
      // This prevents duplicate tasks from appearing
      return data;
    } catch (err) {
      console.error('🔍 useRealtimeTasks - Error in addTask:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    }
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    try {
      console.log('useRealtimeTasks: updateTask called with:', { id, updates });
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      console.log('useRealtimeTasks: Task updated successfully:', data);
      
      // Directly sync task status with stage status
      if (updates.status) {
        try {
          const syncResult = await syncTaskStatusWithStage(id);
          if (syncResult.stageCompleted) {
            console.log(`✅ Stage ${syncResult.stageId} status synced with task status`);
          }
        } catch (syncError) {
          console.error('Error syncing task status with stage:', syncError);
          // Don't throw here - task update was successful, sync check is secondary
        }
      }
      
      // Fetch user data for the updated task
      const tasksWithUsers = await fetchUserDataForTasks([data]);
      const taskWithUser = tasksWithUsers[0];
      
      setTasks(prev => prev.map(task => task.id === id ? taskWithUser : task));
      return taskWithUser;
    } catch (err) {
      console.error('useRealtimeTasks: Error updating task:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    }
  };

  const deleteTask = async (id: string) => {
    if (!user) {
      setError('No user found. Cannot delete task.');
      throw new Error('No user found');
    }

    try {
      // First, get the task data before deleting
      const taskToDelete = tasks.find(task => task.id === id);
      if (!taskToDelete) {
        setError('Task not found');
        throw new Error('Task not found');
      }

      // Record the deletion in deleted_tasks table
      await deletedTasksService.recordDeletedTask(taskToDelete, user.id, 'regular');

      // First, try to delete any stage assignments that reference this task
      try {
        // Delete from rental stage assignments
        await supabase
          .from('rental_stage_assignments')
          .delete()
          .eq('task_id', id);

        // Delete from builder stage assignments
        await supabase
          .from('builder_stage_assignments')
          .delete()
          .eq('task_id', id);

        // Delete from resale stage assignments
        await supabase
          .from('resale_stage_assignments')
          .delete()
          .eq('task_id', id);
      } catch (assignmentError) {
        console.warn('Error deleting stage assignments:', assignmentError);
        // Continue with task deletion even if assignment deletion fails
      }

      // Then delete the task
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);

      if (error) {
        // Handle foreign key constraint violations
        if (error.code === '23503') {
          if (error.message.includes('rental_stage_assignments')) {
            throw new Error('Cannot delete task: This task is assigned to a rental deal stage. Please remove the assignment first.');
          } else if (error.message.includes('builder_stage_assignments')) {
            throw new Error('Cannot delete task: This task is assigned to a builder deal stage. Please remove the assignment first.');
          } else if (error.message.includes('stage_assignments')) {
            throw new Error('Cannot delete task: This task is assigned to a deal stage. Please remove the assignment first.');
          } else {
            throw new Error('Cannot delete task: This task is referenced by other records. Please remove all references first.');
          }
        }
        throw error;
      }
      setTasks(prev => prev.filter(task => task.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    }
  };

  const filterTasks = (filters: TaskFilters, taskList?: Task[]) => {
    const tasksToFilter = taskList || tasks;
    let filteredTasks = tasksToFilter.filter(task => {
      // Status filter
      if (filters.status && task.status !== filters.status) return false;
      
      // Priority filter
      if (filters.priority && task.priority !== filters.priority) return false;
      
      // Assigned To filter (check both assignee and assignedTo for compatibility)
      // Check both primary assignee and multiple assignments from JSONB
      if (filters.assignedTo) {
        const validAssignedIds = task.assigned_user_ids?.filter(id => id) || [];
        const isAssignedToUser = task.user_id === filters.assignedTo || 
          validAssignedIds.includes(filters.assignedTo);
        if (!isAssignedToUser) return false;
      }
      if (filters.assignee) {
        const validAssignedIds = task.assigned_user_ids?.filter(id => id) || [];
        const isAssignedToUser = task.user_id === filters.assignee || 
          validAssignedIds.includes(filters.assignee);
        if (!isAssignedToUser) return false;
      }
      
      // Project filter
      if (filters.project && task.project_id !== filters.project) return false;
      
      // User ID filter (for "My Tasks") - check both primary user and assigned users
      if (filters.userId) {
        const validAssignedIds = task.assigned_user_ids?.filter(id => id) || [];
        const isMyTask = task.user_id === filters.userId || 
          validAssignedIds.includes(filters.userId);
        if (!isMyTask) return false;
      }
      
      // Search filter
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        const taskName = task.task_name.toLowerCase();
        const description = task.description?.toLowerCase() || '';
        
        if (!taskName.includes(searchTerm) && !description.includes(searchTerm)) {
          return false;
        }
      }
      
      return true;
    });

    // Sort tasks: pending/in-progress on top, completed below
    filteredTasks.sort((a, b) => {
      // Define priority order: pending/in-progress first, then completed
      const getStatusPriority = (status: string) => {
        if (status === 'pending' || status === 'in_progress' || status === 'not_started') {
          return 1; // Higher priority (appears first)
        } else if (status === 'completed') {
          return 2; // Lower priority (appears last)
        }
        return 3; // Other statuses (blocked, cancelled, etc.)
      };

      const priorityA = getStatusPriority(a.status);
      const priorityB = getStatusPriority(b.status);

      // If status priorities are different, sort by status priority
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      // If status priorities are the same, sort by due date (earliest first)
      const dateA = new Date(a.due_date).getTime();
      const dateB = new Date(b.due_date).getTime();
      return dateA - dateB;
    });

    // Apply due date sort if specified (this will override the default sorting)
    if (filters.dueDateSort) {
      filteredTasks.sort((a, b) => {
        const dateA = new Date(a.due_date).getTime();
        const dateB = new Date(b.due_date).getTime();
        
        if (filters.dueDateSort === 'asc') {
          return dateA - dateB;
        } else {
          return dateB - dateA;
        }
      });
    }

    return filteredTasks;
  };

  const refetchTasks = useCallback(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Real-time subscription for tasks
  useEffect(() => {
    fetchTasks();

    const tasksSubscription = supabase
      .channel('tasks_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks'
        },
        async (payload) => {
          console.log('Tasks real-time update:', payload);
          
          if (payload.eventType === 'INSERT') {
            // New task created - fetch user data and add to list
            const newTask = payload.new as Task;
            const tasksWithUsers = await fetchUserDataForTasks([newTask]);
            const taskWithUser = tasksWithUsers[0];
            setTasks(prev => [taskWithUser, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            // Task updated - fetch user data and update in list
            const updatedTask = payload.new as Task;
            const tasksWithUsers = await fetchUserDataForTasks([updatedTask]);
            const taskWithUser = tasksWithUsers[0];
            setTasks(prev => prev.map(t => t.id === taskWithUser.id ? taskWithUser : t));
          } else if (payload.eventType === 'DELETE') {
            // Task deleted - remove from list
            const deletedTask = payload.old as Task;
            setTasks(prev => prev.filter(t => t.id !== deletedTask.id));
          }
        }
      )
      .subscribe();

    return () => {
      tasksSubscription.unsubscribe();
    };
  }, [fetchTasks]);

  return {
    tasks,
    loading,
    error,
    addTask,
    updateTask,
    deleteTask,
    filterTasks,
    refetchTasks
  };
};
