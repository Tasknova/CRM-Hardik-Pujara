import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Building, Calendar } from 'lucide-react';
import { authService } from '../../services/auth';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { Member, ProjectManager } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

interface MemberFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: Partial<Member> | Partial<ProjectManager>;
  isProjectManager?: boolean;
}

const MemberForm: React.FC<MemberFormProps> = ({ isOpen, onClose, onSuccess, initialData, isProjectManager = false }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    department: '',
    hire_date: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAuth();

  // Use the prop to determine if this is for a Project Manager

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
      setFormData({
        name: '',
        email: '',
        password: '',
        phone: '',
        department: '',
        hire_date: '',
      });
    }
  }, [initialData, isOpen]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen && !initialData) {
      setFormData({
        name: '',
        email: '',
        password: '',
        phone: '',
        department: '',
        hire_date: '',
      });
      setError('');
    }
  }, [isOpen, initialData]);

  const isEdit = !!initialData;

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
        
        if (isProjectManager) {
          await authService.updateProjectManager(initialData.id, updates);
        } else {
          await authService.updateMember(initialData.id, updates, user && user.role === 'admin' ? { id: user.id, name: user.name } : undefined);
        }
      } else {
        if (isProjectManager) {
          await authService.createProjectManager(formData);
        } else {
          await authService.createMember(formData);
        }
      }
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save member');
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
    'Customer Support'
  ];

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={isEdit 
        ? `Edit ${isProjectManager ? 'Project Manager' : 'Team Member'}` 
        : `Add New ${isProjectManager ? 'Project Manager' : 'Team Member'}`
      } 
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name *
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address *
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={isEdit}
              />
            </div>
          </div>
        </div>
        {!isEdit && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password *
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              minLength={6}
              required
            />
            <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
          </div>
        )}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Department
            </label>
            <div className="relative">
              <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <select
                name="department"
                value={formData.department}
                onChange={handleChange}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Department</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Hire Date
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="date"
              name="hire_date"
              value={formData.hire_date}
              onChange={handleChange}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="flex justify-end space-x-3 pt-4">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {isEdit ? 'Update Member' : 'Create Member'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default MemberForm;