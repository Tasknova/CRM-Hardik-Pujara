import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Plus, Trash2, Edit2 } from 'lucide-react';
import { ProjectManager } from '../../types';
import { authService } from '../../services/auth';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Modal from '../ui/Modal';
import { useAuth } from '../../contexts/AuthContext';

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
  const [adminPassword, setAdminPassword] = useState(''); // NEW
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

  // Add this function to check if an email already exists in project managers
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
        // Don't send password if blank
        const updates: any = { ...formData };
        delete updates.password;
        if (!formData.password) delete updates.password;
        await authService.updateProjectManager(initialData.id, updates);
      } else {
        // Pre-check for duplicate email
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
        // Require admin password authentication
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

const ProjectManagersList: React.FC = () => {
  const [projectManagers, setProjectManagers] = useState<ProjectManager[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editProjectManager, setEditProjectManager] = useState<ProjectManager | null>(null);

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

  useEffect(() => {
    fetchProjectManagers();
  }, []);

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this project manager?')) {
      try {
        await authService.deleteProjectManager(id);
        await fetchProjectManagers();
      } catch (err) {
        setError('Failed to delete project manager');
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
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Project Managers</h2>
        <Button
          icon={Plus}
          onClick={() => setIsFormOpen(true)}
          variant="primary"
        >
          Add Project Manager
        </Button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {projectManagers.map(pm => (
          <Card key={pm.id} className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{pm.name}</h3>
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
                >
                  Edit
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  icon={Trash2}
                  onClick={() => handleDelete(pm.id)}
                >
                  Delete
                </Button>
              </div>
            </div>

            {pm.department && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-sm text-gray-600">
                  <strong>Department:</strong> {pm.department}
                </p>
              </div>
            )}

            {pm.hire_date && (
              <div className="mt-2">
                <p className="text-sm text-gray-600">
                  <strong>Hire Date:</strong> {new Date(pm.hire_date).toLocaleDateString()}
                </p>
              </div>
            )}

            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                pm.is_active 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {pm.is_active ? 'Active' : 'Inactive'}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {projectManagers.length === 0 && !loading && (
        <div className="text-center py-8 text-gray-500">
          <User className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>No project managers found.</p>
          <p className="text-sm">Click "Add Project Manager" to create the first one.</p>
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
    </div>
  );
};

export default ProjectManagersList;
