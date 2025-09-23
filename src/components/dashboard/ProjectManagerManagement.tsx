import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Plus, Trash2, Edit2, Folder, Link, Unlink, Users } from 'lucide-react';
import { ProjectManager, Project } from '../../types';
import { authService } from '../../services/auth';
import { supabase } from '../../lib/supabase';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Modal from '../ui/Modal';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';

interface ProjectManagerAssignment {
  id: string;
  project_manager_id: string;
  project_id: string;
  assigned_at: string;
  assigned_by: string;
  is_active: boolean;
  project?: Project;
  project_manager?: ProjectManager;
}

const ProjectManagerForm: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: Partial<ProjectManager>;
}> = ({ isOpen, onClose, onSuccess, initialData }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    department: '',
    hire_date: '',
  });
  const [adminPassword, setAdminPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        email: initialData.email || '',
        password: '',
        phone: initialData.phone || '',
        department: initialData.department || '',
        hire_date: initialData.hire_date || '',
      });
    } else {
      setFormData({ name: '', email: '', password: '', phone: '', department: '', hire_date: '' });
    }
    setAdminPassword('');
  }, [initialData, isOpen]);

  const isEdit = !!initialData;

  const checkProjectManagerEmailExists = async (email: string) => {
    try {
      const projectManagers = await authService.getProjectManagers();
      return projectManagers.some(pm => pm.email.toLowerCase() === email.toLowerCase());
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (isEdit && initialData?.id) {
        const updates: any = { ...formData };
        delete updates.password;
        if (!formData.password) delete updates.password;
        await authService.updateProjectManager(initialData.id, updates);
      } else {
        const exists = await checkProjectManagerEmailExists(formData.email);
        if (exists) {
          setError('Email already exists');
          setLoading(false);
          return;
        }
        if (!formData.password || formData.password.length < 6) {
          setError('Password must be at least 6 characters');
          setLoading(false);
          return;
        }
        if (!adminPassword) {
          setError('Please enter your password to confirm.');
          setLoading(false);
          return;
        }
        const ok = await authService.verifyAdminPassword(user.id, adminPassword);
        if (!ok) {
          setError('Your password is incorrect.');
          setLoading(false);
          return;
        }
        await authService.createProjectManager(formData);
      }
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save project manager');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const departments = [
    'Engineering',
    'Design',
    'Marketing',
    'Sales',
    'HR',
    'Finance',
    'Operations',
    'Project Management'
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose}
      title={isEdit ? 'Edit Project Manager' : 'Add New Project Manager'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Full Name *
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email Address *
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {isEdit ? 'New Password (leave blank to keep current)' : 'Password *'}
          </label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required={!isEdit}
            placeholder={isEdit ? 'Leave blank to keep current password' : 'Enter password'}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone Number
          </label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Department
          </label>
          <select
            name="department"
            value={formData.department}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select Department</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Hire Date
          </label>
          <input
            type="date"
            name="hire_date"
            value={formData.hire_date}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {!isEdit && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Your Password (for confirmation) *
            </label>
            <input
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              placeholder="Enter your admin password to confirm"
            />
          </div>
        )}

        <div className="flex justify-end space-x-3 pt-4">
          <Button variant="outline" onClick={onClose} disabled={loading} type="button">
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving...' : isEdit ? 'Update Project Manager' : 'Create Project Manager'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

const ProjectAssignmentModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  projectManager: ProjectManager | null;
  onSuccess: () => void;
}> = ({ isOpen, onClose, projectManager, onSuccess }) => {
  const { user } = useAuth();
  

  const [projects, setProjects] = useState<Project[]>([]);
  const [assignments, setAssignments] = useState<ProjectManagerAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen && projectManager) {
      fetchData();
    }
  }, [isOpen, projectManager]);

  const fetchData = async () => {
    if (!projectManager) return;
    
    setLoading(true);
    try {
      // Fetch all projects
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .order('name');
      
      if (projectsError) {
        console.error('Error fetching projects:', projectsError);
      }
      
      // Fetch current assignments for this project manager
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('project_manager_assignments')
        .select(`
          *,
          project:projects(*)
        `)
        .eq('project_manager_id', projectManager.id)
        .eq('is_active', true);

      if (assignmentsError) {
        console.error('Error fetching assignments:', assignmentsError);
      }

      setProjects(projectsData || []);
      setAssignments(assignmentsData || []);
      setSelectedProjects((assignmentsData || []).map(a => a.project_id));
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!projectManager) return;
    
    // Check if user is an admin
    if (!user || user.role !== 'admin') {
      toast.error('Only admins can assign projects to project managers');
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      // Get current assignments
      const currentAssignments = assignments.map(a => a.project_id);
      
      // Projects to assign (new selections)
      const projectsToAssign = selectedProjects.filter(projectId => 
        !currentAssignments.includes(projectId)
      );
      
      // Projects to unassign (removed from selections)
      const projectsToUnassign = currentAssignments.filter(projectId => 
        !selectedProjects.includes(projectId)
      );

      // Unassign projects
      if (projectsToUnassign.length > 0) {
        await supabase
          .from('project_manager_assignments')
          .update({ is_active: false })
          .eq('project_manager_id', projectManager.id)
          .in('project_id', projectsToUnassign);
      }

      // Assign new projects
      if (projectsToAssign.length > 0) {
        const assignedBy = user?.id || null;
        
        // Verify that the user ID exists in the admins table
        if (!assignedBy) {
          throw new Error('User ID is required for assignment');
        }
        
        const { data: adminCheck, error: adminCheckError } = await supabase
          .from('admins')
          .select('id')
          .eq('id', assignedBy)
          .single();
        
        if (adminCheckError || !adminCheck) {
          throw new Error('User not found in admins table');
        }
        
        const newAssignments = projectsToAssign.map(projectId => ({
          project_manager_id: projectManager.id,
          project_id: projectId,
          assigned_by: assignedBy
        }));

        const assignResult = await supabase
          .from('project_manager_assignments')
          .upsert(newAssignments, { onConflict: 'project_manager_id,project_id' });
        
        if (assignResult.error) {
          throw new Error(assignResult.error.message);
        }
      }

      toast.success('Project assignments updated successfully');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error updating assignments:', error);
      toast.error('Failed to update project assignments');
    } finally {
      setLoading(false);
    }
  };

  const handleProjectToggle = (projectId: string) => {
    setSelectedProjects(prev => 
      prev.includes(projectId) 
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    );
  };

  if (!projectManager) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Assign Projects to ${projectManager.name}`}>
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading projects...</p>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Select Projects</h3>
              <p className="text-sm text-gray-600">
                Check the projects you want to assign to {projectManager.name}
              </p>
            </div>

            <div className="max-h-96 overflow-y-auto space-y-2">
              {projects.map(project => (
                <label key={project.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedProjects.includes(project.id)}
                    onChange={() => handleProjectToggle(project.id)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{project.name}</div>
                    {project.client_name && (
                      <div className="text-sm text-gray-500">Client: {project.client_name}</div>
                    )}
                    {project.description && (
                      <div className="text-sm text-gray-500 truncate">{project.description}</div>
                    )}
                  </div>
                </label>
              ))}
            </div>

            {projects.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Folder className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No projects available.</p>
              </div>
            )}
          </>
        )}

        <div className="flex justify-end space-x-3 pt-4">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : 'Save Assignments'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

const ProjectManagerManagement: React.FC = () => {
  const [projectManagers, setProjectManagers] = useState<ProjectManager[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editProjectManager, setEditProjectManager] = useState<ProjectManager | null>(null);
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const [selectedProjectManager, setSelectedProjectManager] = useState<ProjectManager | null>(null);
  const [assignments, setAssignments] = useState<ProjectManagerAssignment[]>([]);

  const fetchProjectManagers = async () => {
    try {
      setLoading(true);
      const data = await authService.getProjectManagers();
      setProjectManagers(data);
    } catch (err) {
      setError('Failed to fetch project managers');
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignments = async () => {
    try {
      const { data, error } = await supabase
        .from('project_manager_assignments')
        .select(`
          *,
          project:projects(*),
          project_manager:project_managers(*)
        `)
        .eq('is_active', true)
        .order('assigned_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching assignments:', error);
      }
      
      setAssignments(data || []);
    } catch (error) {
      console.error('Error fetching assignments:', error);
    }
  };

  useEffect(() => {
    fetchProjectManagers();
    fetchAssignments();
  }, []);

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this project manager?')) {
      try {
        await authService.deleteProjectManager(id);
        await fetchProjectManagers();
        toast.success('Project manager deleted successfully');
      } catch (err) {
        setError('Failed to delete project manager');
        toast.error('Failed to delete project manager');
      }
    }
  };

  const handleEdit = (projectManager: ProjectManager) => {
    setEditProjectManager(projectManager);
    setIsFormOpen(true);
  };

  const handleFormSuccess = () => {
    fetchProjectManagers();
    setEditProjectManager(null);
    toast.success('Project manager saved successfully');
  };

  const handleAssignProjects = (projectManager: ProjectManager) => {
    setSelectedProjectManager(projectManager);
    setAssignmentModalOpen(true);
  };

  const handleAssignmentSuccess = () => {
    fetchAssignments();
  };

  const getAssignedProjects = (projectManagerId: string) => {
    return assignments
      .filter(a => a.project_manager_id === projectManagerId)
      .map(a => a.project)
      .filter(Boolean) as Project[];
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-600 mt-4">Loading project managers...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Header Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Team Leadership Hub</h1>
              <p className="text-gray-600 text-sm">Manage and oversee your project management team</p>
            </div>
          </div>
          <Button
            icon={Plus}
            onClick={() => setIsFormOpen(true)}
            variant="primary"
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-200"
          >
            Add Project Manager
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center space-x-2">
          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
          <span>{error}</span>
        </div>
      )}

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Managers</p>
              <p className="text-2xl font-bold text-gray-900">{projectManagers.length}</p>
            </div>
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Managers</p>
              <p className="text-2xl font-bold text-green-600">{projectManagers.filter(pm => pm.is_active).length}</p>
            </div>
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <User className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Assignments</p>
              <p className="text-2xl font-bold text-purple-600">{assignments.length}</p>
            </div>
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Folder className="w-5 h-5 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Project Managers Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {projectManagers.map(pm => {
          const assignedProjects = getAssignedProjects(pm.id);
          
          return (
            <Card key={pm.id} className="p-6 hover:shadow-lg transition-all duration-200 border border-gray-200 hover:border-blue-300">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg">{pm.name}</h3>
                    <p className="text-sm text-gray-600 flex items-center gap-1">
                      <Mail className="w-4 h-4" />
                      {pm.email}
                    </p>
                    {pm.phone && (
                      <p className="text-sm text-gray-600 flex items-center gap-1">
                        <Phone className="w-4 h-4" />
                        {pm.phone}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    icon={Edit2}
                    onClick={() => handleEdit(pm)}
                    className="hover:bg-blue-50 hover:border-blue-300"
                  >
                    Edit
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    icon={Trash2}
                    onClick={() => handleDelete(pm.id)}
                    className="hover:bg-red-50"
                  >
                    Delete
                  </Button>
                </div>
              </div>

              {pm.department && (
                <div className="mb-3 p-2 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Department:</span> {pm.department}
                  </p>
                </div>
              )}

              {pm.hire_date && (
                <div className="mb-3 p-2 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Hire Date:</span> {new Date(pm.hire_date).toLocaleDateString()}
                  </p>
                </div>
              )}

              <div className="mb-4">
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                  pm.is_active 
                    ? 'bg-green-100 text-green-800 border border-green-200' 
                    : 'bg-red-100 text-red-800 border border-red-200'
                }`}>
                  {pm.is_active ? 'Active' : 'Inactive'}
                </div>
              </div>

              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Folder className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">Assigned Projects ({assignedProjects.length})</span>
                  </div>
                  {assignedProjects.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      icon={Link}
                      onClick={() => handleAssignProjects(pm)}
                      className="text-xs hover:bg-blue-50"
                    >
                      Manage
                    </Button>
                  )}
                </div>
                
                {assignedProjects.length > 0 ? (
                  <div className="space-y-1">
                    {assignedProjects.slice(0, 3).map(project => (
                      <div key={project.id} className="text-xs text-gray-600 bg-blue-50 px-3 py-2 rounded-lg border border-blue-100">
                        {project.name}
                      </div>
                    ))}
                    {assignedProjects.length > 3 && (
                      <div className="text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">
                        +{assignedProjects.length - 3} more projects
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">
                    No projects assigned
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {projectManagers.length === 0 && !loading && (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Project Managers Yet</h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Get started by adding your first project manager to help oversee your projects and team.
          </p>
          <Button
            icon={Plus}
            onClick={() => setIsFormOpen(true)}
            variant="primary"
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          >
            Add Your First Project Manager
          </Button>
        </div>
      )}

      <ProjectManagerForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditProjectManager(null);
        }}
        onSuccess={handleFormSuccess}
        initialData={editProjectManager || undefined}
      />

      <ProjectAssignmentModal
        isOpen={assignmentModalOpen}
        onClose={() => {
          setAssignmentModalOpen(false);
          setSelectedProjectManager(null);
        }}
        projectManager={selectedProjectManager}
        onSuccess={handleAssignmentSuccess}
      />
    </div>
  );
};

export default ProjectManagerManagement;
