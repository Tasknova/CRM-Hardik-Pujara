import { supabase } from '../lib/supabase';

export interface StageCompletionResult {
  stageCompleted: boolean;
  dealCompleted: boolean;
  stageId?: string;
  dealId?: string;
  dealType?: 'rental' | 'builder';
}

/**
 * Check if a stage is completed based on its associated tasks
 */
export const checkStageCompletion = async (stageId: string, dealType: 'rental' | 'builder'): Promise<boolean> => {
  try {
    console.log(`Checking stage completion for stage ${stageId} (${dealType})`);
    
    // Get all tasks associated with this stage
    const assignmentTable = dealType === 'rental' ? 'rental_stage_assignments' : 'builder_stage_assignments';
    
    const { data: assignments, error: assignmentError } = await supabase
      .from(assignmentTable)
      .select('task_id')
      .eq('stage_id', stageId);

    if (assignmentError) {
      console.error('Error fetching stage assignments:', assignmentError);
      return false;
    }

    console.log(`Found ${assignments?.length || 0} assignments for stage ${stageId}`);

    if (!assignments || assignments.length === 0) {
      // No tasks assigned to this stage, consider it completed
      console.log(`No assignments found for stage ${stageId}, considering completed`);
      return true;
    }

    const taskIds = assignments.map(a => a.task_id).filter(id => id);
    
    if (taskIds.length === 0) {
      // No valid tasks, consider stage completed
      console.log(`No valid task IDs for stage ${stageId}, considering completed`);
      return true;
    }

    console.log(`Checking completion for tasks: ${taskIds.join(', ')}`);

    // Check if all tasks are completed
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id, status, task_name')
      .in('id', taskIds);

    if (tasksError) {
      console.error('Error fetching tasks:', tasksError);
      return false;
    }

    if (!tasks || tasks.length === 0) {
      console.log(`No tasks found for stage ${stageId}`);
      return false;
    }

    console.log(`Tasks for stage ${stageId}:`, tasks.map(t => ({ id: t.id, status: t.status, name: t.task_name })));

    // All tasks must be completed for the stage to be completed
    const allTasksCompleted = tasks.every(task => task.status === 'completed');
    console.log(`All tasks completed for stage ${stageId}: ${allTasksCompleted}`);
    
    return allTasksCompleted;
  } catch (error) {
    console.error('Error checking stage completion:', error);
    return false;
  }
};

/**
 * Update stage status to completed if all associated tasks are completed
 */
export const updateStageCompletion = async (stageId: string, dealType: 'rental' | 'builder'): Promise<boolean> => {
  try {
    console.log(`Updating stage completion for stage ${stageId} (${dealType})`);
    const isCompleted = await checkStageCompletion(stageId, dealType);
    
    if (isCompleted) {
      const stageTable = dealType === 'rental' ? 'rental_deal_stages' : 'builder_deal_stages';
      
      console.log(`Stage ${stageId} should be completed, updating...`);
      const { error } = await supabase
        .from(stageTable)
        .update({
          status: 'completed',
          actual_end_date: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString()
        })
        .eq('id', stageId);

      if (error) {
        console.error('Error updating stage completion:', error);
        return false;
      }

      console.log(`✅ Stage ${stageId} marked as completed`);
      return true;
    } else {
      console.log(`❌ Stage ${stageId} not ready for completion`);
      return false;
    }
  } catch (error) {
    console.error('Error updating stage completion:', error);
    return false;
  }
};

/**
 * Check if a deal is completed based on all its stages
 */
export const checkDealCompletion = async (dealId: string, dealType: 'rental' | 'builder'): Promise<boolean> => {
  try {
    const stageTable = dealType === 'rental' ? 'rental_deal_stages' : 'builder_deal_stages';
    
    const { data: stages, error: stagesError } = await supabase
      .from(stageTable)
      .select('id, status')
      .eq('deal_id', dealId);

    if (stagesError) {
      console.error('Error fetching deal stages:', stagesError);
      return false;
    }

    if (!stages || stages.length === 0) {
      // No stages, consider deal completed
      return true;
    }

    // All stages must be completed for the deal to be completed
    const allStagesCompleted = stages.every(stage => stage.status === 'completed');
    return allStagesCompleted;
  } catch (error) {
    console.error('Error checking deal completion:', error);
    return false;
  }
};

/**
 * Update deal status to completed if all stages are completed
 */
export const updateDealCompletion = async (dealId: string, dealType: 'rental' | 'builder'): Promise<boolean> => {
  try {
    const isCompleted = await checkDealCompletion(dealId, dealType);
    
    if (isCompleted) {
      const dealTable = dealType === 'rental' ? 'rental_deals' : 'builder_deals';
      
      const { error } = await supabase
        .from(dealTable)
        .update({
          status: 'completed',
          actual_end_date: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString()
        })
        .eq('id', dealId);

      if (error) {
        console.error('Error updating deal completion:', error);
        return false;
      }

      console.log(`Deal ${dealId} marked as completed`);
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error updating deal completion:', error);
    return false;
  }
};

/**
 * Handle task completion and update associated stage and deal
 */
export const handleTaskCompletion = async (taskId: string): Promise<StageCompletionResult> => {
  try {
    console.log(`Handling task completion for task ${taskId}`);
    
    // First, get the task to find associated stages
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('id, project_id, status')
      .eq('id', taskId)
      .single();

    if (taskError || !task) {
      console.error('Error fetching task:', taskError);
      return { stageCompleted: false, dealCompleted: false };
    }

    console.log(`Task ${taskId} status: ${task.status}`);

    // Check for rental stage assignments
    const { data: rentalAssignments } = await supabase
      .from('rental_stage_assignments')
      .select('stage_id, stage:rental_deal_stages(deal_id)')
      .eq('task_id', taskId);

    // Check for builder stage assignments
    const { data: builderAssignments } = await supabase
      .from('builder_stage_assignments')
      .select('stage_id, stage:builder_deal_stages(deal_id)')
      .eq('task_id', taskId);

    let stageCompleted = false;
    let dealCompleted = false;
    let stageId: string | undefined;
    let dealId: string | undefined;
    let dealType: 'rental' | 'builder' | undefined;

    // Handle rental deal stages
    if (rentalAssignments && rentalAssignments.length > 0) {
      console.log(`Found ${rentalAssignments.length} rental assignments for task ${taskId}`);
      for (const assignment of rentalAssignments) {
        if (assignment.stage_id && assignment.stage) {
          stageId = assignment.stage_id;
          dealId = assignment.stage.deal_id;
          dealType = 'rental';
          
          console.log(`Processing rental stage ${stageId} for deal ${dealId}`);
          const stageResult = await updateStageCompletion(stageId, 'rental');
          if (stageResult) {
            stageCompleted = true;
            console.log(`Stage ${stageId} completed`);
            
            // Check if deal is now completed
            const dealResult = await updateDealCompletion(dealId, 'rental');
            if (dealResult) {
              dealCompleted = true;
              console.log(`Deal ${dealId} completed`);
            }
          }
        }
      }
    }

    // Handle builder deal stages
    if (builderAssignments && builderAssignments.length > 0) {
      console.log(`Found ${builderAssignments.length} builder assignments for task ${taskId}`);
      for (const assignment of builderAssignments) {
        if (assignment.stage_id && assignment.stage) {
          stageId = assignment.stage_id;
          dealId = assignment.stage.deal_id;
          dealType = 'builder';
          
          console.log(`Processing builder stage ${stageId} for deal ${dealId}`);
          const stageResult = await updateStageCompletion(stageId, 'builder');
          if (stageResult) {
            stageCompleted = true;
            console.log(`Stage ${stageId} completed`);
            
            // Check if deal is now completed
            const dealResult = await updateDealCompletion(dealId, 'builder');
            if (dealResult) {
              dealCompleted = true;
              console.log(`Deal ${dealId} completed`);
            }
          }
        }
      }
    }

    return {
      stageCompleted,
      dealCompleted,
      stageId,
      dealId,
      dealType
    };
  } catch (error) {
    console.error('Error handling task completion:', error);
    return { stageCompleted: false, dealCompleted: false };
  }
};

/**
 * Directly sync task status with stage status
 */
export const syncTaskStatusWithStage = async (taskId: string): Promise<StageCompletionResult> => {
  try {
    console.log(`🔄 Syncing task status with stage for task ${taskId}`);
    
    // Get the task details
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('id, status, task_name, priority, due_date')
      .eq('id', taskId)
      .single();

    if (taskError || !task) {
      console.error('❌ Error fetching task:', taskError);
      return { stageCompleted: false, dealCompleted: false };
    }

    console.log(`📋 Task ${taskId} status: ${task.status}`);

    // Check for rental stage assignments
    const { data: rentalAssignments } = await supabase
      .from('rental_stage_assignments')
      .select('stage_id, stage:rental_deal_stages(deal_id)')
      .eq('task_id', taskId);

    // Check for builder stage assignments
    const { data: builderAssignments } = await supabase
      .from('builder_stage_assignments')
      .select('stage_id, stage:builder_deal_stages(deal_id)')
      .eq('task_id', taskId);

    let stageUpdated = false;
    let dealUpdated = false;
    let stageId: string | undefined;
    let dealId: string | undefined;
    let dealType: 'rental' | 'builder' | undefined;

    // Handle rental deal stages
    if (rentalAssignments && rentalAssignments.length > 0) {
      console.log(`🏠 Found ${rentalAssignments.length} rental assignments`);
      for (const assignment of rentalAssignments) {
        if (assignment.stage_id && assignment.stage) {
          stageId = assignment.stage_id;
          dealId = assignment.stage.deal_id;
          dealType = 'rental';
          
          // Update stage status to match task status directly
          const stageStatus = task.status === 'completed' ? 'completed' : 
                             task.status === 'in_progress' ? 'in_progress' : 'pending';
          
          console.log(`🔄 Updating rental stage ${stageId} to status: ${stageStatus}`);
          
          const { error: stageError } = await supabase
            .from('rental_deal_stages')
            .update({
              status: stageStatus,
              actual_end_date: task.status === 'completed' ? new Date().toISOString().split('T')[0] : null,
              updated_at: new Date().toISOString()
            })
            .eq('id', stageId);

          if (stageError) {
            console.error('❌ Error updating rental stage:', stageError);
          } else {
            stageUpdated = true;
            console.log(`✅ Rental stage ${stageId} status updated to ${stageStatus}`);
          }
        }
      }
    }

    // Handle builder deal stages
    if (builderAssignments && builderAssignments.length > 0) {
      console.log(`🏗️ Found ${builderAssignments.length} builder assignments`);
      for (const assignment of builderAssignments) {
        if (assignment.stage_id && assignment.stage) {
          stageId = assignment.stage_id;
          dealId = assignment.stage.deal_id;
          dealType = 'builder';
          
          // Update stage status to match task status directly
          const stageStatus = task.status === 'completed' ? 'completed' : 
                             task.status === 'in_progress' ? 'in_progress' : 'pending';
          
          console.log(`🔄 Updating builder stage ${stageId} to status: ${stageStatus}`);
          
          const { error: stageError } = await supabase
            .from('builder_deal_stages')
            .update({
              status: stageStatus,
              actual_end_date: task.status === 'completed' ? new Date().toISOString().split('T')[0] : null,
              updated_at: new Date().toISOString()
            })
            .eq('id', stageId);

          if (stageError) {
            console.error('❌ Error updating builder stage:', stageError);
          } else {
            stageUpdated = true;
            console.log(`✅ Builder stage ${stageId} status updated to ${stageStatus}`);
          }
        }
      }
    }

    console.log(`📊 Sync result: stageUpdated=${stageUpdated}, dealUpdated=${dealUpdated}`);
    return {
      stageCompleted: stageUpdated,
      dealCompleted: dealUpdated,
      stageId,
      dealId,
      dealType
    };
  } catch (error) {
    console.error('❌ Error syncing task status with stage:', error);
    return { stageCompleted: false, dealCompleted: false };
  }
};

/**
 * Manually sync all completed tasks with their stages
 */
export const syncAllCompletedTasksWithStages = async (): Promise<void> => {
  try {
    console.log('🔄 Syncing all completed tasks with their stages...');
    
    // Get all completed tasks that have stage assignments
    const { data: completedTasks, error: tasksError } = await supabase
      .from('tasks')
      .select(`
        id,
        status,
        task_name,
        rental_stage_assignments!inner(stage_id),
        builder_stage_assignments!inner(stage_id)
      `)
      .eq('status', 'completed');

    if (tasksError) {
      console.error('❌ Error fetching completed tasks:', tasksError);
      return;
    }

    console.log(`📋 Found ${completedTasks?.length || 0} completed tasks`);

    for (const task of completedTasks || []) {
      console.log(`🔄 Syncing task ${task.id} (${task.task_name})`);
      await syncTaskStatusWithStage(task.id);
    }

    console.log('✅ Completed syncing all tasks with stages');
  } catch (error) {
    console.error('❌ Error syncing all completed tasks:', error);
  }
};

/**
 * Get detailed task information for timeline display
 */
export const getTaskDetailsForStage = async (stageId: string, dealType: 'rental' | 'builder') => {
  try {
    const assignmentTable = dealType === 'rental' ? 'rental_stage_assignments' : 'builder_stage_assignments';
    
    const { data: assignments, error: assignmentError } = await supabase
      .from(assignmentTable)
      .select(`
        task_id,
        member_id,
        members:member_id(name),
        tasks:task_id(
          id,
          task_name,
          status,
          priority,
          due_date,
          description,
          progress
        )
      `)
      .eq('stage_id', stageId);

    if (assignmentError) {
      console.error('Error fetching task details:', assignmentError);
      return [];
    }

    return assignments || [];
  } catch (error) {
    console.error('Error getting task details for stage:', error);
    return [];
  }
};

/**
 * Handle task reopening and update associated stage and deal
 */
export const handleTaskReopening = async (taskId: string): Promise<StageCompletionResult> => {
  try {
    console.log(`Handling task reopening for task ${taskId}`);
    
    // Get the task to find associated stages
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('id, project_id, status')
      .eq('id', taskId)
      .single();

    if (taskError || !task) {
      console.error('Error fetching task:', taskError);
      return { stageCompleted: false, dealCompleted: false };
    }

    console.log(`Task ${taskId} status: ${task.status}`);

    // Check for rental stage assignments
    const { data: rentalAssignments } = await supabase
      .from('rental_stage_assignments')
      .select('stage_id, stage:rental_deal_stages(deal_id)')
      .eq('task_id', taskId);

    // Check for builder stage assignments
    const { data: builderAssignments } = await supabase
      .from('builder_stage_assignments')
      .select('stage_id, stage:builder_deal_stages(deal_id)')
      .eq('task_id', taskId);

    let stageReopened = false;
    let dealReopened = false;
    let stageId: string | undefined;
    let dealId: string | undefined;
    let dealType: 'rental' | 'builder' | undefined;

    // Handle rental deal stages
    if (rentalAssignments && rentalAssignments.length > 0) {
      for (const assignment of rentalAssignments) {
        if (assignment.stage_id && assignment.stage) {
          stageId = assignment.stage_id;
          dealId = assignment.stage.deal_id;
          dealType = 'rental';
          
          // Reopen stage if it was completed
          const { error: stageError } = await supabase
            .from('rental_deal_stages')
            .update({
              status: 'in_progress',
              actual_end_date: null,
              updated_at: new Date().toISOString()
            })
            .eq('id', stageId)
            .eq('status', 'completed');

          if (!stageError) {
            stageReopened = true;
            console.log(`Stage ${stageId} reopened`);
          }

          // Reopen deal if it was completed
          const { error: dealError } = await supabase
            .from('rental_deals')
            .update({
              status: 'in_progress',
              actual_end_date: null,
              updated_at: new Date().toISOString()
            })
            .eq('id', dealId)
            .eq('status', 'completed');

          if (!dealError) {
            dealReopened = true;
            console.log(`Deal ${dealId} reopened`);
          }
        }
      }
    }

    // Handle builder deal stages
    if (builderAssignments && builderAssignments.length > 0) {
      for (const assignment of builderAssignments) {
        if (assignment.stage_id && assignment.stage) {
          stageId = assignment.stage_id;
          dealId = assignment.stage.deal_id;
          dealType = 'builder';
          
          // Reopen stage if it was completed
          const { error: stageError } = await supabase
            .from('builder_deal_stages')
            .update({
              status: 'in_progress',
              actual_end_date: null,
              updated_at: new Date().toISOString()
            })
            .eq('id', stageId)
            .eq('status', 'completed');

          if (!stageError) {
            stageReopened = true;
            console.log(`Stage ${stageId} reopened`);
          }

          // Reopen deal if it was completed
          const { error: dealError } = await supabase
            .from('builder_deals')
            .update({
              status: 'in_progress',
              actual_end_date: null,
              updated_at: new Date().toISOString()
            })
            .eq('id', dealId)
            .eq('status', 'completed');

          if (!dealError) {
            dealReopened = true;
            console.log(`Deal ${dealId} reopened`);
          }
        }
      }
    }

    return {
      stageCompleted: stageReopened,
      dealCompleted: dealReopened,
      stageId,
      dealId,
      dealType
    };
  } catch (error) {
    console.error('Error handling task reopening:', error);
    return { stageCompleted: false, dealCompleted: false };
  }
};
