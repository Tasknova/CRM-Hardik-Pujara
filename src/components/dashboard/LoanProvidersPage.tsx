import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Eye, Trash2, Building, Phone, Mail, MapPin, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { DeleteConfirmationModal } from '../ui/DeleteConfirmationModal';
import { toast } from 'sonner';

interface LoanProvider {
  id: string;
  provider_name: string;
  address?: string;
  contact_details?: any;
  employees?: any[];
  created_at: string;
  updated_at: string;
}

interface LoanProviderFormData {
  provider_name: string;
  address: string;
  contact_details: {
    phone: string;
    email: string;
    website: string;
  };
  employees: Array<{
    name: string;
    email: string;
    contact: string;
    position: string;
  }>;
}

const LoanProvidersPage: React.FC = () => {
  const [providers, setProviders] = useState<LoanProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingProvider, setEditingProvider] = useState<LoanProvider | null>(null);
  const [providerToDelete, setProviderToDelete] = useState<LoanProvider | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);

  const [formData, setFormData] = useState<LoanProviderFormData>({
    provider_name: '',
    address: '',
    contact_details: {
      phone: '',
      email: '',
      website: ''
    },
    employees: []
  });

  useEffect(() => {
    fetchProviders();
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      console.log('Current user:', user);
      console.log('Auth error:', error);
    } catch (error) {
      console.error('Auth check error:', error);
    }
  };

  const fetchProviders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('loan_providers')
        .select('*')
        .order('provider_name');

      if (error) throw error;
      setProviders(data || []);
    } catch (error) {
      console.error('Error fetching loan providers:', error);
      toast.error('Failed to fetch loan providers');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.provider_name.trim()) {
      toast.error('Provider name is required');
      return;
    }

    try {
      console.log('Submitting loan provider:', formData);
      
      if (editingProvider) {
        console.log('Updating existing provider:', editingProvider.id);
        const { error } = await supabase
          .from('loan_providers')
          .update({
            provider_name: formData.provider_name,
            address: formData.address,
            contact_details: formData.contact_details,
            employees: formData.employees,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingProvider.id);

        if (error) throw error;
        toast.success('Loan provider updated successfully');
      } else {
        console.log('Creating new provider');
        const { data, error } = await supabase
          .from('loan_providers')
          .insert([{
            provider_name: formData.provider_name,
            address: formData.address,
            contact_details: formData.contact_details,
            employees: formData.employees
          }])
          .select();

        if (error) {
          console.error('Database error:', error);
          throw error;
        }
        console.log('Provider created successfully:', data);
        toast.success('Loan provider created successfully');
      }

      setShowForm(false);
      setEditingProvider(null);
      resetForm();
      fetchProviders();
    } catch (error) {
      console.error('Error saving loan provider:', error);
      toast.error('Failed to save loan provider');
    }
  };

  const handleEdit = (provider: LoanProvider) => {
    setEditingProvider(provider);
    setFormData({
      provider_name: provider.provider_name,
      address: provider.address || '',
      contact_details: provider.contact_details || { phone: '', email: '', website: '' },
      employees: provider.employees || []
    });
    setShowForm(true);
  };

  const handleDelete = async () => {
    if (!providerToDelete) return;
    
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('loan_providers')
        .delete()
        .eq('id', providerToDelete.id);

      if (error) throw error;
      toast.success('Loan provider deleted successfully');
      setProviderToDelete(null);
      fetchProviders();
    } catch (error) {
      console.error('Error deleting loan provider:', error);
      toast.error('Failed to delete loan provider');
    } finally {
      setIsDeleting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      provider_name: '',
      address: '',
      contact_details: { phone: '', email: '', website: '' },
      employees: []
    });
  };

  const addEmployee = () => {
    setFormData(prev => ({
      ...prev,
      employees: [...prev.employees, { name: '', email: '', contact: '', position: '' }]
    }));
  };

  const removeEmployee = (index: number) => {
    setFormData(prev => ({
      ...prev,
      employees: prev.employees.filter((_, i) => i !== index)
    }));
  };

  const updateEmployee = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      employees: prev.employees.map((emp, i) => 
        i === index ? { ...emp, [field]: value } : emp
      )
    }));
  };

  const filteredProviders = providers.filter(provider =>
    provider.provider_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (provider.address && provider.address.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalProviders = providers.length;
  const totalEmployees = providers.reduce((sum, provider) => 
    sum + (provider.employees?.length || 0), 0
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Loan Providers</h1>
          <p className="text-gray-600 mt-1">Manage loan providers and their employees</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add New Provider
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center">
            <Building className="w-8 h-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Providers</p>
              <p className="text-2xl font-bold text-gray-900">{totalProviders}</p>
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
            <Building className="w-8 h-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Providers</p>
              <p className="text-2xl font-bold text-gray-900">{totalProviders}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Search providers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Providers List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProviders.map((provider) => (
          <Card key={provider.id} className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {provider.provider_name}
                </h3>
                {provider.address && (
                  <div className="flex items-start text-sm text-gray-600 mb-2">
                    <MapPin className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="line-clamp-2">{provider.address}</span>
                  </div>
                )}
              </div>
              <div className="flex space-x-1">
                <button
                  onClick={() => handleEdit(provider)}
                  className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                  title="Edit Provider"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setProviderToDelete(provider)}
                  className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                  title="Delete Provider"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Contact Details */}
            {provider.contact_details && (
              <div className="space-y-2 mb-4">
                {provider.contact_details.phone && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Phone className="w-4 h-4 mr-2" />
                    <span>{provider.contact_details.phone}</span>
                  </div>
                )}
                {provider.contact_details.email && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Mail className="w-4 h-4 mr-2" />
                    <span>{provider.contact_details.email}</span>
                  </div>
                )}
              </div>
            )}

            {/* Employees Count */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-200">
              <div className="flex items-center text-sm text-gray-600">
                <Users className="w-4 h-4 mr-2" />
                <span>{provider.employees?.length || 0} employees</span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filteredProviders.length === 0 && (
        <div className="text-center py-12">
          <Building className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">
            {searchTerm ? 'No providers found matching your search' : 'No loan providers found'}
          </p>
          <Button onClick={() => setShowForm(true)} className="mt-4">
            <Plus className="w-4 h-4 mr-2" />
            Add Your First Provider
          </Button>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingProvider ? 'Edit Loan Provider' : 'Add New Loan Provider'}
                </h2>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setEditingProvider(null);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Provider Details */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Provider Name *
                    </label>
                    <input
                      type="text"
                      value={formData.provider_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, provider_name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Address
                    </label>
                    <textarea
                      value={formData.address}
                      onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={3}
                    />
                  </div>
                </div>

                {/* Contact Details */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Contact Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone
                      </label>
                      <input
                        type="tel"
                        value={formData.contact_details.phone}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          contact_details: { ...prev.contact_details, phone: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={formData.contact_details.email}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          contact_details: { ...prev.contact_details, email: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Website
                    </label>
                    <input
                      type="url"
                      value={formData.contact_details.website}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        contact_details: { ...prev.contact_details, website: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Employees */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Employees</h3>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={addEmployee}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Employee
                    </Button>
                  </div>

                  {formData.employees.map((employee, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-gray-900">Employee {index + 1}</h4>
                        <button
                          type="button"
                          onClick={() => removeEmployee(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Name
                          </label>
                          <input
                            type="text"
                            value={employee.name}
                            onChange={(e) => updateEmployee(index, 'name', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Position
                          </label>
                          <input
                            type="text"
                            value={employee.position}
                            onChange={(e) => updateEmployee(index, 'position', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email
                          </label>
                          <input
                            type="email"
                            value={employee.email}
                            onChange={(e) => updateEmployee(index, 'email', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Contact
                          </label>
                          <input
                            type="tel"
                            value={employee.contact}
                            onChange={(e) => updateEmployee(index, 'contact', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Form Actions */}
                <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setShowForm(false);
                      setEditingProvider(null);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingProvider ? 'Update Provider' : 'Create Provider'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={!!providerToDelete}
        onClose={() => setProviderToDelete(null)}
        onConfirm={handleDelete}
        taskName={providerToDelete?.provider_name || ''}
        taskDescription={`loan provider with ${providerToDelete?.employees?.length || 0} employees`}
        projectName="Loan Provider"
        isLoading={isDeleting}
      />
    </div>
  );
};

export default LoanProvidersPage;
