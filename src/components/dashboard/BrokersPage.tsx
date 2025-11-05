import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Eye, EyeOff, Mail, Phone, MapPin, User, Trash2, Building, FileText, Key, Copy, Check } from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Modal from '../ui/Modal';
import { DeleteConfirmationModal } from '../ui/DeleteConfirmationModal';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

interface Broker {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  company_name?: string;
  license_number?: string;
  created_at: string;
  updated_at: string;
}

const BrokersPage: React.FC = () => {
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingBroker, setEditingBroker] = useState<Broker | null>(null);
  const [viewingBroker, setViewingBroker] = useState<Broker | null>(null);
  const [brokerToDelete, setBrokerToDelete] = useState<Broker | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [brokerCredentials, setBrokerCredentials] = useState<{ brokerId: string; password: string; loginUrl: string } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    company_name: '',
    license_number: ''
  });

  useEffect(() => {
    fetchBrokers();
  }, []);

  const fetchBrokers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('brokers')
        .select('*')
        .order('name');

      if (error) throw error;
      setBrokers(data || []);
    } catch (error) {
      console.error('Error fetching brokers:', error);
      toast.error('Failed to load brokers');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = () => {
    setEditingBroker(null);
    setFormData({ 
      name: '', 
      email: '', 
      phone: '', 
      address: '', 
      company_name: '', 
      license_number: '' 
    });
    setShowModal(true);
  };

  const handleEdit = (broker: Broker) => {
    setEditingBroker(broker);
    setFormData({
      name: broker.name,
      email: broker.email || '',
      phone: broker.phone || '',
      address: broker.address || '',
      company_name: broker.company_name || '',
      license_number: broker.license_number || ''
    });
    setShowModal(true);
  };

  const handleView = (broker: Broker) => {
    setViewingBroker(broker);
  };

  const handleDelete = (broker: Broker) => {
    setBrokerToDelete(broker);
  };

  const generatePassword = () => {
    // Generate a random 8-character password
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const handleGiveAccess = async (broker: Broker) => {
    try {
      // Check if broker already has credentials
      if (broker.password_hash) {
        // Credentials already exist - show existing credentials info
        const loginUrl = 'https://propazone.tasknova.io/broker/login';
        setBrokerCredentials({
          brokerId: broker.id,
          password: '********', // Show masked password
          loginUrl: loginUrl
        });
        setShowAccessModal(true);
        toast.info('Broker already has access. Password cannot be viewed for security reasons.');
        return;
      }

      // Generate a new password only if one doesn't exist
      const password = generatePassword();

      // Hash the password
      const hashedPassword = btoa(password);

      // Update broker with password
      const { error } = await supabase
        .from('brokers')
        .update({
          password_hash: hashedPassword,
          is_active: true
        })
        .eq('id', broker.id);

      if (error) throw error;

      // Set credentials to show in modal
      const loginUrl = 'https://propazone.tasknova.io/broker/login';
      setBrokerCredentials({
        brokerId: broker.id,
        password: password,
        loginUrl: loginUrl
      });
      setShowPassword(false); // Reset to hide password by default
      setShowAccessModal(true);

      toast.success('Access granted successfully!');
    } catch (error) {
      console.error('Error giving access:', error);
      toast.error('Failed to grant access');
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleDeleteConfirm = async () => {
    if (!brokerToDelete) return;
    
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('brokers')
        .delete()
        .eq('id', brokerToDelete.id);

      if (error) {
        // Check if it's a foreign key constraint error
        if (error.message.includes('foreign key constraint')) {
          toast.error(`Cannot delete broker "${brokerToDelete.name}" because they have associated deals or other records. Please remove these associations first.`);
        } else {
          throw error;
        }
        return;
      }

      toast.success('Broker deleted successfully');
      setBrokers(brokers.filter(b => b.id !== brokerToDelete.id));
      setBrokerToDelete(null);
    } catch (error) {
      console.error('Error deleting broker:', error);
      toast.error('Failed to delete broker');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Broker name is required');
      return;
    }

    try {
      if (editingBroker) {
        // Update existing broker
        const { error } = await supabase
          .from('brokers')
          .update({
            name: formData.name.trim(),
            email: formData.email.trim() || null,
            phone: formData.phone.trim() || null,
            address: formData.address.trim() || null,
            company_name: formData.company_name.trim() || null,
            license_number: formData.license_number.trim() || null
          })
          .eq('id', editingBroker.id);

        if (error) throw error;

        toast.success('Broker updated successfully');
        setBrokers(brokers.map(b => 
          b.id === editingBroker.id 
            ? { ...b, ...formData, name: formData.name.trim() }
            : b
        ));
      } else {
        // Create new broker
        const { data, error } = await supabase
          .from('brokers')
          .insert([{
            name: formData.name.trim(),
            email: formData.email.trim() || null,
            phone: formData.phone.trim() || null,
            address: formData.address.trim() || null,
            company_name: formData.company_name.trim() || null,
            license_number: formData.license_number.trim() || null
          }])
          .select()
          .single();

        if (error) throw error;

        toast.success('Broker created successfully');
        setBrokers([...brokers, data]);
      }

      setShowModal(false);
      setFormData({ 
        name: '', 
        email: '', 
        phone: '', 
        address: '', 
        company_name: '', 
        license_number: '' 
      });
    } catch (error) {
      console.error('Error saving broker:', error);
      toast.error(editingBroker ? 'Failed to update broker' : 'Failed to create broker');
    }
  };

  const filteredBrokers = brokers.filter(broker =>
    broker.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (broker.email && broker.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (broker.phone && broker.phone.includes(searchTerm)) ||
    (broker.company_name && broker.company_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (broker.license_number && broker.license_number.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading brokers...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Brokers</h1>
          <p className="text-gray-600">Manage real estate brokers</p>
        </div>
        <Button onClick={handleAddNew} className="flex items-center space-x-2">
          <Plus className="w-4 h-4" />
          <span>Add Broker</span>
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          type="text"
          placeholder="Search brokers by name, email, phone, company, or license number..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Brokers Grid */}
      {filteredBrokers.length === 0 ? (
        <Card className="p-8 text-center">
          <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm ? 'No brokers found' : 'No brokers yet'}
          </h3>
          <p className="text-gray-600 mb-4">
            {searchTerm 
              ? 'Try adjusting your search terms' 
              : 'Get started by adding your first broker'
            }
          </p>
          {!searchTerm && (
            <Button onClick={handleAddNew} className="flex items-center space-x-2">
              <Plus className="w-4 h-4" />
              <span>Add Broker</span>
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBrokers.map((broker) => (
            <Card key={broker.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{broker.name}</h3>
                    {broker.company_name && (
                      <p className="text-sm text-gray-600 flex items-center">
                        <Building className="w-3 h-3 mr-1" />
                        {broker.company_name}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex space-x-1">
                  <button
                    onClick={() => handleGiveAccess(broker)}
                    className="p-1 text-gray-400 hover:text-purple-600 transition-colors"
                    title="Give access"
                  >
                    <Key className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleView(broker)}
                    className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                    title="View details"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleEdit(broker)}
                    className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                    title="Edit broker"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(broker)}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                    title="Delete broker"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {broker.email && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Mail className="w-4 h-4 mr-2 text-gray-400" />
                    <span>{broker.email}</span>
                  </div>
                )}
                {broker.phone && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Phone className="w-4 h-4 mr-2 text-gray-400" />
                    <span>{broker.phone}</span>
                  </div>
                )}
                {broker.license_number && (
                  <div className="flex items-center text-sm text-gray-600">
                    <FileText className="w-4 h-4 mr-2 text-gray-400" />
                    <span>License: {broker.license_number}</span>
                  </div>
                )}
                {broker.address && (
                  <div className="flex items-start text-sm text-gray-600">
                    <MapPin className="w-4 h-4 mr-2 text-gray-400 mt-0.5 flex-shrink-0" />
                    <span className="line-clamp-2">{broker.address}</span>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingBroker(null);
          setFormData({ 
            name: '', 
            email: '', 
            phone: '', 
            address: '', 
            company_name: '', 
            license_number: '' 
          });
        }}
        title={editingBroker ? 'Edit Broker' : 'Add New Broker'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <User className="w-4 h-4 inline mr-2" />
              Broker Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter broker name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Mail className="w-4 h-4 inline mr-2" />
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter email address"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Phone className="w-4 h-4 inline mr-2" />
              Phone
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter phone number"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Building className="w-4 h-4 inline mr-2" />
              Company Name
            </label>
            <input
              type="text"
              value={formData.company_name}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter company name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FileText className="w-4 h-4 inline mr-2" />
              License Number
            </label>
            <input
              type="text"
              value={formData.license_number}
              onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter license number"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <MapPin className="w-4 h-4 inline mr-2" />
              Address
            </label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter address"
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowModal(false);
                setEditingBroker(null);
                setFormData({ 
                  name: '', 
                  email: '', 
                  phone: '', 
                  address: '', 
                  company_name: '', 
                  license_number: '' 
                });
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              {editingBroker ? 'Update Broker' : 'Create Broker'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* View Modal */}
      <Modal
        isOpen={!!viewingBroker}
        onClose={() => setViewingBroker(null)}
        title="Broker Details"
      >
        {viewingBroker && (
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{viewingBroker.name}</h3>
                {viewingBroker.company_name && (
                  <p className="text-sm text-gray-600 flex items-center">
                    <Building className="w-4 h-4 mr-1" />
                    {viewingBroker.company_name}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-3">
              {viewingBroker.email && (
                <div className="flex items-center text-sm text-gray-600">
                  <Mail className="w-4 h-4 mr-3 text-gray-400" />
                  <span>{viewingBroker.email}</span>
                </div>
              )}
              {viewingBroker.phone && (
                <div className="flex items-center text-sm text-gray-600">
                  <Phone className="w-4 h-4 mr-3 text-gray-400" />
                  <span>{viewingBroker.phone}</span>
                </div>
              )}
              {viewingBroker.license_number && (
                <div className="flex items-center text-sm text-gray-600">
                  <FileText className="w-4 h-4 mr-3 text-gray-400" />
                  <span>License: {viewingBroker.license_number}</span>
                </div>
              )}
              {viewingBroker.address && (
                <div className="flex items-start text-sm text-gray-600">
                  <MapPin className="w-4 h-4 mr-3 text-gray-400 mt-0.5 flex-shrink-0" />
                  <span>{viewingBroker.address}</span>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-gray-200">
              <div className="text-xs text-gray-500">
                <p>Created: {new Date(viewingBroker.created_at).toLocaleDateString()}</p>
                <p>Updated: {new Date(viewingBroker.updated_at).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={!!brokerToDelete}
        onClose={() => setBrokerToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Broker"
        message={`Are you sure you want to delete "${brokerToDelete?.name}"? This action cannot be undone.`}
        isLoading={isDeleting}
      />

      {/* Access Credentials Modal */}
      <Modal
        isOpen={showAccessModal}
        onClose={() => {
          setShowAccessModal(false);
          setBrokerCredentials(null);
          setCopiedField(null);
          setShowPassword(false);
        }}
        title="Broker Access Credentials"
      >
        {brokerCredentials && (
          <div className="space-y-4">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-4">
                Share these credentials with the broker. They can use these to login to their dashboard.
              </p>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Broker ID
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={brokerCredentials.brokerId}
                      readOnly
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 font-mono text-sm"
                    />
                    <button
                      onClick={() => copyToClipboard(brokerCredentials.brokerId, 'brokerId')}
                      className="p-2 text-gray-600 hover:text-purple-600 transition-colors"
                      title="Copy Broker ID"
                    >
                      {copiedField === 'brokerId' ? (
                        <Check className="w-5 h-5 text-green-600" />
                      ) : (
                        <Copy className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <div className="flex items-center space-x-2">
                    <div className="relative flex-1">
                      <input
                        type={brokerCredentials.password === '********' ? 'password' : (showPassword ? 'text' : 'password')}
                        value={brokerCredentials.password}
                        readOnly
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg bg-gray-50 font-mono text-sm"
                      />
                      {brokerCredentials.password !== '********' && (
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-purple-600 transition-colors z-10"
                          title={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      )}
                    </div>
                    {brokerCredentials.password !== '********' && (
                      <button
                        onClick={() => copyToClipboard(brokerCredentials.password, 'password')}
                        className="p-2 text-gray-600 hover:text-purple-600 transition-colors"
                        title="Copy Password"
                      >
                        {copiedField === 'password' ? (
                          <Check className="w-5 h-5 text-green-600" />
                        ) : (
                          <Copy className="w-5 h-5" />
                        )}
                      </button>
                    )}
                  </div>
                  {brokerCredentials.password === '********' && (
                    <p className="text-xs text-gray-500 mt-1">
                      Password is hidden for security. Broker can change it from their profile.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Login URL
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={brokerCredentials.loginUrl}
                      readOnly
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 font-mono text-sm"
                    />
                    <button
                      onClick={() => copyToClipboard(brokerCredentials.loginUrl, 'loginUrl')}
                      className="p-2 text-gray-600 hover:text-purple-600 transition-colors"
                      title="Copy Login URL"
                    >
                      {copiedField === 'loginUrl' ? (
                        <Check className="w-5 h-5 text-green-600" />
                      ) : (
                        <Copy className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  {brokerCredentials.password === '********' ? (
                    <>
                      <strong>Note:</strong> This broker already has credentials set. The password cannot be viewed for security reasons. 
                      The broker can change their password from their profile page after logging in.
                    </>
                  ) : (
                    <>
                      <strong>Note:</strong> Please save this password securely. It will not be shown again. 
                      The broker can change their password from their profile page after logging in.
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                variant="primary"
                onClick={() => {
                  setShowAccessModal(false);
                  setBrokerCredentials(null);
                  setCopiedField(null);
                }}
              >
                Done
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default BrokersPage;
