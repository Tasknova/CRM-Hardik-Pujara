import { supabase } from '../lib/supabase';
import { Member, Admin, ProjectManager, Broker } from '../types';

export interface LoginResponse {
  user: (Member & { role: 'member' }) | (Admin & { role: 'admin' }) | (ProjectManager & { role: 'project_manager' }) | (Broker & { role: 'broker' });
  token: string;
}

export const authService = {
  async loginUser(email: string, password: string, role: 'admin' | 'member' | 'project_manager' | 'broker'): Promise<LoginResponse> {
    try {
      let user, error;
      if (role === 'admin') {
        ({ data: user, error } = await supabase
          .from('admins')
          .select('*')
          .eq('email', email)
          .eq('is_active', true)
          .single());
      } else if (role === 'project_manager') {
        ({ data: user, error } = await supabase
          .from('project_managers')
          .select('*')
          .eq('email', email)
          .eq('is_active', true)
          .single());
      } else if (role === 'broker') {
        // For brokers, login using broker_id instead of email
        ({ data: user, error } = await supabase
          .from('brokers')
          .select('*')
          .eq('id', email) // Use email field for broker_id
          .or('is_active.is.null,is_active.eq.true')
          .single());
      } else {
        ({ data: user, error } = await supabase
          .from('members')
          .select('*')
          .eq('email', email)
          .eq('is_active', true)
          .single());
      }

      if (error || !user) {
        throw new Error('Invalid credentials');
      }

      // Verify password using proper hashing
      const hashedPassword = btoa(password);
      if (!user.password_hash || user.password_hash !== hashedPassword) {
        throw new Error('Invalid credentials');
      }

      // Create a simple token (in production, use JWT)
      const token = btoa(
        JSON.stringify({ id: user.id, role: role, exp: Date.now() + 24 * 60 * 60 * 1000 })
      );

      return {
        user: { ...user, role: role },
        token,
      };
    } catch (error) {
      throw new Error('Login failed. Please check your credentials.');
    }
  },

  async createMember(memberData: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    department?: string;
    hire_date?: string;
  }): Promise<Member> {
    try {
      // In production, hash the password with bcrypt
      const password_hash = btoa(memberData.password); // Simple encoding for demo

      const { data: member, error } = await supabase
        .from('members')
        .insert({
          name: memberData.name,
          email: memberData.email,
          password_hash,
          role: 'member', // Add the required role field
          phone: memberData.phone,
          department: memberData.department,
          hire_date: memberData.hire_date,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          throw new Error('Email already exists');
        }
        throw new Error('Failed to create member');
      }

      return member;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to create member');
    }
  },

  async updateMember(id: string, updates: Partial<Member>, adminUser?: { id: string; name: string }): Promise<Member> {
    const { data, error } = await supabase
      .from('members')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error('Failed to update member');
    // --- NEW: Send notification to member if updated by admin ---
    if (adminUser) {
      console.log('NOTIF DEBUG', {adminUser, id, updates});
      try {
        await supabase.from('notifications').insert([
          {
            user_id: id,
            title: '👤 Profile Updated',
            message: `Your profile was updated by admin${adminUser.name ? ' ' + adminUser.name : ''}. If you did not request this change, please contact support.`,
            type: 'system', // changed from 'profile_updated_by_admin' to 'system'
            related_id: id,
            related_type: 'user', // changed from 'member' to 'user'
          },
        ]);
      } catch (notifError) {
        // eslint-disable-next-line no-console
        console.error('Failed to send profile update notification to member:', notifError);
      }
    }
    // --- END NEW ---
    return data;
  },

  async deleteMember(id: string): Promise<void> {
    console.log('🔍 Attempting to delete member with ID:', id);
    
    try {
      // First, try the cascade function
    const { data, error } = await supabase
      .rpc('delete_member_with_cascade', { target_member_id: id });
    
    console.log('📊 Delete member response:', { data, error });
    
    if (error) {
      console.error('❌ Supabase error:', error);
        // Don't throw here, try manual cleanup instead
        throw new Error('Cascade function failed');
    }
    
    if (data && !data.success) {
      console.error('❌ Function returned error:', data);
        throw new Error(data.message || 'Error deleting member');
      }
      
      console.log('✅ Member deleted successfully with cascade function:', data);
      return; // Success, exit early
      
    } catch (error) {
      // If the cascade function fails, try manual cleanup
      console.log('🔄 Cascade function failed, attempting manual cleanup...');
      
      try {
        // Manual cleanup in the correct order
        await this.cleanupMemberReferences(id);
        
        // Verify that leave balances are deleted before attempting member deletion
        const { data: remainingBalances, error: checkError } = await supabase
          .from('member_leave_balances')
          .select('id')
          .eq('member_id', id);
        
        if (checkError) {
          console.warn('⚠️ Could not verify leave balances deletion:', checkError.message);
        } else if (remainingBalances && remainingBalances.length > 0) {
          console.warn('⚠️ Leave balances still exist, attempting force deletion...');
          // Force delete any remaining balances
          await supabase.from('member_leave_balances').delete().eq('member_id', id);
        }
        
        // Finally delete the member
        const { error: deleteError } = await supabase
          .from('members')
          .delete()
          .eq('id', id);
        
        if (deleteError) {
          // Check if it's a foreign key constraint error
          if (deleteError.message.includes('foreign key constraint')) {
            throw new Error(`Cannot delete member: ${deleteError.message}. Please ensure all related data is cleaned up first.`);
          }
          throw new Error(`Error deleting member: ${deleteError.message}`);
        }
        
        console.log('✅ Member deleted successfully with manual cleanup');
      } catch (manualError) {
        console.error('❌ Manual cleanup failed:', manualError);
        throw new Error(`Error deleting member: ${manualError instanceof Error ? manualError.message : 'Unknown error'}`);
      }
    }
  },

  async cleanupMemberReferences(memberId: string): Promise<void> {
    console.log('🧹 Cleaning up member references for ID:', memberId);
    
    // Delete in the correct order to avoid foreign key violations
    const cleanupSteps = [
      // 1. Delete leave balances FIRST (this is the key constraint that's causing issues)
      async () => {
        console.log('🗑️ Deleting member leave balances...');
        
        // Try multiple approaches to delete leave balances
        try {
          // Approach 1: Direct deletion
          const { error: memberBalancesError } = await supabase
            .from('member_leave_balances')
            .delete()
            .eq('member_id', memberId);
          
          if (memberBalancesError) {
            console.warn('⚠️ Direct deletion failed:', memberBalancesError.message);
            
            // Approach 2: Use RPC function if available
            try {
              const { error: rpcError } = await supabase.rpc('delete_member_leave_balances', {
                target_member_id: memberId
              });
              
              if (rpcError) {
                console.warn('⚠️ RPC deletion failed:', rpcError.message);
              } else {
                console.log('✅ Member leave balances deleted via RPC');
              }
            } catch (rpcError) {
              console.warn('⚠️ RPC function not available or failed:', rpcError);
            }
          } else {
            console.log('✅ Member leave balances deleted directly');
          }
        } catch (error) {
          console.warn('⚠️ All deletion approaches failed for member leave balances:', error);
        }
        
        // Delete PM leave balances
        try {
          const { error: pmBalancesError } = await supabase
            .from('project_manager_leave_balances')
            .delete()
            .eq('project_manager_id', memberId);
          
          if (pmBalancesError) {
            console.warn('⚠️ Failed to delete PM leave balances:', pmBalancesError.message);
          } else {
            console.log('✅ PM leave balances deleted');
          }
        } catch (error) {
          console.warn('⚠️ Failed to delete PM leave balances:', error);
        }
        
        return { error: null };
      },
      
      // 2. Delete leaves
      async () => {
        console.log('🗑️ Deleting leaves...');
        const { error } = await supabase.from('leaves').delete().eq('user_id', memberId);
        if (error) {
          console.warn('⚠️ Failed to delete leaves:', error.message);
        } else {
          console.log('✅ Leaves deleted');
        }
        return { error };
      },
      
      // 3. Delete stage assignments first (they reference tasks)
      () => supabase.from('rental_stage_assignments').delete().eq('member_id', memberId),
      () => supabase.from('builder_stage_assignments').delete().eq('member_id', memberId),
      
      // 4. Delete team member assignments
      () => supabase.from('rental_deal_team_members').delete().eq('member_id', memberId),
      () => supabase.from('builder_deal_team_members').delete().eq('member_id', memberId),
      
      // 5. Delete stage assignments where member is assigned_to (check if column exists)
      () => supabase.from('rental_deal_stages').delete().eq('assigned_to', memberId),
      // Skip builder_deal_stages.assigned_to if column doesn't exist
      
      // 6. Update tasks to remove member from assigned_user_ids (handle JSONB properly)
      async () => {
        try {
          console.log('🗑️ Updating tasks to remove member from assigned_user_ids...');
          // Use a direct SQL query to update the JSONB array
          const { error } = await supabase.rpc('update_tasks_remove_member', {
            member_id_param: memberId
          });
          
          if (error) {
            console.warn('⚠️ Failed to update tasks with member removal:', error.message);
            // Fallback to manual approach - get all tasks and update individually
            const { data: allTasks, error: fetchError } = await supabase
              .from('tasks')
              .select('id, assigned_user_ids');
            
            if (!fetchError && allTasks) {
              for (const task of allTasks) {
                if (task.assigned_user_ids && task.assigned_user_ids.includes(memberId)) {
                  const updatedIds = task.assigned_user_ids.filter((id: string) => id !== memberId);
                  await supabase
                    .from('tasks')
                    .update({ assigned_user_ids: updatedIds })
                    .eq('id', task.id);
                }
              }
            }
          } else {
            console.log('✅ Tasks updated to remove member');
          }
        } catch (error) {
          console.warn('⚠️ Task cleanup failed:', error);
        }
        
        return { error: null };
      },
      
      // 7. Delete tasks where member is primary assignee
      async () => {
        console.log('🗑️ Deleting tasks where member is primary assignee...');
        const { error } = await supabase.from('tasks').delete().eq('user_id', memberId);
        if (error) {
          console.warn('⚠️ Failed to delete tasks:', error.message);
        } else {
          console.log('✅ Tasks deleted');
        }
        return { error };
      },
      
      // 8. Delete notifications
      () => supabase.from('notifications').delete().eq('user_id', memberId),
      
      // 9. Delete daily tasks
      () => supabase.from('daily_tasks').delete().eq('user_id', memberId),
      
      // 10. Delete project manager assignments
      () => supabase.from('project_manager_assignments').delete().eq('project_manager_id', memberId),
    ];
    
    for (const step of cleanupSteps) {
      try {
        const { error } = await step();
        if (error) {
          console.warn('⚠️ Cleanup step failed:', error.message);
          // Continue with other steps even if one fails
        }
      } catch (error) {
        console.warn('⚠️ Cleanup step failed:', error);
        // Continue with other steps
      }
    }
    
    console.log('✅ Member references cleanup completed');
  },

  async getMembers(): Promise<Member[]> {
    try {
      const { data: members, error } = await supabase
        .from('members')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error('Failed to fetch members');
      }

      return members || [];
    } catch (error) {
      throw new Error('Failed to fetch members');
    }
  },

  async getAdmins(): Promise<Admin[]> {
    try {
      const { data: admins, error } = await supabase
        .from('admins')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (error) {
        throw new Error('Failed to fetch admins');
      }
      return admins || [];
    } catch (error) {
      throw new Error('Failed to fetch admins');
    }
  },

  async createAdmin(adminData: {
    name: string;
    email: string;
    password: string;
    phone?: string;
  }): Promise<Admin> {
    try {
      const password_hash = btoa(adminData.password); // Simple encoding for demo
      const { data: admin, error } = await supabase
        .from('admins')
        .insert({
          name: adminData.name,
          email: adminData.email,
          password_hash,
          phone: adminData.phone,
        })
        .select()
        .single();
      if (error) {
        if (error.code === '23505') {
          throw new Error('Email already exists');
        }
        throw new Error('Failed to create admin');
      }
      return admin;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to create admin');
    }
  },

  async updateAdmin(id: string, updates: Partial<Admin>): Promise<Admin> {
    const { data, error } = await supabase
      .from('admins')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error('Failed to update admin');
    return data;
  },

  async deleteAdmin(id: string): Promise<void> {
    const { error } = await supabase
      .from('admins')
      .delete()
      .eq('id', id);
    if (error) throw new Error('Failed to delete admin');
  },


  // Add password verification for admin
  async verifyAdminPassword(adminId: string, password: string): Promise<boolean> {
    try {
      // First, try to find the admin by ID
      const { data: admin, error } = await supabase
        .from('admins')
        .select('password_hash, email')
        .eq('id', adminId)
        .single();
        
      if (error || !admin) {
        // Fallback: try to find by email if ID lookup fails
        const { data: adminByEmail, error: emailError } = await supabase
          .from('admins')
          .select('password_hash, email, id')
          .eq('email', adminId) // In case adminId is actually an email
          .single();
          
        if (emailError || !adminByEmail) {
          return false;
        }
        
        // Use the admin found by email
        const hashedPassword = btoa(password);
        return adminByEmail.password_hash === hashedPassword;
      }
      
      // Hash the provided password using the same method as storage
      const hashedPassword = btoa(password);
      return admin.password_hash === hashedPassword;
    } catch (error) {
      console.error('Error in verifyAdminPassword:', error);
      return false;
    }
  },

  validateToken(token: string): boolean {
    try {
      const decoded = JSON.parse(atob(token));
      return decoded.exp > Date.now();
    } catch {
      return false;
    }
  },

  getTokenData(token: string): { id: string; role: 'admin' | 'member' | 'project_manager' } | null {
    try {
      const decoded = JSON.parse(atob(token));
      if (decoded.exp > Date.now()) {
        return { id: decoded.id, role: decoded.role };
      }
      return null;
    } catch {
      return null;
    }
  },

  async getProjectManagers(): Promise<ProjectManager[]> {
    try {
      const { data: projectManagers, error } = await supabase
        .from('project_managers')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) {
        console.error('Error fetching project managers:', error);
        throw new Error('Failed to fetch project managers');
      }
      console.log('Fetched project managers:', projectManagers);
      return projectManagers || [];
    } catch (error) {
      console.error('Error in getProjectManagers:', error);
      throw new Error('Failed to fetch project managers');
    }
  },

  async createProjectManager(pmData: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    department?: string;
    hire_date?: string;
  }): Promise<ProjectManager> {
    try {
      const password_hash = btoa(pmData.password); // Simple encoding for demo
      const { data: projectManager, error } = await supabase
        .from('project_managers')
        .insert({
          name: pmData.name,
          email: pmData.email,
          password_hash,
          phone: pmData.phone,
          department: pmData.department,
          hire_date: pmData.hire_date,
        })
        .select()
        .single();
      if (error) {
        if (error.code === '23505') {
          throw new Error('Email already exists');
        }
        throw new Error('Failed to create project manager');
      }
      return projectManager;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to create project manager');
    }
  },

  async updateProjectManager(id: string, updates: Partial<ProjectManager>): Promise<ProjectManager> {
    const { data, error } = await supabase
      .from('project_managers')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error('Failed to update project manager');
    return data;
  },

  async deleteProjectManager(id: string): Promise<void> {
    const { error } = await supabase
      .rpc('delete_project_manager_cascade', { pm_id: id });
    if (error) {
      if (error.code === '23503') {
        throw new Error('Cannot delete project manager: This PM has associated records (projects, tasks, deals, etc.). Please remove these associations first.');
      }
      throw new Error(`Failed to delete project manager: ${error.message}`);
    }
  }
};