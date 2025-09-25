import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Eye, Trash2, Users, MapPin, Phone, Mail, Building } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Modal from '../ui/Modal';
import { DeleteConfirmationModal } from '../ui/DeleteConfirmationModal';
import { toast } from 'sonner';

interface BuilderEmployee {
  name: string;
  email: string;
  contact: string;
  position: string;
}

interface Builder {
  id: string;
  name: string;
  location: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  employees: BuilderEmployee[];
  created_at: string;
}

interface BuilderFormData {
  name: string;
  location: string;
  contact_email: string;
  contact_phone: string;
  address: string;
  employees: BuilderEmployee[];
}

const BuildersPage: React.FC = () => {
  const [builders, setBuilders] = useState<Builder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingBuilder, setEditingBuilder] = useState<Builder | null>(null);
  const [viewingBuilder, setViewingBuilder] = useState<Builder | null>(null);
  const [builderToDelete, setBuilderToDelete] = useState<Builder | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [formData, setFormData] = useState<BuilderFormData>({
    name: '',
    location: '',
    contact_email: '',
    contact_phone: '',
    address: '',
    employees: []
  });

  const [employeeForm, setEmployeeForm] = useState({
    name: '',
    email: '',
    contact: '',
    position: ''
  });
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);

  useEffect(() => {
    fetchBuilders();
  }, []);

  const fetchBuilders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('builders')
        .select('*')
        .order('name');

      if (error) throw error;
      setBuilders(data || []);
    } catch (error) {
      console.error('Error fetching builders:', error);
      toast.error('Failed to fetch builders');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingBuilder) {
        const { error } = await supabase
          .from('builders')
          .update({
            ...formData,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingBuilder.id);

        if (error) throw error;
        toast.success('Builder updated successfully');
      } else {
        const { error } = await supabase
          .from('builders')
          .insert([formData]);

        if (error) throw error;
        toast.success('Builder created successfully');
      }

      resetForm();
      fetchBuilders();
    } catch (error) {
      console.error('Error saving builder:', error);
      toast.error('Failed to save builder');
    }
  };

  const handleAddEmployee = () => {
    if (!employeeForm.name || !employeeForm.position) {
      toast.error('Employee name and position are required');
      return;
    }

    setFormData(prev => ({
      ...prev,
      employees: [...prev.employees, { ...employeeForm }]
    }));

    setEmployeeForm({ name: '', email: '', contact: '', position: '' });
    setShowEmployeeForm(false);
    toast.success('Employee added');
  };

  const handleRemoveEmployee = (index: number) => {
    setFormData(prev => ({
      ...prev,
      employees: prev.employees.filter((_, i) => i !== index)
    }));
    toast.success('Employee removed');
  };

  const handleEdit = (builder: Builder) => {
    setEditingBuilder(builder);
    setFormData({
      name: builder.name,
      location: builder.location,
      contact_email: builder.contact_email || '',
      contact_phone: builder.contact_phone || '',
      address: builder.address || '',
      employees: builder.employees || []
    });
    setShowForm(true);
  };

  const handleDelete = async () => {
    if (!builderToDelete) return;
    
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('builders')
        .delete()
        .eq('id', builderToDelete.id);

      if (error) {
        // Check if it's a foreign key constraint error
        if (error.message.includes('foreign key constraint') || error.message.includes('violates foreign key constraint')) {
          toast.error(`Cannot delete builder "${builderToDelete.name}" because they have associated builder deals. Please delete the associated deals first.`);
        } else {
          throw error;
        }
        return;
      }
      
      toast.success(`${builderToDelete.name} deleted successfully`);
      setBuilderToDelete(null);
      fetchBuilders();
    } catch (error) {
      console.error('Error deleting builder:', error);
      toast.error('Failed to delete builder');
    } finally {
      setIsDeleting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      location: '',
      contact_email: '',
      contact_phone: '',
      address: '',
      employees: []
    });
    setEditingBuilder(null);
    setShowForm(false);
    setShowEmployeeForm(false);
  };

  const filteredBuilders = builders.filter(builder =>
    builder.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    builder.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalBuilders = builders.length;
  const totalEmployees = builders.reduce((sum, builder) => sum + (builder.employees?.length || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Builders Management</h1>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add New Builder
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center">
            <Building className="w-8 h-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Builders</p>
              <p className="text-2xl font-bold text-gray-900">{totalBuilders}</p>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center">
            <Users className="w-8 h-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Employees</p>
              <p className="text-2xl font-bold text-gray-900">{totalEmployees}</p>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center">
            <MapPin className="w-8 h-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Locations</p>
              <p className="text-2xl font-bold text-gray-900">
                {new Set(builders.map(b => b.location)).size}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Search builders..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Builders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBuilders.map((builder) => (
          <Card key={builder.id} className="p-6 hover:shadow-lg transition-shadow relative">
            <div className="absolute top-4 right-4 flex space-x-2">
              <button
                onClick={() => setViewingBuilder(builder)}
                className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                title="View Details"
              >
                <Eye className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleEdit(builder)}
                className="p-1 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                title="Edit Builder"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setBuilderToDelete(builder)}
                className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                title="Delete Builder"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2 pr-20">{builder.name}</h3>
              <div className="space-y-2">
                <div className="flex items-center text-sm text-gray-600">
                  <MapPin className="w-4 h-4 mr-2" />
                  {builder.location}
                </div>
                {builder.contact_email && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Mail className="w-4 h-4 mr-2" />
                    {builder.contact_email}
                  </div>
                )}
                {builder.contact_phone && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Phone className="w-4 h-4 mr-2" />
                    {builder.contact_phone}
                  </div>
                )}
                <div className="flex items-center text-sm text-gray-600">
                  <Users className="w-4 h-4 mr-2" />
                  {builder.employees?.length || 0} employees
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filteredBuilders.length === 0 && (
        <div className="text-center py-12">
          <Building className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No builders found</p>
        </div>
      )}

      {/* Builder Form Modal */}
      <Modal
        isOpen={showForm}
        onClose={resetForm}
        title={editingBuilder ? 'Edit Builder' : 'Add New Builder'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Builder Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location *
              </label>
              <input
                type="text"
                required
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Email
              </label>
              <input
                type="email"
                value={formData.contact_email}
                onChange={(e) => setFormData(prev => ({ ...prev, contact_email: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Phone
              </label>
              <input
                type="tel"
                value={formData.contact_phone}
                onChange={(e) => setFormData(prev => ({ ...prev, contact_phone: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address
            </label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Employees Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Employees ({formData.employees.length})
              </label>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setShowEmployeeForm(true)}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Employee
              </Button>
            </div>

            {formData.employees.length > 0 && (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {formData.employees.map((employee, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{employee.name}</p>
                      <p className="text-xs text-gray-600">{employee.position}</p>
                      {employee.email && <p className="text-xs text-gray-500">{employee.email}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveEmployee(index)}
                      className="text-red-600 hover:bg-red-100 p-1 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="secondary" onClick={resetForm}>
              Cancel
            </Button>
            <Button type="submit">
              {editingBuilder ? 'Update Builder' : 'Create Builder'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Employee Form Modal */}
      <Modal
        isOpen={showEmployeeForm}
        onClose={() => setShowEmployeeForm(false)}
        title="Add Employee"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name *
              </label>
              <input
                type="text"
                required
                value={employeeForm.name}
                onChange={(e) => setEmployeeForm(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Position *
              </label>
              <input
                type="text"
                required
                value={employeeForm.position}
                onChange={(e) => setEmployeeForm(prev => ({ ...prev, position: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={employeeForm.email}
                onChange={(e) => setEmployeeForm(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact
              </label>
              <input
                type="tel"
                value={employeeForm.contact}
                onChange={(e) => setEmployeeForm(prev => ({ ...prev, contact: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <Button 
              type="button" 
              variant="secondary" 
              onClick={() => setShowEmployeeForm(false)}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleAddEmployee}>
              Add Employee
            </Button>
          </div>
        </div>
      </Modal>

      {/* View Builder Modal */}
      <Modal
        isOpen={!!viewingBuilder}
        onClose={() => setViewingBuilder(null)}
        title="Builder Details"
      >
        {viewingBuilder && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <p className="text-gray-900">{viewingBuilder.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Location</label>
                <p className="text-gray-900">{viewingBuilder.location}</p>
              </div>
            </div>
            
            {(viewingBuilder.contact_email || viewingBuilder.contact_phone) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {viewingBuilder.contact_email && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <p className="text-gray-900">{viewingBuilder.contact_email}</p>
                  </div>
                )}
                {viewingBuilder.contact_phone && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Phone</label>
                    <p className="text-gray-900">{viewingBuilder.contact_phone}</p>
                  </div>
                )}
              </div>
            )}

            {viewingBuilder.address && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Address</label>
                <p className="text-gray-900">{viewingBuilder.address}</p>
              </div>
            )}

            {viewingBuilder.employees && viewingBuilder.employees.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Employees ({viewingBuilder.employees.length})
                </label>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {viewingBuilder.employees.map((employee, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg">
                      <p className="font-medium">{employee.name}</p>
                      <p className="text-sm text-gray-600">{employee.position}</p>
                      {employee.email && <p className="text-sm text-gray-500">{employee.email}</p>}
                      {employee.contact && <p className="text-sm text-gray-500">{employee.contact}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={!!builderToDelete}
        onClose={() => setBuilderToDelete(null)}
        onConfirm={handleDelete}
        taskName={builderToDelete?.name || ''}
        taskDescription={`Builder from ${builderToDelete?.location || ''}`}
        projectName="Builders Management"
        isLoading={isDeleting}
      />
    </div>
  );
};

export default BuildersPage;
