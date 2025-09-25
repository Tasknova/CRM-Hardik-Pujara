import React, { useState } from 'react';
import { X, Building, Mail, Phone, MapPin, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

interface NewLoanProviderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (loanProvider: { id: string; name: string; email?: string; phone?: string; address?: string }) => void;
  initialName?: string;
}

const NewLoanProviderModal: React.FC<NewLoanProviderModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  initialName = '' 
}) => {
  const [formData, setFormData] = useState({
    name: initialName,
    email: '',
    phone: '',
    address: ''
  });
  const [employees, setEmployees] = useState<Array<{
    name: string;
    email: string;
    contact: string;
    position: string;
  }>>([]);
  const [employeeForm, setEmployeeForm] = useState({
    name: '',
    email: '',
    contact: '',
    position: ''
  });
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Loan provider name is required');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('loan_providers')
        .insert([{
          provider_name: formData.name.trim(),
          address: formData.address.trim() || null,
          contact_details: {
            email: formData.email.trim() || null,
            phone: formData.phone.trim() || null
          },
          employees: employees
        }])
        .select()
        .single();

      if (error) throw error;

      toast.success('New loan provider created successfully');
      onSuccess({
        id: data.id,
        name: data.provider_name,
        email: data.contact_details?.email,
        phone: data.contact_details?.phone,
        address: data.address
      });
      onClose();
    } catch (error) {
      console.error('Error creating loan provider:', error);
      toast.error('Failed to create new loan provider');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddEmployee = () => {
    if (!employeeForm.name.trim() || !employeeForm.position.trim()) {
      toast.error('Employee name and position are required');
      return;
    }

    setEmployees(prev => [...prev, { ...employeeForm }]);
    setEmployeeForm({ name: '', email: '', contact: '', position: '' });
    setShowEmployeeForm(false);
    toast.success('Employee added');
  };

  const handleRemoveEmployee = (index: number) => {
    setEmployees(prev => prev.filter((_, i) => i !== index));
    toast.success('Employee removed');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-2">
            <Building className="w-5 h-5 text-green-600" />
            <h2 className="text-xl font-semibold text-gray-900">Create New Loan Provider</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Loan Provider Name *
            </label>
            <div className="relative">
              <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter loan provider name"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter email address"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter phone number"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Address
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 text-gray-400 w-4 h-4" />
              <textarea
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                rows={3}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter complete address"
              />
            </div>
          </div>

          {/* Employee Management Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Employees</h3>
              <button
                type="button"
                onClick={() => setShowEmployeeForm(true)}
                className="flex items-center px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Employee
              </button>
            </div>

            {/* Employee List */}
            {employees.length > 0 && (
              <div className="space-y-2">
                {employees.map((employee, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{employee.name}</div>
                      <div className="text-sm text-gray-600">{employee.position}</div>
                      {employee.email && (
                        <div className="text-sm text-gray-500">{employee.email}</div>
                      )}
                      {employee.contact && (
                        <div className="text-sm text-gray-500">{employee.contact}</div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveEmployee(index)}
                      className="p-1 text-red-600 hover:bg-red-100 rounded-full transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Employee Form */}
            {showEmployeeForm && (
              <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                <h4 className="font-medium text-gray-900 mb-3">Add New Employee</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name *
                    </label>
                    <input
                      type="text"
                      value={employeeForm.name}
                      onChange={(e) => setEmployeeForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Employee name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Position *
                    </label>
                    <input
                      type="text"
                      value={employeeForm.position}
                      onChange={(e) => setEmployeeForm(prev => ({ ...prev, position: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Job position"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={employeeForm.email}
                      onChange={(e) => setEmployeeForm(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Email address"
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
                      placeholder="Phone number"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-2 mt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEmployeeForm(false);
                      setEmployeeForm({ name: '', email: '', contact: '', position: '' });
                    }}
                    className="px-3 py-1.5 text-sm text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddEmployee}
                    className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Add Employee
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !formData.name.trim()}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Creating...' : 'Create Loan Provider'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewLoanProviderModal;
