import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-toastify';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { Save, RefreshCw } from 'lucide-react';

interface Permission {
  id: string;
  role: 'project_manager' | 'member';
  permission_type: 'task' | 'project';
  action: 'create' | 'update' | 'delete' | 'view';
  is_enabled: boolean;
}

const SettingsPage: React.FC = () => {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [originalPermissions, setOriginalPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch permission settings
  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('permission_settings')
        .select('*')
        .order('role', { ascending: true })
        .order('permission_type', { ascending: true })
        .order('action', { ascending: true });

      if (error) {
        // If table doesn't exist, create default permissions
        if (error.code === 'PGRST116' || error.message.includes('relation "permission_settings" does not exist')) {
          console.log('Permission settings table not found, using default permissions');
          const defaultPermissions = [
            // Project Manager permissions
            { id: '1', role: 'project_manager', permission_type: 'task', action: 'create', is_enabled: true },
            { id: '2', role: 'project_manager', permission_type: 'task', action: 'update', is_enabled: true },
            { id: '3', role: 'project_manager', permission_type: 'task', action: 'delete', is_enabled: true },
            { id: '4', role: 'project_manager', permission_type: 'task', action: 'view', is_enabled: true },
            { id: '5', role: 'project_manager', permission_type: 'project', action: 'create', is_enabled: true },
            { id: '6', role: 'project_manager', permission_type: 'project', action: 'update', is_enabled: true },
            { id: '7', role: 'project_manager', permission_type: 'project', action: 'delete', is_enabled: false },
            { id: '8', role: 'project_manager', permission_type: 'project', action: 'view', is_enabled: true },
            // Member permissions
            { id: '9', role: 'member', permission_type: 'task', action: 'create', is_enabled: true },
            { id: '10', role: 'member', permission_type: 'task', action: 'update', is_enabled: true },
            { id: '11', role: 'member', permission_type: 'task', action: 'delete', is_enabled: false },
            { id: '12', role: 'member', permission_type: 'task', action: 'view', is_enabled: true },
            { id: '13', role: 'member', permission_type: 'project', action: 'create', is_enabled: false },
            { id: '14', role: 'member', permission_type: 'project', action: 'update', is_enabled: false },
            { id: '15', role: 'member', permission_type: 'project', action: 'delete', is_enabled: false },
            { id: '16', role: 'member', permission_type: 'project', action: 'view', is_enabled: true },
          ];
          setPermissions(defaultPermissions);
          setOriginalPermissions(defaultPermissions);
          return;
        }
        throw error;
      }

      setPermissions(data || []);
      setOriginalPermissions(data || []);
    } catch (error) {
      console.error('Error fetching permissions:', error);
      toast.error('Failed to load permission settings');
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionChange = (id: string, isEnabled: boolean) => {
    setPermissions(prev => 
      prev.map(permission => 
        permission.id === id 
          ? { ...permission, is_enabled: isEnabled }
          : permission
      )
    );
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Update each permission
      for (const permission of permissions) {
        const { error } = await supabase
          .from('permission_settings')
          .update({ is_enabled: permission.is_enabled })
          .eq('id', permission.id);
        
        if (error) throw error;
      }
      
      setOriginalPermissions([...permissions]);
      toast.success('Permission settings saved successfully');
    } catch (error) {
      console.error('Error saving permissions:', error);
      toast.error('Failed to save permission settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setPermissions([...originalPermissions]);
    toast.info('Changes reset to last saved state');
  };

  const hasChanges = JSON.stringify(permissions) !== JSON.stringify(originalPermissions);

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  const groupedPermissions = permissions.reduce((acc, permission) => {
    if (!acc[permission.role]) {
      acc[permission.role] = {};
    }
    if (!acc[permission.role][permission.permission_type]) {
      acc[permission.role][permission.permission_type] = [];
    }
    acc[permission.role][permission.permission_type].push(permission);
    return acc;
  }, {} as Record<string, Record<string, Permission[]>>);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Permission Settings</h2>
          <p className="text-gray-600 mt-1">Manage permissions for project managers and team members</p>
        </div>
        <div className="flex space-x-3">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={!hasChanges || saving}
            icon={RefreshCw}
          >
            Reset
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            icon={Save}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Object.entries(groupedPermissions).map(([role, rolePermissions]) => (
          <Card key={role} className="p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 capitalize">
                {role.replace('_', ' ')} Permissions
              </h3>
            </div>
            
            {Object.entries(rolePermissions).map(([permissionType, typePermissions]) => (
              <div key={permissionType} className="mb-6">
                <h4 className="text-md font-medium text-gray-700 mb-3 capitalize">
                  {permissionType} Permissions
                </h4>
                <div className="space-y-3">
                  {typePermissions.map((permission) => (
                    <div key={permission.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <span className="font-medium text-gray-900 capitalize">
                          {permission.action}
                        </span>
                        <p className="text-sm text-gray-600">
                          Allow {role.replace('_', ' ')}s to {permission.action} {permissionType}s
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={permission.is_enabled}
                          onChange={(e) => handlePermissionChange(permission.id, e.target.checked)}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </Card>
        ))}
      </div>

      {hasChanges && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                You have unsaved changes
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>Don't forget to save your changes before navigating away from this page.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
