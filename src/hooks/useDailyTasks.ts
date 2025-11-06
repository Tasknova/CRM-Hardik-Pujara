import { useState, useEffect, useCallback, useRef } from 'react';
import { DailyTask, DailyTaskFilters, Member, Admin } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { authService } from '../services/auth';
import { deletedTasksService } from '../services/deletedTasks';
import { toast } from 'react-toastify';

export const useDailyTasks = (filters: DailyTaskFilters = {}) => {
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  
  // Safe useAuth with fallback
  let user = null;
  try {
    const authContext = useAuth();
    user = authContext.user;
  } catch (error) {
    // This can happen during hot reload or if context is not available
    console.warn('useAuth not available in useDailyTasks, using null user');
  }
  
  const subscriptionRef = useRef<any>(null);

  const fetchTasks = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      let query = supabase
        .from('daily_tasks')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.member) {
        // Check both primary user_id and assigned_user_ids for multi-assignment
        query = query.or(`user_id.eq.${filters.member},assigned_user_ids.cs.["${filters.member}"]`);
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

      // If not admin or project manager, only show user's own tasks
      if (user.role !== 'admin' && user.role !== 'project_manager') {
        // Check both primary user_id and assigned_user_ids for multi-assignment
        query = query.or(`user_id.eq.${user.id},assigned_user_ids.cs.["${user.id}"]`);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching daily tasks:', error);
        setError(error.message || 'Failed to fetch daily tasks');
        setTasks([]);
      } else {
        // Fetch user and project information for all tasks
        const tasksWithUsers = await fetchUserDataForTasks(data || []);
        const tasksWithProjects = await fetchProjectDataForTasks(tasksWithUsers);
        setTasks(tasksWithProjects);
      }
    } catch (err) {
      console.error('Error in fetchTasks:', err);
      setError('Failed to fetch daily tasks');
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [filters.status, filters.member, filters.date, filters.priority, filters.project, filters.search, user?.id, user?.role]);

  // Function to fetch user data for tasks
  const fetchUserDataForTasks = async (tasks: any[]): Promise<DailyTask[]> => {
    if (!tasks.length) return [];
    
    try {
      // Get unique user IDs from tasks (both primary user_id and assigned_user_ids)
      const primaryUserIds = [...new Set(tasks.map(task => task.user_id).filter(id => id))];
      const assignedUserIds = [...new Set(tasks.flatMap(task => task.assigned_user_ids || []))];
      const allUserIds = [...new Set([...primaryUserIds, ...assignedUserIds])];
      
      // Fetch members, admins, and project managers for all user IDs
      const [membersData, adminsData, projectManagersData] = await Promise.all([
        supabase
          .from('members')
          .select('id, name, email, avatar_url')
          .in('id', allUserIds)
          .eq('is_active', true),
        supabase
          .from('admins')
          .select('id, name, email, avatar_url')
          .in('id', allUserIds)
          .eq('is_active', true),
        supabase
          .from('project_managers')
          .select('id, name, email, avatar_url')
          .in('id', allUserIds)
          .eq('is_active', true)
      ]);

      // Combine members, admins, and project managers into a single map
      const userMap = new Map();
      
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

      // Attach user data to tasks and create assignments from assigned_user_ids JSONB
      return tasks.map(task => {
        let assignments = [];
        
        // Create assignments from assigned_user_ids JSONB column
        if (task.assigned_user_ids && Array.isArray(task.assigned_user_ids)) {
          assignments = task.assigned_user_ids
            .filter((userId: string) => userId) // Only filter out null/undefined, not specific UUIDs
            .map((userId: string) => {
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

  // Function to fetch project data for tasks
  const fetchProjectDataForTasks = async (tasks: DailyTask[]): Promise<DailyTask[]> => {
    if (!tasks.length) return [];
    
    try {
      // Get unique project IDs from tasks
      const projectIds = [...new Set(tasks.filter(task => task.project_id).map(task => task.project_id))];
      
      if (projectIds.length === 0) {
        return tasks; // No projects to fetch
      }
      
      // Fetch project data
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('id, name, description, client_name, status')
        .in('id', projectIds);
      
      if (projectsError) {
        console.error('Error fetching project data:', projectsError);
        return tasks; // Return tasks without project data if there's an error
      }
      
      // Create a map of project data
      const projectMap = new Map();
      if (projectsData) {
        projectsData.forEach(project => {
          projectMap.set(project.id, project);
        });
      }
      
      // Attach project data to tasks
      return tasks.map(task => ({
        ...task,
        project: task.project_id ? projectMap.get(task.project_id) || null : null
      }));
    } catch (error) {
      console.error('Error fetching project data for tasks:', error);
      // Return tasks without project data if there's an error
      return tasks.map(task => ({
        ...task,
        project: null
      }));
    }
  };

  // Set up real-time subscription
  useEffect(() => {
    if (!user) return;

    // Clean up existing subscription
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
    }

    // Create new subscription
    subscriptionRef.current = supabase
      .channel('daily_tasks_changes')
      .on('presence', { event: 'sync' }, () => {
        console.log('🟢 Real-time connection established');
        setRealtimeConnected(true);
      })
      .on('presence', { event: 'join' }, () => {
        console.log('🟢 Real-time client joined');
      })
      .on('presence', { event: 'leave' }, () => {
        console.log('🔴 Real-time client left');
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'daily_tasks'
        },
        (payload) => {
          console.log('🔄 Real-time change received:', {
            eventType: payload.eventType,
            table: payload.table,
            schema: payload.schema,
            new: payload.new,
            old: payload.old
          });

          // Show toast for real-time updates (only for updates, not for user's own actions)
          if (payload.eventType === 'UPDATE' && payload.new?.updated_by !== user?.id) {
            const taskName = payload.new?.task_name || 'Task';
            toast.info(`🔄 ${taskName} was updated in real-time`, {
              position: "top-right",
              autoClose: 3000,
            });
          } else if (payload.eventType === 'INSERT' && payload.new?.created_by !== user?.id) {
            const taskName = payload.new?.task_name || 'Task';
            toast.info(`🆕 New task "${taskName}" was created`, {
              position: "top-right",
              autoClose: 3000,
            });
          } else if (payload.eventType === 'DELETE' && payload.old?.created_by !== user?.id) {
            const taskName = payload.old?.task_name || 'Task';
            toast.info(`🗑️ Task "${taskName}" was deleted`, {
              position: "top-right",
              autoClose: 3000,
            });
          }
          
          // Handle different types of changes
          if (payload.eventType === 'INSERT') {
            // Fetch complete task data with user relationship
            const fetchCompleteTask = async () => {
              const { data: completeTask, error } = await supabase
                .from('daily_tasks')
                .select('*')
                .eq('id', payload.new.id)
                .single();
              
              if (error || !completeTask) {
                console.error('Error fetching complete task data:', error);
                return;
              }
              
              // Fetch user data for the new task
              const tasksWithUsers = await fetchUserDataForTasks([completeTask]);
              const newTask = tasksWithUsers[0] as DailyTask;
            setTasks(prevTasks => {
              // Check if task already exists to avoid duplicates
              if (prevTasks.find(task => task.id === newTask.id)) {
                return prevTasks;
              }
              
              // Apply filters to new task
              let shouldInclude = true;
              if (filters.status && newTask.status !== filters.status) shouldInclude = false;
              if (filters.member && newTask.user_id !== filters.member) shouldInclude = false;
              if (filters.date && newTask.task_date !== filters.date) shouldInclude = false;
              if (filters.priority && newTask.priority !== filters.priority) shouldInclude = false;
              if (filters.search) {
                const searchLower = filters.search.toLowerCase();
                const matchesSearch = 
                  newTask.task_name.toLowerCase().includes(searchLower) ||
                  (newTask.description && newTask.description.toLowerCase().includes(searchLower));
                if (!matchesSearch) shouldInclude = false;
              }
              
              // If not admin, only include user's own tasks
              if (user.role !== 'admin' && newTask.user_id !== user.id) shouldInclude = false;
              
                             if (shouldInclude) {
                 return [newTask, ...prevTasks];
               }
               return prevTasks;
             });
            };
            
            fetchCompleteTask();
          } else if (payload.eventType === 'UPDATE') {
            // Fetch complete task data with user relationship
            const fetchCompleteTask = async () => {
              const { data: completeTask, error } = await supabase
                .from('daily_tasks')
                .select('*')
                .eq('id', payload.new.id)
                .single();
              
              if (error || !completeTask) {
                console.error('Error fetching complete task data:', error);
                return;
              }
              
              // Fetch user data for the updated task
              const tasksWithUsers = await fetchUserDataForTasks([completeTask]);
              const updatedTask = tasksWithUsers[0] as DailyTask;
            setTasks(prevTasks => {
              const taskIndex = prevTasks.findIndex(task => task.id === updatedTask.id);
              if (taskIndex === -1) return prevTasks;
              
              // Check if updated task still matches filters
              let shouldInclude = true;
              if (filters.status && updatedTask.status !== filters.status) shouldInclude = false;
              if (filters.member && updatedTask.user_id !== filters.member) shouldInclude = false;
              if (filters.date && updatedTask.task_date !== filters.date) shouldInclude = false;
              if (filters.priority && updatedTask.priority !== filters.priority) shouldInclude = false;
              if (filters.search) {
                const searchLower = filters.search.toLowerCase();
                const matchesSearch = 
                  updatedTask.task_name.toLowerCase().includes(searchLower) ||
                  (updatedTask.description && updatedTask.description.toLowerCase().includes(searchLower));
                if (!matchesSearch) shouldInclude = false;
              }
              
              // If not admin, only include user's own tasks
              if (user.role !== 'admin' && updatedTask.user_id !== user.id) shouldInclude = false;
              
              if (shouldInclude) {
                const newTasks = [...prevTasks];
                newTasks[taskIndex] = updatedTask;
                return newTasks;
                             } else {
                 // Remove task if it no longer matches filters
                 return prevTasks.filter(task => task.id !== updatedTask.id);
               }
             });
            };
            
            fetchCompleteTask();
          } else if (payload.eventType === 'DELETE') {
            const deletedTaskId = payload.old.id;
            setTasks(prevTasks => prevTasks.filter(task => task.id !== deletedTaskId));
          }
        }
      )
      .subscribe();

    // Cleanup function
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, [user?.id, user?.role, filters.status, filters.member, filters.date, filters.priority, filters.search]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const createTask = useCallback(async (taskData: Omit<DailyTask, 'id' | 'created_at' | 'updated_at' | 'user' | 'created_by_user'>) => {
    if (!user) {
      setError('No user found. Cannot create task.');
      return null;
    }

    setError(null);

    try {
      // Ensure required fields are present
      const taskToInsert = {
        ...taskData,
        status: taskData.status || 'pending',
        priority: taskData.priority || 'medium',
        is_active: taskData.is_active !== undefined ? taskData.is_active : true,
        task_date: taskData.task_date || new Date().toISOString().split('T')[0],
        // For admins, created_by should be the admin's ID (which is not in members table)
        // For members, created_by should be their member ID
        created_by: taskData.created_by || user.id
      };

      const { data, error } = await supabase
        .from('daily_tasks')
        .insert([taskToInsert])
        .select('*')
        .single();

      if (error) {
        console.error('Error creating daily task:', error);
        setError(error.message || 'Error creating daily task');
        return null;
      }

      if (data) {
        // Fetch user data for the new task
        const tasksWithUsers = await fetchUserDataForTasks([data]);
        const taskWithUser = tasksWithUsers[0];
        
        toast.success(`📝 Daily Task Added: ${data.task_name}`, {
          position: "top-right",
          autoClose: 4500,
        });
        return taskWithUser;
      }
    } catch (err) {
      console.error('Error in createTask:', err);
      setError('Failed to create daily task');
    }
    return null;
  }, [user?.id, fetchTasks]);

  const updateTask = useCallback(async (id: string, updates: Partial<DailyTask>) => {
    if (!id || !user) {
      setError('Invalid task id or no user found.');
      return null;
    }

    setError(null);

    try {
      const { data, error } = await supabase
        .from('daily_tasks')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        console.error('Error updating daily task:', error);
        setError(error.message || 'Error updating daily task');
        return null;
      }

      if (data) {
        // Fetch user data for the updated task
        const tasksWithUsers = await fetchUserDataForTasks([data]);
        const taskWithUser = tasksWithUsers[0];
        
        toast.success(`✅ Daily Task Updated: ${data.task_name}`, {
          position: "top-right",
          autoClose: 3000,
        });
        return taskWithUser;
      }
    } catch (err) {
      console.error('Error in updateTask:', err);
      setError('Failed to update daily task');
    }
    return null;
  }, [user?.id, fetchTasks]);

  const deleteTask = useCallback(async (id: string) => {
    if (!id || !user) {
      setError('Invalid task id or no user found.');
      return;
    }

    setError(null);
    const taskToDelete = tasks.find(t => t.id === id);
    
    if (!taskToDelete) {
      setError('Task not found');
      return;
    }

    try {
      // Record the deletion in deleted_tasks table
      await deletedTasksService.recordDeletedTask(taskToDelete, user.id, 'daily');

      const { error } = await supabase
        .from('daily_tasks')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting daily task:', error);
        // Handle foreign key constraint violations
        if (error.code === '23503') {
          setError('Cannot delete task: This task is referenced by other records. Please remove all references first.');
        } else {
          setError(error.message || 'Error deleting daily task');
        }
        return;
      }

      toast.success(`🗑️ Daily Task Deleted: ${taskToDelete.task_name}`, {
        position: "top-right",
        autoClose: 4000,
      });

      // Update local state immediately for better UX
      setTasks(prevTasks => prevTasks.filter(t => t.id !== id));
      
      // Refresh the tasks list after successful deletion to ensure consistency
      await fetchTasks();
    } catch (err) {
      console.error('Error in deleteTask:', err);
      setError('Failed to delete daily task');
    }
  }, [user?.id, tasks, fetchTasks]);

  const markCompleted = useCallback(async (id: string) => {
    return updateTask(id, {
      status: 'completed',
      completed_at: new Date().toISOString()
    });
  }, [updateTask]);

  const markSkipped = useCallback(async (id: string, skipReason?: string) => {
    return updateTask(id, {
      status: 'skipped',
      completed_at: null,
      skip_reason: skipReason || null
    });
  }, [updateTask]);

  const markPending = useCallback(async (id: string) => {
    return updateTask(id, {
      status: 'pending',
      completed_at: null
    });
  }, [updateTask]);

  return {
    tasks,
    loading,
    error,
    realtimeConnected,
    fetchTasks,
    createTask,
    updateTask,
    deleteTask,
    markCompleted,
    markSkipped,
    markPending
  };
};
