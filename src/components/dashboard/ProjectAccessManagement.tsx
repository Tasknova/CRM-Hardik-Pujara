import React, { useState, useEffect } from 'react';
import { Key, Copy, Eye, EyeOff, Trash2, Plus, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Modal from '../ui/Modal';
import Badge from '../ui/Badge';
import { toast } from 'sonner';
import bcrypt from 'bcryptjs';

interface ProjectAccessCredential {
  id: string;
  project_id: string;
  access_type: 'client' | 'builder' | 'owner';
  entity_name: string;
  is_active: boolean;
  created_at: string;
  last_accessed_at?: string;
}

interface ProjectAccessManagementProps {
  projectId: string;
  projectName: string;
}

const ProjectAccessManagement: React.FC<ProjectAccessManagementProps> = ({ projectId, projectName }) => {
  const [credentials, setCredentials] = useState<ProjectAccessCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [newCredential, setNewCredential] = useState({
    access_type: 'client' as 'client' | 'builder' | 'owner',
    entity_name: '',
    password: ''
  });
  const [showPasswords, setShowPasswords] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    fetchCredentials();
  }, [projectId]);

  const fetchCredentials = async () => {
    try {
      const { data, error } = await supabase
        .from('project_access_credentials')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCredentials(data || []);
    } catch (error) {
      console.error('Error fetching credentials:', error);
      toast.error('Failed to load project access credentials');
    } finally {
      setLoading(false);
    }
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const createCredential = async () => {
    if (!newCredential.entity_name.trim()) {
      toast.error('Please enter entity name');
      return;
    }

    try {
      const password = newCredential.password || generatePassword();
      const hashedPassword = await bcrypt.hash(password, 10);

      const { data, error } = await supabase
        .from('project_access_credentials')
        .insert({
          project_id: projectId,
          access_type: newCredential.access_type,
          entity_name: newCredential.entity_name.trim(),
          password_hash: hashedPassword
        })
        .select()
        .single();

      if (error) throw error;

      setGeneratedPassword(password);
      setShowCreateModal(false);
      setShowPasswordModal(true);
      setNewCredential({ access_type: 'client', entity_name: '', password: '' });
      fetchCredentials();
    } catch (error) {
      console.error('Error creating credential:', error);
      toast.error('Failed to create project access credential');
    }
  };

  const toggleCredentialStatus = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('project_access_credentials')
        .update({ is_active: !isActive })
        .eq('id', id);

      if (error) throw error;

      setCredentials(prev => 
        prev.map(cred => 
          cred.id === id ? { ...cred, is_active: !isActive } : cred
        )
      );
      toast.success(`Credential ${!isActive ? 'activated' : 'deactivated'}`);
    } catch (error) {
      console.error('Error updating credential:', error);
      toast.error('Failed to update credential status');
    }
  };

  const deleteCredential = async (id: string) => {
    if (!confirm('Are you sure you want to delete this credential?')) return;

    try {
      const { error } = await supabase
        .from('project_access_credentials')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setCredentials(prev => prev.filter(cred => cred.id !== id));
      toast.success('Credential deleted successfully');
    } catch (error) {
      console.error('Error deleting credential:', error);
      toast.error('Failed to delete credential');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const getAccessTypeColor = (type: string) => {
    switch (type) {
      case 'client': return 'bg-blue-100 text-blue-800';
      case 'builder': return 'bg-green-100 text-green-800';
      case 'owner': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getProjectAccessUrl = () => {
    // Use production domain for external sharing
    const isProduction = window.location.hostname !== 'localhost';
    const baseUrl = isProduction ? 'https://propazone.tasknova.io' : window.location.origin;
    return `${baseUrl}/project-access/login`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Project Access Management</h2>
          <p className="text-gray-600">Manage access credentials for {projectName}</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="flex items-center space-x-2">
          <Plus className="w-4 h-4" />
          <span>Create Access</span>
        </Button>
      </div>

      {/* Project Access URL */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">Project Access Login URL</h3>
            <p className="text-sm text-gray-600">Share this URL with clients, builders, and owners</p>
          </div>
          <Button
            variant="outline"
            onClick={() => copyToClipboard(getProjectAccessUrl())}
            className="flex items-center space-x-2"
          >
            <Copy className="w-4 h-4" />
            <span>Copy URL</span>
          </Button>
        </div>
        <div className="mt-2 p-2 bg-gray-50 rounded text-sm font-mono text-gray-700">
          {getProjectAccessUrl()}
        </div>
      </Card>

      {/* Credentials List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Access Credentials</h3>
        {credentials.length === 0 ? (
          <Card className="p-8 text-center">
            <Key className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Access Credentials</h3>
            <p className="text-gray-600 mb-4">Create access credentials to allow external users to view this project.</p>
            <Button onClick={() => setShowCreateModal(true)}>
              Create First Access
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4">
            {credentials.map((credential) => (
              <Card key={credential.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="font-semibold text-gray-900">{credential.entity_name}</h4>
                      <Badge className={getAccessTypeColor(credential.access_type)}>
                        {credential.access_type}
                      </Badge>
                      <Badge className={credential.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                        {credential.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600">
                      <p>Project ID: <span className="font-mono">{projectId}</span></p>
                      <p>Created: {new Date(credential.created_at).toLocaleDateString()}</p>
                      {credential.last_accessed_at && (
                        <p>Last accessed: {new Date(credential.last_accessed_at).toLocaleDateString()}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleCredentialStatus(credential.id, credential.is_active)}
                    >
                      {credential.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteCredential(credential.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Credential Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Project Access"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Access Type
            </label>
            <select
              value={newCredential.access_type}
              onChange={(e) => setNewCredential(prev => ({ ...prev, access_type: e.target.value as any }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="client">Client</option>
              <option value="builder">Builder</option>
              <option value="owner">Owner</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Entity Name
            </label>
            <input
              type="text"
              value={newCredential.entity_name}
              onChange={(e) => setNewCredential(prev => ({ ...prev, entity_name: e.target.value }))}
              placeholder="Enter client/builder/owner name"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password (Optional)
            </label>
            <input
              type="text"
              value={newCredential.password}
              onChange={(e) => setNewCredential(prev => ({ ...prev, password: e.target.value }))}
              placeholder="Leave empty to auto-generate"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              If left empty, a secure password will be auto-generated
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button onClick={createCredential}>
              Create Access
            </Button>
          </div>
        </div>
      </Modal>

      {/* Generated Password Modal */}
      <Modal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        title="Access Credentials Created"
        size="md"
      >
        <div className="space-y-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="font-semibold text-green-800">Access credentials created successfully!</span>
            </div>
            <p className="text-sm text-green-700">
              Share these credentials with the user to grant them access to this project.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Project ID
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={projectId}
                readOnly
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 font-mono"
              />
              <Button
                variant="outline"
                onClick={() => copyToClipboard(projectId)}
                className="flex items-center space-x-1"
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={generatedPassword}
                readOnly
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 font-mono"
              />
              <Button
                variant="outline"
                onClick={() => copyToClipboard(generatedPassword)}
                className="flex items-center space-x-1"
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Important:</strong> Save these credentials securely. The password cannot be recovered if lost.
            </p>
          </div>

          <div className="flex justify-end pt-4">
            <Button onClick={() => setShowPasswordModal(false)}>
              Done
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ProjectAccessManagement;
