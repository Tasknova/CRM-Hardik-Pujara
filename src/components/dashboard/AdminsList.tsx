import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Plus, Trash2, Edit2 } from 'lucide-react';
import { Admin } from '../../types';
import { authService } from '../../services/auth';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Modal from '../ui/Modal';
import { useAuth } from '../../contexts/AuthContext';

const AdminForm: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: Partial<Admin>;
}> = ({ isOpen, onClose, onSuccess, initialData }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
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
      });
    } else {
      setFormData({ name: '', email: '', password: '', phone: '' });
    }
    setAdminPassword('');
  }, [initialData, isOpen]);

  const isEdit = !!initialData;

  // Add this function to check if an email already exists in admins
  const checkAdminEmailExists = async (email: string) => {
    try {
      const admins = await authService.getAdmins();
      return admins.some(a => a.email.toLowerCase() === email.toLowerCase());
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
        await authService.updateAdmin(initialData.id, updates);
      } else {
        // Pre-check for duplicate email
        const exists = await checkAdminEmailExists(formData.email);
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
        await authService.createAdmin(formData);
      }
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save admin');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Edit Admin' : 'Add New Admin'} size="lg">
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
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password {isEdit ? '(leave blank to keep unchanged)' : '*'}
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required={!isEdit}
              minLength={6}
              placeholder={isEdit ? 'Leave blank to keep current password' : ''}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone
            </label>
            <input
              type="text"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        {/* Password authentication before adding admin */}
        {!isEdit && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Your Password (required to add a new admin)
            </label>
            <input
              type="password"
              name="adminPassword"
              value={adminPassword}
              onChange={e => setAdminPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
        )}
        <div className="flex justify-end space-x-3 pt-4">
          <Button variant="outline" onClick={onClose} disabled={loading} type="button">
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {isEdit ? 'Update Admin' : 'Create Admin'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

const AdminsList: React.FC = () => {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [error, setError] = useState('');

  const loadAdmins = async () => {
    try {
      setLoading(true);
      const adminsData = await authService.getAdmins();
      setAdmins(adminsData);
    } catch (error) {
      console.error('Failed to load admins:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdmins();
  }, []);

  const handleAdminCreated = () => {
    loadAdmins();
  };

  const handleAdminClick = (admin: Admin) => {
    setSelectedAdmin(admin);
    setEditMode(false);
    setError('');
  };

  const handleEdit = () => {
    setEditMode(true);
  };

  // Open edit admin modal
  const handleEditAdmin = (admin: Admin) => {
    setSelectedAdmin(admin);
    setEditMode(true);
    setIsFormOpen(true);
  };
  // Open delete confirmation modal
  const handleDeleteConfirm = (admin: Admin) => {
    setSelectedAdmin(admin);
    setDeleteConfirm(true);
  };
  // Delete admin
  const handleDelete = async () => {
    if (!selectedAdmin) return;
    setError('');
    try {
      await authService.deleteAdmin(selectedAdmin.id);
      setDeleteConfirm(false);
      setSelectedAdmin(null);
      loadAdmins();
    } catch (err) {
      setError('Failed to delete admin');
    }
  };

  const handleUpdate = () => {
    setEditMode(false);
    setSelectedAdmin(null);
    loadAdmins();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Admins</h2>
          <p className="text-gray-600">Manage your admins and their information</p>
        </div>
        <Button
          icon={Plus}
          onClick={() => { setIsFormOpen(true); setEditMode(false); setSelectedAdmin(null); }}
        >
          Add Admin
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading admins...</p>
        </div>
      ) : admins.length === 0 ? (
        <div className="text-center py-12">
          <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No admins yet</h3>
          <p className="text-gray-600 mb-6">Get started by adding your first admin</p>
          <Button
            icon={Plus}
            onClick={() => setIsFormOpen(true)}
          >
            Add First Admin
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {admins.map((admin) => (
            <Card key={admin.id} hover className="relative cursor-pointer">
              {/* Hide edit/delete for Super-Admin */}
              {!(admin.email === 'contact.tasknova@gmail.com') && (
                <>
                  <button
                    title="Edit Admin"
                    className="absolute top-2 left-2 z-10 rounded-full bg-white border border-blue-200 p-1 shadow hover:bg-blue-50 hover:border-blue-400 transition"
                    onClick={e => {
                      e.stopPropagation();
                      handleEditAdmin(admin);
                    }}
                  >
                    <Edit2 className="w-4 h-4 text-blue-600" />
                  </button>
                  <button
                    title="Delete Admin"
                    className="absolute top-2 right-2 z-10 rounded-full bg-white border border-red-200 p-1 shadow hover:bg-red-50 hover:border-red-400 transition"
                    onClick={e => {
                      e.stopPropagation();
                      handleDeleteConfirm(admin);
                    }}
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </>
              )}
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                {admin.avatar_url ? (
                  <img src={admin.avatar_url} alt="Profile" className="w-16 h-16 object-cover rounded-full" />
                ) : (
                  <User className="w-8 h-8 text-blue-600" />
                )}
              </div>
              {/* Center the admin name */}
              <h3 className="text-lg font-semibold text-gray-900 mb-1 text-center">
                {admin.name}
              </h3>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center justify-center">
                  <Mail className="w-4 h-4 mr-2" />
                  {admin.email}
                </div>
                {admin.phone && (
                  <div className="flex items-center justify-center">
                    <Phone className="w-4 h-4 mr-2" />
                    {admin.phone}
                  </div>
                )}
              </div>
              <div className="mt-4 flex justify-center">
                <span className={`px-2 py-1 rounded text-xs font-semibold ${admin.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>
                  {admin.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Admin Form Modal (add/edit) */}
      {isFormOpen && (
        <AdminForm
          isOpen={isFormOpen}
          onClose={() => { setIsFormOpen(false); setSelectedAdmin(null); setEditMode(false); }}
          onSuccess={handleAdminCreated}
          initialData={editMode ? selectedAdmin || undefined : undefined}
        />
      )}
      {/* Delete Confirmation Modal */}
      {deleteConfirm && selectedAdmin && (
        <Modal isOpen={deleteConfirm} onClose={() => setDeleteConfirm(false)} title="Delete Admin">
          <div>Are you sure you want to delete {selectedAdmin.name}?</div>
          <div className="flex justify-end space-x-2 mt-4">
            <Button variant="outline" onClick={() => setDeleteConfirm(false)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete}>Delete</Button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AdminsList; 