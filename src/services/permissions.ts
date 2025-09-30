import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface Permission {
  role: 'project_manager' | 'member';
  permission_type: 'task' | 'project';
  action: 'create' | 'update' | 'delete' | 'view';
  is_enabled: boolean;
}

export class PermissionService {
  private static permissionsCache: Permission[] = [];
  private static cacheTimestamp: number = 0;
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Get all permissions from cache or database
   */
  static async getPermissions(): Promise<Permission[]> {
    const now = Date.now();
    
    // Return cached permissions if still valid
    if (this.permissionsCache.length > 0 && (now - this.cacheTimestamp) < this.CACHE_DURATION) {
      return this.permissionsCache;
    }

    try {
      const { data, error } = await supabase
        .from('permission_settings')
        .select('*');

      if (error) throw error;

      this.permissionsCache = data || [];
      this.cacheTimestamp = now;
      return this.permissionsCache;
    } catch (error) {
      console.error('Error fetching permissions:', error);
      return [];
    }
  }

  /**
   * Check if a user has a specific permission
   */
  static async hasPermission(
    userRole: 'admin' | 'project_manager' | 'member',
    permissionType: 'task' | 'project',
    action: 'create' | 'update' | 'delete' | 'view'
  ): Promise<boolean> {
    // Admins always have all permissions
    if (userRole === 'admin') {
      return true;
    }

    const permissions = await this.getPermissions();
    const permission = permissions.find(
      p => p.role === userRole && 
           p.permission_type === permissionType && 
           p.action === action
    );

    return permission?.is_enabled ?? false;
  }

  /**
   * Check multiple permissions at once
   */
  static async hasPermissions(
    userRole: 'admin' | 'project_manager' | 'member',
    permissionChecks: Array<{
      permissionType: 'task' | 'project';
      action: 'create' | 'update' | 'delete' | 'view';
    }>
  ): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    
    for (const check of permissionChecks) {
      const key = `${check.permissionType}_${check.action}`;
      results[key] = await this.hasPermission(userRole, check.permissionType, check.action);
    }

    return results;
  }

  /**
   * Clear the permissions cache (call this when permissions are updated)
   */
  static clearCache(): void {
    this.permissionsCache = [];
    this.cacheTimestamp = 0;
  }

  /**
   * Get permissions for a specific role
   */
  static async getRolePermissions(role: 'project_manager' | 'member'): Promise<Permission[]> {
    const permissions = await this.getPermissions();
    return permissions.filter(p => p.role === role);
  }

  /**
   * Check if user can create tasks
   */
  static async canCreateTask(userRole: 'admin' | 'project_manager' | 'member'): Promise<boolean> {
    return this.hasPermission(userRole, 'task', 'create');
  }

  /**
   * Check if user can update tasks
   */
  static async canUpdateTask(userRole: 'admin' | 'project_manager' | 'member'): Promise<boolean> {
    return this.hasPermission(userRole, 'task', 'update');
  }

  /**
   * Check if user can delete tasks
   */
  static async canDeleteTask(userRole: 'admin' | 'project_manager' | 'member'): Promise<boolean> {
    return this.hasPermission(userRole, 'task', 'delete');
  }

  /**
   * Check if user can create projects
   */
  static async canCreateProject(userRole: 'admin' | 'project_manager' | 'member'): Promise<boolean> {
    return this.hasPermission(userRole, 'project', 'create');
  }

  /**
   * Check if user can update projects
   */
  static async canUpdateProject(userRole: 'admin' | 'project_manager' | 'member'): Promise<boolean> {
    return this.hasPermission(userRole, 'project', 'update');
  }

  /**
   * Check if user can delete projects
   */
  static async canDeleteProject(userRole: 'admin' | 'project_manager' | 'member'): Promise<boolean> {
    return this.hasPermission(userRole, 'project', 'delete');
  }
}

// React hook for permissions
export const usePermissions = () => {
  const { user } = useAuth();

  const checkPermission = async (
    permissionType: 'task' | 'project',
    action: 'create' | 'update' | 'delete' | 'view'
  ): Promise<boolean> => {
    if (!user) return false;
    return PermissionService.hasPermission(user.role as any, permissionType, action);
  };

  const checkMultiplePermissions = async (
    permissionChecks: Array<{
      permissionType: 'task' | 'project';
      action: 'create' | 'update' | 'delete' | 'view';
    }>
  ): Promise<Record<string, boolean>> => {
    if (!user) return {};
    return PermissionService.hasPermissions(user.role as any, permissionChecks);
  };

  return {
    checkPermission,
    checkMultiplePermissions,
    userRole: user?.role
  };
};

