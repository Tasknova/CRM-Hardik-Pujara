import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Eye, Mail, Phone, MapPin, Building } from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Modal from '../ui/Modal';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

interface Owner {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  created_at: string;
  updated_at: string;
}

const OwnersPage: React.FC = () => {
  const [owners, setOwners] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingOwner, setEditingOwner] = useState<Owner | null>(null);
  const [viewingOwner, setViewingOwner] = useState<Owner | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: ''
  });

  useEffect(() => {
    fetchOwners();
  }, []);

  const fetchOwners = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('owners')
        .select('*')
        .order('name');

      if (error) throw error;
      setOwners(data || []);
    } catch (error) {
      console.error('Error fetching owners:', error);
      toast.error('Failed to load owners');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = () => {
    setEditingOwner(null);
    setFormData({ name: '', email: '', phone: '', address: '' });
    setShowModal(true);
  };

  const handleEdit = (owner: Owner) => {
    setEditingOwner(owner);
    setFormData({
      name: owner.name,
      email: owner.email || '',
      phone: owner.phone || '',
      address: owner.address || ''
    });
    setShowModal(true);
  };

  const handleView = (owner: Owner) => {
    setViewingOwner(owner);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Owner name is required');
      return;
    }

    try {
      if (editingOwner) {
        // Update existing owner
        const { error } = await supabase
          .from('owners')
          .update({
            name: formData.name.trim(),
            email: formData.email.trim() || null,
            phone: formData.phone.trim() || null,
            address: formData.address.trim() || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingOwner.id);

        if (error) throw error;
        toast.success('Owner updated successfully');
      } else {
        // Create new owner
        const { error } = await supabase
          .from('owners')
          .insert([{
            name: formData.name.trim(),
            email: formData.email.trim() || null,
            phone: formData.phone.trim() || null,
            address: formData.address.trim() || null
          }]);

        if (error) throw error;
        toast.success('Owner created successfully');
      }

      setShowModal(false);
      fetchOwners();
    } catch (error) {
      console.error('Error saving owner:', error);
      toast.error('Failed to save owner');
    }
  };

  const filteredOwners = owners.filter(owner =>
    owner.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (owner.email && owner.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (owner.phone && owner.phone.includes(searchTerm))
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading owners...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Property Owners</h1>
            <p className="text-gray-600 mt-1">Manage your property owner database</p>
          </div>
          <Button
            onClick={handleAddNew}
            className="flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Owner</span>
          </Button>
        </div>

        {/* Summary Stats */}
        {owners.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-2xl font-bold text-purple-600">{owners.length}</div>
              <div className="text-sm text-gray-600">Total Owners</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-2xl font-bold text-green-600">
                {owners.filter(o => o.email).length}
              </div>
              <div className="text-sm text-gray-600">With Email</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-2xl font-bold text-blue-600">
                {owners.filter(o => o.phone).length}
              </div>
              <div className="text-sm text-gray-600">With Phone</div>
            </div>
          </div>
        )}

        {/* Search Bar */}
        <div className="max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search owners..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Owners Grid */}
        {filteredOwners.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Building className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No owners found
            </h3>
            <p className="text-gray-600 mb-6">
              {searchTerm ? 'No owners match your search criteria.' : 'Get started by adding your first property owner.'}
            </p>
            <Button onClick={handleAddNew}>
              <Plus className="w-4 h-4 mr-2" />
              Add First Owner
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredOwners.map((owner) => (
              <Card key={owner.id} className="p-6 hover:shadow-lg transition-all duration-300 relative">
                <div className="space-y-4">
                  {/* Action Icons */}
                  <div className="absolute top-4 right-4 flex space-x-1">
                    <button
                      onClick={() => handleView(owner)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors duration-200"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleEdit(owner)}
                      className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-full transition-colors duration-200"
                      title="Edit Owner"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Header */}
                  <div className="flex items-center space-x-3 pr-16">
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                      <Building className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {owner.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        Added {new Date(owner.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Contact Details */}
                  <div className="space-y-2 text-sm text-gray-600">
                    {owner.email && (
                      <div className="flex items-center space-x-2">
                        <Mail className="w-4 h-4" />
                        <span className="truncate">{owner.email}</span>
                      </div>
                    )}
                    {owner.phone && (
                      <div className="flex items-center space-x-2">
                        <Phone className="w-4 h-4" />
                        <span>{owner.phone}</span>
                      </div>
                    )}
                    {owner.address && (
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4" />
                        <span className="truncate">{owner.address}</span>
                      </div>
                    )}
                  </div>

                </div>
              </Card>
            ))}
          </div>
        )}

      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingOwner ? 'Edit Owner' : 'Add New Owner'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter owner name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter email address"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter phone number"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Address
            </label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter address"
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowModal(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              {editingOwner ? 'Update Owner' : 'Add Owner'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* View Modal */}
      <Modal
        isOpen={!!viewingOwner}
        onClose={() => setViewingOwner(null)}
        title="Owner Details"
      >
        {viewingOwner && (
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
                <Building className="w-8 h-8 text-purple-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">{viewingOwner.name}</h3>
                <p className="text-gray-600">Property Owner</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {viewingOwner.email && (
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <Mail className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Email</p>
                    <p className="text-gray-600">{viewingOwner.email}</p>
                  </div>
                </div>
              )}

              {viewingOwner.phone && (
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <Phone className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Phone</p>
                    <p className="text-gray-600">{viewingOwner.phone}</p>
                  </div>
                </div>
              )}

              {viewingOwner.address && (
                <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                  <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Address</p>
                    <p className="text-gray-600">{viewingOwner.address}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <Building className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Created</p>
                  <p className="text-gray-600">{new Date(viewingOwner.created_at).toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="flex space-x-3 pt-4">
              <Button
                variant="secondary"
                onClick={() => setViewingOwner(null)}
                className="flex-1"
              >
                Close
              </Button>
              <Button
                onClick={() => {
                  setViewingOwner(null);
                  handleEdit(viewingOwner);
                }}
                className="flex-1"
              >
                Edit Owner
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default OwnersPage;
